/**
 * RAG Debug Endpoint
 *
 * Tests vector search to diagnose why regeneration isn't hitting RAG.
 * GET /api/debug/rag-test?query=sleep+training
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vectorSearch } from '@/lib/rag/search'
import { generateEmbedding, isConfigured } from '@/lib/rag/embeddings'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || 'sleep training'
  const threshold = parseFloat(searchParams.get('threshold') || '0.5')

  const diagnostics: Record<string, unknown> = {
    query,
    threshold,
    timestamp: new Date().toISOString(),
    openaiConfigured: isConfigured(),
  }

  try {
    // Step 1: Generate embedding
    console.log(`[RAG Debug] Generating embedding for: "${query}"`)
    const embeddingStart = Date.now()
    const embeddingResult = await generateEmbedding(query)
    const embeddingTime = Date.now() - embeddingStart

    diagnostics.embedding = {
      dimensions: embeddingResult.embedding.length,
      first10: embeddingResult.embedding.slice(0, 10),
      model: embeddingResult.model,
      tokens: embeddingResult.tokens,
      generationTimeMs: embeddingTime,
    }

    // Step 2: Call vectorSearch (the way generator.ts does it)
    console.log(`[RAG Debug] Calling vectorSearch...`)
    const searchStart = Date.now()
    let vectorSearchResults: Awaited<ReturnType<typeof vectorSearch>> = []
    let vectorSearchError: string | null = null

    try {
      vectorSearchResults = await vectorSearch(query, {
        threshold,
        limit: 10,
      })
    } catch (err) {
      vectorSearchError = err instanceof Error ? err.message : String(err)
      console.error(`[RAG Debug] vectorSearch error:`, err)
    }

    diagnostics.vectorSearch = {
      resultCount: vectorSearchResults.length,
      timeMs: Date.now() - searchStart,
      error: vectorSearchError,
      results: vectorSearchResults.slice(0, 3).map(r => ({
        chunk_id: r.chunk_id,
        document_title: r.document_title,
        similarity: r.similarity,
        contentPreview: r.content.substring(0, 100) + '...',
      })),
    }

    // Step 3: Direct SQL query for comparison
    console.log(`[RAG Debug] Running direct SQL query...`)
    const supabase = await createClient()
    const sqlStart = Date.now()

    // Format embedding as pgvector text
    const embeddingText = `[${embeddingResult.embedding.join(',')}]`

    const { data: sqlResults, error: sqlError } = await (supabase as any).rpc('search_chunks', {
      query_embedding: embeddingText,
      match_threshold: threshold,
      match_count: 10,
    })

    diagnostics.directSQL = {
      resultCount: sqlResults?.length || 0,
      timeMs: Date.now() - sqlStart,
      error: sqlError?.message || null,
      results: (sqlResults || []).slice(0, 3).map((r: any) => ({
        id: r.id,
        document_title: r.document_title,
        similarity: r.similarity,
        contentPreview: r.content?.substring(0, 100) + '...',
      })),
    }

    // Step 4: Database stats
    const { count: chunkCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })

    const { data: docStats } = await supabase
      .from('documents')
      .select('processed_status')

    diagnostics.databaseStats = {
      totalChunks: chunkCount,
      documents: {
        total: docStats?.length || 0,
        completed: (docStats as any[])?.filter(d => d.processed_status === 'completed').length || 0,
      },
    }

    // Step 5: Diagnosis
    const vectorCount = vectorSearchResults.length
    const sqlCount = sqlResults?.length || 0

    if (vectorCount === 0 && sqlCount > 0) {
      diagnostics.diagnosis = {
        status: 'MISMATCH',
        message: 'vectorSearch returns 0 but direct SQL returns results. Issue is in how embedding is passed to RPC.',
        suggestedFix: 'Change JSON.stringify(queryEmbedding) to `[${queryEmbedding.join(",")}]` in lib/rag/search.ts',
      }
    } else if (vectorCount === 0 && sqlCount === 0) {
      diagnostics.diagnosis = {
        status: 'NO_RESULTS',
        message: 'Both methods return 0 results. Either no relevant content or threshold too high.',
        suggestedFix: 'Try lower threshold or check if documents are processed.',
      }
    } else if (vectorCount > 0 && sqlCount > 0) {
      diagnostics.diagnosis = {
        status: 'WORKING',
        message: 'Both methods return results. RAG should be working.',
        suggestedFix: 'Check generator.ts for other issues.',
      }
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error) {
    console.error('[RAG Debug] Fatal error:', error)
    return NextResponse.json(
      {
        ...diagnostics,
        fatalError: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
