import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { queryToSlug } from '@/lib/wiki/slugs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Search endpoint
 * Handles both instant search (JSON) and redirect search
 *
 * GET /api/wiki/search?q=pregnancy+nutrition&instant=true
 * Returns JSON search results for instant search
 *
 * GET /api/wiki/search?q=pregnancy+nutrition
 * Redirects to /wiki/pregnancy-nutrition
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const instant = searchParams.get('instant') === 'true'

  // Validate query parameter
  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  // Handle instant search
  if (instant) {
    return handleInstantSearch(query)
  }

  // Log search (fire-and-forget for analytics)
  logSearch(query).catch(err => {
    console.error('Failed to log search:', err)
  })

  // Convert query to slug
  const slug = queryToSlug(query)

  // Redirect to wiki page
  return redirect(`/wiki/${slug}`)
}

/**
 * Handle instant search - return JSON results
 */
async function handleInstantSearch(query: string) {
  try {
    const supabase = createAdminClient()

    // Search in existing pages
    const { data: pages, error } = await supabase
      .from('wiki_pages')
      .select('slug, title, excerpt, confidence_score, view_count')
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
      .order('view_count', { ascending: false })
      .limit(10)

    if (error) throw error

    // Transform to search results
    const results = pages?.map((page: any) => ({
      slug: page.slug,
      title: page.title,
      excerpt: page.excerpt || '',
      confidence: getConfidenceLevel(page.confidence_score),
      pageExists: true,
      relevanceScore: calculateRelevance(query, page.title, page.excerpt),
      viewCount: page.view_count || 0
    })) || []

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({
      results,
      query
    })
  } catch (error) {
    console.error('Instant search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}

/**
 * Calculate relevance score
 */
function calculateRelevance(query: string, title: string, excerpt: string): number {
  const queryLower = query.toLowerCase()
  const titleLower = title.toLowerCase()
  const excerptLower = excerpt?.toLowerCase() || ''

  let score = 0

  // Exact title match
  if (titleLower === queryLower) {
    score += 10
  }
  // Title contains query
  else if (titleLower.includes(queryLower)) {
    score += 5
  }
  // Title starts with query
  else if (titleLower.startsWith(queryLower)) {
    score += 7
  }

  // Excerpt contains query
  if (excerptLower.includes(queryLower)) {
    score += 2
  }

  // Word matches
  const queryWords = queryLower.split(/\s+/)
  queryWords.forEach(word => {
    if (titleLower.includes(word)) score += 1
    if (excerptLower.includes(word)) score += 0.5
  })

  return score
}

function getConfidenceLevel(score?: number): 'strong' | 'medium' | 'weak' | 'ghost' {
  if (!score) return 'ghost'
  if (score >= 0.7) return 'strong'
  if (score >= 0.5) return 'medium'
  if (score >= 0.3) return 'weak'
  return 'ghost'
}

/**
 * Log search query for analytics
 * Stores search queries to track popular topics and user interests
 *
 * @param query - User's search query
 */
async function logSearch(query: string): Promise<void> {
  try {
    const supabase = await createClient()
    const slug = queryToSlug(query)

    // Check if table exists, if not, create it later via migration
    // For now, just console log
    console.log(`[Search] Query: "${query}"  Slug: "${slug}"`)

    // TODO: Store in search_logs table when available
    // await supabase.from('search_logs').insert({
    //   query,
    //   slug,
    //   created_at: new Date().toISOString(),
    // })
  } catch (error) {
    console.error('Search logging error:', error)
    // Don't throw - logging failures shouldn't break search
  }
}
