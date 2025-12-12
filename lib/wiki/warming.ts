/**
 * Wiki Cache Warming
 *
 * Pregenerate popular pages to ensure fast initial loads.
 * Can be triggered manually by admins or run during deployment.
 */

import { generateWikiPage } from './generator'
import { upsertPage } from './cache-db'
import { queryToSlug } from './slugs'
import { CACHE_CONFIG } from './config'
import { recordWarming, createTimer } from './monitoring'

/**
 * Popular topics to pregenerate
 * These are high-traffic pages that should be cached on startup
 */
const POPULAR_TOPICS = [
  // Pregnancy topics
  'pregnancy nutrition',
  'pregnancy symptoms',
  'prenatal vitamins',
  'pregnancy exercise',
  'pregnancy diet',
  'morning sickness',
  'pregnancy complications',
  'pregnancy milestones',

  // Newborn care
  'newborn care',
  'newborn sleep',
  'breastfeeding',
  'bottle feeding',
  'baby sleep training',
  'infant development',
  'baby milestones',

  // Common concerns
  'teething symptoms',
  'teething remedies',
  'diaper rash',
  'baby colic',
  'postpartum recovery',
  'postpartum depression',

  // Development
  'baby development',
  'baby development milestones',
  'infant brain development',
  'baby motor skills',

  // Feeding
  'introducing solids',
  'baby food recipes',
  'breastfeeding tips',
  'pumping breast milk',
  'formula feeding',

  // Sleep
  'baby sleep schedule',
  'sleep regression',
  'bedtime routine',
  'co-sleeping',

  // Health
  'baby vaccines',
  'infant illness',
  'baby fever',
  'baby rashes',
] as const

/**
 * Result of a warming operation
 */
export interface WarmingResult {
  slug: string
  status: 'success' | 'error'
  error?: string
  confidenceScore?: number
  durationMs?: number
}

/**
 * Summary of warming operation
 */
export interface WarmingSummary {
  total: number
  success: number
  failed: number
  totalDurationMs: number
  avgDurationMs: number
  results: WarmingResult[]
}

/**
 * Warm the cache with popular topics
 *
 * Pregenerates pages for commonly accessed content.
 * Should be run during deployment or manually by admins.
 *
 * @param topics - Optional custom topics to warm (defaults to POPULAR_TOPICS)
 * @param options - Warming options
 * @returns Summary of warming operation
 */
