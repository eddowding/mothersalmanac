/**
 * ChatPanel Component
 *
 * Main chat interface with message history, input, and streaming
 */

'use client'

import { useState, useRef, useEffect } from 'react'
// Temporarily disabled due to Turbopack build issue
// import { useChat } from 'ai/react'
// Using placeholder for now
interface PlaceholderMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}
const useChat = (config?: any) => ({
  messages: [] as PlaceholderMessage[],
  input: '',
  handleInputChange: (e: any) => {},
  handleSubmit: (e: any) => {},
  isLoading: false,
  error: null as Error | null,
  reload: () => {},
  setInput: (value: string) => {},
})
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  X,
  Sparkles,
  FileText,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONVERSATION_STARTERS, QUICK_ACTIONS } from '@/lib/chat/prompts'
import { toast } from 'sonner'

export interface ChatPanelProps {
  conversationId?: string
  pageContext?: string
  pageTitle?: string
  onClose?: () => void
  onCreateWikiPage?: (content: string) => void
  className?: string
}

export function ChatPanel({
  conversationId: initialConversationId,
  pageContext,
  pageTitle,
  onClose,
  onCreateWikiPage,
  className,
}: ChatPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  )

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    setInput,
  } = useChat({
    api: '/api/chat',
    body: {
      conversationId,
      pageContext,
      pageTitle,
    },
    onResponse: (response: Response) => {
      // Extract conversation ID from response headers
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && !conversationId) {
        setConversationId(convId)
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to send message', {
        description: error.message,
      })
    },
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isLoading])

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
  }

  const handleCreateWikiPage = () => {
    const lastAssistantMessage = messages
      .filter((m) => m.role === 'assistant')
      .pop()

    if (lastAssistantMessage && onCreateWikiPage) {
      onCreateWikiPage(lastAssistantMessage.content)
      toast.success('Wiki page creation started')
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-l shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-sm">Ask the Almanac</h2>
            {pageTitle && (
              <p className="text-xs text-muted-foreground">
                About: {pageTitle}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Context indicator */}
      {pageContext && (
        <div className="px-4 py-2 bg-primary/5 border-b">
          <Badge variant="secondary" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Context: {pageContext}
          </Badge>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="p-4 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  Welcome to Mother's Almanac
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  I'm here to help with parenting questions, child development,
                  health, nutrition, and more. How can I assist you today?
                </p>
              </div>

              {/* Conversation starters */}
              <div className="space-y-3 w-full max-w-md">
                <p className="text-xs font-medium text-muted-foreground">
                  Try asking:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CONVERSATION_STARTERS.slice(0, 4).map((starter, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start whitespace-normal"
                      onClick={() => handleQuickAction(starter)}
                    >
                      {starter}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id || index}
                  role={message.role as 'user' | 'assistant'}
                  content={message.content}
                  conversationId={conversationId}
                  messageId={message.id}
                  timestamp={message.createdAt ? new Date(message.createdAt) : undefined}
                />
              ))}

              {isLoading && <TypingIndicator />}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <span className="text-destructive flex-1">{error.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => reload()}
                    className="h-7"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Quick actions */}
      {!isEmpty && messages.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/20">
          <div className="flex items-center gap-2 overflow-x-auto">
            {onCreateWikiPage &&
              messages.some((m) => m.role === 'assistant') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateWikiPage}
                  className="h-7 text-xs whitespace-nowrap"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Create Wiki Page
                </Button>
              )}
            {QUICK_ACTIONS.slice(0, 2).map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction(action.prompt)}
                className="h-7 text-xs whitespace-nowrap"
                disabled={isLoading}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2"
        >
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question about parenting..."
            disabled={isLoading}
            className="flex-1 resize-none"
            aria-label="Chat message input"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  )
}
