/**
 * Search analytics library for Mother's Almanac RAG system
 *
 * Tracks search performance, user queries, and result quality
 * to help optimize the search system over time.
 */

import { createClient } from '@/lib/supabase/server'
import type { SearchResult } from '@/lib/rag/search'

/**
 * Analytics for a search query
 */
export interface SearchAnalytics {
  query: string
  result_count: number
  avg_similarity: number
  execution_time_ms?: number
  user_id?: string
}

/**
 * Aggregated search analytics
 */
export interface AggregatedAnalytics {
  topQueries: Array<{ query: string; count: number }>
  avgResultCount: number
  avgSimilarity: number
  avgExecutionTime: number
  noResultQueries: string[]
  totalSearches: number
  uniqueQueries: number
}

/**
 * Log a search query and its results
 *
 * @param query - The search query
 * @param results - Search results
 * @param userId - Optional user ID
 * @param executionTimeMs - Optional execution time in milliseconds
 */
export async function logSearch(
  query: string,
  results: SearchResult[],
  userId?: string,
  executionTimeMs?: number
): Promise<void> {
  try {
    const supabase = await createClient()

    const avgSimilarity = results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0

    await (supabase as any).from('search_analytics').insert({
      query,
      result_count: results.length,
      avg_similarity: avgSimilarity,
      user_id: userId || null,
      execution_time_ms: executionTimeMs || null,
    })
  } catch (error) {
    // Don't throw - analytics failure shouldn't break search
    console.error('Failed to log search analytics:', error)
  }
}

/**
 * Get aggregated search analytics
 *
 * @param days - Number of days to look back (default: 30)
 * @returns Aggregated analytics
 */
