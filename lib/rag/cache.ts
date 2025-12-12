/**
 * Search caching layer for RAG system
 *
 * Provides in-memory LRU cache for search results to reduce
 * database load and improve response times for repeated queries.
 */

import type { SearchResult, SearchOptions } from './search'

/**
 * Cache entry with timestamp and TTL
 */
interface CacheEntry {
  results: SearchResult[]
  timestamp: number
  hits: number
}

/**
 * LRU Cache implementation for search results
 */
class SearchCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number
  private ttlMs: number

  constructor(maxSize: number = 100, ttlMinutes: number = 5) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttlMs = ttlMinutes * 60 * 1000
  }

  /**
   * Generate cache key from query and options
   */
  private generateKey(query: string, options?: SearchOptions): string {
    const normalizedQuery = query.trim().toLowerCase()
    const optionsStr = JSON.stringify(options || {})
    return `${normalizedQuery}:${optionsStr}`
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp
    return age < this.ttlMs
  }

  /**
   * Get cached search results
   */
  get(query: string, options?: SearchOptions): SearchResult[] | null {
    const key = this.generateKey(query, options)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (!this.isValid(entry)) {
      this.cache.delete(key)
      return null
    }

    // Update hit count and move to end (LRU)
    entry.hits++
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.results
  }

  /**
   * Set cached search results
   */
  set(query: string, options: SearchOptions, results: SearchResult[]): void {
    const key = this.generateKey(query, options)

    // If at capacity, remove oldest entry (first in Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove expired entries
   */
  prune(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    this.cache.forEach((entry, key) => {
      if (!this.isValid(entry)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    ttlMinutes: number
    entries: Array<{
      query: string
      hits: number
      age: number
    }>
  } {
    const now = Date.now()
    const entryArray: Array<[string, CacheEntry]> = []
    this.cache.forEach((entry, key) => {
      entryArray.push([key, entry])
    })
    const entries = entryArray.map(([key, entry]) => {
      const query = key.split(':')[0]
      return {
        query,
        hits: entry.hits,
        age: Math.floor((now - entry.timestamp) / 1000), // seconds
      }
    })

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttlMs / (60 * 1000),
      entries: entries.sort((a, b) => b.hits - a.hits),
    }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const entries = Array.from(this.cache.values())
    if (entries.length === 0) return 0

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const totalRequests = entries.length + totalHits

    return totalRequests > 0 ? totalHits / totalRequests : 0
  }
}

// Global cache instance
const globalCache = new SearchCache(100, 5)

/**
 * Get cached search results
 *
 * @param query - Search query
 * @param options - Search options
 * @returns Cached results or null if not found/expired
 */
export async function getCachedSearch(
  query: string,
  options?: SearchOptions
): Promise<SearchResult[] | null> {
  return globalCache.get(query, options)
}

/**
 * Cache search results
 *
 * @param query - Search query
 * @param options - Search options
 * @param results - Search results to cache
 */
export async function setCachedSearch(
  query: string,
  options: SearchOptions,
  results: SearchResult[]
): Promise<void> {
  globalCache.set(query, options, results)
}

/**
 * Clear all cached search results
 */
export function clearSearchCache(): void {
  globalCache.clear()
}

/**
 * Remove expired cache entries
 * Should be called periodically (e.g., via cron job)
 */
export function pruneSearchCache(): void {
  globalCache.prune()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): ReturnType<SearchCache['getStats']> {
  return globalCache.getStats()
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  return globalCache.getHitRate()
}

/**
 * Wrapper for vector search with caching
 *
 * @param searchFn - Search function to wrap
 * @param query - Search query
 * @param options - Search options
 * @returns Search results (from cache or fresh)
 */
export async function cachedSearch<T extends SearchResult = SearchResult>(
  searchFn: (query: string, options?: SearchOptions) => Promise<T[]>,
  query: string,
  options?: SearchOptions
): Promise<T[]> {
  // Try to get from cache first
  const cached = await getCachedSearch(query, options)
  if (cached) {
    return cached as T[]
  }

  // If not in cache, execute search
  const results = await searchFn(query, options)

  // Cache the results
  await setCachedSearch(query, options || {}, results)

  return results
}

/**
 * Invalidate cache entries containing specific documents
 * Useful when documents are updated or deleted
 *
 * @param documentIds - Document IDs to invalidate
 */
export function invalidateCacheByDocuments(documentIds: string[]): void {
  const stats = globalCache.getStats()
  const documentIdSet = new Set(documentIds)

  // We can't easily check which cached results contain specific documents
  // without storing more metadata, so for now we just clear the entire cache
  // In production, you might want to store document IDs with cache entries
  globalCache.clear()
}

// Automatically prune cache every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    pruneSearchCache()
  }, 10 * 60 * 1000)
}
