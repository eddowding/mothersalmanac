import { NextRequest, NextResponse } from 'next/server'
import { getCachedPage } from '@/lib/wiki/cache'

/**
 * GET /api/wiki/preview
 * Returns a preview of a wiki page for hover cards
 * Query params:
 * - slug: the page slug to preview
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      )
    }

    // Fetch the page
    const page = await getCachedPage(slug)

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    // Create excerpt from content (first 150 characters)
    const excerpt = page.content
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/[*_`]/g, '') // Remove markdown formatting
      .trim()
      .substring(0, 150)
      .trim() + '...'

    // Return preview data
    return NextResponse.json({
      title: page.title,
      excerpt,
      confidence_score: page.confidence_score,
    })
  } catch (error) {
    console.error('Error fetching page preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
