/**
 * Wiki Cache Database Operations
 *
 * Handles all database operations for the wiki page cache.
 * Uses the admin client to bypass RLS for public cache operations.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'
import { CACHE_CONFIG, getTTLExpiration } from './config'
import { recordCacheHit, recordCacheMiss, createTimer } from './monitoring'

type WikiPage = Database['public']['Tables']['wiki_pages']['Row']
type WikiPageInsert = Database['public']['Tables']['wiki_pages']['Insert']
type WikiPageUpdate = Database['public']['Tables']['wiki_pages']['Update']

/**
 * Get page from cache by slug
 *
 * Returns null if page doesn't exist or is not published.
 * Logs cache hit/miss for analytics.
 */
export async function getCachedPage(slug: string): Promise<WikiPage | null> {
  const timer = createTimer()
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('slug', slug)
      .eq('published', true) // Only return published pages
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is a cache miss
        recordCacheMiss(slug, { duration_ms: timer.elapsed() })
        return null
      }
      throw error
    }

    // Cache hit
    recordCacheHit(slug, {
      duration_ms: timer.elapsed(),
      confidence_score: (data as any).confidence_score,
      view_count: (data as any).view_count,
    })

    return data
  } catch (error) {
    console.error('Failed to get cached page:', error)
    recordCacheMiss(slug, {
      duration_ms: timer.elapsed(),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Insert or update page in cache
 *
 * Upserts a wiki page with the provided data.
 * Automatically sets TTL expiration and generation timestamp.
 */
export async function upsertPage(page: WikiPageInsert): Promise<WikiPage> {
  const supabase = createAdminClient()
  const timer = createTimer()

  try {
    const { data, error } = await (supabase
      .from('wiki_pages') as any)
      .upsert(
        {
          slug: page.slug,
          title: page.title,
          content: page.content,
          excerpt: page.excerpt || null,
          confidence_score: page.confidence_score || 0.5,
          generated_at: new Date().toISOString(),
          ttl_expires_at: getTTLExpiration().toISOString(),
          metadata: page.metadata || {},
          view_count: page.view_count || 0,
          published: page.published ?? true, // Default to published
          // Don't override regeneration_count - let DB handle it
        },
        {
          onConflict: 'slug',
        }
      )
      .select()
      .single()

    if (error) throw new Error(`Failed to cache page: ${error.message}`)

    console.log(
      `✅ Cached page: ${page.slug} (confidence: ${data.confidence_score.toFixed(2)}, ${timer.elapsed()}ms)`
    )

    return data
  } catch (error) {
    console.error('Failed to upsert page:', error)
    throw error
  }
}

/**
 * Increment view count (fire-and-forget)
 *
 * Calls the database function to increment view count.
 * Does not wait for response to avoid slowing down page loads.
 */
export function incrementViewCount(slug: string): void {
  const client: any = createAdminClient()

  // Fire and forget - don't await
  client
    .rpc('increment_page_view', { page_slug: slug })
    .then(() => {
      console.debug(`📈 Incremented view count for: ${slug}`)
    })
    .catch((err: any) => {
      console.error(`Failed to increment view count for ${slug}:`, err)
    })
}

/**
 * Check if page is stale
 *
 * A page is stale if its TTL has expired.
 */
export function isPageStale(page: WikiPage): boolean {
  const now = new Date()
  const expiresAt = new Date(page.ttl_expires_at)
  return expiresAt < now
}

/**
 * Get stale pages ordered by popularity
 *
 * Returns pages that have expired TTL, sorted by view count.
 * Used by background regeneration jobs.
 */
export async function getStalePages(limit: number = 20): Promise<WikiPage[]> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .lt('ttl_expires_at', new Date().toISOString())
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch stale pages: ${error.message}`)

    console.log(`📊 Found ${data?.length || 0} stale pages`)
    return data || []
  } catch (error) {
    console.error('Failed to get stale pages:', error)
    throw error
  }
}

/**
 * Delete page from cache
 *
 * Permanently removes a page from the cache.
 */
export async function deletePage(slug: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase.from('wiki_pages').delete().eq('slug', slug)

    if (error) throw new Error(`Failed to delete page: ${error.message}`)

    console.log(`🗑️  Deleted page from cache: ${slug}`)
  } catch (error) {
    console.error('Failed to delete page:', error)
    throw error
  }
}

/**
 * Get all cached pages (for sitemap)
 *
 * Returns basic info for all published pages.
 * Used to generate sitemap.xml
 */
export async function getAllCachedPages(): Promise<
  Array<{ slug: string; title: string; generated_at: string }>
> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('slug, title, generated_at')
      .eq('published', true)
      .order('view_count', { ascending: false })

    if (error) {
      console.error('Failed to get all cached pages:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to get all cached pages:', error)
    return []
  }
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalPages: number
  stalePages: number
  publishedPages: number
  avgConfidence: number
  totalViews: number
  popularPages: Array<{ slug: string; title: string; views: number; confidence: number }>
  lowConfidencePages: Array<{ slug: string; title: string; confidence: number }>
}

/**
 * Get cache statistics
 *
 * Returns comprehensive statistics about the cache.
 * Used by admin dashboard.
 */
export async function getCacheStats(): Promise<CacheStats> {
  const supabase = createAdminClient()

  try {
    const { data: pages, error } = await supabase
      .from('wiki_pages')
      .select('slug, title, confidence_score, view_count, ttl_expires_at, published')

    if (error || !pages) {
      return {
        totalPages: 0,
        stalePages: 0,
        publishedPages: 0,
        avgConfidence: 0,
        totalViews: 0,
        popularPages: [],
        lowConfidencePages: [],
      }
    }

    const now = new Date()

    // Calculate statistics
    const totalPages = pages.length
    const stalePages = pages.filter((p: any) => new Date(p.ttl_expires_at) < now).length
    const publishedPages = pages.filter((p: any) => p.published).length
    const avgConfidence = pages.reduce((sum: number, p: any) => sum + p.confidence_score, 0) / totalPages
    const totalViews = pages.reduce((sum: number, p: any) => sum + p.view_count, 0)

    // Popular pages (top 10 by views)
    const popularPages = [...pages]
      .sort((a: any, b: any) => b.view_count - a.view_count)
      .slice(0, 10)
      .map((p: any) => ({
        slug: p.slug,
        title: p.title,
        views: p.view_count,
        confidence: p.confidence_score,
      }))

    // Low confidence pages (below threshold)
    const lowConfidencePages = pages
      .filter((p: any) => p.confidence_score < CACHE_CONFIG.lowConfidenceThreshold)
      .sort((a: any, b: any) => a.confidence_score - b.confidence_score)
      .slice(0, 10)
      .map((p: any) => ({
        slug: p.slug,
        title: p.title,
        confidence: p.confidence_score,
      }))

    return {
      totalPages,
      stalePages,
      publishedPages,
      avgConfidence,
      totalViews,
      popularPages,
      lowConfidencePages,
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    throw error
  }
}

/**
 * Update page metadata
 *
 * Partial update of page metadata without regenerating content.
 */
export async function updatePageMetadata(
  slug: string,
  metadata: Partial<WikiPageUpdate>
): Promise<WikiPage | null> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await (supabase
      .from('wiki_pages') as any)
      .update(metadata)
      .eq('slug', slug)
      .select()
      .single()

    if (error) throw new Error(`Failed to update metadata: ${error.message}`)

    console.log(`✏️  Updated metadata for: ${slug}`)
    return data
  } catch (error) {
    console.error('Failed to update page metadata:', error)
    return null
  }
}

/**
 * Mark page as regenerated
 *
 * Increments regeneration count when a page is regenerated.
 */
export async function markPageRegenerated(slug: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    // Increment regeneration_count using raw SQL
    const { error } = await (supabase as any).rpc('increment', {
      table_name: 'wiki_pages',
      column_name: 'regeneration_count',
      match_column: 'slug',
      match_value: slug,
    })

    if (error) {
      // Fallback: manual increment
      const { data: page } = await supabase
        .from('wiki_pages')
        .select('regeneration_count')
        .eq('slug', slug)
        .single()

      if (page) {
        await (supabase
          .from('wiki_pages') as any)
          .update({ regeneration_count: ((page as any).regeneration_count || 0) + 1 })
          .eq('slug', slug)
      }
    }

    console.log(`🔄 Marked page as regenerated: ${slug}`)
  } catch (error) {
    console.error('Failed to mark page as regenerated:', error)
  }
}

/**
 * Get pages by view count range
 *
 * Useful for finding pages in specific popularity tiers.
 */
export async function getPagesByViewRange(
  minViews: number,
  maxViews: number = 999999
): Promise<WikiPage[]> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .gte('view_count', minViews)
      .lte('view_count', maxViews)
      .order('view_count', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to get pages by view range:', error)
    return []
  }
}

/**
 * Search pages by title or content
 *
 * Simple search functionality for admin use.
 */
export async function searchPages(query: string): Promise<WikiPage[]> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(20)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to search pages:', error)
    return []
  }
}
