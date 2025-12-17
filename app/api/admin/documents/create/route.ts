import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/actions'
import type { SourceType } from '@/types/wiki'

/**
 * POST /api/admin/documents/create
 *
 * Create a document database record after client-side upload to storage.
 * This endpoint does NOT handle file upload - use client-side Supabase upload.
 * Requires admin authentication.
 *
 * Body (JSON):
 * - title: string (required)
 * - author: string (optional)
 * - sourceType: SourceType (required)
 * - filePath: string (required) - path in Supabase Storage
 * - fileSize: number (required)
 * - originalFilename: string (required)
 * - contentType: string (required)
 */
export async function POST(request: NextRequest) {
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

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - not authenticated' },
        { status: 401 }
      )
    }

    // Parse JSON body
    const body = await request.json()
    const { title, author, sourceType, filePath, fileSize, originalFilename, contentType } = body

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!sourceType) {
      return NextResponse.json(
        { error: 'Source type is required' },
        { status: 400 }
      )
    }

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    // Create document record in database
    const { data: document, error: dbError } = await (supabase as any)
      .from('documents')
      .insert({
        title: title.trim(),
        author: author?.trim() || null,
        source_type: sourceType as SourceType,
        file_path: filePath,
        file_size: fileSize || 0,
        upload_date: new Date().toISOString(),
        uploaded_by: user.id,
        processed_status: 'pending',
        metadata: {
          original_filename: originalFilename,
          content_type: contentType,
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        documentId: document.id,
        title: document.title,
        status: document.processed_status,
        message: 'Document record created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create document error:', error)
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
