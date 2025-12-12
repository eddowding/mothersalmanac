/**
 * Wiki Cache Monitoring & Logging
 *
 * Tracks cache hits, misses, and events for debugging and analytics.
 * In production, this can be extended to send metrics to monitoring services.
 */

import { CACHE_CONFIG } from './config'

/**
 * Cache event types
 */
export type CacheEvent = 'hit' | 'miss' | 'regenerate' | 'invalidate' | 'warm' | 'error'

/**
 * Cache event metadata
 */
interface CacheEventMetadata {
  timestamp?: string
  duration_ms?: number
  confidence_score?: number
  view_count?: number
  error?: string
  [key: string]: unknown
}

/**
 * In-memory cache statistics
 * Reset on server restart
 */
const stats = {
  hits: 0,
  misses: 0,
  regenerations: 0,
  invalidations: 0,
  warmings: 0,
  errors: 0,
  startTime: new Date(),
}

/**
 * Log a cache event
 *
 * Logs to console in development, can be extended to send to
 * monitoring services in production (e.g., Vercel Analytics, Datadog, Sentry)
 */
export function logCacheEvent(
  event: CacheEvent,
  slug: string,
  metadata?: CacheEventMetadata
): void {
  const timestamp = new Date().toISOString()

  const logData = {
    event,
    slug,
    timestamp,
    ...metadata,
  }

  // Console logging (always enabled for debugging)
  const emoji = getEventEmoji(event)
  console.log(`${emoji} [Wiki Cache ${event.toUpperCase()}] ${slug}`, metadata || '')

  // Update in-memory stats
  updateStats(event)

  // In production, send to monitoring service
  if (CACHE_CONFIG.enableAnalytics && process.env.NODE_ENV === 'production') {
    sendToAnalytics(logData).catch((err) => {
      console.error('Failed to send analytics:', err)
    })
  }
}

/**
 * Get emoji for event type
 */
function getEventEmoji(event: CacheEvent): string {
  switch (event) {
    case 'hit':
      return '✅'
    case 'miss':
      return '❌'
    case 'regenerate':
      return '🔄'
    case 'invalidate':
      return '🗑️'
    case 'warm':
      return '🔥'
    case 'error':
      return '⚠️'
    default:
      return '📊'
  }
}

/**
 * Update in-memory statistics
 */
function updateStats(event: CacheEvent): void {
  switch (event) {
    case 'hit':
      stats.hits++
      break
    case 'miss':
      stats.misses++
      break
    case 'regenerate':
      stats.regenerations++
      break
    case 'invalidate':
      stats.invalidations++
      break
    case 'warm':
      stats.warmings++
      break
    case 'error':
      stats.errors++
      break
  }
}

/**
 * Record a cache hit
 */
export function recordCacheHit(slug: string, metadata?: CacheEventMetadata): void {
  logCacheEvent('hit', slug, metadata)
}

/**
 * Record a cache miss
 */
export function recordCacheMiss(slug: string, metadata?: CacheEventMetadata): void {
  logCacheEvent('miss', slug, metadata)
}

/**
 * Record a regeneration
 */
export function recordRegeneration(slug: string, metadata?: CacheEventMetadata): void {
  logCacheEvent('regenerate', slug, metadata)
}

/**
 * Record an invalidation
 */
export function recordInvalidation(slug: string, metadata?: CacheEventMetadata): void {
  logCacheEvent('invalidate', slug, metadata)
}

/**
 * Record a cache warming event
 */
export function recordWarming(slug: string, metadata?: CacheEventMetadata): void {
  logCacheEvent('warm', slug, metadata)
}

/**
 * Record an error
 */
export function recordError(slug: string, error: Error | string, metadata?: CacheEventMetadata): void {
  logCacheEvent('error', slug, {
    ...metadata,
    error: error instanceof Error ? error.message : error,
  })
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  const total = stats.hits + stats.misses
  return total === 0 ? 0 : stats.hits / total
}

/**
 * Get all cache statistics
 */
export function getCacheStatistics() {
  const total = stats.hits + stats.misses
  const uptime = Date.now() - stats.startTime.getTime()

  return {
    hits: stats.hits,
    misses: stats.misses,
    total_requests: total,
    hit_rate: getCacheHitRate(),
    regenerations: stats.regenerations,
    invalidations: stats.invalidations,
    warmings: stats.warmings,
    errors: stats.errors,
    uptime_ms: uptime,
    uptime_hours: uptime / (1000 * 60 * 60),
    started_at: stats.startTime.toISOString(),
  }
}

/**
 * Reset statistics (for testing)
 */
export function resetStatistics(): void {
  stats.hits = 0
  stats.misses = 0
  stats.regenerations = 0
  stats.invalidations = 0
  stats.warmings = 0
  stats.errors = 0
  stats.startTime = new Date()
}

/**
 * Send analytics to monitoring service
 * Placeholder for integration with services like:
 * - Vercel Analytics
 * - Datadog
 * - Sentry
 * - Custom analytics endpoint
 */
async function sendToAnalytics(data: unknown): Promise<void> {
  // Example: Send to custom analytics endpoint
  // if (process.env.ANALYTICS_ENDPOINT) {
  //   await fetch(process.env.ANALYTICS_ENDPOINT, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(data),
  //   })
  // }

  // Example: Send to Vercel Analytics
  // if (typeof window !== 'undefined' && window.va) {
  //   window.va('track', 'wiki_cache_event', data)
  // }

  // For now, just log that analytics would be sent
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Analytics] Would send:', data)
  }
}

/**
 * Performance timer helper
 */
export class PerformanceTimer {
  private startTime: number

  constructor() {
    this.startTime = performance.now()
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsed(): number {
    return Math.round(performance.now() - this.startTime)
  }

  /**
   * Get elapsed time and log it
   */
  elapsedAndLog(label: string): number {
    const elapsed = this.elapsed()
    console.debug(`⏱️  [${label}] ${elapsed}ms`)
    return elapsed
  }
}

/**
 * Create a performance timer
 */
export function createTimer(): PerformanceTimer {
  return new PerformanceTimer()
}
