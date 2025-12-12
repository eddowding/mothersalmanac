/**
 * Token estimation utilities for RAG context management
 *
 * These are rough estimations since we don't have access to the actual tokenizer.
 * OpenAI's general rule: ~4 characters per token for English text
 */

/**
 * Estimate token count for a given text
 * Uses the rough approximation of 4 characters per token
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // More accurate estimation accounting for:
  // - Whitespace (counts as tokens)
  // - Punctuation (often separate tokens)
  // - Average English word length (~4.7 chars)

  // Conservative estimate: 3.5 chars per token
  return Math.ceil(text.length / 3.5)
}

/**
 * Truncate text to fit within a token limit
 * Attempts to truncate at sentence boundaries when possible
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum number of tokens
 * @returns Truncated text
 */
export function truncateToTokens(
  text: string,
  maxTokens: number
): string {
  if (!text) return ''

  const estimatedTokens = estimateTokens(text)

  // If already within limit, return as-is
  if (estimatedTokens <= maxTokens) {
    return text
  }

  // Calculate approximate character limit
  const targetChars = Math.floor(maxTokens * 3.5)

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, targetChars)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentenceEnd > targetChars * 0.8) {
    // If we found a sentence boundary in the last 20%, use it
    return truncated.substring(0, lastSentenceEnd + 1)
  }

  // Otherwise, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...'
  }

  // Fallback: hard truncate
  return truncated + '...'
}

/**
 * Calculate total tokens across multiple text chunks
 *
 * @param texts - Array of text strings
 * @returns Total estimated token count
 */
export function calculateTotalTokens(texts: string[]): number {
  return texts.reduce((total, text) => total + estimateTokens(text), 0)
}

/**
 * Fit as many text chunks as possible within a token budget
 * Returns the chunks that fit and the total tokens used
 *
 * @param chunks - Array of text chunks (ordered by priority)
 * @param maxTokens - Maximum total tokens
 * @returns Object with fitting chunks and token count
 */
export function fitChunksToTokenBudget(
  chunks: string[],
  maxTokens: number
): {
  chunks: string[]
  totalTokens: number
  truncated: boolean
} {
  const fittingChunks: string[] = []
  let totalTokens = 0

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk)

    if (totalTokens + chunkTokens <= maxTokens) {
      fittingChunks.push(chunk)
      totalTokens += chunkTokens
    } else {
      // Check if we can fit a truncated version
      const remainingTokens = maxTokens - totalTokens
      if (remainingTokens > 100) { // Only truncate if we have meaningful space
        const truncated = truncateToTokens(chunk, remainingTokens)
        fittingChunks.push(truncated)
        totalTokens += estimateTokens(truncated)
      }
      break
    }
  }

  return {
    chunks: fittingChunks,
    totalTokens,
    truncated: fittingChunks.length < chunks.length
  }
}

/**
 * Estimate tokens for a formatted context string with sources
 * Accounts for formatting overhead
 *
 * @param contentTokens - Estimated tokens in the content
 * @param sourceCount - Number of sources cited
 * @returns Total estimated tokens including formatting
 */
export function estimateFormattedContextTokens(
  contentTokens: number,
  sourceCount: number
): number {
  // Add overhead for:
  // - Context header (~20 tokens)
  // - Source citations (~30 tokens per source)
  // - Formatting markers (~10 tokens)
  const overhead = 30 + (sourceCount * 30)
  return contentTokens + overhead
}

/**
 * Calculate optimal chunk size for a given context window
 * Leaves room for the prompt, user query, and model response
 *
 * @param contextWindow - Total context window size (e.g., 200k for Claude)
 * @param promptTokens - Estimated tokens in system prompt
 * @param queryTokens - Estimated tokens in user query
 * @param responseTokens - Expected tokens in model response
 * @returns Maximum tokens available for RAG context
 */
export function calculateAvailableContextTokens(
  contextWindow: number,
  promptTokens: number = 1000,
  queryTokens: number = 500,
  responseTokens: number = 4000
): number {
  // Reserve some buffer for safety
  const buffer = Math.floor(contextWindow * 0.05) // 5% buffer
  const reserved = promptTokens + queryTokens + responseTokens + buffer

  return Math.max(0, contextWindow - reserved)
}

/**
 * Estimate tokens in a structured object (for metadata, etc.)
 *
 * @param obj - Object to estimate tokens for
 * @returns Estimated token count
 */
export function estimateObjectTokens(obj: unknown): number {
  try {
    const jsonString = JSON.stringify(obj)
    return estimateTokens(jsonString)
  } catch {
    return 0
  }
}
