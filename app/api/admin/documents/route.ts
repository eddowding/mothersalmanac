import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteDocument } from '@/lib/supabase/storage'
import { isAdmin } from '@/lib/auth/actions'
import type { DocumentStatus } from '@/types/wiki'

/**
 * GET /api/admin/documents
 *
 * List documents with filtering, search, and pagination.
 * Requires admin authentication.
 *
 * Query Parameters:
 * - status: DocumentStatus (optional) - Filter by status
 * - search: string (optional) - Search by title or author
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 *
 * Returns:
 * - documents: Document[]
 * - stats: { total, totalChunks, processedToday, failed }
 * - pagination: { page, limit, total, totalPages }
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const isAdminUser = await isAdmin()
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status') as DocumentStatus | null
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('documents')
      .select('*, document_chunks(count)', { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('processed_status', status)
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,author.ilike.%${search}%`
      )
    }

    // Apply pagination and ordering
    query = query
      .order('upload_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: documents, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    // Calculate statistics
    const { data: statsData } = await supabase
      .from('documents')
      .select('processed_status, processed_at, document_chunks(count)')

    const stats = {
      total: count || 0,
      totalChunks: 0,
      processedToday: 0,
      failed: 0,
    }

    if (statsData) {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      statsData.forEach((doc: any) => {
        // Count chunks
        if (doc.document_chunks && doc.document_chunks.length > 0) {
          stats.totalChunks += doc.document_chunks[0].count || 0
        }

        // Count failed
        if (doc.processed_status === 'failed') {
          stats.failed++
        }

        // Count processed today
        const processedAt = (doc as any).processed_at || (doc as any).processing_completed_at
        if (processedAt && new Date(processedAt) >= todayStart) {
          stats.processedToday++
        }
      })
    }

    // Transform documents to include chunk_count
    const transformedDocuments = (documents || []).map((doc: any) => ({
      ...doc,
      chunk_count: doc.document_chunks?.[0]?.count || 0,
      document_chunks: undefined, // Remove the nested object
    }))

    return NextResponse.json({
      documents: transformedDocuments,
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
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/documents
 *
 * Delete a document and its associated chunks.
 * Requires admin authentication.
 *
 * Query Parameters:
 * - id: string (required) - Document ID
 *
 * Returns:
 * - success: boolean
 * - message: string
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    const isAdminUser = await isAdmin()
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get document to find file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete from storage if file exists
    if ((document as any).file_path) {
      const deleteResult = await deleteDocument((document as any).file_path)
      if (deleteResult.error) {
        console.error('Storage deletion error:', deleteResult.error)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete document record (chunks will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete document: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
