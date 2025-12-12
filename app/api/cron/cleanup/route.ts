import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Cleanup cron job
 * Removes old analytics data and orphaned cache entries
 *
 * Scheduled to run daily
 * Add to Vercel cron: "0 2 * * *" (2 AM daily)
 */

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Calculate cutoff dates
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const results = {
      pageViewsDeleted: 0,
      searchesDeleted: 0,
      generationsDeleted: 0,
      costsDeleted: 0,
      orphanedCacheDeleted: 0,
    }

    // Delete old page views (keep last 30 days)
    const { count: pageViewsDeleted } = await supabase
      .from('analytics_page_views')
      .delete({ count: 'exact' })
      .lt('viewed_at', thirtyDaysAgo.toISOString())

    results.pageViewsDeleted = pageViewsDeleted || 0

    // Delete old searches (keep last 90 days)
    const { count: searchesDeleted } = await supabase
      .from('analytics_searches')
      .delete({ count: 'exact' })
      .lt('searched_at', ninetyDaysAgo.toISOString())

    results.searchesDeleted = searchesDeleted || 0

    // Delete old failed generations (keep last 30 days)
    const { count: generationsDeleted } = await supabase
      .from('analytics_generations')
      .delete({ count: 'exact' })
      .eq('success', false)
      .lt('generated_at', thirtyDaysAgo.toISOString())

    results.generationsDeleted = generationsDeleted || 0

    // Aggregate and delete old cost data (keep last 90 days)
    // First, aggregate to daily totals
    const { data: oldCosts } = await supabase
      .from('analytics_costs')
      .select('*')
      .lt('tracked_at', ninetyDaysAgo.toISOString()) as { data: any[] | null }

    if (oldCosts && oldCosts.length > 0) {
      // Group by day and type
      const dailyAggregates = oldCosts.reduce((acc, cost) => {
        const day = (cost.tracked_at as string).split('T')[0]
        const key = `${day}-${cost.type}`

        if (!acc[key]) {
          acc[key] = {
            day,
            type: cost.type,
            tokens_used: 0,
            estimated_cost: 0,
            count: 0,
          }
        }

        acc[key].tokens_used += cost.tokens_used
        acc[key].estimated_cost += cost.estimated_cost
        acc[key].count += 1

        return acc
      }, {} as Record<string, any>)

      // Insert aggregated data into a summary table
      await (supabase as any).from('analytics_costs_daily').upsert(
        Object.values(dailyAggregates).map((agg: any) => ({
          date: agg.day,
          type: agg.type,
          tokens_used: agg.tokens_used,
          estimated_cost: agg.estimated_cost,
          event_count: agg.count,
        })),
        { onConflict: 'date,type' }
      )

      // Delete the old detailed records
      const { count: costsDeleted } = await supabase
        .from('analytics_costs')
        .delete({ count: 'exact' })
        .lt('tracked_at', ninetyDaysAgo.toISOString())

      results.costsDeleted = costsDeleted || 0
    }

    // Delete orphaned cache entries (no views, low confidence, older than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: orphanedCacheDeleted } = await supabase
      .from('wiki_cache')
      .delete({ count: 'exact' })
      .eq('view_count', 0)
      .lt('confidence', 0.5)
      .lt('generated_at', sevenDaysAgo.toISOString())

    results.orphanedCacheDeleted = orphanedCacheDeleted || 0

    console.log('Cleanup completed:', results)

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cleanup cron error:', error)
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
