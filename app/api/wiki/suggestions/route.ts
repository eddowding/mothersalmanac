import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface Suggestion {
  slug: string
  title: string
  type: 'page' | 'stub'
  confidence?: string
  mention_count?: number
}

// Type definitions for database rows
type PageRow = { slug: string; title: string }
type StubRow = { slug: string; title: string; confidence: string; mention_count: number }

/**
 * GET /api/wiki/suggestions
 * Returns search suggestions combining existing pages and stubs
 *
 * Query params:
 * - q: search query (optional, returns popular if empty)
 * - limit: max results (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    const supabase = await createClient()
    const suggestions: Suggestion[] = []

    if (query.length > 0) {
      // Search existing pages
      const { data: pages } = await supabase
        .from('wiki_pages')
        .select('slug, title')
        .or(`title.ilike.%${query}%,slug.ilike.%${query}%`)
        .limit(Math.ceil(limit / 2))

      if (pages) {
        const typedPages = pages as PageRow[]
        suggestions.push(...typedPages.map(p => ({
          slug: p.slug,
          title: p.title,
          type: 'page' as const,
        })))
      }

      // Search stubs (topics mentioned but not yet generated)
      try {
        const { data: stubs } = await supabase
          .from('wiki_stubs')
          .select('slug, title, confidence, mention_count')
          .eq('is_generated', false)
          .or(`title.ilike.%${query}%,slug.ilike.%${query}%`)
          .order('mention_count', { ascending: false })
          .limit(Math.ceil(limit / 2))

        if (stubs) {
          const typedStubs = stubs as StubRow[]
          suggestions.push(...typedStubs.map(s => ({
            slug: s.slug,
            title: s.title,
            type: 'stub' as const,
            confidence: s.confidence,
            mention_count: s.mention_count,
          })))
        }
      } catch {
        // wiki_stubs table might not exist yet
      }
    } else {
      // No query - return popular pages and top stubs
      const { data: pages } = await supabase
        .from('wiki_pages')
        .select('slug, title')
        .order('view_count', { ascending: false })
        .limit(Math.ceil(limit / 2))

      if (pages) {
        const typedPages = pages as PageRow[]
        suggestions.push(...typedPages.map(p => ({
          slug: p.slug,
          title: p.title,
          type: 'page' as const,
        })))
      }

      try {
        const { data: stubs } = await supabase
          .from('wiki_stubs')
          .select('slug, title, confidence, mention_count')
          .eq('is_generated', false)
          .order('mention_count', { ascending: false })
          .limit(Math.ceil(limit / 2))

        if (stubs) {
          const typedStubs = stubs as StubRow[]
          suggestions.push(...typedStubs.map(s => ({
            slug: s.slug,
            title: s.title,
            type: 'stub' as const,
            confidence: s.confidence,
            mention_count: s.mention_count,
          })))
        }
      } catch {
        // wiki_stubs table might not exist yet
      }
    }

    // Sort: pages first, then stubs by mention count
    suggestions.sort((a, b) => {
      if (a.type === 'page' && b.type === 'stub') return -1
      if (a.type === 'stub' && b.type === 'page') return 1
      if (a.type === 'stub' && b.type === 'stub') {
        return (b.mention_count || 0) - (a.mention_count || 0)
      }
      return 0
    })

    return NextResponse.json({
      suggestions: suggestions.slice(0, limit),
      query,
    })
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
