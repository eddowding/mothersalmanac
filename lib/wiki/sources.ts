/**
 * Source attribution utilities for wiki pages
 *
 * Handles formatting and managing source references and citations.
 */

import type { SearchResult } from '../rag/search'
import type { SourceReference } from './types'

/**
 * Create source metadata from search results
 *
 * Transforms raw search results into formatted source references
 * suitable for attribution and citation.
 *
 * @param searchResults - Results from vector search
 * @returns Array of source references
 */
export function createSourceMetadata(
  searchResults: SearchResult[]
): SourceReference[] {
  return searchResults.map((result, index) => ({
    index: index + 1,
    title: result.document_title || 'Unknown Source',
    author: result.document_author,
    source_type: result.source_type || 'unknown',
    excerpt: truncateExcerpt(result.content, 200),
    similarity: result.similarity,
  }))
}

/**
 * Truncate text to a maximum length for excerpts
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum character length
 * @returns Truncated text with ellipsis if needed
 */
function truncateExcerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, maxLength)
  const lastSentence = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentence > maxLength * 0.7) {
    return truncated.substring(0, lastSentence + 1)
  }

  // Otherwise truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * Format source references for display in page footer
 *
 * Creates a readable list of sources that can be displayed at the
 * bottom of a wiki page.
 *
 * @param sources - Source references
 * @returns Formatted source list as markdown
 */
export function formatSourceReferences(
  sources: SourceReference[]
): string {
  if (sources.length === 0) {
    return ''
  }

  const formatted = sources.map(s => {
    const authorText = s.author ? ` by ${s.author}` : ''
    return `[${s.index}] ${s.title}${authorText}`
  })

  return `## Sources\n\n${formatted.join('\n')}`
}

/**
 * Deduplicate sources by document title
 *
 * Multiple chunks from the same document should only be cited once.
 *
 * @param sources - Source references (possibly with duplicates)
 * @returns Deduplicated sources with reindexed numbers
 */
export function deduplicateSources(
  sources: SourceReference[]
): SourceReference[] {
  const seen = new Map<string, SourceReference>()

  for (const source of sources) {
    const key = `${source.title}|${source.author || ''}`

    if (!seen.has(key)) {
      seen.set(key, source)
    } else {
      // Keep the one with higher similarity
      const existing = seen.get(key)!
      if (source.similarity > existing.similarity) {
        seen.set(key, source)
      }
    }
  }

  // Reindex sources
  const deduplicated = Array.from(seen.values())
  return deduplicated.map((source, index) => ({
    ...source,
    index: index + 1,
  }))
}

/**
 * Group sources by type (book, article, website, etc.)
 *
 * @param sources - Source references
 * @returns Map of source type to sources
 */
export function groupSourcesByType(
  sources: SourceReference[]
): Map<string, SourceReference[]> {
  const grouped = new Map<string, SourceReference[]>()

  for (const source of sources) {
    const type = source.source_type || 'unknown'
    const existing = grouped.get(type) || []
    grouped.set(type, [...existing, source])
  }

  return grouped
}

/**
 * Format sources grouped by type for display
 *
 * @param sources - Source references
 * @returns Formatted markdown with sources grouped by type
 */
export function formatSourcesByType(
  sources: SourceReference[]
): string {
  const grouped = groupSourcesByType(sources)
  const sections: string[] = []

  // Sort by type name
  const sortedTypes = Array.from(grouped.keys()).sort()

  for (const type of sortedTypes) {
    const typeSources = grouped.get(type)!
    const typeLabel = formatSourceTypeLabel(type)

    const formattedSources = typeSources.map(s => {
      const authorText = s.author ? ` by ${s.author}` : ''
      return `- [${s.index}] ${s.title}${authorText}`
    })

    sections.push(`### ${typeLabel}\n\n${formattedSources.join('\n')}`)
  }

  return `## Sources\n\n${sections.join('\n\n')}`
}

/**
 * Format source type for display
 *
 * @param type - Raw source type string
 * @returns Formatted label
 */
function formatSourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    book: 'Books',
    article: 'Articles',
    website: 'Websites',
    pdf: 'Documents',
    research: 'Research Papers',
    unknown: 'Other Sources',
  }

  return labels[type.toLowerCase()] || type
}

/**
 * Extract citation numbers used in content
 *
 * Finds all [1], [2], etc. citations in the markdown content
 * to determine which sources were actually referenced.
 *
 * @param content - Markdown content
 * @returns Set of citation numbers used
 */
export function extractUsedCitations(content: string): Set<number> {
  const citations = new Set<number>()
  const matches = content.matchAll(/\[(\d+)\]/g)

  for (const match of matches) {
    citations.add(parseInt(match[1], 10))
  }

  return citations
}

/**
 * Filter sources to only those actually cited
 *
 * Removes sources that weren't referenced in the content.
 *
 * @param sources - All source references
 * @param content - Generated markdown content
 * @returns Sources that are actually cited
 */
export function filterToCitedSources(
  sources: SourceReference[],
  content: string
): SourceReference[] {
  const usedCitations = extractUsedCitations(content)

  return sources
    .filter(s => usedCitations.has(s.index))
    .map((source, index) => ({
      ...source,
      index: index + 1, // Reindex to be sequential
    }))
}

/**
 * Validate that all citations in content have corresponding sources
 *
 * @param content - Markdown content
 * @param sources - Source references
 * @returns Validation result with any orphaned citations
 */
export function validateCitations(
  content: string,
  sources: SourceReference[]
): {
  valid: boolean
  orphanedCitations: number[]
  unusedSources: number[]
} {
  const usedCitations = extractUsedCitations(content)
  const availableSources = new Set(sources.map(s => s.index))

  const orphanedCitations = Array.from(usedCitations)
    .filter(num => !availableSources.has(num))
    .sort((a, b) => a - b)

  const unusedSources = sources
    .filter(s => !usedCitations.has(s.index))
    .map(s => s.index)
    .sort((a, b) => a - b)

  return {
    valid: orphanedCitations.length === 0,
    orphanedCitations,
    unusedSources,
  }
}

/**
 * Create a citation map for content replacement
 *
 * Useful when you need to renumber citations after filtering sources.
 *
 * @param oldToNew - Map of old citation numbers to new numbers
 * @param content - Original markdown content
 * @returns Updated content with renumbered citations
 */
export function renumberCitations(
  oldToNew: Map<number, number>,
  content: string
): string {
  return content.replace(/\[(\d+)\]/g, (match, num) => {
    const oldNum = parseInt(num, 10)
    const newNum = oldToNew.get(oldNum)
    return newNum !== undefined ? `[${newNum}]` : match
  })
}

/**
 * Get source diversity score
 *
 * Measures how diverse the sources are (different authors, types, etc.)
 *
 * @param sources - Source references
 * @returns Diversity score (0-1)
 */
export function calculateSourceDiversity(
  sources: SourceReference[]
): number {
  if (sources.length === 0) return 0

  const uniqueAuthors = new Set(
    sources.map(s => s.author).filter(Boolean)
  ).size

  const uniqueTypes = new Set(
    sources.map(s => s.source_type)
  ).size

  const uniqueTitles = sources.length // Each source has unique title

  // Weighted average of diversity factors
  const authorDiversity = Math.min(uniqueAuthors / 5, 1) // Ideal: 5+ authors
  const typeDiversity = Math.min(uniqueTypes / 3, 1)     // Ideal: 3+ types

  return (authorDiversity * 0.6) + (typeDiversity * 0.4)
}

/**
 * Generate source attribution text for AI context
 *
 * Creates a formatted text block describing sources that can be
 * included in prompts.
 *
 * @param sources - Source references
 * @returns Formatted attribution text
 */
export function generateAttributionContext(
  sources: SourceReference[]
): string {
  const deduplicated = deduplicateSources(sources)

  const lines = deduplicated.map(s => {
    const authorText = s.author ? ` by ${s.author}` : ''
    const similarityPercent = (s.similarity * 100).toFixed(0)
    return `[${s.index}] ${s.title}${authorText} (${similarityPercent}% relevant)\n${s.excerpt}`
  })

  return lines.join('\n\n')
}
