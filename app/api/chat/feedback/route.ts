/**
 * Chat Feedback API Route
 *
 * Handles thumbs up/down feedback on chat messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

interface FeedbackRequest {
  conversationId: string
  messageId: string
  isPositive: boolean
}

/**
 * POST /api/chat/feedback
 * Record user feedback on a message
 */
export async function POST(req: NextRequest) {
  try {
    const body: FeedbackRequest = await req.json()
    const { conversationId, messageId, isPositive } = body

    if (!conversationId || !messageId || typeof isPositive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Record feedback event
    const { error } = await supabase
      .from('chat_analytics')
      .insert({
        conversation_id: conversationId,
        message_id: messageId,
        event_type: isPositive ? 'feedback_positive' : 'feedback_negative',
      } as any)

    if (error) {
      console.error('[Feedback API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
