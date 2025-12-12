/**
 * Chat Client Functions for Mother's Almanac
 * Client-safe utilities for chat components
 */

import { createClient } from '@/lib/supabase/client'
import type { ChatMessage, ChatConversation } from './types'

/**
 * Get conversation messages (client-side)
 */
export async function getConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('chat_messages') as any)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get user conversations (client-side)
 */
export async function getUserConversations(
  userId: string,
  limit: number = 10
): Promise<ChatConversation[]> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('chat_conversations') as any)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Create a new conversation (client-side)
 */
export async function createConversation(
  userId: string,
  pageContext?: string
): Promise<string> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('chat_conversations') as any)
    .insert({
      user_id: userId,
      page_context: pageContext,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/**
 * Delete a conversation (client-side)
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await (supabase
    .from('chat_conversations') as any)
    .delete()
    .eq('id', conversationId)

  if (error) throw error
}
