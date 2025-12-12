/**
 * Link Intelligence System for Mother's Almanac Wiki
 * Analyzes content to identify potential wiki links with confidence scoring
 */

import { checkPageExists } from '@/lib/wiki/link-candidates'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LinkConfidence } from '@/lib/wiki/types'

export interface LinkAnalysis {
  text: string
  slug: string
  confidence: 'strong' | 'medium' | 'weak' | 'ghost'
  pageExists: boolean
  mentionCount: number
  context?: string
}

export interface LinkStrengthData {
  mentionCount: number
  pageExists: boolean
  hasBacklinks: boolean
  contentQuality?: number
}

/**
 * Analyze content to identify potential link candidates
 * Extracts entities and evaluates their suitability as wiki links
 */
export async function analyzeLinkCandidates(
  content: string
): Promise<LinkAnalysis[]> {
  const candidates: LinkAnalysis[] = []

  // Extract potential entities from content
  const entities = extractEntities(content)

  // Analyze each entity
  for (const entity of entities) {
    const slug = normalizeToSlug(entity.text)

    // Check if page exists
    const pageExists = await checkPageExists(slug)

    // Get mention statistics
    const mentionCount = await getMentionCount(slug)

    // Calculate confidence
    const confidence = calculateLinkConfidence({
      pageExists,
      mentionCount,
      entityType: entity.type,
      contextRelevance: entity.relevance
    })

    candidates.push({
      text: entity.text,
      slug,
      confidence,
      pageExists,
      mentionCount,
      context: entity.context
    })
  }

  return candidates.sort((a, b) => {
    // Sort by confidence, then by mention count
    const confidenceOrder = { strong: 0, medium: 1, weak: 2, ghost: 3 }
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
    if (confDiff !== 0) return confDiff
    return b.mentionCount - a.mentionCount
  })
}

/**
 * Check if a wiki page exists for the given slug
 */
export async function checkWikiPageExists(slug: string): Promise<boolean> {
  return checkPageExists(slug)
}

/**
 * Get link strength data for a slug
 */
export async function getLinkStrength(slug: string): Promise<string> {
  const data = await getLinkStrengthData(slug)

  if (data.pageExists && data.contentQuality && data.contentQuality > 0.7) {
    return 'strong'
  }

  if (data.pageExists || (data.mentionCount >= 3 && data.hasBacklinks)) {
    return 'medium'
  }

  if (data.mentionCount >= 1) {
    return 'weak'
  }

  return 'ghost'
}

/**
 * Get detailed link strength data
 */
async function getLinkStrengthData(slug: string): Promise<LinkStrengthData> {
  const supabase = createAdminClient()

  // Check if page exists and get quality
  const { data: page } = await supabase
    .from('wiki_pages')
    .select('confidence_score')
    .eq('slug', slug)
    .maybeSingle()

  // Get mention count
  const { data: candidate } = await
    (supabase.from('link_candidates') as any)
    .select('mentioned_count')
    .eq('normalized_slug', slug)
    .maybeSingle()

  // Check for backlinks
  const { count: backlinkCount } = await
    (supabase.from('page_connections') as any)
    .select('*', { count: 'exact', head: true })
    .eq('to_slug', slug)

  return {
    mentionCount: (candidate as any)?.mentioned_count || 0,
    pageExists: !!page,
    hasBacklinks: (backlinkCount || 0) > 0,
    contentQuality: (page as any)?.confidence_score
  }
}

/**
 * Get mention count for a slug
 */
async function getMentionCount(slug: string): Promise<number> {
  const supabase = createAdminClient()

  const { data } = await
    (supabase.from('link_candidates') as any)
    .select('mentioned_count')
    .eq('normalized_slug', slug)
    .maybeSingle()

  return data?.mentioned_count || 0
}

/**
 * Extract potential entities from content
 */
function extractEntities(content: string): Array<{
  text: string
  type: string
  relevance: number
  context: string
}> {
  const entities: Array<{
    text: string
    type: string
    relevance: number
    context: string
  }> = []

  // Split into sentences for context
  const sentences = content.split(/[.!?]+/)

  // Patterns to identify potential wiki entities
  const patterns = [
    // Age ranges: "6-12 months", "newborns", "toddlers"
    /\b(\d+-\d+\s+(?:months?|years?|weeks?))\b/gi,
    /\b(newborns?|infants?|toddlers?|preschoolers?|teenagers?)\b/gi,

    // Medical/developmental terms (2-4 words)
    /\b([A-Z][a-z]+(?:\s+[a-z]+){1,3})\b/g,

    // Quoted concepts
    /"([^"]{3,50})"/g,

    // Common parenting topics (multi-word phrases)
    /\b(sleep\s+training|potty\s+training|separation\s+anxiety|growth\s+spurts?)\b/gi,
  ]

  sentences.forEach(sentence => {
    patterns.forEach(pattern => {
      const matches = sentence.matchAll(pattern)
      for (const match of matches) {
        const text = match[1].trim()

        // Filter out common words and short phrases
        if (text.length < 3 || isCommonWord(text)) continue

        // Determine entity type and relevance
        const { type, relevance } = classifyEntity(text)

        entities.push({
          text,
          type,
          relevance,
          context: sentence.trim()
        })
      }
    })
  })

  // Deduplicate entities
  const uniqueEntities = new Map<string, typeof entities[0]>()
  entities.forEach(entity => {
    const key = entity.text.toLowerCase()
    const existing = uniqueEntities.get(key)
    if (!existing || entity.relevance > existing.relevance) {
      uniqueEntities.set(key, entity)
    }
  })

  return Array.from(uniqueEntities.values())
}

