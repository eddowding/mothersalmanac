/**
 * Web Search Augmentation for RAG Pipeline
 *
 * Fetches authoritative health content from NHS, WHO, CDC when
 * RAG sources are insufficient. Used in hybrid generation mode.
 */

import { AUTHORITATIVE_DOMAINS } from './prioritization'

// ============================================================================
// Configuration
// ============================================================================

/** Maximum time to wait for a web fetch */
const FETCH_TIMEOUT_MS = 5000

/** Maximum content length to extract per source */
const MAX_CONTENT_LENGTH = 2000

/** User agent for fetching */
const USER_AGENT = 'MothersAlmanac/1.0 (Health Reference Bot)'

/** Cache TTL in milliseconds (24 hours) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** In-memory cache for web results */
const webCache = new Map<string, { result: WebAugmentationResult; fetchedAt: number }>()

/** NHS search base URL */
const NHS_SEARCH_URL = 'https://www.nhs.uk/search/results?q='

/** Known NHS topic patterns for direct URL construction */
const NHS_TOPIC_PATTERNS: Record<string, string> = {
  // Pregnancy and birth
  'pregnancy': '/pregnancy/',
  'labour': '/pregnancy/labour-and-birth/',
  'birth': '/pregnancy/labour-and-birth/',
  'antenatal': '/pregnancy/your-pregnancy-care/',
  'prenatal': '/pregnancy/your-pregnancy-care/',
  // Baby care
  'newborn': '/conditions/baby/',
  'baby': '/conditions/baby/',
  'infant': '/conditions/baby/',
  'breastfeeding': '/conditions/baby/breastfeeding-and-bottle-feeding/',
  'bottle feeding': '/conditions/baby/breastfeeding-and-bottle-feeding/',
  'weaning': '/conditions/baby/weaning-and-feeding/',
  'solid foods': '/conditions/baby/weaning-and-feeding/',
  // Common conditions
  'colic': '/conditions/colic/',
  'reflux': '/conditions/reflux-in-babies/',
  'jaundice': '/conditions/jaundice-newborn/',
  'teething': '/conditions/baby/teething/',
  'fever': '/conditions/fever-in-children/',
  'rash': '/conditions/rashes-babies-and-children/',
  // Development
  'milestones': '/conditions/baby/development/',
  'development': '/conditions/baby/development/',
  // Safety
  'sids': '/conditions/sudden-infant-death-syndrome-sids/',
  'safe sleep': '/conditions/sudden-infant-death-syndrome-sids/',
  'vaccination': '/conditions/vaccinations/',
  'vaccine': '/conditions/vaccinations/',
  'immunisation': '/conditions/vaccinations/',
}

/** CDC topic URL patterns */
const CDC_TOPIC_PATTERNS: Record<string, string> = {
  'milestones': '/ncbddd/actearly/milestones/',
  'development': '/ncbddd/actearly/milestones/',
  'vaccination': '/vaccines/schedules/',
  'vaccine': '/vaccines/schedules/',
  'safe sleep': '/sids/',
  'sids': '/sids/',
  'breastfeeding': '/breastfeeding/',
}

// ============================================================================
// Types
// ============================================================================

export interface WebSearchResult {
  /** Source domain (e.g., 'nhs.uk') */
  domain: string
  /** Full URL */
  url: string
  /** Page title */
  title: string
  /** Extracted content snippet */
  content: string
  /** Whether fetch was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

export interface WebAugmentationResult {
  /** Combined context from all sources */
  context: string
  /** Individual source results */
  sources: WebSearchResult[]
  /** Number of successful fetches */
  successCount: number
  /** Total fetch time in ms */
  fetchTimeMs: number
}

// ============================================================================
// URL Construction
// ============================================================================

/**
 * Build potential NHS URL for a topic
 */
function buildNHSUrl(query: string): string {
  const lowerQuery = query.toLowerCase()

  // Check for known patterns
  for (const [pattern, path] of Object.entries(NHS_TOPIC_PATTERNS)) {
    if (lowerQuery.includes(pattern)) {
      return `https://www.nhs.uk${path}`
    }
  }

  // Fallback to search
  return `${NHS_SEARCH_URL}${encodeURIComponent(query)}`
}

/**
 * Build potential CDC URL for a topic
 */
function buildCDCUrl(query: string): string {
  const lowerQuery = query.toLowerCase()

  // Check for known patterns
  for (const [pattern, path] of Object.entries(CDC_TOPIC_PATTERNS)) {
    if (lowerQuery.includes(pattern)) {
      return `https://www.cdc.gov${path}`
    }
  }

  // Fallback to search
  return `https://search.cdc.gov/search/?query=${encodeURIComponent(query)}&dession=true&affiliate=cdc-main`
}

/**
 * Build WHO URL for a topic (direct to fact sheets)
 */
function buildWHOUrl(query: string): string {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes('breastfeeding') || lowerQuery.includes('infant feeding')) {
    return 'https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding'
  }
  if (lowerQuery.includes('vaccination') || lowerQuery.includes('vaccine') || lowerQuery.includes('immunisation')) {
    return 'https://www.who.int/news-room/fact-sheets/detail/immunization-coverage'
  }
  if (lowerQuery.includes('development') || lowerQuery.includes('growth')) {
    return 'https://www.who.int/tools/child-growth-standards'
  }

  // Fallback to general search
  return `https://www.who.int/search?query=${encodeURIComponent(query)}`
}

// ============================================================================
// Content Extraction
// ============================================================================

