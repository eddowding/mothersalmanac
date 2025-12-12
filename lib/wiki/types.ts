/**
 * Core types for the Mother's Almanac wiki system
 */

export type EntityType = 'concept' | 'age-range' | 'symptom' | 'technique' | 'product'

export type EntityConfidence = 'strong' | 'medium' | 'weak' | 'ghost'

export type LinkConfidence = 'strong' | 'weak' | 'ghost'

export interface Entity {
  text: string              // "teething"
  normalizedSlug: string    // "teething"
  type: EntityType
  confidence: EntityConfidence
  context: string           // Surrounding sentence
  startIndex: number
  endIndex: number
}

export interface LinkCandidate {
  id: string
  entity: string
  normalizedSlug: string
  confidence: LinkConfidence
  mentionedCount: number
  pageExists: boolean
  firstSeenAt: string
  lastSeenAt: string
}

export interface PageConnection {
  fromSlug: string
  toSlug: string
  linkText: string
  strength: number // 0-1 based on confidence
}

export interface RelatedPage {
  slug: string
  title: string
  strength: number
}

export interface WikiPageMetadata {
  generated_at?: string
  model?: string
  entity_links?: Array<{
    entity: string
    slug: string
    confidence: EntityConfidence
  }>
}

export interface WikiPageGeneration {
  title: string
  slug: string
  content: string
  summary?: string
  metadata?: WikiPageMetadata
  confidence_score?: number
  sources_used?: string[]
  generation_time_ms?: number
  token_usage?: {
    input: number
    output: number
    cost: number
  }
}

/**
 * Request to Claude for page generation
 */
export interface ClaudePageRequest {
  topic: string
  context: string
  sources: SourceReference[]
}

/**
 * Response from Claude page generation
 */
export interface ClaudePageResponse {
  title: string
  content: string
  sections: string[]
  citations: number
}

/**
 * Source reference for attribution
 */
export interface SourceReference {
  index: number
  title: string
  author?: string
  source_type: string
  excerpt: string
  similarity: number
}

/**
 * Factors for calculating confidence score
 */
export interface ConfidenceFactors {
  sourceCount: number        // How many source documents
  avgSimilarity: number      // Avg similarity score
  contentLength: number      // Generated content length
  citationCount: number      // Number of citations used
  topicCoverage: number      // % of query terms covered
}

/**
 * Confidence badge display information
 */
export interface ConfidenceBadge {
  label: string
  color: string
  description: string
}

/**
 * Generation options
 */
export interface GenerationOptions {
  maxTokens?: number         // Max context tokens
  threshold?: number         // Similarity threshold
  maxSources?: number        // Max sources to use
  temperature?: number       // Claude temperature
}

/**
 * Convert a query string to a normalized slug
 */
export function queryToSlug(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
}

/**
 * Convert a slug back to a readable title
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
