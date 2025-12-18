/**
 * Official Source Prioritization for RAG Pipeline
 *
 * Detects and boosts official health organization sources (NHS, WHO, CDC, etc.)
 * to prioritize authoritative content while maintaining quality thresholds.
 */

import type { SearchResult } from './search'

// ============================================================================
// Configuration
// ============================================================================

/** Similarity boost multiplier for official sources */
export const OFFICIAL_BOOST_FACTOR = 1.25  // 25% boost

/** Minimum similarity required for official source to receive boost */
export const MIN_OFFICIAL_SIMILARITY = 0.30

/** Maximum gap between official and best non-official before boost is applied */
export const MAX_SIMILARITY_GAP = 0.15

/** Official health organizations (case-insensitive matching) */
export const OFFICIAL_ORGS = [
  // UK
  'NHS',
  'NICE',
  'RCPCH',    // Royal College of Paediatrics and Child Health
  'RCOG',     // Royal College of Obstetricians and Gynaecologists
  'PHE',      // Public Health England
  'UKHSA',    // UK Health Security Agency
  // US
  'CDC',
  'AAP',      // American Academy of Pediatrics
  'ACOG',     // American College of Obstetricians and Gynecologists
  // International
  'WHO',
  'UNICEF',
] as const

/** Authoritative web domains for web search augmentation */
export const AUTHORITATIVE_DOMAINS = [
  'nhs.uk',
  'nice.org.uk',
  'who.int',
  'cdc.gov',
  'aap.org',
  'rcpch.ac.uk',
  'rcog.org.uk',
] as const

// ============================================================================
// Types
// ============================================================================

export interface BoostedSearchResult extends SearchResult {
  /** Whether this result is from an official source */
  is_official: boolean
  /** Original similarity before any boosting */
  original_similarity: number
  /** Whether boost was applied (may be false even for official if quality too low) */
  boosted: boolean
}

