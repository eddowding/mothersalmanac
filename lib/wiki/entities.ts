/**
 * Entity Extraction for Wiki Pages
 *
 * Uses Claude to identify linkable concepts in generated content,
 * enabling automatic cross-linking within the wiki.
 */

import { generateJSON } from '@/lib/anthropic/client'
import { buildEntityExtractionPrompt } from './prompts'
import { queryToSlug } from './utils'

/**
 * Entity confidence levels
 * Determines how aggressively we link to this concept
 */
export type EntityConfidence = 'strong' | 'medium' | 'weak' | 'ghost'

/**
 * Linkable entity found in content
 */
export interface EntityLink {
  text: string              // Original text (e.g., "swaddling")
  slug: string              // URL slug (e.g., "swaddling")
  confidence: EntityConfidence
  context: string           // Surrounding text for preview
  startIndex?: number       // Position in content (optional)
  endIndex?: number         // End position (optional)
}

/**
 * Raw entity from Claude before enrichment
 */
interface RawEntity {
  text: string
  confidence: EntityConfidence
}

/**
 * Extract linkable entities from generated wiki content
 *
 * Uses Claude to identify parenting concepts, techniques, and terms
 * that should become clickable links to other wiki pages.
 *
 * @param content - Generated article content
 * @returns Array of entity links with metadata
 */
export async function extractEntities(
  content: string
): Promise<EntityLink[]> {
  if (!content || content.trim().length === 0) {
    return []
  }

  try {
    // Build prompt for entity extraction
    const prompt = buildEntityExtractionPrompt(content)

    // Use Claude to extract entities as JSON
    const rawEntities = await generateJSON<RawEntity[]>(
      prompt,
      'You are an expert at identifying parenting concepts and topics that should be linked in a wiki.',
      {
        temperature: 0,     // Deterministic extraction
        maxTokens: 2048,    // Enough for entity list
      }
    )

    if (!Array.isArray(rawEntities)) {
      console.warn('[Entity Extraction] Invalid response format, expected array')
      return []
    }

    // Enrich entities with context and position data
    const entities: EntityLink[] = []
    const seenSlugs = new Set<string>()

    for (const rawEntity of rawEntities) {
      if (!rawEntity.text || typeof rawEntity.text !== 'string') {
        continue
      }

      const slug = queryToSlug(rawEntity.text)

      // Skip duplicates (same slug)
      if (seenSlugs.has(slug)) {
        continue
      }

      // Find position in content
      const position = findEntityPosition(content, rawEntity.text)

      // Extract context (surrounding text)
      const context = extractContext(content, position.startIndex, position.endIndex)

      entities.push({
        text: rawEntity.text,
        slug,
        confidence: rawEntity.confidence || 'medium',
        context,
        startIndex: position.startIndex,
        endIndex: position.endIndex,
      })

      seenSlugs.add(slug)
    }

    // Sort by position in document
    entities.sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0))

    console.log(`[Entity Extraction] Found ${entities.length} entities`)
    return entities

  } catch (error) {
    console.error('[Entity Extraction] Failed to extract entities:', error)
    // Don't throw - entity extraction is optional, return empty array
    return []
  }
}

/**
 * Find position of entity text in content
 *
 * @param content - Full content
 * @param text - Entity text to find
 * @returns Start and end indices
 */
function findEntityPosition(
  content: string,
  text: string
): { startIndex: number; endIndex: number } {
  // Case-insensitive search
  const lowerContent = content.toLowerCase()
  const lowerText = text.toLowerCase()

  const startIndex = lowerContent.indexOf(lowerText)

  if (startIndex === -1) {
    return { startIndex: 0, endIndex: 0 }
  }

  return {
    startIndex,
    endIndex: startIndex + text.length,
  }
}

/**
 * Extract surrounding context for an entity
 *
 * @param content - Full content
 * @param startIndex - Entity start position
 * @param endIndex - Entity end position
 * @returns Context string (sentence or paragraph)
 */
