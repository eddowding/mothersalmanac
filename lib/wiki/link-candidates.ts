/**
 * Link candidate management for the wiki system
 * Tracks entities that could become wiki pages
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { LinkCandidate, LinkConfidence } from './types'

/**
 * Store or update a link candidate in the database
 * Increments mention count if entity already exists
 *
 * @param entity - The entity text (e.g., "sleep training")
 * @param slug - The normalized slug (e.g., "sleep-training")
 * @param confidence - Confidence level from entity extraction
 */
export async function upsertLinkCandidate(
  entity: string,
  slug: string,
  confidence: LinkConfidence
): Promise<void> {
  const supabase = createAdminClient()

  const { data: existing, error: selectError } = await (supabase
    .from('link_candidates') as any)
    .select('*')
    .eq('normalized_slug', slug)
    .maybeSingle()

  if (selectError) {
    throw new Error(`Failed to check existing candidate: ${selectError.message}`)
  }

  if (existing) {
    // Update: increment count, update last seen, upgrade confidence if needed
    const newConfidence = upgradeConfidence((existing as any).confidence, confidence)

    const { error: updateError } = await (supabase
      .from('link_candidates') as any)
      .update({
        mentioned_count: (existing as any).mentioned_count + 1,
        last_seen_at: new Date().toISOString(),
        confidence: newConfidence
      })
      .eq('id', (existing as any).id)

    if (updateError) {
      throw new Error(`Failed to update link candidate: ${updateError.message}`)
    }
  } else {
    // Insert new candidate
    const { error: insertError } = await (supabase
      .from('link_candidates') as any)
      .insert({
        entity,
        normalized_slug: slug,
        confidence,
        mentioned_count: 1,
        page_exists: false
      })

    if (insertError) {
      throw new Error(`Failed to insert link candidate: ${insertError.message}`)
    }
  }
}

/**
 * Upgrade confidence level if new mention has higher confidence
 */
function upgradeConfidence(
  current: LinkConfidence,
  newValue: LinkConfidence
): LinkConfidence {
  const hierarchy: LinkConfidence[] = ['ghost', 'weak', 'strong']
  const currentIndex = hierarchy.indexOf(current)
  const newIndex = hierarchy.indexOf(newValue)

  return newIndex > currentIndex ? newValue : current
}

/**
 * Check if a wiki page exists for this entity
 *
 * @param slug - The normalized slug to check
 * @returns True if page exists
 */
export async function checkPageExists(slug: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('wiki_pages')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.warn(`Error checking page existence for ${slug}:`, error)
    return false
  }

  return !!data
}

/**
 * Update link candidates after page creation
 * Marks the candidate as having an existing page
 *
 * @param slug - The slug of the newly created page
 */
export async function markPageAsExisting(slug: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await (supabase
    .from('link_candidates') as any)
    .update({ page_exists: true })
    .eq('normalized_slug', slug)

  if (error) {
    throw new Error(`Failed to mark page as existing: ${error.message}`)
  }
}

/**
 * Get suggested pages to create based on mention frequency
 * Returns candidates that are frequently mentioned but don't have pages yet
 *
 * @param limit - Maximum number of suggestions to return
 * @returns Array of link candidates sorted by mention count
 */
export async function getSuggestedPages(
  limit: number = 20
): Promise<LinkCandidate[]> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase
    .from('link_candidates') as any)
    .select('*')
    .eq('page_exists', false)
    .order('mentioned_count', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get suggested pages: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    entity: row.entity,
    normalizedSlug: row.normalized_slug,
    confidence: row.confidence as LinkConfidence,
    mentionedCount: row.mentioned_count,
    pageExists: row.page_exists,
    firstSeenAt: row.first_seen_at || row.created_at,
    lastSeenAt: row.last_seen_at || row.created_at
  }))
}

/**
 * Get all link candidates (for admin dashboard)
 *
 * @param filters - Optional filters for the query
 */
export async function getAllLinkCandidates(filters?: {
  pageExists?: boolean
  minMentions?: number
  confidence?: LinkConfidence
}): Promise<LinkCandidate[]> {
  const supabase = createAdminClient()

  let query = (supabase
    .from('link_candidates') as any)
    .select('*')
    .order('mentioned_count', { ascending: false })

  if (filters?.pageExists !== undefined) {
    query = query.eq('page_exists', filters.pageExists)
  }

  if (filters?.minMentions) {
    query = query.gte('mentioned_count', filters.minMentions)
  }

  if (filters?.confidence) {
    query = query.eq('confidence', filters.confidence)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get link candidates: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    entity: row.entity,
    normalizedSlug: row.normalized_slug,
    confidence: row.confidence as LinkConfidence,
    mentionedCount: row.mentioned_count,
    pageExists: row.page_exists,
    firstSeenAt: row.first_seen_at || row.created_at,
    lastSeenAt: row.last_seen_at || row.created_at
  }))
}

/**
 * Get statistics about link candidates
 */
export async function getLinkCandidateStats(): Promise<{
  total: number
  withPages: number
  withoutPages: number
  strongConfidence: number
  weakConfidence: number
  ghostConfidence: number
}> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase
    .from('link_candidates') as any)
    .select('page_exists, confidence')

  if (error) {
    throw new Error(`Failed to get link candidate stats: ${error.message}`)
  }

  const stats = {
    total: data?.length || 0,
    withPages: 0,
    withoutPages: 0,
    strongConfidence: 0,
    weakConfidence: 0,
    ghostConfidence: 0
  }

  data?.forEach((row: any) => {
    if (row.page_exists) stats.withPages++
    else stats.withoutPages++

    if (row.confidence === 'strong') stats.strongConfidence++
    else if (row.confidence === 'weak') stats.weakConfidence++
    else if (row.confidence === 'ghost') stats.ghostConfidence++
  })

  return stats
}

/**
 * Batch upsert link candidates (for efficient processing)
 */
export async function batchUpsertLinkCandidates(
  candidates: Array<{
    entity: string
    slug: string
    confidence: LinkConfidence
  }>
): Promise<void> {
  // Process in smaller batches to avoid overwhelming the database
  const batchSize = 50
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)

    // Process each batch sequentially
    await Promise.all(
      batch.map(c => upsertLinkCandidate(c.entity, c.slug, c.confidence))
    )
  }
}

/**
 * Delete a link candidate (admin function)
 */
export async function deleteLinkCandidate(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await (supabase
    .from('link_candidates') as any)
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete link candidate: ${error.message}`)
  }
}
