import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/wiki/popular
 * Returns popular wiki topics based on view count
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const supabase = createAdminClient()

    const { data: pages, error } = await supabase
      .from('wiki_pages')
      .select('slug, title, excerpt, confidence_score, view_count')
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) throw error

    const topics = pages?.map((page: any) => ({
      slug: page.slug,
      title: page.title,
      excerpt: page.excerpt || '',
      confidence: getConfidenceLevel(page.confidence_score),
      pageExists: true,
      relevanceScore: 1.0,
      viewCount: page.view_count || 0
    })) || []

    return NextResponse.json({
      topics
    })
  } catch (error) {
    console.error('Error fetching popular topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch popular topics' },
      { status: 500 }
    )
  }
}

function getConfidenceLevel(score?: number): 'strong' | 'medium' | 'weak' | 'ghost' {
  if (!score) return 'ghost'
  if (score >= 0.7) return 'strong'
  if (score >= 0.5) return 'medium'
  if (score >= 0.3) return 'weak'
  return 'ghost'
}
