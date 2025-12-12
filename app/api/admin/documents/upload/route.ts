import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadDocument, validateFile } from '@/lib/supabase/storage'
import { isAdmin } from '@/lib/auth/actions'
import type { SourceType } from '@/types/wiki'

/**
 * POST /api/admin/documents/upload
 *
 * Upload a document file and create a database record.
 * Requires admin authentication.
 *
 * Body (multipart/form-data):
 * - file: File (required)
 * - title: string (required)
 * - author: string (optional)
 * - sourceType: SourceType (required)
 *
 * Returns:
 * - documentId: string
 * - title: string
 * - status: 'pending'
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const author = formData.get('author') as string | null
    const sourceType = formData.get('sourceType') as SourceType | null

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

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

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadDocument(file, user.id)

    if (uploadResult.error) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.error}` },
        { status: 500 }
      )
    }

    // Create document record in database
    const { data: document, error: dbError } = await (supabase as any)
      .from('documents')
      .insert({
        title: title.trim(),
        author: author?.trim() || null,
        source_type: sourceType,
        file_path: uploadResult.path,
        file_size: uploadResult.size,
        upload_date: new Date().toISOString(),
        uploaded_by: user.id,
        processed_status: 'pending',
        metadata: {
          original_filename: file.name,
          content_type: file.type,
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
        message: 'Document uploaded successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload error:', error)
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
