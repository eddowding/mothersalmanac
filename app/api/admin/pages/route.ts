import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/actions'
import { generateWikiPage } from '@/lib/wiki/generator'
import { invalidateCache, cachePage } from '@/lib/wiki/cache'
import { revalidatePath } from 'next/cache'

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
 * POST /api/admin/pages
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
      const supabase = await createClient()

      // Get existing page to extract query
      const { data: existingPage } = await supabase
        .from('wiki_pages')
        .select('metadata')
        .eq('slug', slug)
        .single() as { data: { metadata: { query: string } } | null }

      if (!existingPage?.metadata?.query) {
        return NextResponse.json(
          { error: 'Page not found or missing query metadata' },
          { status: 404 }
        )
      }

      const query = existingPage.metadata.query
      console.log(`[Admin Regenerate] Regenerating "${slug}" from query: "${query}"`)

      // Invalidate existing cache
      await invalidateCache(slug)

      // Regenerate page using original query
      const generatedPage = await generateWikiPage(query, {
        temperature: 0.7,
        extractEntities: true,
      })

      // Update existing page in database
      const { error: updateError } = await (supabase as any)
        .from('wiki_pages')
        .update({
          content: generatedPage.content,
          excerpt: generatedPage.excerpt,
          confidence_score: generatedPage.confidence_score,
          generated_at: generatedPage.generated_at,
          ttl_expires_at: generatedPage.ttl_expires_at,
          published: true,
          metadata: generatedPage.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('slug', slug)

      if (updateError) {
        throw new Error(`Failed to update page: ${updateError.message}`)
      }

      // Cache new page
      await cachePage({
        ...generatedPage,
        slug,
      })

      // Revalidate Next.js cache
      revalidatePath(`/wiki/${slug}`)
      revalidatePath('/wiki')

      console.log(`[Admin Regenerate] Successfully regenerated: ${slug}`)

      return NextResponse.json({
        success: true,
        message: 'Page regenerated successfully',
        page: {
          slug,
          title: generatedPage.title,
          confidence_score: generatedPage.confidence_score,
          generation_source: generatedPage.metadata.generation_source,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Admin Regenerate] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
