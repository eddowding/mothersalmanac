import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/search/test
 *
 * Test vector search with debug information
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { query, mode = 'vector', threshold = 0.7, limit = 10 } = body

    const startTime = Date.now()

    // Mock embedding and results for now
    const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() * 2 - 1)

    const mockResults = [
      {
        id: '1',
        content: `Relevant chunk about ${query} with detailed information.`,
        similarity: 0.89,
        document_title: 'Pregnancy Guide',
        document_file_name: 'pregnancy-guide.pdf',
        section_title: 'First Trimester',
        page_number: 12,
        chunk_index: 5,
      },
    ]

    const searchLatency = Date.now() - startTime
    const contextSizeEstimate = mockResults.reduce(
      (sum, result) => sum + Math.ceil(result.content.length / 4),
      0
    )

    return NextResponse.json({
      results: mockResults,
      debug: {
        queryEmbeddingPreview: mockEmbedding,
        searchLatency,
        resultsCount: mockResults.length,
        contextSizeEstimate,
      },
    })
  } catch (error) {
    console.error('Error testing search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