export async function getSearchAnalytics(
  days: number = 30
): Promise<AggregatedAnalytics> {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Get all searches in the time period
  const { data: searches, error } = await supabase
    .from('search_analytics')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch search analytics: ${error.message}`)
  }

  if (!searches || searches.length === 0) {
    return {
      topQueries: [],
      avgResultCount: 0,
      avgSimilarity: 0,
      avgExecutionTime: 0,
      noResultQueries: [],
      totalSearches: 0,
      uniqueQueries: 0,
    }
  }

  // Count query frequencies
  const queryCounts = new Map<string, number>()
  const noResultQueries: string[] = []
  let totalResults = 0
  let totalSimilarity = 0
  let totalExecutionTime = 0
  let executionTimeCount = 0

  for (const search of searches as any[]) {
    // Count queries
    const count = queryCounts.get(search.query) || 0
    queryCounts.set(search.query, count + 1)

    // Track no-result queries
    if (search.result_count === 0) {
      noResultQueries.push(search.query)
    }

    // Accumulate averages
    totalResults += search.result_count
    totalSimilarity += search.avg_similarity || 0

    if (search.execution_time_ms) {
      totalExecutionTime += search.execution_time_ms
      executionTimeCount++
    }
  }

  // Get top queries
  const topQueries = Array.from(queryCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return {
    topQueries,
    avgResultCount: totalResults / searches.length,
    avgSimilarity: totalSimilarity / searches.length,
    avgExecutionTime: executionTimeCount > 0
      ? totalExecutionTime / executionTimeCount
      : 0,
    noResultQueries: Array.from(new Set(noResultQueries)).slice(0, 20),
    totalSearches: searches.length,
    uniqueQueries: queryCounts.size,
  }
}

/**
 * Get search performance metrics
 *
 * @param days - Number of days to look back
 * @returns Performance metrics
 */
export async function getSearchPerformance(days: number = 7): Promise<{
  p50: number
  p95: number
  p99: number
  avg: number
  min: number
  max: number
}> {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: searches, error } = await supabase
    .from('search_analytics')
    .select('execution_time_ms')
    .gte('created_at', since.toISOString())
    .not('execution_time_ms', 'is', null)
    .order('execution_time_ms', { ascending: true })

  if (error || !searches || searches.length === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 }
  }

  const times = (searches as any[]).map(s => s.execution_time_ms).filter(t => t != null)

  if (times.length === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 }
  }

  const sorted = times.sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)

  return {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    avg: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

/**
 * Get search quality metrics
 *
 * @param days - Number of days to look back
 * @returns Quality metrics
 */
export async function getSearchQuality(days: number = 7): Promise<{
  avgSimilarity: number
  medianSimilarity: number
  lowQualityRate: number // % of searches with avg similarity < 0.5
  noResultRate: number    // % of searches with 0 results
}> {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: searches, error } = await supabase
    .from('search_analytics')
    .select('avg_similarity, result_count')
    .gte('created_at', since.toISOString())

  if (error || !searches || searches.length === 0) {
    return {
      avgSimilarity: 0,
      medianSimilarity: 0,
      lowQualityRate: 0,
      noResultRate: 0,
    }
  }

  const similarities = (searches as any[])
    .map(s => s.avg_similarity || 0)
    .sort((a, b) => a - b)

  const lowQualityCount = (searches as any[]).filter(s =>
    (s.avg_similarity || 0) < 0.5
  ).length

  const noResultCount = (searches as any[]).filter(s => s.result_count === 0).length

  const sum = similarities.reduce((a, b) => a + b, 0)

  return {
    avgSimilarity: sum / similarities.length,
    medianSimilarity: similarities[Math.floor(similarities.length / 2)],
    lowQualityRate: (lowQualityCount / searches.length) * 100,
    noResultRate: (noResultCount / searches.length) * 100,
  }
}

/**
 * Get trending queries
 * Identifies queries that are increasing in frequency
 *
 * @param days - Number of days to look back
 * @returns Trending queries
 */
export async function getTrendingQueries(days: number = 7): Promise<Array<{
  query: string
  count: number
  trend: 'rising' | 'falling' | 'stable'
}>> {
  const supabase = await createClient()

  const now = new Date()
  const midpoint = new Date(now.getTime() - (days / 2) * 24 * 60 * 60 * 1000)
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Get recent half
  const { data: recentSearches } = await supabase
    .from('search_analytics')
    .select('query')
    .gte('created_at', midpoint.toISOString())

  // Get older half
  const { data: olderSearches } = await supabase
    .from('search_analytics')
    .select('query')
    .gte('created_at', start.toISOString())
    .lt('created_at', midpoint.toISOString())

  if (!recentSearches || !olderSearches) {
    return []
  }

  // Count frequencies
  const recentCountsMap: Record<string, number> = {}
  const olderCountsMap: Record<string, number> = {}

  for (const s of recentSearches as any[]) {
    recentCountsMap[s.query] = (recentCountsMap[s.query] || 0) + 1
  }

  for (const s of olderSearches as any[]) {
    olderCountsMap[s.query] = (olderCountsMap[s.query] || 0) + 1
  }

  // Calculate trends
  const allQueries = new Set([...Object.keys(recentCountsMap), ...Object.keys(olderCountsMap)])
  const trends = Array.from(allQueries).map(query => {
    const recent = recentCountsMap[query] || 0
    const older = olderCountsMap[query] || 0
    const total = recent + older

    let trend: 'rising' | 'falling' | 'stable'
    if (recent > older * 1.5) {
      trend = 'rising'
    } else if (older > recent * 1.5) {
      trend = 'falling'
    } else {
      trend = 'stable'
    }

    return { query, count: total, trend }
  })

  // Return top rising queries
  return trends
    .filter(t => t.trend === 'rising')
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

/**
 * Clean up old analytics data
 * Should be run periodically to prevent unbounded growth
 *
 * @param keepDays - Number of days to keep (default: 90)
 */
export async function cleanupOldAnalytics(keepDays: number = 90): Promise<number> {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - keepDays)

  const { data, error } = await supabase
    .from('search_analytics')
    .delete()
    .lt('created_at', cutoff.toISOString())
    .select('id')

  if (error) {
    throw new Error(`Failed to cleanup analytics: ${error.message}`)
  }

  return data?.length || 0
}
