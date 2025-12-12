/**
 * Chat Helper Functions for Mother's Almanac
 *
 * Provides utilities for managing chat conversations, messages, and RAG integration
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { vectorSearch, type SearchResult } from '@/lib/rag/search'
import { formatSystemPrompt } from './prompts'
import type {
  ChatConversation,
  ChatMessage,
  MessageSource,
  ChatAnalyticsEvent,
} from './types'

/**
 * Get or create a conversation for the current user/session
 */
export async function getOrCreateConversation(
  conversationId?: string,
  pageContext?: string,
  userId?: string | null
): Promise<string> {
  const supabase = await createClient()

  // If conversation ID provided, verify it exists and user has access
  if (conversationId) {
    const { data, error } = await
      (supabase.from('chat_conversations') as any)
      .select('id')
      .eq('id', conversationId)
      .single()

    if (!error && data) {
      return conversationId
    }
  }

  // Create new conversation
  const { data, error } = await
    (supabase.from('chat_conversations') as any)
    .insert({
      user_id: userId || null,
      page_context: pageContext,
      title: 'New Conversation',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`)
  }

  return data.id
}

/**
 * Get conversation history with messages
 */
export async function getConversationHistory(
  conversationId: string
): Promise<ChatConversation | null> {
  const supabase = await createClient()

  const { data: conversation, error: convError } = await
    (supabase.from('chat_conversations') as any)
    .select('*')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    return null
  }

  const { data: messages, error: msgError } = await
    (supabase.from('chat_messages_new') as any)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgError) {
    throw new Error(`Failed to fetch messages: ${msgError.message}`)
  }

  return {
    id: conversation.id,
    userId: conversation.user_id,
    title: conversation.title,
    pageContext: conversation.page_context,
    createdAt: new Date(conversation.created_at),
    updatedAt: new Date(conversation.updated_at),
    messages: messages.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      sources: msg.sources as MessageSource[] | undefined,
      metadata: msg.metadata,
      createdAt: new Date(msg.created_at),
    })),
  }
}

/**
 * Get list of conversations for a user
 */
export async function getUserConversations(
  userId: string,
  limit: number = 50
): Promise<ChatConversation[]> {
  const supabase = await createClient()

  const { data, error } = await
    (supabase.from('chat_conversations') as any)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`)
  }

  return data.map((conv: any) => ({
    id: conv.id,
    userId: conv.user_id,
    title: conv.title,
    pageContext: conv.page_context,
    createdAt: new Date(conv.created_at),
    updatedAt: new Date(conv.updated_at),
  }))
}

/**
 * Save a message to the database
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  sources?: MessageSource[],
  metadata?: Record<string, any>
): Promise<ChatMessage> {
  const supabase = await createClient()

  const { data, error } = await
    (supabase.from('chat_messages_new') as any)
    .insert({
      conversation_id: conversationId,
      role,
      content,
      sources: sources || null,
      metadata: metadata || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`)
  }

  return {
    id: data.id,
    conversationId: data.conversation_id,
    role: data.role as 'user' | 'assistant',
    content: data.content,
    sources: data.sources as MessageSource[] | undefined,
    metadata: data.metadata,
    createdAt: new Date(data.created_at),
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await
    (supabase.from('chat_conversations') as any)
    .delete()
    .eq('id', conversationId)

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`)
  }
}

/**
 * Retrieve relevant context from knowledge base using RAG
 */
export async function getRAGContext(
  query: string,
  pageContext?: string
): Promise<{ context: string; sources: MessageSource[] }> {
  try {
    // Perform vector search
    const results = await vectorSearch(query, {
      threshold: 0.65,
      limit: 5,
    })

    if (!results || results.length === 0) {
      return { context: '', sources: [] }
    }

    // Format context for the prompt
    const contextParts = results.map((result, index) => {
      const title = result.document_title || 'Untitled Document'
      return `[${index + 1}] ${title}\n${result.content}`
    })

    const context = contextParts.join('\n\n---\n\n')

    // Convert to MessageSource format
    const sources: MessageSource[] = results.map(result => ({
      chunkId: result.chunk_id,
      title: result.document_title || 'Untitled Document',
      content: result.content.substring(0, 200) + '...',
      relevance: result.similarity,
      documentId: result.document_id,
    }))

    return { context, sources }
  } catch (error) {
    console.error('[Chat] RAG context retrieval failed:', error)
    return { context: '', sources: [] }
  }
}

/**
 * Build chat history in Claude format
 */
export function buildChatHistory(messages: ChatMessage[]): Array<{
  role: 'user' | 'assistant'
  content: string
}> {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * Track analytics event
 */
export async function trackChatEvent(
  event: ChatAnalyticsEvent
): Promise<void> {
  const supabase = await createClient()

  const { error } = await
    (supabase.from('chat_analytics') as any)
    .insert({
      conversation_id: event.conversationId,
      message_id: event.messageId,
      event_type: event.eventType,
      metadata: event.metadata || null,
    })

  if (error) {
    console.error('[Chat] Failed to track analytics event:', error)
  }
}

/**
 * Client-side function to send feedback
 */
export async function sendMessageFeedback(
  conversationId: string,
  messageId: string,
  isPositive: boolean
): Promise<void> {
  const supabase = createBrowserClient()

  await (supabase.from('chat_analytics') as any).insert({
    conversation_id: conversationId,
    message_id: messageId,
    event_type: isPositive ? 'feedback_positive' : 'feedback_negative',
  })
}

/**
 * Search conversations by query
 */
export async function searchConversations(
  userId: string,
  query: string
): Promise<ChatConversation[]> {
  const supabase = await createClient()

  const { data, error } = await
    (supabase.from('chat_conversations') as any)
    .select('*')
    .eq('user_id', userId)
    .textSearch('title', query)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Failed to search conversations: ${error.message}`)
  }

  return data.map((conv: any) => ({
    id: conv.id,
    userId: conv.user_id,
    title: conv.title,
    pageContext: conv.page_context,
    createdAt: new Date(conv.created_at),
    updatedAt: new Date(conv.updated_at),
  }))
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await
    (supabase.from('chat_conversations') as any)
    .update({ title })
    .eq('id', conversationId)

  if (error) {
    throw new Error(`Failed to update conversation title: ${error.message}`)
  }
}
