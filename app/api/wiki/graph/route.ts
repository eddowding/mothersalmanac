import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/wiki/graph
 * Returns graph data for knowledge graph visualization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const maxNodes = parseInt(searchParams.get('maxNodes') || '50', 10)

    const supabase = createAdminClient()

    // Get top pages by view count
    const { data: pages, error: pagesError } = await supabase
      .from('wiki_pages')
      .select('slug, title, view_count, confidence_score, metadata')
      .order('view_count', { ascending: false })
      .limit(maxNodes)

    if (pagesError) throw pagesError

    // Get page connections for these pages
    const slugs = pages?.map((p: any) => p.slug) || []

    const { data: connections, error: connectionsError } = await supabase
      .from('page_connections')
      .select('from_slug, to_slug, strength')
      .or(`from_slug.in.(${slugs.join(',')}),to_slug.in.(${slugs.join(',')})`)

    if (connectionsError) throw connectionsError

    // Build nodes
    const nodes = pages?.map((page: any) => ({
      id: page.slug,
      title: page.title,
      slug: page.slug,
      viewCount: page.view_count || 0,
      category: extractCategory(page.metadata),
      confidenceScore: page.confidence_score
    })) || []

    // Build links (only include links between nodes in our set)
    const slugSet = new Set(slugs)
    const links = connections
      ?.filter((conn: any) => slugSet.has(conn.from_slug) && slugSet.has(conn.to_slug))
      .map((conn: any) => ({
        source: conn.from_slug,
        target: conn.to_slug,
        strength: conn.strength
      })) || []

    return NextResponse.json({
      nodes,
      links
    })
  } catch (error) {
    console.error('Error fetching graph data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    )
  }
}

/**
 * Extract category from page metadata
 */
function extractCategory(metadata: any): string {
  if (!metadata || typeof metadata !== 'object') return 'concept'

  // Try to infer category from entity links
  if (metadata.entity_links && Array.isArray(metadata.entity_links)) {
    const types = metadata.entity_links.map((link: any) => link.type).filter(Boolean)
    if (types.length > 0) {
      // Return most common type
      const typeCounts = types.reduce((acc: Record<string, number>, type: string) => {
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
      return Object.entries(typeCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0][0]
    }
  }

  return 'concept'
}
