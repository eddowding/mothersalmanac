/**
 * Wiki page cache management
 * Handles caching, TTL validation, and retrieval of generated wiki pages
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type WikiPageRow = Database['public']['Tables']['wiki_pages']['Row']
type WikiPageInsert = Database['public']['Tables']['wiki_pages']['Insert']

/**
 * Cached wiki page interface
 */
export interface CachedPage {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  confidence_score: number
  generated_at: string
  ttl_expires_at: string
  metadata: {
    sources_used?: string[]
    entity_links?: Array<{entity: string, slug: string, confidence: string}>
    reading_mode?: string
    [key: string]: unknown
  }
  view_count: number
  published: boolean
}

/**
 * Get default TTL duration in hours from environment or use default
 */
export function getTTLHours(): number {
  return parseInt(process.env.WIKI_CACHE_TTL_HOURS || '48', 10)
}

/**
 * Calculate TTL expiration timestamp
 * @param hours - TTL duration in hours (default: 48)
 * @returns ISO timestamp for TTL expiration
 */
export function calculateTTLExpiration(hours?: number): string {
  const ttlHours = hours || getTTLHours()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)
  return expiresAt.toISOString()
}

/**
 * Check if a cached page is stale (past TTL expiration)
 * @param page - Cached wiki page
 * @returns true if page is stale and should be regenerated
 */
export function isStale(page: CachedPage): boolean {
  const now = new Date()
  const expiresAt = new Date(page.ttl_expires_at)
  return now > expiresAt
}

/**
 * Get a cached wiki page by slug
 * @param slug - Wiki page slug
 * @returns Cached page or null if not found
 */
export async function getCachedPage(
  slug: string
): Promise<CachedPage | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - page doesn't exist
        return null
      }
      console.error('Error fetching cached page:', error)
      throw error
    }

    return data as CachedPage
  } catch (error) {
    console.error('Failed to get cached page:', error)
    return null
  }
}

/**
 * Cache a new or updated wiki page
 * @param page - Page data to cache (without id and view_count)
 */
export async function cachePage(
  page: Omit<CachedPage, 'id' | 'view_count'>
): Promise<void> {
  try {
    const supabase = createAdminClient()

    const pageData: WikiPageInsert = {
      slug: page.slug,
      title: page.title,
      content: page.content,
      excerpt: page.excerpt,
      confidence_score: page.confidence_score,
      generated_at: page.generated_at,
      ttl_expires_at: page.ttl_expires_at,
      metadata: page.metadata,
      published: page.published,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upsert: insert or update if slug exists
    const { error } = await (supabase
      .from('wiki_pages') as any)
      .upsert(pageData, {
        onConflict: 'slug',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error('Error caching page:', error)
      throw error
    }

    console.log(`Cached wiki page: ${page.slug}`)
  } catch (error) {
    console.error('Failed to cache page:', error)
    throw error
  }
}

/**
 * Increment page view count (fire-and-forget)
 * Does not await to avoid blocking page render
 * @param slug - Wiki page slug
 */
export function incrementPageView(slug: string): void {
  // Fire-and-forget: don't await this
  void (async () => {
    try {
      const supabase = createAdminClient()

      const { error } = await (supabase as any).rpc('increment_page_view', {
        page_slug: slug
      })

      if (error) {
        console.error('Error incrementing page views:', error)
      }
    } catch (error) {
      console.error('Failed to increment page views:', error)
    }
  })()
}

/**
 * Manually invalidate cache for a specific page
 * Deletes the page from cache, forcing regeneration on next access
 * @param slug - Wiki page slug to invalidate
 */
export async function invalidateCache(slug: string): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('wiki_pages')
      .delete()
      .eq('slug', slug)

    if (error) {
      console.error('Error invalidating cache:', error)
      throw error
    }

    console.log(`Invalidated cache for: ${slug}`)
  } catch (error) {
    console.error('Failed to invalidate cache:', error)
    throw error
  }
}

/**
 * Get stale pages for background regeneration
 * Returns pages that have expired TTL, ordered by view count (most popular first)
 * @param limit - Maximum number of stale pages to return (default: 20)
 * @returns Array of stale cached pages
 */
export async function getStalePages(limit: number = 20): Promise<CachedPage[]> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('published', true)
      .lt('ttl_expires_at', now)
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching stale pages:', error)
      throw error
    }

    return (data || []) as CachedPage[]
  } catch (error) {
    console.error('Failed to get stale pages:', error)
    return []
  }
}

/**
 * Get all cached pages for sitemap generation
 * @returns Array of all published cached pages
 */
export async function getAllCachedPages(): Promise<CachedPage[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('published', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching all pages:', error)
      throw error
    }

    return (data || []) as CachedPage[]
  } catch (error) {
    console.error('Failed to get all cached pages:', error)
    return []
  }
}

/**
 * Get popular pages (by view count)
 * @param limit - Number of pages to return (default: 10)
 * @returns Array of popular cached pages
 */
export async function getPopularPages(limit: number = 10): Promise<CachedPage[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('published', true)
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching popular pages:', error)
      throw error
    }

    return (data || []) as CachedPage[]
  } catch (error) {
    console.error('Failed to get popular pages:', error)
    return []
  }
}

/**
 * Search cached pages by title or content
 * @param query - Search query
 * @param limit - Maximum results to return (default: 10)
 * @returns Array of matching cached pages
 */
export async function searchCachedPages(
  query: string,
  limit: number = 10
): Promise<CachedPage[]> {
  try {
    const supabase = await createClient()

    // Use PostgreSQL text search
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('published', true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error searching cached pages:', error)
      throw error
    }

    return (data || []) as CachedPage[]
  } catch (error) {
    console.error('Failed to search cached pages:', error)
    return []
  }
}

/**
 * Get cache statistics
 * @returns Cache statistics object
 */
export async function getCacheStats(): Promise<{
  total_pages: number
  stale_pages: number
  total_views: number
  avg_confidence: number
}> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Get total pages
    const { count: totalPages } = await supabase
      .from('wiki_pages')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)

    // Get stale pages count
    const { count: stalePages } = await supabase
      .from('wiki_pages')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)
      .lt('ttl_expires_at', now)

    // Get aggregate stats
    const { data: stats } = await supabase
      .from('wiki_pages')
      .select('view_count, confidence_score')
      .eq('published', true)

    const totalViews = stats?.reduce((sum: number, page: any) => sum + page.view_count, 0) || 0
    const avgConfidence = stats?.length
      ? stats.reduce((sum: number, page: any) => sum + page.confidence_score, 0) / stats.length
      : 0

    return {
      total_pages: totalPages || 0,
      stale_pages: stalePages || 0,
      total_views: totalViews,
      avg_confidence: avgConfidence,
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return {
      total_pages: 0,
      stale_pages: 0,
      total_views: 0,
      avg_confidence: 0,
    }
  }
}