function extractContext(
  content: string,
  startIndex: number,
  endIndex: number
): string {
  if (startIndex === 0 && endIndex === 0) {
    return ''
  }

  // Find sentence boundaries around the entity
  const beforeText = content.substring(0, startIndex)
  const afterText = content.substring(endIndex)

  // Find start of sentence (last period, exclamation, or question mark)
  const sentenceStart = Math.max(
    beforeText.lastIndexOf('. ') + 2,
    beforeText.lastIndexOf('! ') + 2,
    beforeText.lastIndexOf('? ') + 2,
    beforeText.lastIndexOf('\n\n') + 2,
    0
  )

  // Find end of sentence
  const periodIndex = afterText.indexOf('. ')
  const exclamIndex = afterText.indexOf('! ')
  const questIndex = afterText.indexOf('? ')
  const newlineIndex = afterText.indexOf('\n\n')

  const endIndices = [periodIndex, exclamIndex, questIndex, newlineIndex]
    .filter(i => i !== -1)

  const sentenceEnd = endIndices.length > 0
    ? Math.min(...endIndices) + endIndex + 1
    : endIndex + Math.min(afterText.length, 100)

  const context = content.substring(sentenceStart, sentenceEnd).trim()

  // Limit length
  if (context.length > 200) {
    return context.substring(0, 197) + '...'
  }

  return context
}

/**
 * Validate entity for quality
 *
 * @param entity - Entity to validate
 * @returns Whether entity is valid
 */
export function validateEntity(entity: EntityLink): boolean {
  // Must have text
  if (!entity.text || entity.text.length < 3) {
    return false
  }

  // Must have valid slug
  if (!entity.slug || entity.slug.length < 2) {
    return false
  }

  // Reject overly generic terms
  const genericTerms = ['baby', 'child', 'parent', 'mom', 'dad', 'help', 'care', 'need']
  if (genericTerms.includes(entity.text.toLowerCase())) {
    return false
  }

  return true
}

/**
 * Filter entities by confidence level
 *
 * @param entities - All entities
 * @param minConfidence - Minimum confidence to include
 * @returns Filtered entities
 */
export function filterByConfidence(
  entities: EntityLink[],
  minConfidence: EntityConfidence = 'medium'
): EntityLink[] {
  const confidenceLevels: Record<EntityConfidence, number> = {
    strong: 3,
    medium: 2,
    weak: 1,
    ghost: 0,
  }

  const threshold = confidenceLevels[minConfidence]

  return entities.filter(entity => {
    const level = confidenceLevels[entity.confidence]
    return level >= threshold
  })
}

/**
 * Group entities by confidence level
 *
 * @param entities - All entities
 * @returns Map of confidence to entities
 */
export function groupByConfidence(
  entities: EntityLink[]
): Record<EntityConfidence, EntityLink[]> {
  const grouped: Record<EntityConfidence, EntityLink[]> = {
    strong: [],
    medium: [],
    weak: [],
    ghost: [],
  }

  for (const entity of entities) {
    grouped[entity.confidence].push(entity)
  }

  return grouped
}

/**
 * Get entity statistics
 *
 * @param entities - All entities
 * @returns Statistics object
 */
export function getEntityStats(entities: EntityLink[]): {
  total: number
  byConfidence: Record<EntityConfidence, number>
  uniqueSlugs: number
  withContext: number
} {
  const byConfidence: Record<EntityConfidence, number> = {
    strong: 0,
    medium: 0,
    weak: 0,
    ghost: 0,
  }

  const uniqueSlugs = new Set<string>()
  let withContext = 0

  for (const entity of entities) {
    byConfidence[entity.confidence]++
    uniqueSlugs.add(entity.slug)
    if (entity.context && entity.context.length > 0) {
      withContext++
    }
  }

  return {
    total: entities.length,
    byConfidence,
    uniqueSlugs: uniqueSlugs.size,
    withContext,
  }
}
