/**
 * Type definitions for chat functionality
 */

/**
 * Message role in a conversation
 */
export type MessageRole = 'user' | 'assistant'

/**
 * Source information from RAG retrieval
 */
export interface MessageSource {
  chunkId: string
  title: string
  content: string
  relevance: number
  documentId?: string
  url?: string
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  model?: string
  tokens?: {
    input: number
    output: number
  }
  responseTime?: number
  temperature?: number
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  sources?: MessageSource[]
  metadata?: MessageMetadata
  createdAt: Date
}

/**
 * Chat conversation structure
 */
export interface ChatConversation {
  id: string
  userId: string | null
  title: string
  pageContext?: string
  createdAt: Date
  updatedAt: Date
  messages?: ChatMessage[]
}

/**
 * Chat request payload
 */
export interface ChatRequest {
  conversationId?: string
  message: string
  pageContext?: string
  pageTitle?: string
}

/**
 * Chat response payload
 */
export interface ChatResponse {
  conversationId: string
  message: ChatMessage
}

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'message_sent'
  | 'feedback_positive'
  | 'feedback_negative'
  | 'wiki_page_created'

/**
 * Chat analytics event
 */
export interface ChatAnalyticsEvent {
  conversationId: string
  messageId?: string
  eventType: AnalyticsEventType
  metadata?: Record<string, any>
}
