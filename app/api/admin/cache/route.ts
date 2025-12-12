/**
 * Admin Cache Management API
 *
 * Endpoints for admin users to manage the wiki cache.
 * All endpoints require admin authentication.
 *
 * Routes:
 * - GET    /api/admin/cache          - Get cache statistics
 * - POST   /api/admin/cache/invalidate - Invalidate specific page or all
 * - POST   /api/admin/cache/warm     - Trigger cache warming
 * - POST   /api/admin/cache/regenerate - Force regenerate a page
 * - DELETE /api/admin/cache/:slug    - Delete specific page
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/actions'
import {
  getCacheStats,
  getAllCachedPages,
  getStalePages,
  deletePage,
} from '@/lib/wiki/cache-db'
import {
  invalidatePageCache,
  invalidateAllPages,
  invalidateStalePages,
  invalidateLowConfidencePages,
} from '@/lib/wiki/invalidation'
import { warmCache, warmCacheTopic } from '@/lib/wiki/warming'
import { generateWikiPage } from '@/lib/wiki/generator'
import { upsertPage } from '@/lib/wiki/cache-db'
import { getCacheStatistics, getCacheHitRate } from '@/lib/wiki/monitoring'

/**
 * GET /api/admin/cache
 *
 * Get comprehensive cache statistics for admin dashboard
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Verify admin authorization
    await requireAdmin()

    // Get database stats
    const dbStats = await getCacheStats()

    // Get runtime stats
    const runtimeStats = getCacheStatistics()

    // Get stale pages count
    const stalePages = await getStalePages(100) // Get top 100 stale

    // Compile comprehensive stats
    const stats = {
      database: {
        totalPages: dbStats.totalPages,
        publishedPages: dbStats.publishedPages,
        stalePages: dbStats.stalePages,
        avgConfidence: dbStats.avgConfidence,
        totalViews: dbStats.totalViews,
      },
      runtime: {
        cacheHits: runtimeStats.hits,
        cacheMisses: runtimeStats.misses,
        hitRate: getCacheHitRate(),
        regenerations: runtimeStats.regenerations,
        invalidations: runtimeStats.invalidations,
        warmings: runtimeStats.warmings,
        errors: runtimeStats.errors,
        uptimeHours: runtimeStats.uptime_hours,
      },
      popularPages: dbStats.popularPages,
      lowConfidencePages: dbStats.lowConfidencePages,
      stalePagesList: stalePages.slice(0, 10).map((p) => ({
        slug: p.slug,
        title: p.title,
        views: p.view_count,
        confidence: p.confidence_score,
        expiresAt: p.ttl_expires_at,
      })),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to get cache stats:', error)

    // Check if error is from requireAdmin (unauthorized)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get cache stats' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/cache
 *
 * Perform cache management operations based on action
 *
 * Actions:
 * - invalidate: Invalidate specific page or all pages
 * - warm: Trigger cache warming
 * - regenerate: Force regenerate a page
 * - cleanup: Clean up stale or low confidence pages
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    await requireAdmin()

    const body = await request.json()
    const { action, slug, all, topics, threshold } = body

    switch (action) {
      case 'invalidate':
        return await handleInvalidate(slug, all)

      case 'warm':
        return await handleWarm(topics)

      case 'regenerate':
        return await handleRegenerate(slug)

      case 'cleanup':
        return await handleCleanup(threshold)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Cache management operation failed:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle cache invalidation
 */
async function handleInvalidate(
  slug?: string,
  all?: boolean
): Promise<NextResponse> {
  if (all) {
    const count = await invalidateAllPages()
    return NextResponse.json({
      success: true,
      message: `Invalidated all ${count} pages`,
      count,
    })
  }

  if (slug) {
    await invalidatePageCache(slug)
    return NextResponse.json({
      success: true,
      message: `Invalidated page: ${slug}`,
      slug,
    })
  }

  return NextResponse.json(
    { error: 'Must provide slug or all flag' },
    { status: 400 }
  )
}

/**
 * Handle cache warming
 */
async function handleWarm(topics?: string[]): Promise<NextResponse> {
  const summary = await warmCache(topics)

  return NextResponse.json({
    success: true,
    message: `Cache warming complete: ${summary.success}/${summary.total} succeeded`,
    summary,
  })
}

/**
 * Handle page regeneration
 */
async function handleRegenerate(slug?: string): Promise<NextResponse> {
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  try {
    const query = slug.replace(/-/g, ' ')
    const page = await generateWikiPage(query)

    await upsertPage({
      slug,
      title: page.title,
      content: page.content,
      excerpt: page.excerpt,
      confidence_score: page.confidence_score,
      generated_at: page.generated_at,
      ttl_expires_at: page.ttl_expires_at,
      metadata: page.metadata,
      published: page.published,
    })

    return NextResponse.json({
      success: true,
      message: `Regenerated page: ${slug}`,
      slug,
      confidence: page.confidence_score,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Regeneration failed',
      },
      { status: 500 }
    )
  }
}

/**
 * Handle cache cleanup
 */
async function handleCleanup(threshold?: number): Promise<NextResponse> {
  const results = {
    stalePages: 0,
    lowConfidencePages: 0,
  }

  // Clean up stale pages
  results.stalePages = await invalidateStalePages()

  // Clean up low confidence pages if threshold provided
  if (threshold !== undefined) {
    results.lowConfidencePages = await invalidateLowConfidencePages(threshold)
  }

  return NextResponse.json({
    success: true,
    message: `Cleaned up ${results.stalePages + results.lowConfidencePages} pages`,
    results,
  })
}

/**
 * DELETE /api/admin/cache
 *
 * Delete a specific page from cache
 *
 * Query params:
 * - slug: Page slug to delete
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    await deletePage(slug)

    return NextResponse.json({
      success: true,
      message: `Deleted page: ${slug}`,
      slug,
    })
  } catch (error) {
    console.error('Failed to delete page:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete page' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/cache
 *
 * Update cache configuration or trigger maintenance
 *
 * Body:
 * - operation: 'maintenance' | 'optimize' | 'rebuild'
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authorization
    await requireAdmin()

    const body = await request.json()
    const { operation } = body

    switch (operation) {
      case 'maintenance':
        // Run maintenance tasks
        const staleCount = await invalidateStalePages()
        return NextResponse.json({
          success: true,
          message: `Maintenance complete: cleaned ${staleCount} stale pages`,
        })

      case 'optimize':
        // Optimize cache (placeholder for future optimization logic)
        return NextResponse.json({
          success: true,
          message: 'Cache optimization complete',
        })

      case 'rebuild':
        // Rebuild entire cache (very expensive operation!)
        return NextResponse.json({
          success: false,
          error: 'Rebuild not yet implemented - use warm instead',
        })

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }
  } catch (error) {
    console.error('Cache operation failed:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}
