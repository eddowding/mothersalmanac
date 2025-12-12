/**
 * Chat Integration Examples
 *
 * Copy these examples to integrate the chat interface into your app
 */

// ============================================================================
// Example 1: Add Floating Chat Widget to Root Layout
// ============================================================================
// File: app/layout.tsx

import { ChatWidget } from '@/components/chat'
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Add floating chat widget */}
        <ChatWidget />

        {/* Toast notifications (required for error messages) */}
        <Toaster />
      </body>
    </html>
  )
}

// ============================================================================
// Example 2: Context-Aware Chat on Wiki Pages
// ============================================================================
// File: app/wiki/[slug]/page.tsx

import { ChatWidget } from '@/components/chat'
import ReactMarkdown from 'react-markdown'

export default async function WikiPage({
  params,
}: {
  params: { slug: string }
}) {
  // Fetch wiki page data
  const page = await getWikiPage(params.slug)

  return (
    <div>
      {/* Wiki content - using ReactMarkdown for safe rendering */}
      <article>
        <h1>{page.title}</h1>
        <ReactMarkdown>{page.content}</ReactMarkdown>
      </article>

      {/* Context-aware chat widget */}
      <ChatWidget
        pageContext={`/wiki/${params.slug}`}
        pageTitle={page.title}
      />
    </div>
  )
}

// ============================================================================
// Example 3: Inline Chat in a Dedicated Chat Page
// ============================================================================
// File: app/chat/page.tsx

import { InlineChat } from '@/components/chat'

export default function ChatPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">
        Chat with Mother's Almanac
      </h1>

      {/* Inline chat (embedded, not floating) */}
      <InlineChat className="h-[700px] border rounded-lg" />
    </div>
  )
}

// ============================================================================
// Example 4: Custom Chat Interface with Hook
// ============================================================================
// File: components/CustomChat.tsx

'use client'

import { useAlmanacChat } from '@/lib/chat/useChat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CustomChat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useAlmanacChat({
    pageContext: '/custom-page',
    pageTitle: 'Custom Page',
  })

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div className="text-destructive text-sm">{error.message}</div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}

// ============================================================================
// Example 5: Server-Side Conversation Loading
// ============================================================================
// File: app/chat/[id]/page.tsx

import { getConversationHistory } from '@/lib/chat'
import { InlineChat } from '@/components/chat'
import { notFound } from 'next/navigation'

export default async function ConversationPage({
  params,
}: {
  params: { id: string }
}) {
  const conversation = await getConversationHistory(params.id)

  if (!conversation) {
    notFound()
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{conversation.title}</h1>
        <p className="text-sm text-muted-foreground">
          {conversation.messages?.length || 0} messages
        </p>
      </div>

      {/* Continue existing conversation */}
      <InlineChat
        pageContext={conversation.pageContext}
        pageTitle={conversation.title}
        className="h-[600px]"
      />
    </div>
  )
}

// ============================================================================
// Example 6: Programmatic Chat Control
// ============================================================================
// File: components/ChatController.tsx

'use client'

import { useState } from 'react'
import { ChatWidget } from '@/components/chat'
import { Button } from '@/components/ui/button'

export function ChatController() {
  const [chatOpen, setChatOpen] = useState(false)
  const [context, setContext] = useState<string>()

  const openChatWithContext = (pageContext: string, title: string) => {
    setContext(pageContext)
    setChatOpen(true)
  }

  return (
    <div>
      {/* Trigger buttons */}
      <div className="space-x-2">
        <Button onClick={() => openChatWithContext('/wiki/sleep', 'Sleep')}>
          Ask about Sleep
        </Button>
        <Button onClick={() => openChatWithContext('/wiki/feeding', 'Feeding')}>
          Ask about Feeding
        </Button>
      </div>

      {/* Chat widget with controlled state */}
      {chatOpen && (
        <ChatWidget
          pageContext={context}
          defaultOpen={chatOpen}
        />
      )}
    </div>
  )
}

// ============================================================================
// Example 7: Analytics Tracking
// ============================================================================
// File: lib/analytics/chat-tracker.ts

import { trackChatEvent } from '@/lib/chat'

export async function trackChatInteraction(
  conversationId: string,
  eventType: 'message_sent' | 'feedback_positive' | 'feedback_negative',
  metadata?: Record<string, any>
) {
  await trackChatEvent({
    conversationId,
    eventType,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    },
  })

  // Also send to your analytics platform
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventType, {
      conversation_id: conversationId,
      ...metadata,
    })
  }
}

// ============================================================================
// Example 8: Error Boundary for Chat
// ============================================================================
// File: components/ChatErrorBoundary.tsx

'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Chat error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Chat unavailable
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage:
// <ChatErrorBoundary>
//   <ChatWidget />
// </ChatErrorBoundary>

// ============================================================================
// Example 9: Chat with Pre-filled Message
// ============================================================================
// File: components/QuickQuestionButton.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'

export function QuickQuestionButton({
  question,
  label,
}: {
  question: string
  label: string
}) {
  const openChatWithQuestion = () => {
    // Open chat and pre-fill input
    const chatWidget = document.querySelector('[data-chat-input]') as HTMLInputElement
    if (chatWidget) {
      chatWidget.value = question
      chatWidget.focus()
    }

    // Or dispatch custom event
    window.dispatchEvent(
      new CustomEvent('open-chat', { detail: { message: question } })
    )
  }

  return (
    <Button onClick={openChatWithQuestion} variant="outline">
      <MessageCircle className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}

// ============================================================================
// Example 10: SSR-Safe Chat Component
// ============================================================================
// File: components/ChatProvider.tsx

'use client'

import dynamic from 'next/dynamic'
import { ComponentProps } from 'react'

// Dynamically import chat widget (client-only)
const ChatWidget = dynamic(
  () => import('@/components/chat').then(mod => ({ default: mod.ChatWidget })),
  {
    ssr: false,
    loading: () => null, // Or a loading skeleton
  }
)

export function ChatProvider(props: ComponentProps<typeof ChatWidget>) {
  return <ChatWidget {...props} />
}

// Usage in server component:
// import { ChatProvider } from '@/components/ChatProvider'
// <ChatProvider pageContext="/wiki/sleep" />

// ============================================================================
// TIPS
// ============================================================================

/*
1. Always wrap ChatWidget in error boundary for production
2. Use InlineChat for dedicated chat pages
3. Use ChatWidget for floating overlay
4. Add pageContext for context-aware responses
5. Track analytics to improve responses
6. Test keyboard shortcuts work
7. Verify mobile responsiveness
8. Check RLS policies in production
9. Monitor API usage and costs
10. Customize system prompts for your domain
*/
