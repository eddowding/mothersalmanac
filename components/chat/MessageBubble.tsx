/**
 * MessageBubble Component
 *
 * Displays a single chat message with user/AI styling and source citations
 */

'use client'

import { cn } from '@/lib/utils'
import { MessageSource } from '@/lib/chat/types'
import { Badge } from '@/components/ui/badge'
import { Bot, User, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// import { sendMessageFeedback } from '@/lib/chat' // Server-only import removed
import { SourcesPreview } from './SourcesPreview'

export interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  sources?: MessageSource[]
  conversationId?: string
  messageId?: string
  showFeedback?: boolean
  timestamp?: Date
}

export function MessageBubble({
  role,
  content,
  sources,
  conversationId,
  messageId,
  showFeedback = true,
  timestamp,
}: MessageBubbleProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const isUser = role === 'user'

  const handleFeedback = async (isPositive: boolean) => {
    if (!conversationId || !messageId) return

    const newFeedback = isPositive ? 'positive' : 'negative'
    setFeedback(newFeedback)

    try {
      // Send feedback via API endpoint instead of direct server function
      const response = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, messageId, isPositive }),
      })
      if (!response.ok) throw new Error('Feedback failed')
    } catch (error) {
      console.error('Failed to send feedback:', error)
      setFeedback(null)
    }
  }

  return (
    <div
      className={cn(
        'flex w-full gap-3 group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-2 max-w-[80%]',
          isUser && 'items-end'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Customize markdown rendering
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 text-sm leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 last:mb-0 ml-4 list-disc space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 last:mb-0 ml-4 list-decimal space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-background/50 p-3 rounded-lg overflow-x-auto my-2">
                      {children}
                    </pre>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && sources && sources.length > 0 && (
          <SourcesPreview sources={sources} />
        )}

        {/* Timestamp and Feedback */}
        <div className="flex items-center gap-2 px-1">
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}

          {!isUser && showFeedback && conversationId && messageId && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 w-6 p-0',
                  feedback === 'positive' && 'text-green-600'
                )}
                onClick={() => handleFeedback(true)}
                disabled={feedback !== null}
                aria-label="Helpful"
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 w-6 p-0',
                  feedback === 'negative' && 'text-red-600'
                )}
                onClick={() => handleFeedback(false)}
                disabled={feedback !== null}
                aria-label="Not helpful"
              >
                <ThumbsDown className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  )
}
