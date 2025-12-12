/**
 * Rate limiting and request deduplication for wiki generation
 *
 * Prevents abuse and reduces redundant API calls by:
 * - Deduplicating concurrent requests for the same page
 * - Rate limiting generation requests
 * - Caching in-flight requests
 */

/**
 * In-memory queue for tracking in-flight generation requests
 * In production, this should be replaced with Redis or similar
 */
const generationQueue = new Map<string, Promise<any>>()

/**
 * Deduplicate concurrent requests for the same page
 *
 * If multiple requests come in for the same slug simultaneously,
 * only one will actually execute and all others will wait for
 * that result.
 *
 * @param slug - Page slug to generate
 * @param generateFn - Generation function to call
 * @returns Result from generation function
 */
export async function deduplicatedGeneration<T>(
  slug: string,
  generateFn: () => Promise<T>
): Promise<T> {
  // Check if there's already a request in flight for this slug
  if (generationQueue.has(slug)) {
    console.log(`[Throttle] Deduplicating request for: ${slug}`)
    return generationQueue.get(slug)! as Promise<T>
  }

  // Create new promise and track it
  const promise = generateFn().finally(() => {
    // Clean up after completion
    generationQueue.delete(slug)
  })

  generationQueue.set(slug, promise)

  return promise
}

/**
 * Get current queue status
 *
 * @returns Array of slugs currently being generated
 */
export function getQueueStatus(): string[] {
  return Array.from(generationQueue.keys())
}

/**
 * Clear a specific item from the queue (for error recovery)
 *
 * @param slug - Slug to clear
 */
export function clearFromQueue(slug: string): void {
  generationQueue.delete(slug)
}

/**
 * Simple rate limiter for generation requests
 * Tracks requests per time window
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  /**
   * Check if a request is allowed
   *
   * @param key - Identifier (e.g., IP address, user ID)
   * @returns Whether request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []

    // Filter out old requests outside the window
    const recentTimestamps = timestamps.filter(
      time => now - time < this.windowMs
    )

    if (recentTimestamps.length >= this.maxRequests) {
      return false
    }

    // Add current request
    recentTimestamps.push(now)
    this.requests.set(key, recentTimestamps)

    return true
  }

  /**
   * Get remaining requests for a key
   *
   * @param key - Identifier
   * @returns Number of remaining requests
   */
  getRemaining(key: string): number {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []
    const recentCount = timestamps.filter(
      time => now - time < this.windowMs
    ).length

    return Math.max(0, this.maxRequests - recentCount)
  }

  /**
   * Get time until next request is allowed
   *
   * @param key - Identifier
   * @returns Milliseconds until reset, or 0 if allowed now
   */
  getResetTime(key: string): number {
    const timestamps = this.requests.get(key) || []
    if (timestamps.length === 0) return 0

    const now = Date.now()
    const oldestRelevant = timestamps.find(
      time => now - time < this.windowMs
    )

    if (!oldestRelevant) return 0

    const resetTime = oldestRelevant + this.windowMs - now
    return Math.max(0, resetTime)
  }

  /**
   * Clear rate limit data for a key
   *
   * @param key - Identifier
   */
  clear(key: string): void {
    this.requests.delete(key)
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.requests.clear()
  }
}

// Global rate limiter instance
// In production, this should be Redis-backed
const globalRateLimiter = new RateLimiter(
  60000,  // 1 minute window
  10      // 10 requests per minute
)

/**
 * Check if a generation request is rate limited
 *
 * @param identifier - Request identifier (IP, user ID, etc.)
 * @returns Rate limit status
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  remaining: number
  resetInMs: number
} {
  const allowed = globalRateLimiter.isAllowed(identifier)
  const remaining = globalRateLimiter.getRemaining(identifier)
  const resetInMs = globalRateLimiter.getResetTime(identifier)

  return { allowed, remaining, resetInMs }
}

/**
 * Clear rate limit for an identifier
 *
 * @param identifier - Identifier to clear
 */
export function clearRateLimit(identifier: string): void {
  globalRateLimiter.clear(identifier)
}

