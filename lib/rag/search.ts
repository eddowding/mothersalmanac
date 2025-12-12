/**
 * Vector search library for Mother's Almanac RAG system
 *
 * Provides functions for searching document chunks using vector similarity
 * and hybrid (vector + keyword) search.
 */

import { createClient } from '../supabase/server'
import { generateEmbedding as generateVoyageEmbedding } from './embeddings'

/**
 * Metadata stored with each chunk
 */
export interface ChunkMetadata {
  chunk_index?: number
  section_title?: string
  page_number?: number
  [key: string]: unknown
}

/**
 * Search result from vector/hybrid search
 */
export interface SearchResult {
  chunk_id: string
  document_id: string
  content: string
  metadata: ChunkMetadata
  similarity: number
  document_title?: string
  document_author?: string
  source_type?: string
}

/**
 * Options for configuring search behavior
 */
export interface SearchOptions {
  threshold?: number       // Minimum similarity score (0.0-1.0), default 0.7
  limit?: number          // Maximum results to return, default 10
  documentIds?: string[]  // Filter by specific document IDs
  sourceTypes?: string[]  // Filter by source type (book, article, etc.)
}

/**
 * Result from hybrid search with additional relevance metrics
 */
export interface HybridSearchResult extends SearchResult {
  relevance: number       // Full-text search relevance
  combined_score: number  // Weighted combination of similarity + relevance
}

/**
 * Generate embeddings for a query using Voyage AI (via Anthropic)
 *
 * @param query - Text to generate embeddings for
 * @returns Embedding vector
 */
async function generateEmbedding(query: string): Promise<number[]> {
  const result = await generateVoyageEmbedding(query)
  return result.embedding
}

/**
 * Perform vector similarity search on document chunks
 *
 * Uses cosine similarity to find chunks most semantically similar to the query.
 *
 * @param query - Search query text
 * @param options - Search configuration options
 * @returns Array of search results ordered by similarity
 */
export async function vectorSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    threshold = 0.7,
    limit = 10,
    documentIds,
    sourceTypes,
  } = options

  if (!query.trim()) {
    return []
  }

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)

  // Call Supabase RPC function for vector search
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('search_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('Vector search error:', error)
    throw new Error(`Vector search failed: ${error.message}`)
  }

  // Map results to SearchResult interface
  return (data || []).map((row: any) => ({
    chunk_id: row.id,
    document_id: row.document_id,
    content: row.content,
    metadata: row.metadata || {},
    similarity: row.similarity,
    document_title: undefined,
    document_author: undefined,
    source_type: undefined,
  }))
}

/**
 * Perform hybrid search combining vector similarity and full-text search
 *
 * This can be more effective than pure vector search for exact phrase matching
 * or keyword-heavy queries.
 *
 * @param query - Search query text
 * @param options - Search configuration options
 * @returns Array of hybrid search results ordered by combined score
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<HybridSearchResult[]> {
  const {
    threshold = 0.7,
    limit = 10,
  } = options

  if (!query.trim()) {
    return []
  }

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)

  // Call Supabase RPC function for hybrid search
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('hybrid_search', {
    query_text: query,
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('Hybrid search error:', error)
    throw new Error(`Hybrid search failed: ${error.message}`)
  }

  // Map results to HybridSearchResult interface
  return (data || []).map((row: any) => ({
    chunk_id: row.chunk_id,
    document_id: row.document_id,
    content: row.content,
    metadata: row.metadata || {},
    similarity: row.similarity,
    relevance: row.relevance,
    combined_score: row.combined_score,
    document_title: row.document_title,
  }))
}

/**
 * Find chunks similar to a given chunk
 * Useful for "related content" features
 *
 * @param chunkId - ID of the source chunk
 * @param threshold - Minimum similarity (default 0.8)
 * @param limit - Maximum results (default 5)
 * @returns Array of similar chunks
 */
export async function findSimilarChunks(
  chunkId: string,
  threshold: number = 0.8,
  limit: number = 5
): Promise<SearchResult[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('find_similar_chunks', {
    source_chunk_id: chunkId,
    similarity_threshold: threshold,
    limit_count: limit,
  })

  if (error) {
    console.error('Similar chunks search error:', error)
    throw new Error(`Similar chunks search failed: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    chunk_id: row.chunk_id,
    document_id: row.document_id,
    content: row.content,
    metadata: {},
    similarity: row.similarity,
    document_title: row.document_title,
  }))
}

/**
 * Get document coverage statistics for search results
 * Shows how much of each source document is represented in results
 *
 * @param chunkIds - Array of chunk IDs from search results
 * @returns Coverage statistics per document
 */
export async function getDocumentCoverage(
  chunkIds: string[]
): Promise<Array<{
  document_id: string
  document_title: string
  chunk_count: number
  total_chunks: number
  coverage_percent: number
}>> {
  if (chunkIds.length === 0) {
    return []
  }

  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('get_document_coverage', {
    chunk_ids: chunkIds,
  })

  if (error) {
    console.error('Document coverage error:', error)
    throw new Error(`Document coverage failed: ${error.message}`)
  }

  return data || []
}

/**
 * Search with automatic strategy selection
 * Uses hybrid search for keyword-heavy queries, vector search otherwise
 *
 * @param query - Search query text
 * @param options - Search configuration options
 * @returns Array of search results
 */
export async function smartSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // Heuristic: if query has many specific terms or quotes, use hybrid
  const hasQuotes = query.includes('"')
  const wordCount = query.trim().split(/\s+/).length
  const hasSpecificTerms = wordCount > 5 || hasQuotes

  if (hasSpecificTerms) {
    return await hybridSearch(query, options)
  }

  return await vectorSearch(query, options)
}

/**
 * Batch search for multiple queries
 * Useful for generating multiple wiki pages or answering multiple questions
 *
 * @param queries - Array of search queries
 * @param options - Search configuration options
 * @returns Map of query to search results
 */
export async function batchSearch(
  queries: string[],
  options: SearchOptions = {}
): Promise<Map<string, SearchResult[]>> {
  const results = new Map<string, SearchResult[]>()

  // Execute searches in parallel
  const searchPromises = queries.map(query =>
    vectorSearch(query, options).then(result => ({ query, result }))
  )

  const searchResults = await Promise.all(searchPromises)

  searchResults.forEach(({ query, result }) => {
    results.set(query, result)
  })

  return results
}
