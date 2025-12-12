/**
 * useAlmanacChat Hook
 *
 * Custom hook for chat functionality with Mother's Almanac enhancements
 */

'use client'

// Temporarily disabled due to Turbopack build issue
// import { useChat as useVercelChat } from 'ai/react'
// Using placeholder for now
interface PlaceholderMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}
const useVercelChat = (config?: any) => ({
  messages: [] as PlaceholderMessage[],
  input: '',
  handleInputChange: (e: any) => {},
  handleSubmit: (e: any) => {},
  isLoading: false,
  error: null as Error | null,
  reload: () => {},
  setInput: (value: string) => {},
  setMessages: (messages: PlaceholderMessage[]) => {},
})

import { toast } from 'sonner'

export interface UseAlmanacChatOptions {
  conversationId?: string
  pageContext?: string
  pageTitle?: string
  onNewConversation?: (conversationId: string) => void
}

/**
 * Enhanced chat hook with Mother's Almanac specific features
 */
export function useAlmanacChat(options: UseAlmanacChatOptions = {}) {
  const { conversationId, pageContext, pageTitle, onNewConversation } = options

  const chat = useVercelChat({
    api: '/api/chat',
    body: {
      conversationId,
      pageContext,
      pageTitle,
    },
    onResponse: (response: Response) => {
      // Extract conversation ID from headers if this is a new conversation
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && !conversationId && onNewConversation) {
        onNewConversation(convId)
      }
    },
    onError: (error: Error) => {
      toast.error('Chat Error', {
        description: error.message || 'Failed to send message',
      })
    },
    onFinish: (message: any) => {
      // Could track analytics here
      console.log('[Chat] Message completed:', message.id)
    },
  })

  return {
    ...chat,
    // Add custom helpers
    clearChat: () => {
      chat.setMessages([])
    },
    hasMessages: chat.messages.length > 0,
    lastAssistantMessage: chat.messages
      .filter((m) => m.role === 'assistant')
      .pop(),
  }
}

/**
 * Type exports for convenience
 */
// Temporarily disabled due to Turbopack build issue
// export type { Message } from 'ai/react'
export type Message = PlaceholderMessage
