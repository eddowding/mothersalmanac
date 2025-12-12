/**
 * Wiki-related type definitions
 */

export interface WikiPage {
  id: string
  slug: string
  title: string
  content: string
  excerpt?: string | null
  metadata: PageMetadata
  created_at: string
  updated_at: string
  generated_at: string
  ttl_expires_at?: string | null
  published?: boolean | null
  created_by?: string
  updated_by?: string
  view_count: number
  confidence_score: number
}

export interface PageMetadata {
  description?: string
  tags?: string[]
  category?: string
  featured_image?: string
  author?: string
  lastModifiedBy?: string
  version?: number
  status?: 'draft' | 'published' | 'archived'
  sources_used?: string[] // Document IDs
  chunk_count?: number
  generated_at?: string
  entity_links?: Array<{
    entity: string
    slug: string
  }>
  related_pages?: Array<{
    slug: string
    title: string
    strength?: number
  }>
}

export interface EntityLink {
  text: string
  slug: string
  confidence?: number
}

export interface LinkCandidate {
  text: string
  targetPage: string
  position: {
    start: number
    end: number
  }
  confidence: number
  context?: string
}

export interface WikiLink {
  id: string
  source_page_id: string
  target_page_id: string
  anchor_text: string
  created_at: string
}

export interface WikiSearchResult {
  page: WikiPage
  score: number
  highlights?: string[]
}

export interface WikiPageCreateInput {
  slug: string
  title: string
  content: string
  metadata?: Partial<PageMetadata>
}

export interface WikiPageUpdateInput {
  title?: string
  content?: string
  metadata?: Partial<PageMetadata>
}

// =====================================================
// DOCUMENT TYPES
// =====================================================

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type SourceType = 'book' | 'article' | 'pdf' | 'website' | 'other'

export interface Document {
  id: string
  title: string
  author: string | null
  source_type: SourceType
  file_path: string | null
  file_size: number | null
  upload_date: string
  uploaded_by: string | null
  processed_status: DocumentStatus
  processed_at: string | null
  metadata: Record<string, any>
  chunk_count: number
  created_at: string
  updated_at: string
}

export interface DocumentCreateInput {
  title: string
  author?: string | null
  source_type: SourceType
  file_path: string
  file_size: number
  metadata?: Record<string, any>
}

export interface DocumentUpdateInput {
  title?: string
  author?: string | null
  source_type?: SourceType
  processed_status?: DocumentStatus
  processed_at?: string | null
  metadata?: Record<string, any>
}

export interface DocumentChunk {
  id: string
  document_id: string
  content: string
  chunk_index: number
  embedding: number[] | null
  metadata: Record<string, any>
  created_at: string
}
