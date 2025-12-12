/**
 * Wiki Cache Configuration
 *
 * Central configuration for the Mother's Almanac wiki caching system.
 * All timeouts, limits, and thresholds are defined here.
 */

export const CACHE_CONFIG = {
  /**
   * Time-to-live for cached pages in hours
   * Default: 48 hours
   */
  ttl: parseInt(process.env.WIKI_CACHE_TTL_HOURS || '48', 10),

  /**
   * Maximum number of pages to cache
   * Prevents unbounded growth
   * Default: 1000 pages
   */
  maxPages: parseInt(process.env.WIKI_MAX_CACHED_PAGES || '1000', 10),

  /**
   * Number of stale pages to regenerate per cron run
   * Default: 10 pages
   */
  regenerationBatchSize: parseInt(process.env.WIKI_REGEN_BATCH_SIZE || '10', 10),

  /**
   * View count threshold for a page to be considered "popular"
   * Popular pages are prioritized for regeneration
   * Default: 10 views
   */
  popularThreshold: parseInt(process.env.WIKI_POPULAR_THRESHOLD || '10', 10),

  /**
   * Confidence score threshold for showing warnings to users
   * Pages below this threshold show a "low confidence" notice
   * Default: 0.4 (40%)
   */
  lowConfidenceThreshold: parseFloat(process.env.WIKI_LOW_CONFIDENCE_THRESHOLD || '0.4'),

  /**
   * Minimum confidence score to publish a page
   * Pages below this are saved as drafts
   * Default: 0.3 (30%)
   */
  minPublishConfidence: parseFloat(process.env.WIKI_MIN_PUBLISH_CONFIDENCE || '0.3'),

  /**
   * Rate limit delay between regenerations (milliseconds)
   * Prevents API throttling
   * Default: 1000ms (1 second)
   */
  regenerationDelayMs: parseInt(process.env.WIKI_REGEN_DELAY_MS || '1000', 10),

  /**
   * Enable cache warming on startup
   * Default: false (manual trigger only)
   */
  enableWarmingOnStartup: process.env.WIKI_ENABLE_WARMING === 'true',

  /**
   * Enable analytics tracking for cache hits/misses
   * Default: true
   */
  enableAnalytics: process.env.WIKI_ENABLE_ANALYTICS !== 'false',

  /**
   * Cron schedule for background regeneration
   * Default: every 6 hours
   */
  cronSchedule: process.env.WIKI_CRON_SCHEDULE || '0 */6 * * *',
} as const

/**
 * Validation function to check config is valid
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (CACHE_CONFIG.ttl < 1 || CACHE_CONFIG.ttl > 168) {
    errors.push('TTL must be between 1 and 168 hours (1 week)')
  }

  if (CACHE_CONFIG.maxPages < 10) {
    errors.push('Max pages must be at least 10')
  }

  if (CACHE_CONFIG.regenerationBatchSize < 1 || CACHE_CONFIG.regenerationBatchSize > 50) {
    errors.push('Regeneration batch size must be between 1 and 50')
  }

  if (CACHE_CONFIG.lowConfidenceThreshold < 0 || CACHE_CONFIG.lowConfidenceThreshold > 1) {
    errors.push('Low confidence threshold must be between 0 and 1')
  }

  if (CACHE_CONFIG.minPublishConfidence < 0 || CACHE_CONFIG.minPublishConfidence > 1) {
    errors.push('Min publish confidence must be between 0 and 1')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get TTL expiration timestamp from now
 */
export function getTTLExpiration(): Date {
  return new Date(Date.now() + CACHE_CONFIG.ttl * 60 * 60 * 1000)
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(timestamp: Date | string): boolean {
  const expiresAt = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return expiresAt < new Date()
}

/**
 * Format cache config for logging
 */
export function formatConfig(): string {
  return Object.entries(CACHE_CONFIG)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n')
}
