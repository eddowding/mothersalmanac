/**
 * Context assembly library for RAG system
 *
 * Handles deduplication, ranking, and formatting of search results
 * into context strings suitable for LLM prompts.
 */

import type { SearchResult } from './search'
import { estimateTokens, fitChunksToTokenBudget } from './tokens'

/**
 * Context chunk with source information
 */
export interface ContextChunk {
  content: string
  source: string
  similarity: number
}

/**
 * Assembled context ready for LLM prompt
 */
export interface AssembledContext {
  context: string
  sources: string[]
  tokensUsed: number
  chunksUsed: number
  truncated: boolean
}

/**
 * Remove duplicate or highly similar chunks from search results
 *
 * Uses content similarity to detect duplicates. This is important because
 * vector search might return overlapping chunks or the same content from
 * different documents.
 *
 * @param chunks - Search results to deduplicate
 * @param similarityThreshold - Threshold for considering chunks as duplicates (0-1)
 * @returns Deduplicated chunks
 */
export function deduplicateChunks(
  chunks: SearchResult[],
  similarityThreshold: number = 0.95
): SearchResult[] {
  if (chunks.length === 0) return []

  const deduplicated: SearchResult[] = []
  const seen = new Set<string>()

  for (const chunk of chunks) {
    // Exact content match
    const contentHash = chunk.content.trim().toLowerCase()
    if (seen.has(contentHash)) {
      continue
    }

    // Check for high similarity to already included chunks
    const isDuplicate = deduplicated.some(existing => {
      const similarity = calculateTextSimilarity(
        chunk.content,
        existing.content
      )
      return similarity > similarityThreshold
    })

    if (!isDuplicate) {
      deduplicated.push(chunk)
      seen.add(contentHash)
    }
  }

  return deduplicated
}

/**
 * Calculate simple Jaccard similarity between two texts
 * Used for duplicate detection
 *
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity score (0-1)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))

  const words1Array = Array.from(words1)
  const intersection = new Set(words1Array.filter(x => words2.has(x)))

  const union = new Set<string>()
  words1.forEach(w => union.add(w))
  words2.forEach(w => union.add(w))

  return intersection.size / union.size
}

/**
 * Rank chunks by relevance and diversity
 *
 * Balances similarity scores with diversity across source documents
 * to provide more comprehensive context.
 *
 * @param chunks - Search results to rank
 * @param query - Original search query (for additional relevance signals)
 * @returns Ranked chunks
 */
