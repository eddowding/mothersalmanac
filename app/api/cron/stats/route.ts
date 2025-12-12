import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnalyticsSummary } from '@/lib/analytics/tracking'

/**
 * Stats generation cron job
 * Generates daily statistics and stores them for historical analysis
 *
 * Scheduled to run daily at midnight
 * Add to Vercel cron: "0 0 * * *"
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

    // Get yesterday's stats
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
    const endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()

    // Get analytics summary
    const summary = await getAnalyticsSummary({
      startDate,
      endDate,
    })

    // Get additional metrics
    const { data: cacheStats } = await supabase
      .from('wiki_cache')
      .select('*', { count: 'exact', head: true })

    const { data: lowConfidencePages } = await supabase
      .from('wiki_cache')
      .select('*', { count: 'exact', head: true })
      .lt('confidence', 0.5)

    const { data: popularPages } = await supabase
      .from('wiki_cache')
      .select('*', { count: 'exact', head: true })
      .gte('view_count', 10)

    // Get unique users (approximation based on page views)
    const { data: uniqueUsers } = await supabase
      .from('analytics_page_views')
      .select('user_id')
      .gte('viewed_at', startDate)
      .lte('viewed_at', endDate)
      .not('user_id', 'is', null)

    const uniqueUserCount = new Set(
      uniqueUsers?.map((u: any) => u.user_id)
    ).size

    // Calculate cache hit rate
    const { data: cacheHits } = await supabase
      .from('analytics_page_views')
      .select('*', { count: 'exact', head: true })
      .like('path', '/wiki/%')
      .gte('viewed_at', startDate)
      .lte('viewed_at', endDate)

    const cacheHitRate =
      summary.generations.total > 0
        ? (((cacheHits as any)?.count || 0) - summary.generations.total) / ((cacheHits as any)?.count || 1)
        : 1

    // Store daily stats
    const dailyStats = {
      date: yesterday.toISOString().split('T')[0],
      page_views: summary.pageViews,
      unique_users: uniqueUserCount,
      searches: summary.searches,
      generations_total: summary.generations.total,
      generations_successful: summary.generations.successful,
      generations_failed: summary.generations.failed,
      success_rate: summary.generations.successRate,
      total_tokens: summary.performance.totalTokens,
      total_cost: parseFloat(summary.performance.totalCost),
      avg_generation_duration: summary.performance.avgDuration,
      total_wiki_pages: (cacheStats as any)?.count || 0,
      low_confidence_pages: (lowConfidencePages as any)?.count || 0,
      popular_pages: (popularPages as any)?.count || 0,
      cache_hit_rate: cacheHitRate,
    }

    await (supabase as any)
      .from('analytics_daily_stats')
      .upsert(dailyStats, { onConflict: 'date' })

    // Get trend data (last 7 days for comparison)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: weeklyStats } = await supabase
      .from('analytics_daily_stats')
      .select('*')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    const trends = calculateTrends(weeklyStats || [])

    console.log('Daily stats generated:', {
      ...dailyStats,
      trends,
    })

    return NextResponse.json({
      success: true,
      stats: dailyStats,
      trends,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Stats cron error:', error)
    return NextResponse.json(
      {
        error: 'Stats generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate trends from historical data
 */
function calculateTrends(stats: any[]) {
  if (stats.length < 2) {
    return {
      pageViewsTrend: 0,
      generationsTrend: 0,
      costTrend: 0,
    }
  }

  const latest = stats[stats.length - 1]
  const previous = stats[stats.length - 2]

  return {
    pageViewsTrend: calculateChange(previous.page_views, latest.page_views),
    generationsTrend: calculateChange(
      previous.generations_total,
      latest.generations_total
    ),
    costTrend: calculateChange(previous.total_cost, latest.total_cost),
    successRateTrend: calculateChange(
      previous.success_rate,
      latest.success_rate
    ),
    cacheHitRateTrend: calculateChange(
      previous.cache_hit_rate,
      latest.cache_hit_rate
    ),
  }
}

/**
 * Calculate percentage change
 */
function calculateChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return ((newValue - oldValue) / oldValue) * 100
}
