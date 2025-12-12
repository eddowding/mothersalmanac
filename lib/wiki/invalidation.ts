/**
 * Wiki Cache Invalidation
 *
 * Handles cache invalidation strategies for the wiki system.
 * Coordinates database deletion with Next.js cache revalidation.
 */

import { revalidatePath } from 'next/cache'
import { deletePage, searchPages } from './cache-db'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordInvalidation } from './monitoring'

/**
 * Invalidate cache for a specific page
 *
 * 1. Deletes from database
 * 2. Revalidates Next.js cache
 */
export async function invalidatePageCache(slug: string): Promise<void> {
  try {
    // Delete from database
    await deletePage(slug)

    // Revalidate Next.js cache for this specific page
    revalidatePath(`/wiki/${slug}`)

    // Also revalidate the wiki index (if it lists pages)
    revalidatePath('/wiki')

    recordInvalidation(slug)

    console.log(`✅ Invalidated cache for: ${slug}`)
  } catch (error) {
    console.error(`Failed to invalidate cache for ${slug}:`, error)
    throw error
  }
}

/**
 * Invalidate multiple pages by slugs
 *
 * Batch invalidation for efficiency.
 */
export async function invalidatePageCaches(slugs: string[]): Promise<{
  success: string[]
  failed: Array<{ slug: string; error: string }>
}> {
  const success: string[] = []
  const failed: Array<{ slug: string; error: string }> = []

  for (const slug of slugs) {
    try {
      await invalidatePageCache(slug)
      success.push(slug)
    } catch (error) {
      failed.push({
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  console.log(`✅ Invalidated ${success.length} pages, ${failed.length} failed`)

  return { success, failed }
}

/**
 * Invalidate all pages (use carefully!)
 *
 * WARNING: This will delete ALL cached wiki pages.
 * Use only when necessary (e.g., major content update, schema change)
 */
export async function invalidateAllPages(): Promise<number> {
  const supabase = createAdminClient()

  try {
    // Count pages before deletion
    const { count } = await supabase
      .from('wiki_pages')
      .select('*', { count: 'exact', head: true })

    // Delete all wiki pages
    // Using a non-existent ID to delete all (since we can't use .delete() without filter)
    const { error } = await supabase
      .from('wiki_pages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) throw error

    // Revalidate wiki routes
    revalidatePath('/wiki', 'layout')

    console.log(`✅ Invalidated ALL ${count || 0} wiki pages`)
    recordInvalidation('*ALL*', { count })

    return count || 0
  } catch (error) {
    console.error('Failed to invalidate all pages:', error)
    throw error
  }
}

/**
 * Invalidate pages related to a document
 *
 * When a document is reprocessed, invalidate all pages that used it as a source.
 * This ensures pages get regenerated with the updated document content.
 */
export async function invalidatePagesUsingDocument(documentId: string): Promise<string[]> {
  const supabase = createAdminClient()

  try {
    // Find pages that reference this document in their metadata.sources_used
    const { data: pages, error } = await supabase
      .from('wiki_pages')
      .select('slug, metadata')
      .contains('metadata->sources_used', [documentId])

    if (error) throw error

    if (!pages || pages.length === 0) {
      console.log(`No pages found using document: ${documentId}`)
      return []
    }

    const slugs = pages.map((p: any) => p.slug)

    // Invalidate each page
    const { success } = await invalidatePageCaches(slugs)

    console.log(`✅ Invalidated ${success.length} pages using document: ${documentId}`)

    return success
  } catch (error) {
    console.error(`Failed to invalidate pages using document ${documentId}:`, error)
    throw error
  }
}

/**
 * Invalidate pages by search query
 *
 * Useful for bulk invalidation based on content matching.
 */
export async function invalidatePagesBySearch(query: string): Promise<string[]> {
  try {
    const pages = await searchPages(query)
    const slugs = pages.map((p) => p.slug)

    if (slugs.length === 0) {
      console.log(`No pages found matching query: ${query}`)
      return []
    }

    const { success } = await invalidatePageCaches(slugs)

    console.log(`✅ Invalidated ${success.length} pages matching: ${query}`)

    return success
  } catch (error) {
    console.error(`Failed to invalidate pages by search:`, error)
    throw error
  }
}

/**
 * Invalidate stale pages
 *
 * Deletes pages that have expired TTL.
 * Useful for cleanup, but normally stale pages are regenerated not deleted.
 */
export async function invalidateStalePages(): Promise<number> {
  const supabase = createAdminClient()

  try {
    // Find all stale pages
    const { data: stalePages, error } = await supabase
      .from('wiki_pages')
      .select('slug')
      .lt('ttl_expires_at', new Date().toISOString())

    if (error) throw error

    type PageSlug = { slug: string }
    const pages = stalePages as PageSlug[] | null
    if (!pages || pages.length === 0) {
      console.log('No stale pages to invalidate')
      return 0
    }

    const slugs = pages.map((p) => p.slug)
    const { success } = await invalidatePageCaches(slugs)

    console.log(`✅ Invalidated ${success.length} stale pages`)

    return success.length
  } catch (error) {
    console.error('Failed to invalidate stale pages:', error)
    throw error
  }
}

/**
 * Invalidate low confidence pages
 *
 * Deletes pages with confidence scores below threshold.
 * Can be used to clean up poorly generated content.
 */
export async function invalidateLowConfidencePages(threshold: number = 0.3): Promise<number> {
  const supabase = createAdminClient()

  try {
    const { data: lowConfPages, error } = await supabase
      .from('wiki_pages')
      .select('slug, confidence_score')
      .lt('confidence_score', threshold)

    if (error) throw error

    type PageRow = { slug: string; confidence_score: number }
    const pages = lowConfPages as PageRow[] | null
    if (!pages || pages.length === 0) {
      console.log(`No pages with confidence < ${threshold}`)
      return 0
    }

    const slugs = pages.map((p) => p.slug)
    const { success } = await invalidatePageCaches(slugs)

    console.log(`✅ Invalidated ${success.length} low confidence pages (< ${threshold})`)

    return success.length
  } catch (error) {
    console.error('Failed to invalidate low confidence pages:', error)
    throw error
  }
}

/**
 * Soft invalidation - mark as unpublished instead of deleting
 *
 * Alternative to hard deletion. Keeps the page in database but hides it.
 * Useful when you want to preserve analytics/history.
 */
export async function softInvalidatePage(slug: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    const { error } = await (supabase
      .from('wiki_pages') as any)
      .update({ published: false })
      .eq('slug', slug)

    if (error) throw error

    // Revalidate cache
    revalidatePath(`/wiki/${slug}`)
    revalidatePath('/wiki')

    recordInvalidation(slug, { soft: true })

    console.log(`✅ Soft invalidated (unpublished): ${slug}`)
  } catch (error) {
    console.error(`Failed to soft invalidate ${slug}:`, error)
    throw error
  }
}

/**
 * Restore a soft-invalidated page
 *
 * Republishes a previously unpublished page.
 */
export async function restorePage(slug: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    const { error } = await (supabase.from('wiki_pages') as any)
      .update({ published: true })
      .eq('slug', slug)

    if (error) throw error

    // Revalidate cache
    revalidatePath(`/wiki/${slug}`)
    revalidatePath('/wiki')

    console.log(`✅ Restored (republished): ${slug}`)
  } catch (error) {
    console.error(`Failed to restore ${slug}:`, error)
    throw error
  }
}

/**
 * Invalidation result summary
 */
export interface InvalidationSummary {
  total: number
  success: number
  failed: number
  slugs: string[]
  errors: Array<{ slug: string; error: string }>
}

/**
 * Get invalidation summary for reporting
 */
export function createInvalidationSummary(
  success: string[],
  failed: Array<{ slug: string; error: string }>
): InvalidationSummary {
  return {
    total: success.length + failed.length,
    success: success.length,
    failed: failed.length,
    slugs: success,
    errors: failed,
  }
}
