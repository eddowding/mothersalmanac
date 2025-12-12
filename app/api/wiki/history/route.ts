import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/wiki/history
 * Returns generation history for a page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get page generation history
    const { data: history, error } = await supabase
      .from('wiki_page_history')
      .select('*')
      .eq('slug', slug)
      .order('generated_at', { ascending: false })
      .limit(20)

    if (error) {
      // If history table doesn't exist, try current page
      const { data: currentPage } = await supabase
        .from('wiki_pages')
        .select('generated_at, model, confidence_score, generation_time_ms')
        .eq('slug', slug)
        .single()

      if (currentPage) {
        const page = currentPage as any
        return NextResponse.json({
          history: [{
            id: 'current',
            slug,
            generated_at: page.generated_at,
            model: page.model,
            confidence_score: page.confidence_score,
            generation_time_ms: page.generation_time_ms
          }]
        })
      }

      return NextResponse.json({
        history: []
      })
    }

    return NextResponse.json({
      history: history || []
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