export async function warmCache(
  topics: readonly string[] = POPULAR_TOPICS,
  options: {
    /** Skip topics that are already cached */
    skipExisting?: boolean
    /** Delay between generations in milliseconds */
    delayMs?: number
    /** Max number of topics to warm */
    maxTopics?: number
  } = {}
): Promise<WarmingSummary> {
  const { skipExisting = true, delayMs = CACHE_CONFIG.regenerationDelayMs, maxTopics } = options

  const topicsToWarm = maxTopics ? topics.slice(0, maxTopics) : topics

  console.log(`🔥 Starting cache warming for ${topicsToWarm.length} topics...`)
  console.log(`   Skip existing: ${skipExisting}`)
  console.log(`   Delay: ${delayMs}ms between pages`)

  const totalTimer = createTimer()
  const results: WarmingResult[] = []

  for (const topic of topicsToWarm) {
    const slug = queryToSlug(topic)

    try {
      // Check if page already exists and skip if configured
      if (skipExisting) {
        // We'll skip this check for now and just regenerate
        // In a real implementation, you'd check getCachedPage first
      }

      console.log(`  Warming: ${topic}...`)
      const pageTimer = createTimer()

      // Generate the page
      const page = await generateWikiPage(topic)

      // Cache it
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

      const durationMs = pageTimer.elapsed()

      recordWarming(slug, {
        confidence_score: page.confidence_score,
        duration_ms: durationMs,
      })

      results.push({
        slug,
        status: 'success',
        confidenceScore: page.confidence_score,
        durationMs,
      })

      console.log(
        `    ✅ ${slug} (confidence: ${page.confidence_score.toFixed(2)}, ${durationMs}ms)`
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      results.push({
        slug,
        status: 'error',
        error: errorMessage,
      })

      console.error(`    ❌ ${slug}: ${errorMessage}`)
    }

    // Rate limiting delay
    if (delayMs > 0 && topicsToWarm.indexOf(topic) < topicsToWarm.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  const totalDurationMs = totalTimer.elapsed()
  const summary: WarmingSummary = {
    total: results.length,
    success: results.filter((r) => r.status === 'success').length,
    failed: results.filter((r) => r.status === 'error').length,
    totalDurationMs,
    avgDurationMs: Math.round(totalDurationMs / results.length),
    results,
  }

  console.log(`🔥 Cache warming complete!`)
  console.log(`   Total: ${summary.total}`)
  console.log(`   Success: ${summary.success}`)
  console.log(`   Failed: ${summary.failed}`)
  console.log(`   Duration: ${(totalDurationMs / 1000).toFixed(1)}s`)
  console.log(`   Avg per page: ${(summary.avgDurationMs / 1000).toFixed(1)}s`)

  return summary
}

/**
 * Warm cache for a specific topic
 *
 * Useful for warming a single page on demand.
 */
export async function warmCacheTopic(topic: string): Promise<WarmingResult> {
  const slug = queryToSlug(topic)

  try {
    console.log(`🔥 Warming cache for: ${topic}`)
    const timer = createTimer()

    const page = await generateWikiPage(topic)

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

    const durationMs = timer.elapsed()

    recordWarming(slug, {
      confidence_score: page.confidence_score,
      duration_ms: durationMs,
    })

    console.log(
      `✅ Warmed: ${slug} (confidence: ${page.confidence_score.toFixed(2)}, ${durationMs}ms)`
    )

    return {
      slug,
      status: 'success',
      confidenceScore: page.confidence_score,
      durationMs,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error(`❌ Failed to warm ${slug}:`, errorMessage)

    return {
      slug,
      status: 'error',
      error: errorMessage,
    }
  }
}

/**
 * Get the list of popular topics for warming
 */
export function getPopularTopics(): readonly string[] {
  return POPULAR_TOPICS
}

/**
 * Get warming recommendations based on cache stats
 *
 * Analyzes current cache and suggests topics to warm.
 */
export async function getWarmingRecommendations(): Promise<{
  missing: string[]
  lowConfidence: string[]
  stale: string[]
}> {
  // This is a placeholder implementation
  // In a real implementation, you'd:
  // 1. Check which popular topics are not cached
  // 2. Find cached topics with low confidence
  // 3. Find stale popular pages

  return {
    missing: [], // Topics not yet cached
    lowConfidence: [], // Topics with confidence < threshold
    stale: [], // Popular topics that are stale
  }
}

/**
 * Estimate warming time
 *
 * Estimates how long it will take to warm the cache.
 */
export function estimateWarmingTime(
  topicCount: number = POPULAR_TOPICS.length,
  avgGenerationTimeMs: number = 5000,
  delayMs: number = CACHE_CONFIG.regenerationDelayMs
): {
  totalMs: number
  totalMinutes: number
  perPage: number
} {
  const totalMs = topicCount * (avgGenerationTimeMs + delayMs)

  return {
    totalMs,
    totalMinutes: Math.round(totalMs / 60000),
    perPage: avgGenerationTimeMs + delayMs,
  }
}

/**
 * Validate warming configuration
 *
 * Checks if warming is properly configured.
 */
export function validateWarmingConfig(): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // POPULAR_TOPICS is a const array, so this is only for runtime safety
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if ((POPULAR_TOPICS as readonly string[]).length === 0) {
    issues.push('No popular topics defined for warming')
  }

  if (CACHE_CONFIG.regenerationDelayMs < 100) {
    issues.push('Regeneration delay too short, may cause rate limiting')
  }

  if (CACHE_CONFIG.regenerationDelayMs > 10000) {
    issues.push('Regeneration delay very long, warming will take a long time')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Format warming summary for display
 */
export function formatWarmingSummary(summary: WarmingSummary): string {
  const successRate = ((summary.success / summary.total) * 100).toFixed(1)
  const avgTime = (summary.avgDurationMs / 1000).toFixed(1)

  return `
Cache Warming Summary
=====================
Total Topics: ${summary.total}
Success: ${summary.success} (${successRate}%)
Failed: ${summary.failed}
Total Time: ${(summary.totalDurationMs / 1000).toFixed(1)}s
Average Per Page: ${avgTime}s

${summary.results
  .map((r) =>
    r.status === 'success'
      ? `✅ ${r.slug} (${r.confidenceScore?.toFixed(2)}, ${(r.durationMs! / 1000).toFixed(1)}s)`
      : `❌ ${r.slug}: ${r.error}`
  )
  .join('\n')}
  `.trim()
}
