/**
 * Wiki Stubs - Manage suggested topics extracted from entity links
 *
 * Note: The wiki_stubs table must be created in Supabase before these functions work.
 * Run the SQL migration in supabase/migrations/20241212_create_wiki_stubs.sql
 */

import { createClient } from '@/lib/supabase/server'

// Helper to get untyped supabase client for wiki_stubs table
// (table not in generated types until migration is run)
async function getStubsTable() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('wiki_stubs')
}

export interface WikiStub {
  id: string
  slug: string
  title: string
  mentioned_in: string[]
  mention_count: number
  confidence: 'strong' | 'medium' | 'weak'
  category: string | null
  created_at: string
  updated_at: string
  generated_at: string | null
  is_generated: boolean
}

/**
 * Save entity links as stubs (if they don't already have pages)
 */
export async function saveEntityLinksAsStubs(
  entityLinks: Array<{ entity: string; slug: string; confidence: string }>,
  sourcePageSlug: string
): Promise<void> {
  if (entityLinks.length === 0) return

  const supabase = await createClient()

  // Check which slugs already have pages
  const slugs = entityLinks.map(e => e.slug)
  const { data: existingPages } = await supabase
    .from('wiki_pages')
    .select('slug')
    .in('slug', slugs)

  const typedPages = (existingPages || []) as Array<{ slug: string }>
  const existingSlugs = new Set(typedPages.map(p => p.slug))

  // Filter to only stubs (entities without pages)
  const stubEntities = entityLinks.filter(e => !existingSlugs.has(e.slug))

  if (stubEntities.length === 0) return

  // Get untyped stubs table access
  const stubsTable = await getStubsTable()

  for (const entity of stubEntities) {
    try {
      const { data: existing } = await stubsTable
        .select('id, mentioned_in, mention_count')
        .eq('slug', entity.slug)
        .single()

      if (existing) {
        // Update existing stub
        const mentionedIn = existing.mentioned_in || []
        if (!mentionedIn.includes(sourcePageSlug)) {
          mentionedIn.push(sourcePageSlug)
        }

        await stubsTable
          .update({
            mentioned_in: mentionedIn,
            mention_count: mentionedIn.length,
            confidence: entity.confidence,
          })
          .eq('id', existing.id)
      } else {
        // Insert new stub
        await stubsTable
          .insert({
            slug: entity.slug,
            title: entity.entity,
            mentioned_in: [sourcePageSlug],
            mention_count: 1,
            confidence: entity.confidence,
          })
      }
    } catch (err) {
      // Table might not exist yet, skip
      console.warn(`[Stubs] Could not save stub for ${entity.slug}:`, err)
    }
  }

  console.log(`[Stubs] Saved ${stubEntities.length} stubs from ${sourcePageSlug}`)
}

/**
 * Get top stubs for search suggestions
 */
export async function getTopStubs(limit: number = 10): Promise<WikiStub[]> {
  try {
    const stubsTable = await getStubsTable()
    const { data, error } = await stubsTable
      .select('*')
      .eq('is_generated', false)
      .order('mention_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Stubs] Error fetching top stubs:', error)
      return []
    }

    return (data || []) as WikiStub[]
  } catch {
    return []
  }
}

/**
 * Search stubs by title
 */
export async function searchStubs(query: string, limit: number = 5): Promise<WikiStub[]> {
  try {
    const stubsTable = await getStubsTable()
    const { data, error } = await stubsTable
      .select('*')
      .eq('is_generated', false)
      .ilike('title', `%${query}%`)
      .order('mention_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Stubs] Error searching stubs:', error)
      return []
    }

    return (data || []) as WikiStub[]
  } catch {
    return []
  }
}

/**
 * Get all ungenerated stubs for admin
 */
export async function getAllStubs(): Promise<WikiStub[]> {
  try {
    const stubsTable = await getStubsTable()
    const { data, error } = await stubsTable
      .select('*')
      .order('mention_count', { ascending: false })

    if (error) {
      console.error('[Stubs] Error fetching all stubs:', error)
      return []
    }

    return (data || []) as WikiStub[]
  } catch {
    return []
  }
}

/**
 * Mark a stub as generated (after its page is created)
 */
export async function markStubAsGenerated(slug: string): Promise<void> {
  try {
    const stubsTable = await getStubsTable()
    await stubsTable
      .update({
        is_generated: true,
        generated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
  } catch {
    // Table might not exist
  }
}

/**
 * Delete a stub
 */
export async function deleteStub(id: string): Promise<void> {
  try {
    const stubsTable = await getStubsTable()
    await stubsTable.delete().eq('id', id)
  } catch {
    // Table might not exist
  }
}
