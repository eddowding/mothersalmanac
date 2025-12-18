/**
 * Test Generation Endpoint
 *
 * Tests wiki page generation with RAG.
 * GET /api/debug/generate-test?query=sleep+training
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateWikiPage } from '@/lib/wiki/generator'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || 'sleep training'

  try {
    console.log(`[Generate Test] Starting generation for: "${query}"`)
    const startTime = Date.now()

    const page = await generateWikiPage(query, {
      temperature: 0.7,
      extractEntities: true,
    })

    const generationTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      query,
      generationTimeMs: generationTime,
      result: {
        slug: page.slug,
        title: page.title,
        confidence_score: page.confidence_score,
        generation_source: page.metadata.generation_source,
        ai_fallback: page.metadata.ai_fallback,
        chunk_count: page.metadata.chunk_count,
        sources_used: page.metadata.sources_used,
        search_stats: page.metadata.search_stats,
        model: page.metadata.model,
        contentPreview: page.content.substring(0, 500) + '...',
      },
    })
  } catch (error) {
    console.error('[Generate Test] Error:', error)
    return NextResponse.json(
      {
        success: false,
        query,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