/**
 * Classify entity type and calculate relevance
 */
function classifyEntity(text: string): { type: string; relevance: number } {
  const lower = text.toLowerCase()

  // Age-related entities (high relevance)
  if (/\d+.*(?:month|year|week)/.test(lower) ||
      /newborn|infant|toddler|preschooler/.test(lower)) {
    return { type: 'age-range', relevance: 0.9 }
  }

  // Medical symptoms (high relevance)
  if (/fever|rash|cough|pain|vomit|diarrhea/.test(lower)) {
    return { type: 'symptom', relevance: 0.85 }
  }

  // Techniques/methods (medium-high relevance)
  if (/training|method|technique|approach|strategy/.test(lower)) {
    return { type: 'technique', relevance: 0.75 }
  }

  // Products (medium relevance)
  if (/bottle|diaper|carrier|stroller|crib/.test(lower)) {
    return { type: 'product', relevance: 0.6 }
  }

  // General concepts (medium relevance)
  return { type: 'concept', relevance: 0.5 }
}

/**
 * Check if text is a common word to filter out
 */
function isCommonWord(text: string): boolean {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might',
    'can', 'must', 'this', 'that', 'these', 'those',
    'you', 'your', 'their', 'our', 'its', 'his', 'her'
  ])

  return commonWords.has(text.toLowerCase())
}

/**
 * Normalize text to a URL-safe slug
 */
function normalizeToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Calculate link confidence based on multiple factors
 */
function calculateLinkConfidence(factors: {
  pageExists: boolean
  mentionCount: number
  entityType: string
  contextRelevance: number
}): 'strong' | 'medium' | 'weak' | 'ghost' {
  const { pageExists, mentionCount, entityType, contextRelevance } = factors

  // Strong confidence: page exists with good quality
  if (pageExists && mentionCount >= 3) {
    return 'strong'
  }

  // Medium confidence: page exists OR frequently mentioned
  if (pageExists || (mentionCount >= 2 && contextRelevance > 0.7)) {
    return 'medium'
  }

  // Weak confidence: mentioned once with good context
  if (mentionCount >= 1 && contextRelevance > 0.5) {
    return 'weak'
  }

  // Ghost: mentioned but low quality
  return 'ghost'
}

/**
 * Get related links based on entity co-occurrence
 */
export async function getRelatedLinks(slug: string, limit: number = 10): Promise<LinkAnalysis[]> {
  const supabase = createAdminClient()

  // Get pages that share entities with this page
  const { data: connections } = await
    (supabase.from('page_connections') as any)
    .select(`
      to_slug,
      strength,
      link_text
    `)
    .eq('from_slug', slug)
    .order('strength', { ascending: false })
    .limit(limit * 2) // Get extra to filter

  if (!connections || connections.length === 0) {
    return []
  }

  // Analyze each connected page
  const analyses: LinkAnalysis[] = []
  for (const conn of connections) {
    const pageExists = await checkPageExists(conn.to_slug)
    const mentionCount = await getMentionCount(conn.to_slug)
    const strength = await getLinkStrength(conn.to_slug)

    analyses.push({
      text: conn.link_text,
      slug: conn.to_slug,
      confidence: strength as 'strong' | 'medium' | 'weak' | 'ghost',
      pageExists,
      mentionCount
    })
  }

  return analyses
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, limit)
}

/**
 * Find broken links (links to non-existent pages)
 */
export async function findBrokenLinks(slug: string): Promise<string[]> {
  const supabase = createAdminClient()

  const { data: connections } = await
    (supabase.from('page_connections') as any)
    .select('to_slug')
    .eq('from_slug', slug)

  if (!connections) return []

  const brokenLinks: string[] = []
  for (const conn of connections) {
    const exists = await checkPageExists(conn.to_slug)
    if (!exists) {
      brokenLinks.push(conn.to_slug)
    }
  }

  return brokenLinks
}

/**
 * Suggest pages to create based on link analysis
 */
export async function suggestPagesToCreate(limit: number = 20): Promise<LinkAnalysis[]> {
  const supabase = createAdminClient()

  // Get frequently mentioned candidates without pages
  const { data: candidates } = await
    (supabase.from('link_candidates') as any)
    .select('*')
    .eq('page_exists', false)
    .gte('mentioned_count', 2)
    .order('mentioned_count', { ascending: false })
    .limit(limit)

  if (!candidates) return []

  return candidates.map((c: any) => ({
    text: c.entity,
    slug: c.normalized_slug,
    confidence: c.confidence as 'strong' | 'medium' | 'weak' | 'ghost',
    pageExists: false,
    mentionCount: c.mentioned_count
  }))
}
