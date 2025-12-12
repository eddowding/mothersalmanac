import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRelatedPages } from '@/lib/wiki/graph'

/**
 * GET /api/wiki/suggest-next
 * Suggests next pages to read based on current page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const limit = parseInt(searchParams.get('limit') || '5', 10)

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      )
    }

    // Get related pages based on connections
    const relatedPages = await getRelatedPages(slug, limit * 2)

    // Transform to suggestion format with reasons
    const suggestions = relatedPages.slice(0, limit).map((page, index) => ({
      slug: page.slug,
      title: page.title,
      reason: generateReason(page.strength, index),
      depth: index,
      isRead: false
    }))

    return NextResponse.json({
      suggestions
    })
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

/**
 * Generate human-readable reason for suggestion
 */
function generateReason(strength: number, index: number): string {
  if (strength >= 0.8) {
    return 'Strongly related to this topic'
  }
  if (strength >= 0.6) {
    return 'Related topic worth exploring'
  }
  if (strength >= 0.4) {
    return 'Connected topic you might find useful'
  }

  const reasons = [
    'Another relevant topic',
    'Extends on this subject',
    'Complementary information',
    'Related area to consider',
    'Follow-up topic'
  ]

  return reasons[index % reasons.length]
}
