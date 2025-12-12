/**
 * Chat API Route with Streaming Support
 *
 * Handles chat messages with RAG context retrieval and Claude streaming responses
 */

import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import {
  getOrCreateConversation,
  getConversationHistory,
  saveMessage,
  getRAGContext,
  buildChatHistory,
  trackChatEvent,
} from '@/lib/chat'
import { formatSystemPrompt } from '@/lib/chat/prompts'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const maxDuration = 60

interface ChatRequestBody {
  conversationId?: string
  message: string
  pageContext?: string
  pageTitle?: string
}

/**
 * POST /api/chat
 * Send a message and receive a streaming response
 */
export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json()
    const { conversationId, message, pageContext, pageTitle } = body

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get current user (optional - supports anonymous chat)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // Get or create conversation
    const activeConversationId = await getOrCreateConversation(
      conversationId,
      pageContext,
      userId
    )

    // Save user message
    await saveMessage(activeConversationId, 'user', message)

    // Track message sent event
    trackChatEvent({
      conversationId: activeConversationId,
      eventType: 'message_sent',
      metadata: { role: 'user', pageContext },
    }).catch(console.error)

    // Get conversation history
    const conversation = await getConversationHistory(activeConversationId)
    const previousMessages = conversation?.messages || []

    // Get RAG context for the user's message
    const { context: ragContext, sources } = await getRAGContext(
      message,
      pageContext
    )

    // Build chat history for Claude (exclude current message as it's already in the history)
    const chatHistory = buildChatHistory(
      previousMessages.slice(0, -1) // Exclude the message we just saved
    )

    // Add the current user message
    chatHistory.push({
      role: 'user',
      content: message,
    })

    // Format system prompt with context
    const systemPrompt = formatSystemPrompt({
      pageTitle,
      ragContext: ragContext || undefined,
    })

    // Stream response from Claude
    const result = await streamText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      messages: chatHistory,
      system: systemPrompt,
      temperature: 0.7,
      onFinish: async ({ text, usage }) => {
        try {
          // Save assistant message
          await saveMessage(
            activeConversationId,
            'assistant',
            text,
            sources.length > 0 ? sources : undefined,
            {
              model: 'claude-sonnet-4-5-20250929',
              tokens: {
                input: (usage as any).promptTokens || 0,
                output: (usage as any).completionTokens || 0,
              },
            }
          )

          // Track analytics
          trackChatEvent({
            conversationId: activeConversationId,
            eventType: 'message_sent',
            metadata: {
              role: 'assistant',
              sourcesCount: sources.length,
              tokens: ((usage as any).promptTokens || 0) + ((usage as any).completionTokens || 0),
            },
          }).catch(console.error)
        } catch (error) {
          console.error('[Chat API] Error saving assistant message:', error)
        }
      },
    })

    // Return streaming response with conversation ID in headers
    return result.toTextStreamResponse({
      headers: {
        'X-Conversation-Id': activeConversationId,
        'X-Sources-Count': sources.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Chat API] Error:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * GET /api/chat?conversationId=xxx
 * Get conversation history
 */
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId')

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const conversation = await getConversationHistory(conversationId)

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify(conversation), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Chat API] Error fetching conversation:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