export interface OfficialSourceStats {
  /** Total number of results */
  total_count: number
  /** Number of official source results */
  official_count: number
  /** Number of book/other source results */
  non_official_count: number
  /** Ratio of official sources (0-1) */
  official_ratio: number
  /** Number of results that received a boost */
  boosted_count: number
  /** Average similarity of official sources */
  avg_official_similarity: number
  /** Average similarity of non-official sources */
  avg_non_official_similarity: number
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check if a search result is from an official health organization
 *
 * Uses multi-signal detection:
 * 1. Source type is 'article' or 'website' (not 'book')
 * 2. Author matches official organization name
 * 3. Title contains official organization name (fallback)
 *
 * @param result - Search result to check
 * @returns true if from official source
 */
export function isOfficialSource(result: SearchResult): boolean {
  const author = result.document_author?.toUpperCase() || ''
  const title = result.document_title?.toUpperCase() || ''
  const sourceType = result.source_type?.toLowerCase() || ''

  // Books are never official sources
  if (sourceType === 'book') {
    return false
  }

  // Check if author matches any official org
  for (const org of OFFICIAL_ORGS) {
    if (author.includes(org.toUpperCase())) {
      return true
    }
    // Also check title for organization name
    if (title.includes(org.toUpperCase())) {
      return true
    }
  }

  // Check source type + partial matches for common patterns
  if (sourceType === 'article' || sourceType === 'website') {
    // NHS patterns
    if (author.includes('NATIONAL HEALTH') || title.includes('NHS CHOICES')) {
      return true
    }
    // WHO patterns
    if (author.includes('WORLD HEALTH') || title.includes('WORLD HEALTH')) {
      return true
    }
  }

  return false
}

/**
 * Get the organization name for an official source
 *
 * @param result - Search result to check
 * @returns Organization name or null if not official
 */
export function getOfficialOrgName(result: SearchResult): string | null {
  if (!isOfficialSource(result)) {
    return null
  }

  const author = result.document_author?.toUpperCase() || ''
  const title = result.document_title?.toUpperCase() || ''

  for (const org of OFFICIAL_ORGS) {
    if (author.includes(org.toUpperCase()) || title.includes(org.toUpperCase())) {
      return org
    }
  }

  return 'Official'  // Generic fallback
}

// ============================================================================
// Boosting Functions
// ============================================================================

/**
 * Apply similarity boost to official sources
 *
 * Boosts official sources by OFFICIAL_BOOST_FACTOR (default 1.25x) when:
 * - They meet minimum similarity threshold (MIN_OFFICIAL_SIMILARITY)
 * - They are within MAX_SIMILARITY_GAP of the best non-official result
 *
 * @param results - Search results to process
 * @returns Results with official sources boosted
 */
export function boostOfficialSources(results: SearchResult[]): BoostedSearchResult[] {
  if (results.length === 0) {
    return []
  }

  // Find best non-official similarity for gap calculation
  const nonOfficialResults = results.filter(r => !isOfficialSource(r))
  const bestNonOfficialSim = nonOfficialResults.length > 0
    ? Math.max(...nonOfficialResults.map(r => r.similarity))
    : 0

  // Process each result
  const boostedResults: BoostedSearchResult[] = results.map(result => {
    const isOfficial = isOfficialSource(result)
    const originalSimilarity = result.similarity

    // Determine if boost should be applied
    let shouldBoost = false
    let newSimilarity = originalSimilarity

    if (isOfficial) {
      // Quality gate: must meet minimum similarity
      if (originalSimilarity >= MIN_OFFICIAL_SIMILARITY) {
        // Gap gate: must be within competitive range of best non-official
        const gap = bestNonOfficialSim - originalSimilarity
        if (gap <= MAX_SIMILARITY_GAP) {
          shouldBoost = true
          newSimilarity = Math.min(originalSimilarity * OFFICIAL_BOOST_FACTOR, 1.0)
        }
      }
    }

    return {
      ...result,
      similarity: newSimilarity,
      is_official: isOfficial,
      original_similarity: originalSimilarity,
      boosted: shouldBoost,
    }
  })

  // Re-sort by new similarity scores
  boostedResults.sort((a, b) => b.similarity - a.similarity)

  return boostedResults
}

/**
 * Calculate statistics about official source representation
 *
 * @param results - Search results (original or boosted)
 * @returns Statistics about official vs non-official sources
 */
export function analyzeOfficialStats(results: SearchResult[] | BoostedSearchResult[]): OfficialSourceStats {
  if (results.length === 0) {
    return {
      total_count: 0,
      official_count: 0,
      non_official_count: 0,
      official_ratio: 0,
      boosted_count: 0,
      avg_official_similarity: 0,
      avg_non_official_similarity: 0,
    }
  }

  const officials: SearchResult[] = []
  const nonOfficials: SearchResult[] = []
  let boostedCount = 0

  for (const result of results) {
    const isOfficial = 'is_official' in result
      ? (result as BoostedSearchResult).is_official
      : isOfficialSource(result)

    if (isOfficial) {
      officials.push(result)
    } else {
      nonOfficials.push(result)
    }

    if ('boosted' in result && (result as BoostedSearchResult).boosted) {
      boostedCount++
    }
  }

  const avgOfficial = officials.length > 0
    ? officials.reduce((sum, r) => {
        // Use original similarity for stats if available
        const sim = 'original_similarity' in r
          ? (r as BoostedSearchResult).original_similarity
          : r.similarity
        return sum + sim
      }, 0) / officials.length
    : 0

  const avgNonOfficial = nonOfficials.length > 0
    ? nonOfficials.reduce((sum, r) => sum + r.similarity, 0) / nonOfficials.length
    : 0

  return {
    total_count: results.length,
    official_count: officials.length,
    non_official_count: nonOfficials.length,
    official_ratio: officials.length / results.length,
    boosted_count: boostedCount,
    avg_official_similarity: avgOfficial,
    avg_non_official_similarity: avgNonOfficial,
  }
}

// ============================================================================
// Diversity Enforcement
// ============================================================================

/**
 * Enforce source diversity when official sources dominate
 *
 * If official sources make up more than maxOfficialRatio of results,
 * rebalance to include more non-official sources for diversity.
 *
 * @param results - Boosted search results
 * @param maxOfficialRatio - Maximum ratio of official sources (default 0.7)
 * @param maxResults - Maximum total results to return
 * @returns Rebalanced results with diversity enforced
 */
export function enforceDiversity(
  results: BoostedSearchResult[],
  maxOfficialRatio: number = 0.7,
  maxResults: number = 15
): BoostedSearchResult[] {
  if (results.length === 0) {
    return []
  }

  const stats = analyzeOfficialStats(results)

  // If within ratio, just truncate to maxResults
  if (stats.official_ratio <= maxOfficialRatio) {
    return results.slice(0, maxResults)
  }

  // Need to rebalance
  const officials = results.filter(r => r.is_official)
  const nonOfficials = results.filter(r => !r.is_official)

  // Calculate target counts
  const maxOfficial = Math.floor(maxResults * maxOfficialRatio)
  const targetNonOfficial = maxResults - maxOfficial

  // Select best from each group
  const selectedOfficials = officials.slice(0, maxOfficial)
  const selectedNonOfficials = nonOfficials.slice(0, targetNonOfficial)

  // Combine and re-sort by similarity
  const combined = [...selectedOfficials, ...selectedNonOfficials]
  combined.sort((a, b) => b.similarity - a.similarity)

  return combined.slice(0, maxResults)
}

// ============================================================================
// Web Search Augmentation
// ============================================================================

/**
 * Get authoritative search query for web augmentation
 *
 * Constructs a search query targeting authoritative health websites
 *
 * @param topic - Topic to search for
 * @param preferredDomains - Domains to prioritize (default: NHS, WHO, CDC)
 * @returns Search query string
 */
export function buildAuthoritativeSearchQuery(
  topic: string,
  preferredDomains: string[] = ['nhs.uk', 'who.int', 'cdc.gov']
): string {
  // Build site-restricted query for major health authorities
  const siteRestrictions = preferredDomains
    .map(domain => `site:${domain}`)
    .join(' OR ')

  return `(${siteRestrictions}) ${topic}`
}

/**
 * Check if web search augmentation should be used
 *
 * Recommends web search when:
 * - No official sources found in RAG results
 * - Topic appears to be medical/health-related
 *
 * @param results - RAG search results
 * @param query - Original search query
 * @returns true if web augmentation is recommended
 */
export function shouldUseWebAugmentation(
  results: SearchResult[] | BoostedSearchResult[],
  query: string
): boolean {
  const stats = analyzeOfficialStats(results)

  // No official sources from RAG
  if (stats.official_count === 0) {
    // Check if query seems medical/health-related
    const healthKeywords = [
      'fever', 'temperature', 'sick', 'ill', 'vaccine', 'vaccination', 'immunisation',
      'safe', 'safety', 'danger', 'risk', 'emergency', 'hospital', 'doctor',
      'weight', 'growth', 'development', 'milestone', 'feeding', 'breastfeeding',
      'sleep', 'SIDS', 'cry', 'rash', 'allergy', 'medicine', 'medication',
    ]

    const lowerQuery = query.toLowerCase()
    for (const keyword of healthKeywords) {
      if (lowerQuery.includes(keyword)) {
        return true
      }
    }
  }

  return false
}
