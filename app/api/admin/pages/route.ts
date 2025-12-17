import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/actions'

/**
 * GET /api/admin/pages
 *
 * List wiki pages with filtering, search, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort') || 'updated_at'
    const sortOrder = searchParams.get('order') || 'desc'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('wiki_pages')
      .select('*', { count: 'exact' })

    // Apply filters - convert status to published boolean
    if (status && status !== 'all') {
      if (status === 'published') {
        query = query.eq('published', true)
      } else if (status === 'draft') {
        query = query.eq('published', false)
      }
      // 'archived' status not supported in current schema - treat as draft
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    // Apply sorting
    const validSortFields = ['title', 'view_count', 'created_at', 'updated_at', 'confidence_score']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'updated_at'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rawPages, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform pages to include status field and extract source info from metadata
    const pages = (rawPages || []).map((page: any) => {
      const metadata = page.metadata || {}
      const sourcesUsed = metadata.sources_used || []
      const generationSource = metadata.generation_source || (metadata.ai_fallback ? 'ai_knowledge' : 'rag_documents')
      const modelUsed = metadata.model || metadata.model_used || null

      return {
        ...page,
        status: page.published ? 'published' : 'draft',
        source_count: sourcesUsed.length,
        sources_used: sourcesUsed,
        generation_source: generationSource,
        used_rag: generationSource === 'rag_documents' && sourcesUsed.length > 0,
        model_used: modelUsed,
      }
    })

    // Get stats
    const { data: statsData } = await supabase
      .from('wiki_pages')
      .select('published, view_count, confidence_score')

    const stats = {
      total: count || 0,
      published: 0,
      draft: 0,
      archived: 0,
      totalViews: 0,
      avgConfidence: 0,
    }

    if (statsData) {
      let totalConfidence = 0
      let confidenceCount = 0
      statsData.forEach((p: any) => {
        if (p.published) stats.published++
        else stats.draft++
        stats.totalViews += p.view_count || 0
        if (p.confidence_score) {
          totalConfidence += p.confidence_score
          confidenceCount++
        }
      })
      stats.avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0
    }

    return NextResponse.json({
      pages: pages || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/pages?slug=<slug>
 *
 * Delete a wiki page.
 */
export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete the page
    const { error } = await supabase
      .from('wiki_pages')
      .delete()
      .eq('slug', slug)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also clean up related data
    await supabase.from('page_connections').delete().or(`from_slug.eq.${slug},to_slug.eq.${slug}`)
    // Update link_candidates to mark page as no longer existing
    await (supabase.from('link_candidates') as any).update({ page_exists: false }).eq('normalized_slug', slug)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/pages
 *
 * Update a wiki page (status, metadata).
 */
export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { slug, status, metadata } = body

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const updateData: any = { updated_at: new Date().toISOString() }
    // Convert status to published boolean
    if (status) {
      updateData.published = status === 'published'
    }
    if (metadata) updateData.metadata = metadata

    const { data, error } = await (supabase
      .from('wiki_pages') as any)
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform response to include status
    const transformedPage = data ? {
      ...data,
      status: data.published ? 'published' : 'draft',
    } : null

    return NextResponse.json({ success: true, page: transformedPage })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/pages/regenerate
 *
 * Trigger regeneration of a wiki page.
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { slug, action } = body

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    if (action === 'regenerate') {
      // Call the regenerate API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/wiki/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, force: true }),
      })

      if (!response.ok) {
        const error = await response.json()
        return NextResponse.json({ error: error.error || 'Regeneration failed' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Regeneration started' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
