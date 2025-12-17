import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/chunks
 *
 * Fetches document chunks with optional search filter
 */
export async function GET(request: NextRequest) {
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

    // Get search query from URL
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('document_chunks')
      .select(
        `
        id,
        content,
        chunk_index,
        section_title,
        page_number,
        char_count,
        token_count,
        embedding,
        document_id,
        created_at,
        documents (
          title,
          file_path,
          metadata
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(100)

    // Apply search filter if provided
    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    const { data: chunks, error } = await query

    if (error) throw error

    // Normalize document info to include a safe file_name derived from metadata/path
    const normalizedChunks = (chunks as any[] | null)?.map((chunk) => {
      const doc = (chunk as any).documents || {}
      const metadata = (doc.metadata || {}) as Record<string, any>
      const fileName =
        doc.file_name ||
        metadata.original_filename ||
        metadata.file_name ||
        doc.file_path?.split('/')?.pop() ||
        'document'

      return {
        ...chunk,
        documents: {
          title: doc.title,
          file_name: fileName,
        },
      }
    }) ?? []

    return NextResponse.json({ chunks: normalizedChunks })
  } catch (error) {
    console.error('Error fetching chunks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/chunks
 *
 * Updates a chunk's content (requires re-embedding)
 */
export async function PATCH(request: NextRequest) {
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
    const { id, content } = body

    // Update chunk
    const { error } = await (supabase as any)
      .from('document_chunks')
      .update({ content, embedding: null }) // Clear embedding to mark for re-generation
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating chunk:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/chunks
 *
 * Deletes all chunks (dangerous operation)
 */
export async function DELETE(request: NextRequest) {
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

    // Delete all chunks
    const { error } = await supabase
      .from('document_chunks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chunks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
