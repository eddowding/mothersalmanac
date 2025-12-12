import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadDocument } from '@/lib/supabase/storage'
import { isAdmin } from '@/lib/auth/actions'

/**
 * GET /api/admin/documents/[id]/download
 *
 * Get a signed download URL for a document.
 * Requires admin authentication.
 *
 * Returns:
 * - url: string (signed URL valid for 1 hour)
 * - filename: string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const isAdminUser = await isAdmin()
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

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
      .select('file_path, title, metadata')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (!(document as any).file_path) {
      return NextResponse.json(
        { error: 'Document has no associated file' },
        { status: 404 }
      )
    }

    // Get signed URL from storage
    const result = await downloadDocument((document as any).file_path)

    if (result.error || !result.url) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    // Get original filename from metadata or use title
    const filename =
      (document as any).metadata?.original_filename || `${(document as any).title}.pdf`

    return NextResponse.json({
      url: result.url,
      filename,
    })
  } catch (error) {
    console.error('Download error:', error)
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
