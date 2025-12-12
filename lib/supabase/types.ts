export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
      }
      wiki_pages: {
        Row: {
          id: string
          slug: string
          title: string
          content: string
          excerpt: string | null
          confidence_score: number
          generated_at: string
          ttl_expires_at: string
          metadata: {
            sources_used?: string[]
            entity_links?: Array<{entity: string, slug: string, confidence: string}>
            reading_mode?: string
            [key: string]: unknown
          }
          view_count: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content: string
          excerpt?: string | null
          confidence_score?: number
          generated_at?: string
          ttl_expires_at?: string
          metadata?: {
            sources_used?: string[]
            entity_links?: Array<{entity: string, slug: string, confidence: string}>
            reading_mode?: string
            [key: string]: unknown
          }
          view_count?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content?: string
          excerpt?: string | null
          confidence_score?: number
          generated_at?: string
          ttl_expires_at?: string
          metadata?: {
            sources_used?: string[]
            entity_links?: Array<{entity: string, slug: string, confidence: string}>
            reading_mode?: string
            [key: string]: unknown
          }
          view_count?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