export function rankChunks(
  chunks: SearchResult[],
  query: string
): SearchResult[] {
  if (chunks.length === 0) return []

  // Calculate diversity bonus for each chunk
  const documentCounts = new Map<string, number>()

  return chunks
    .map(chunk => {
      // Count how many chunks from this document we've seen
      const docCount = documentCounts.get(chunk.document_id) || 0
      documentCounts.set(chunk.document_id, docCount + 1)

      // Diversity penalty: reduce score for documents already represented
      const diversityPenalty = docCount * 0.05

      // Query term bonus: boost chunks that contain exact query terms
      const queryTerms = query.toLowerCase().split(/\s+/)
      const chunkText = chunk.content.toLowerCase()
      const matchingTerms = queryTerms.filter(term =>
        term.length > 3 && chunkText.includes(term)
      )
      const queryBonus = matchingTerms.length * 0.02

      // Calculate final score
      const finalScore = chunk.similarity - diversityPenalty + queryBonus

      return { chunk, finalScore }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .map(({ chunk }) => chunk)
}

/**
 * Group chunks by source document
 *
 * @param chunks - Search results to group
 * @returns Map of document ID to chunks
 */
export function groupChunksByDocument(
  chunks: SearchResult[]
): Map<string, SearchResult[]> {
  const grouped = new Map<string, SearchResult[]>()

  for (const chunk of chunks) {
    const existing = grouped.get(chunk.document_id) || []
    grouped.set(chunk.document_id, [...existing, chunk])
  }

  return grouped
}

/**
 * Build a context string from search results with deduplication and token limiting
 *
 * @param results - Search results to assemble
 * @param maxTokens - Maximum tokens for the context (default 6000)
 * @param query - Optional query for better ranking
 * @returns Assembled context with metadata
 */
export function assembleContext(
  results: SearchResult[],
  maxTokens: number = 6000,
  query?: string
): AssembledContext {
  if (results.length === 0) {
    return {
      context: '',
      sources: [],
      tokensUsed: 0,
      chunksUsed: 0,
      truncated: false,
    }
  }

  // Step 1: Deduplicate chunks
  let chunks = deduplicateChunks(results)

  // Step 2: Rank by relevance and diversity
  if (query) {
    chunks = rankChunks(chunks, query)
  }

  // Step 3: Extract content and sources
  const chunkContents = chunks.map(chunk => chunk.content)
  const sources = new Set<string>()

  chunks.forEach(chunk => {
    if (chunk.document_title) {
      const source = chunk.document_author
        ? `${chunk.document_title} by ${chunk.document_author}`
        : chunk.document_title
      sources.add(source)
    }
  })

  // Step 4: Fit chunks to token budget
  const { chunks: fittingChunks, totalTokens, truncated } = fitChunksToTokenBudget(
    chunkContents,
    maxTokens
  )

  // Step 5: Build context string
  const context = fittingChunks.join('\n\n---\n\n')

  return {
    context,
    sources: Array.from(sources),
    tokensUsed: totalTokens,
    chunksUsed: fittingChunks.length,
    truncated,
  }
}

/**
 * Format context for Claude prompt
 * Wraps context with appropriate XML tags and source citations
 *
 * @param context - The assembled context text
 * @param sources - List of source documents
 * @returns Formatted context string ready for LLM prompt
 */
export function formatContextForPrompt(
  context: string,
  sources: string[]
): string {
  if (!context) {
    return ''
  }

  const sourcesSection = sources.length > 0
    ? `\n\nSources:\n${sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : ''

  return `<context>
${context}
</context>${sourcesSection}`
}

/**
 * Get relevant context for RAG (combines search, dedup, and formatting)
 * This is the main function to use for RAG workflows
 *
 * @param query - Search query
 * @param searchResults - Results from vector/hybrid search
 * @param maxTokens - Maximum tokens for context
 * @returns Formatted context string ready for prompt
 */
export function getRelevantContext(
  query: string,
  searchResults: SearchResult[],
  maxTokens: number = 6000
): string {
  const assembled = assembleContext(searchResults, maxTokens, query)
  return formatContextForPrompt(assembled.context, assembled.sources)
}

/**
 * Create a summarized context by selecting representative chunks
 * Useful when you need diverse coverage rather than dense similarity
 *
 * @param results - Search results
 * @param maxChunks - Maximum number of chunks to include
 * @returns Array of diverse chunks
 */
export function selectDiverseChunks(
  results: SearchResult[],
  maxChunks: number = 5
): SearchResult[] {
  if (results.length <= maxChunks) {
    return results
  }

  const selected: SearchResult[] = []
  const seenDocuments = new Set<string>()

  // First pass: select one chunk per document (up to maxChunks)
  for (const result of results) {
    if (selected.length >= maxChunks) break

    if (!seenDocuments.has(result.document_id)) {
      selected.push(result)
      seenDocuments.add(result.document_id)
    }
  }

  // Second pass: fill remaining slots with highest similarity
  if (selected.length < maxChunks) {
    const remaining = results.filter(r => !selected.includes(r))
    const sorted = remaining.sort((a, b) => b.similarity - a.similarity)
    selected.push(...sorted.slice(0, maxChunks - selected.length))
  }

  return selected
}

/**
 * Analyze context quality metrics
 * Useful for debugging and optimization
 *
 * @param results - Search results
 * @returns Quality metrics
 */
export function analyzeContextQuality(results: SearchResult[]): {
  avgSimilarity: number
  minSimilarity: number
  maxSimilarity: number
  uniqueDocuments: number
  totalChunks: number
  estimatedTokens: number
} {
  if (results.length === 0) {
    return {
      avgSimilarity: 0,
      minSimilarity: 0,
      maxSimilarity: 0,
      uniqueDocuments: 0,
      totalChunks: 0,
      estimatedTokens: 0,
    }
  }

  const similarities = results.map(r => r.similarity)
  const uniqueDocuments = new Set(results.map(r => r.document_id)).size
  const totalContent = results.map(r => r.content).join('\n\n')

  return {
    avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
    minSimilarity: Math.min(...similarities),
    maxSimilarity: Math.max(...similarities),
    uniqueDocuments,
    totalChunks: results.length,
    estimatedTokens: estimateTokens(totalContent),
  }
}