/**
 * Get rate limit headers for HTTP responses
 *
 * @param identifier - Request identifier
 * @returns Headers object
 */
export function getRateLimitHeaders(identifier: string): Record<string, string> {
  const remaining = globalRateLimiter.getRemaining(identifier)
  const resetInMs = globalRateLimiter.getResetTime(identifier)
  const resetAt = new Date(Date.now() + resetInMs).toISOString()

  return {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetAt,
  }
}

/**
 * Execution queue for sequential processing
 * Useful for ensuring generations don't overwhelm the API
 */
class ExecutionQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private concurrency: number

  constructor(concurrency: number = 1) {
    this.concurrency = concurrency
  }

  /**
   * Add a task to the queue
   *
   * @param task - Async function to execute
   * @returns Promise that resolves with task result
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.process()
    })
  }

  /**
   * Process queued tasks
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        await task()
      }
    }

    this.processing = false
  }

  /**
   * Get current queue length
   */
  getLength(): number {
    return this.queue.length
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = []
  }
}

// Global execution queue
const executionQueue = new ExecutionQueue(1)

/**
 * Queue a generation request for sequential execution
 *
 * @param task - Generation task
 * @returns Promise with result
 */
export async function queueGeneration<T>(
  task: () => Promise<T>
): Promise<T> {
  return executionQueue.enqueue(task)
}

/**
 * Get current queue length
 */
export function getQueueLength(): number {
  return executionQueue.getLength()
}

/**
 * Cooldown tracker to prevent rapid regeneration of the same page
 */
class CooldownTracker {
  private cooldowns = new Map<string, number>()
  private defaultCooldownMs: number

  constructor(cooldownMs: number = 30000) {
    this.defaultCooldownMs = cooldownMs
  }

  /**
   * Check if a slug is in cooldown
   *
   * @param slug - Page slug
   * @returns Whether the slug is in cooldown
   */
  isInCooldown(slug: string): boolean {
    const cooldownUntil = this.cooldowns.get(slug)
    if (!cooldownUntil) return false

    const now = Date.now()
    if (now >= cooldownUntil) {
      this.cooldowns.delete(slug)
      return false
    }

    return true
  }

  /**
   * Set cooldown for a slug
   *
   * @param slug - Page slug
   * @param durationMs - Cooldown duration (optional)
   */
  setCooldown(slug: string, durationMs?: number): void {
    const duration = durationMs || this.defaultCooldownMs
    this.cooldowns.set(slug, Date.now() + duration)
  }

  /**
   * Get remaining cooldown time
   *
   * @param slug - Page slug
   * @returns Remaining milliseconds, or 0 if not in cooldown
   */
  getRemainingCooldown(slug: string): number {
    const cooldownUntil = this.cooldowns.get(slug)
    if (!cooldownUntil) return 0

    const remaining = cooldownUntil - Date.now()
    return Math.max(0, remaining)
  }

  /**
   * Clear cooldown for a slug
   *
   * @param slug - Page slug
   */
  clear(slug: string): void {
    this.cooldowns.delete(slug)
  }

  /**
   * Clear all cooldowns
   */
  clearAll(): void {
    this.cooldowns.clear()
  }
}

// Global cooldown tracker
const cooldownTracker = new CooldownTracker(30000) // 30 second cooldown

/**
 * Check if a page is in regeneration cooldown
 *
 * @param slug - Page slug
 * @returns Cooldown status
 */
export function checkCooldown(slug: string): {
  inCooldown: boolean
  remainingMs: number
} {
  return {
    inCooldown: cooldownTracker.isInCooldown(slug),
    remainingMs: cooldownTracker.getRemainingCooldown(slug),
  }
}

/**
 * Set cooldown for a page after generation
 *
 * @param slug - Page slug
 * @param durationMs - Cooldown duration (optional)
 */
export function setCooldown(slug: string, durationMs?: number): void {
  cooldownTracker.setCooldown(slug, durationMs)
}

/**
 * Clear cooldown for a page
 *
 * @param slug - Page slug
 */
export function clearCooldown(slug: string): void {
  cooldownTracker.clear(slug)
}
