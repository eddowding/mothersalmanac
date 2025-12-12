/**
 * Wiki Utilities
 *
 * Helper functions for wiki page generation, including slug generation,
 * title extraction, and text processing.
 */

/**
 * Convert a query or title to a URL-friendly slug
 *
 * @param text - Text to convert to slug
 * @returns URL-safe slug
 */
export function queryToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special chars with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Convert slug back to readable title
 *
 * @param slug - URL slug
 * @returns Human-readable title
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Extract title from markdown content
 * Looks for first # heading or returns fallback
 *
 * @param markdown - Markdown content
 * @param fallback - Fallback title if none found
 * @returns Extracted title
 */
export function extractTitle(markdown: string, fallback: string): string {
  // Match first # heading (not ##, ###, etc.)
  const match = markdown.match(/^#\s+(.+)$/m)

  if (match && match[1]) {
    return match[1].trim()
  }

  return fallback
}

/**
 * Extract description/summary from markdown content
 * Returns first paragraph after the title
 *
 * @param markdown - Markdown content
 * @param maxLength - Maximum length in characters
 * @returns Description text
 */
export function extractDescription(
  markdown: string,
  maxLength: number = 200
): string {
  // Remove title if present
  const withoutTitle = markdown.replace(/^#\s+.+$/m, '').trim()

  // Get first paragraph
  const firstParagraph = withoutTitle.split(/\n\n/)[0]

  if (!firstParagraph) {
    return ''
  }

  // Clean markdown formatting
  const cleaned = firstParagraph
    .replace(/[#*_`[\]]/g, '') // Remove markdown syntax
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim()

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  // Truncate at word boundary
  const truncated = cleaned.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  return truncated.substring(0, lastSpace) + '...'
}

/**
 * Validate that query is suitable for wiki generation
 *
 * @param query - User query
 * @returns Validation result
 */
export function validateQuery(query: string): {
  valid: boolean
  error?: string
  normalized?: string
} {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' }
  }

  const normalized = query.trim()

  if (normalized.length === 0) {
    return { valid: false, error: 'Query cannot be empty' }
  }

  if (normalized.length < 3) {
    return { valid: false, error: 'Query must be at least 3 characters' }
  }

  if (normalized.length > 200) {
    return { valid: false, error: 'Query must be less than 200 characters' }
  }

  // Check for invalid characters (very permissive)
  if (!/^[\w\s\-.,!?()'"]+$/i.test(normalized)) {
    return {
      valid: false,
      error: 'Query contains invalid characters'
    }
  }

  return { valid: true, normalized }
}

/**
 * Sanitize user input for safe storage and display
 *
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 1000)   // Limit length
}

/**
 * Format date for display
 *
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Calculate reading time estimate for content
 *
 * @param content - Text content
 * @param wordsPerMinute - Average reading speed (default 200)
 * @returns Reading time in minutes
 */
export function estimateReadingTime(
  content: string,
  wordsPerMinute: number = 200
): number {
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Generate SEO-friendly meta description
 *
 * @param content - Article content
 * @param maxLength - Maximum length (default 160 for SEO)
 * @returns Meta description
 */
export function generateMetaDescription(
  content: string,
  maxLength: number = 160
): string {
  return extractDescription(content, maxLength)
}

/**
 * Check if query is likely to have good results
 * Uses heuristics to predict search success
 *
 * @param query - Search query
 * @returns Prediction with confidence
 */
export function predictSearchSuccess(query: string): {
  likely: boolean
  confidence: number
  reason: string
} {
  const normalized = query.toLowerCase().trim()
  const wordCount = normalized.split(/\s+/).length

  // Too vague (single common word)
  const commonWords = ['baby', 'child', 'parent', 'mom', 'dad', 'help']
  if (wordCount === 1 && commonWords.includes(normalized)) {
    return {
      likely: false,
      confidence: 0.3,
      reason: 'Query is too vague. Try being more specific.'
    }
  }

  // Very specific parenting topics (good)
  const parentingKeywords = [
    'swaddl', 'sleep', 'feed', 'diaper', 'cry', 'teething',
    'milestone', 'development', 'reflex', 'bottle', 'breast',
    'nap', 'schedule', 'routine', 'colic', 'rash'
  ]

  const hasParentingKeyword = parentingKeywords.some(keyword =>
    normalized.includes(keyword)
  )

  if (hasParentingKeyword && wordCount >= 2) {
    return {
      likely: true,
      confidence: 0.9,
      reason: 'Specific parenting topic with good coverage expected.'
    }
  }

  // Medium specificity
  if (wordCount >= 2 && wordCount <= 6) {
    return {
      likely: true,
      confidence: 0.7,
      reason: 'Moderate specificity, should find relevant content.'
    }
  }

  // Too long/complex
  if (wordCount > 10) {
    return {
      likely: false,
      confidence: 0.5,
      reason: 'Query is very long. Try simplifying to key concepts.'
    }
  }

  // Default case
  return {
    likely: true,
    confidence: 0.6,
    reason: 'Query seems reasonable.'
  }
}

/**
 * Suggest related queries based on input
 *
 * @param query - Original query
 * @returns Array of suggested related queries
 */
export function suggestRelatedQueries(query: string): string[] {
  const normalized = query.toLowerCase().trim()
  const suggestions: string[] = []

  // Add age-specific variants
  if (!normalized.includes('newborn') && !normalized.includes('infant')) {
    suggestions.push(`${query} for newborns`)
    suggestions.push(`${query} for infants`)
  }

  // Add how-to variant
  if (!normalized.startsWith('how')) {
    suggestions.push(`how to ${query}`)
  }

  // Add safety variant
  if (!normalized.includes('safe')) {
    suggestions.push(`${query} safety`)
  }

  // Add common questions
  if (!normalized.includes('when')) {
    suggestions.push(`when to ${query}`)
  }

  return suggestions.slice(0, 5) // Return top 5
}
