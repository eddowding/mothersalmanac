/**
 * Analytics tracking for Mother's Almanac
 * Tracks page views, searches, generations, and costs
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Track a page view
 *
 * @param params - Page view parameters
 */
export async function trackPageView(params: {
  path: string
  userId?: string
  referrer?: string
  userAgent?: string
}) {
  try {
    const supabase = await createClient()

    await (supabase.from('analytics_page_views') as any).insert({
      path: params.path,
      user_id: params.userId || null,
      referrer: params.referrer || null,
      user_agent: params.userAgent || null,
      viewed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to track page view:', error)
    // Don't throw - analytics failures shouldn't break the app
  }
}

/**
 * Track a wiki page view
 *
 * @param slug - Wiki page slug
 * @param userId - Optional user ID
 */
export async function trackWikiView(slug: string, userId?: string) {
  try {
    const supabase = await createClient()

    // Increment view count in wiki_cache
    await (supabase as any).rpc('increment_wiki_view_count', { page_slug: slug })

    // Track detailed analytics
    await trackPageView({
      path: `/wiki/${slug}`,
      userId,
    })
  } catch (error) {
    console.error('Failed to track wiki view:', error)
  }
}

/**
 * Track a search query
 *
 * @param params - Search parameters
 */
export async function trackSearch(params: {
  query: string
  userId?: string
  resultsCount: number
  source: 'home' | 'wiki' | 'admin'
}) {
  try {
    const supabase = await createClient()

    await (supabase.from('analytics_searches') as any).insert({
      query: params.query,
      user_id: params.userId || null,
      results_count: params.resultsCount,
      source: params.source,
      searched_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to track search:', error)
  }
}

/**
 * Track a wiki page generation
 *
 * @param params - Generation parameters
 */
export async function trackGeneration(params: {
  slug: string
  title: string
  userId?: string
  confidence: number
  tokensUsed: number
  durationMs: number
  success: boolean
  errorMessage?: string
}) {
  try {
    const supabase = await createClient()

    await (supabase.from('analytics_generations') as any).insert({
      slug: params.slug,
      title: params.title,
      user_id: params.userId || null,
      confidence: params.confidence,
      tokens_used: params.tokensUsed,
      duration_ms: params.durationMs,
      success: params.success,
      error_message: params.errorMessage || null,
      generated_at: new Date().toISOString(),
    })

    // Track cost if successful
    if (params.success) {
      await trackCost({
        type: 'generation',
        tokensUsed: params.tokensUsed,
        userId: params.userId,
        metadata: { slug: params.slug, title: params.title },
      })
    }
  } catch (error) {
    console.error('Failed to track generation:', error)
  }
}

/**
 * Track API costs
 *
 * @param params - Cost parameters
 */
export async function trackCost(params: {
  type: 'generation' | 'embedding' | 'rag_query'
  tokensUsed: number
  userId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = await createClient()

    // Calculate cost based on model pricing
    // Claude 3.5 Sonnet: $3/1M input, $15/1M output (average ~$9/1M)
    const costPerToken = 0.000009 // $9 per 1M tokens
    const estimatedCost = params.tokensUsed * costPerToken

    await (supabase.from('analytics_costs') as any).insert({
      type: params.type,
      tokens_used: params.tokensUsed,
      estimated_cost: estimatedCost,
      user_id: params.userId || null,
      metadata: params.metadata || {},
      tracked_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to track cost:', error)
  }
}

/**
 * Get analytics summary for a date range
 *
 * @param params - Date range parameters
 * @returns Analytics summary
 */
export async function getAnalyticsSummary(params: {
  startDate: string
  endDate: string
  userId?: string
}) {
  try {
    const supabase = await createClient()

    // Get page views
    let pageViewsQuery = (supabase
      .from('analytics_page_views') as any)
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', params.startDate)
      .lte('viewed_at', params.endDate)

    if (params.userId) {
      pageViewsQuery = pageViewsQuery.eq('user_id', params.userId)
    }

    const { count: pageViews } = await pageViewsQuery

    // Get searches
    let searchesQuery = (supabase
      .from('analytics_searches') as any)
      .select('*', { count: 'exact', head: true })
      .gte('searched_at', params.startDate)
      .lte('searched_at', params.endDate)

    if (params.userId) {
      searchesQuery = searchesQuery.eq('user_id', params.userId)
    }

    const { count: searches } = await searchesQuery

    // Get generations
    let generationsQuery = (supabase
      .from('analytics_generations') as any)
      .select('success, tokens_used, duration_ms')
      .gte('generated_at', params.startDate)
      .lte('generated_at', params.endDate)

    if (params.userId) {
      generationsQuery = generationsQuery.eq('user_id', params.userId)
    }

    const { data: generations } = await generationsQuery

    const successfulGenerations =
      generations?.filter((g: any) => g.success).length || 0
    const failedGenerations = (generations?.length || 0) - successfulGenerations
    const totalTokens =
      generations?.reduce((sum: number, g: any) => sum + g.tokens_used, 0) || 0
    const avgDuration =
      generations && generations.length > 0
        ? generations.reduce((sum: number, g: any) => sum + g.duration_ms, 0) /
          generations.length
        : 0

    // Get costs
    let costsQuery = (supabase
      .from('analytics_costs') as any)
      .select('estimated_cost')
      .gte('tracked_at', params.startDate)
      .lte('tracked_at', params.endDate)

    if (params.userId) {
      costsQuery = costsQuery.eq('user_id', params.userId)
    }

    const { data: costs } = await costsQuery
    const totalCost =
      costs?.reduce((sum: number, c: any) => sum + c.estimated_cost, 0) || 0

    return {
      pageViews: pageViews || 0,
      searches: searches || 0,
      generations: {
        total: generations?.length || 0,
        successful: successfulGenerations,
        failed: failedGenerations,
        successRate:
          generations && generations.length > 0
            ? (successfulGenerations / generations.length) * 100
            : 0,
      },
      performance: {
        totalTokens,
        avgDuration: Math.round(avgDuration),
        totalCost: totalCost.toFixed(4),
      },
    }
  } catch (error) {
    console.error('Failed to get analytics summary:', error)
    throw error
  }
}

/**
 * Get top wiki pages by views
 *
 * @param limit - Number of pages to return
 * @returns Top pages
 */
export async function getTopWikiPages(limit: number = 10) {
  try {
    const supabase = await createClient()

    const { data } = await (supabase
      .from('wiki_cache') as any)
      .select('slug, title, view_count')
      .order('view_count', { ascending: false })
      .limit(limit)

    return data || []
  } catch (error) {
    console.error('Failed to get top wiki pages:', error)
    return []
  }
}

/**
 * Get popular search queries
 *
 * @param params - Parameters
 * @returns Popular searches
 */
export async function getPopularSearches(params: {
  limit?: number
  startDate?: string
  endDate?: string
}) {
  try {
    const supabase = await createClient()

    let query = (supabase
      .from('analytics_searches') as any)
      .select('query')
      .order('searched_at', { ascending: false })

    if (params.startDate) {
      query = query.gte('searched_at', params.startDate)
    }

    if (params.endDate) {
      query = query.lte('searched_at', params.endDate)
    }

    const { data } = await query.limit(params.limit || 100)

    if (!data) return []

    // Count occurrences
    const counts = data.reduce(
      (acc: Record<string, number>, { query }: any) => {
        acc[query] = (acc[query] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Sort by count and return top results
    return Object.entries(counts)
      .map(([query, count]) => ({ query, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, params.limit || 10)
  } catch (error) {
    console.error('Failed to get popular searches:', error)
    return []
  }
}
