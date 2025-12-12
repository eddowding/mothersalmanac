/**
 * Performance optimization utilities for Mother's Almanac
 * Provides cache headers, ISR config, and performance monitoring
 */

/**
 * Cache control headers for different content types
 */
export const CacheHeaders = {
  // Static assets (images, fonts, etc.)
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },

  // Wiki pages - cache with revalidation
  wiki: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  },

  // Popular wiki pages - cache longer
  wikiPopular: {
    'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=604800',
  },

  // API responses - short cache
  api: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  },

  // No cache for dynamic/personalized content
  noCache: {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },

  // CDN cache with edge revalidation
  edge: {
    'Cache-Control': 'public, s-maxage=3600',
    'CDN-Cache-Control': 'public, s-maxage=86400',
    'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
  },
} as const

/**
 * ISR (Incremental Static Regeneration) configuration
 */
export const ISRConfig = {
  // Homepage - revalidate hourly
  home: {
    revalidate: 3600, // 1 hour
  },

  // Popular wiki pages - revalidate every 6 hours
  wikiPopular: {
    revalidate: 21600, // 6 hours
  },

  // Regular wiki pages - revalidate daily
  wiki: {
    revalidate: 86400, // 24 hours
  },

  // Static pages - revalidate weekly
  static: {
    revalidate: 604800, // 1 week
  },
} as const

/**
 * Determine if a wiki page should use ISR based on popularity
 *
 * @param viewCount - Number of page views
 * @returns Whether to enable ISR for this page
 */
export function shouldUseISR(viewCount: number): boolean {
  const POPULAR_THRESHOLD = parseInt(
    process.env.WIKI_POPULAR_THRESHOLD || '10',
    10
  )
  return viewCount >= POPULAR_THRESHOLD
}

/**
 * Get appropriate cache headers for a wiki page
 *
 * @param viewCount - Number of page views
 * @returns Cache control headers
 */
export function getWikiCacheHeaders(viewCount: number): Record<string, string> {
  if (shouldUseISR(viewCount)) {
    return CacheHeaders.wikiPopular
  }
  return CacheHeaders.wiki
}

/**
 * Get ISR revalidation time for a wiki page
 *
 * @param viewCount - Number of page views
 * @returns Revalidation time in seconds
 */
export function getWikiRevalidationTime(viewCount: number): number {
  if (shouldUseISR(viewCount)) {
    return ISRConfig.wikiPopular.revalidate
  }
  return ISRConfig.wiki.revalidate
}

/**
 * Add cache headers to a Response
 *
 * @param response - Response object
 * @param headers - Cache headers to add
 * @returns Response with cache headers
 */
export function addCacheHeaders(
  response: Response,
  headers: Record<string, string>
): Response {
  const newHeaders = new Headers(response.headers)
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

/**
 * Performance timing marks
 */
export const PerfMarks = {
  // Mark the start of an operation
  start: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`)
    }
  },

  // Mark the end of an operation and measure duration
  end: (name: string): number => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`)
      try {
        const measure = performance.measure(
          name,
          `${name}-start`,
          `${name}-end`
        )
        return measure.duration
      } catch {
        return 0
      }
    }
    return 0
  },

  // Clear all marks for an operation
  clear: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.clearMarks(`${name}-start`)
      performance.clearMarks(`${name}-end`)
      performance.clearMeasures(name)
    }
  },
} as const

/**
 * Prefetch hints for improving navigation performance
 */
export const PrefetchHints = {
  // DNS prefetch for external domains
  dns: (domains: string[]) =>
    domains.map((domain) => ({
      rel: 'dns-prefetch',
      href: domain,
    })),

  // Preconnect to external APIs
  preconnect: (urls: string[]) =>
    urls.map((url) => ({
      rel: 'preconnect',
      href: url,
      crossOrigin: 'anonymous',
    })),

  // Prefetch critical resources
  prefetch: (urls: string[]) =>
    urls.map((url) => ({
      rel: 'prefetch',
      href: url,
    })),

  // Preload critical resources
  preload: (resources: Array<{ href: string; as: string; type?: string }>) =>
    resources.map(({ href, as, type }) => ({
      rel: 'preload',
      href,
      as,
      ...(type && { type }),
    })),
} as const

/**
 * Bundle analysis configuration
 */
export const BundleConfig = {
  // Maximum bundle sizes (in bytes)
  maxSizes: {
    page: 200 * 1024, // 200KB
    shared: 100 * 1024, // 100KB
    vendor: 500 * 1024, // 500KB
  },

  // Modules to analyze
  analyzeModules: process.env.ANALYZE === 'true',
} as const