/**
 * Extract readable text content from HTML
 * Simple extraction without external dependencies
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Remove navigation, footer, header elements
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')

  // Extract main content if available
  const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  if (mainMatch) {
    text = mainMatch[1]
  } else {
    // Try article tag
    const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    if (articleMatch) {
      text = articleMatch[1]
    }
  }

  // Replace tags with newlines/spaces
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ')
  text = text.replace(/\n\s+/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

/**
 * Extract page title from HTML
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (match) {
    return match[1].replace(/\s*[-|]\s*NHS.*$/i, '').trim()
  }

  // Fallback to h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].trim()
  }

  return 'Untitled'
}

// ============================================================================
// Fetching
// ============================================================================

/**
 * Fetch content from a URL with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch and extract content from a single URL
 */
async function fetchSource(url: string, domain: string): Promise<WebSearchResult> {
  try {
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)

    if (!response.ok) {
      return {
        domain,
        url,
        title: '',
        content: '',
        success: false,
        error: `HTTP ${response.status}`,
      }
    }

    const html = await response.text()
    const title = extractTitle(html)
    let content = extractTextFromHTML(html)

    // Truncate if too long
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH) + '...'
    }

    // Check if we got meaningful content
    if (content.length < 100) {
      return {
        domain,
        url,
        title,
        content: '',
        success: false,
        error: 'Insufficient content extracted',
      }
    }

    return {
      domain,
      url,
      title,
      content,
      success: true,
    }
  } catch (error) {
    return {
      domain,
      url,
      title: '',
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch authoritative health content from NHS, WHO, CDC
 *
 * @param query - The topic to search for
 * @param domains - Which domains to fetch from (default: all)
 * @returns Combined context and individual results
 */
export async function fetchAuthoritativeContent(
  query: string,
  domains: string[] = ['nhs.uk', 'cdc.gov', 'who.int']
): Promise<WebAugmentationResult> {
  const startTime = Date.now()

  // Build URLs for each domain
  const urlsToFetch: Array<{ url: string; domain: string }> = []

  for (const domain of domains) {
    if (domain === 'nhs.uk') {
      urlsToFetch.push({ url: buildNHSUrl(query), domain: 'NHS (nhs.uk)' })
    } else if (domain === 'cdc.gov') {
      urlsToFetch.push({ url: buildCDCUrl(query), domain: 'CDC (cdc.gov)' })
    } else if (domain === 'who.int') {
      urlsToFetch.push({ url: buildWHOUrl(query), domain: 'WHO (who.int)' })
    }
  }

  // Fetch all sources in parallel
  console.log(`[Web Augmentation] Fetching ${urlsToFetch.length} sources for: "${query}"`)

  const results = await Promise.all(
    urlsToFetch.map(({ url, domain }) => fetchSource(url, domain))
  )

  // Filter successful results
  const successful = results.filter(r => r.success)

  // Build combined context
  const contextParts: string[] = []
  for (const result of successful) {
    contextParts.push(`--- ${result.domain}: ${result.title} ---\n${result.content}`)
  }

  const fetchTimeMs = Date.now() - startTime

  console.log(
    `[Web Augmentation] Completed in ${fetchTimeMs}ms: ` +
    `${successful.length}/${results.length} successful`
  )

  return {
    context: contextParts.join('\n\n'),
    sources: results,
    successCount: successful.length,
    fetchTimeMs,
  }
}

/** Extended result type with caching info */
export interface CachedWebAugmentationResult extends WebAugmentationResult {
  cached: boolean
  fetchedAt: Date
}

/**
 * Fetch authoritative content with 24h caching
 *
 * Caches results to avoid repeated fetches for the same query.
 * Cache TTL is 24 hours.
 *
 * @param query - The topic to search for
 * @param domains - Which domains to fetch from
 * @returns Cached or fresh results with cache metadata
 */
export async function fetchAuthoritativeContentCached(
  query: string,
  domains: string[] = ['nhs.uk', 'cdc.gov', 'who.int']
): Promise<CachedWebAugmentationResult> {
  const cacheKey = `${query.toLowerCase().trim()}-${[...domains].sort().join(',')}`
  const cached = webCache.get(cacheKey)

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[Web Augmentation] Cache hit for: "${query}"`)
    return { ...cached.result, cached: true, fetchedAt: new Date(cached.fetchedAt) }
  }

  const result = await fetchAuthoritativeContent(query, domains)
  const fetchedAt = Date.now()
  webCache.set(cacheKey, { result, fetchedAt })

  return { ...result, cached: false, fetchedAt: new Date(fetchedAt) }
}

/**
 * Build enhanced hybrid prompt context with web augmentation
 *
 * Combines RAG context with fetched authoritative content
 *
 * @param ragContext - Context from RAG search
 * @param webContext - Context from web augmentation
 * @param fetchedAt - When the web content was retrieved (for attribution)
 * @returns Combined context string
 */
export function buildAugmentedContext(
  ragContext: string,
  webContext: string,
  fetchedAt?: Date
): string {
  if (!webContext || webContext.length === 0) {
    return ragContext
  }

  const dateStr = fetchedAt
    ? ` (Retrieved: ${fetchedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`
    : ''

  return `# Book Sources (From RAG)
${ragContext}

# Official Health Organisation Sources${dateStr}
Note: The following is recent guidance from official health organisations. Prioritise this information for medical facts, ages, and safety recommendations.

${webContext}`
}

/**
 * Check if web augmentation is available
 * (Always returns true since we use built-in fetch)
 */
export function isWebAugmentationAvailable(): boolean {
  return true
}

/**
 * Get list of authoritative domains we can fetch from
 */
export function getAuthoritativeDomains(): readonly string[] {
  return AUTHORITATIVE_DOMAINS
}
