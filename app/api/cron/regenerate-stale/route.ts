/**
 * Background Regeneration Cron Job
 *
 * Vercel Cron endpoint that regenerates stale wiki pages.
 * Runs on a schedule defined in vercel.json (default: every 6 hours)
 *
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Only regenerates popular stale pages (highest traffic first)
 * - Respects rate limits and batch size
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/regenerate-stale",
 *     "schedule": "0 *\/6 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStalePages, upsertPage, markPageRegenerated } from '@/lib/wiki/cache-db'
import { generateWikiPage } from '@/lib/wiki/generator'
import { CACHE_CONFIG } from '@/lib/wiki/config'
import { recordRegeneration, recordError, createTimer } from '@/lib/wiki/monitoring'

/**
 * Result of a single page regeneration
 */
interface RegenerationResult {
  slug: string
  status: 'success' | 'skipped' | 'error'
  confidenceScore?: number
  durationMs?: number
  error?: string
  previousViews?: number
}

/**
 * Summary of the regeneration job
 */
interface RegenerationSummary {
  total: number
  success: number
  skipped: number
  failed: number
  totalDurationMs: number
  results: RegenerationResult[]
  timestamp: string
}

/**
 * GET /api/cron/regenerate-stale
 *
 * Regenerates stale wiki pages in order of popularity.
 * Called by Vercel Cron scheduler.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const jobTimer = createTimer()

  // Step 1: Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET) {
    console.error('❌ CRON_SECRET not configured')
    return NextResponse.json(
      { success: false, error: 'Cron job not configured' },
      { status: 500 }
    )
  }

  if (authHeader !== expectedAuth) {
    console.error('❌ Unauthorized cron request')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🔄 Starting stale page regeneration job...')

  const results: RegenerationResult[] = []

  try {
    // Step 2: Get stale pages ordered by popularity
    const stalePages = await getStalePages(CACHE_CONFIG.regenerationBatchSize)

    if (stalePages.length === 0) {
      console.log('✅ No stale pages to regenerate')
      return NextResponse.json({
        success: true,
        message: 'No stale pages found',
        regenerated: 0,
        skipped: 0,
        failed: 0,
        results: [],
      })
    }

    console.log(`📊 Found ${stalePages.length} stale pages to regenerate`)

    // Step 3: Regenerate each stale page
    for (const page of stalePages) {
      const pageTimer = createTimer()

      try {
        console.log(
          `  Regenerating: ${page.slug} (views: ${page.view_count}, confidence: ${page.confidence_score.toFixed(2)})`
        )

        // Convert slug back to query
        const query = page.slug.replace(/-/g, ' ')

        // Generate new version
        const newPage = await generateWikiPage(query)

        // Update in cache
        await upsertPage({
          slug: page.slug,
          title: newPage.title,
          content: newPage.content,
          excerpt: newPage.excerpt,
          confidence_score: newPage.confidence_score,
          generated_at: newPage.generated_at,
          ttl_expires_at: newPage.ttl_expires_at,
          metadata: {
            ...newPage.metadata,
            previous_confidence: page.confidence_score,
            regenerated_at: new Date().toISOString(),
            regeneration_reason: 'stale_ttl',
          },
          view_count: page.view_count, // Preserve view count
          published: newPage.published,
        })

        // Mark as regenerated
        await markPageRegenerated(page.slug)

        const durationMs = pageTimer.elapsed()

        recordRegeneration(page.slug, {
          confidence_score: newPage.confidence_score,
          duration_ms: durationMs,
          view_count: page.view_count,
        })

        results.push({
          slug: page.slug,
          status: 'success',
          confidenceScore: newPage.confidence_score,
          durationMs,
          previousViews: page.view_count,
        })

        console.log(
          `    ✅ ${page.slug} (new confidence: ${newPage.confidence_score.toFixed(2)}, ${durationMs}ms)`
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        recordError(page.slug, errorMessage, {
          operation: 'regeneration',
          view_count: page.view_count,
        })

        results.push({
          slug: page.slug,
          status: 'error',
          error: errorMessage,
          previousViews: page.view_count,
        })

        console.error(`    ❌ ${page.slug}: ${errorMessage}`)
      }

      // Rate limiting delay between pages
      if (CACHE_CONFIG.regenerationDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, CACHE_CONFIG.regenerationDelayMs))
      }
    }

    // Step 4: Compile summary
    const totalDurationMs = jobTimer.elapsed()
    const summary: RegenerationSummary = {
      total: results.length,
      success: results.filter((r) => r.status === 'success').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'error').length,
      totalDurationMs,
      results,
      timestamp: new Date().toISOString(),
    }

    console.log('🔄 Regeneration job complete!')
    console.log(`   Success: ${summary.success}`)
    console.log(`   Failed: ${summary.failed}`)
    console.log(`   Duration: ${(totalDurationMs / 1000).toFixed(1)}s`)

    return NextResponse.json({
      success: true,
      message: `Regenerated ${summary.success}/${summary.total} pages`,
      regenerated: summary.success,
      failed: summary.failed,
      skipped: summary.skipped,
      total: summary.total,
      durationMs: summary.totalDurationMs,
    })
  } catch (error) {
    const totalDurationMs = jobTimer.elapsed()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('❌ Regeneration job failed:', errorMessage)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        regenerated: results.filter((r) => r.status === 'success').length,
        failed: results.filter((r) => r.status === 'error').length,
        totalDurationMs,
        results,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/regenerate-stale
 *
 * Manual trigger for regeneration (admin use).
 * Accepts optional parameters to override defaults.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin authorization (not just cron secret)
  // For now, we'll use the same cron secret, but in production
  // you might want to use proper admin authentication

  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { limit, force } = body

    console.log('🔄 Manual regeneration triggered')
    console.log(`   Limit: ${limit || CACHE_CONFIG.regenerationBatchSize}`)
    console.log(`   Force: ${force || false}`)

    // Use GET handler logic with custom limit
    // For simplicity, we'll just call the GET handler
    // In a real implementation, you'd extract the logic to a shared function

    return NextResponse.json({
      success: true,
      message: 'Use GET endpoint for now, POST with custom params coming soon',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/cron/regenerate-stale
 *
 * Returns information about the cron job configuration
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/cron/regenerate-stale',
    method: 'GET',
    schedule: CACHE_CONFIG.cronSchedule,
    batchSize: CACHE_CONFIG.regenerationBatchSize,
    delayMs: CACHE_CONFIG.regenerationDelayMs,
    description: 'Regenerates stale wiki pages in order of popularity',
    authentication: 'Bearer token via CRON_SECRET environment variable',
  })
}
