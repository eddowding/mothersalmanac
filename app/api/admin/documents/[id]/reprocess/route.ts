import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/actions'

/**
 * POST /api/admin/documents/[id]/reprocess
 *
 * Trigger reprocessing of a document.
 * Sets the document status back to 'pending' and clears processed_at.
 * Requires admin authentication.
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - documentId: string
 */
export async function POST(
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

    // Check if document exists
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('id, title')
      .eq('id', id)
      .single()

    if (fetchError || !existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete existing chunks (optional - depends on processing strategy)
    const { error: deleteChunksError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', id)

    if (deleteChunksError) {
      console.error('Error deleting chunks:', deleteChunksError)
      // Continue anyway - processing will handle it
    }

    // Update document status to pending
    const { data: updatedDoc, error: updateError } = await (supabase as any)
      .from('documents')
      .update({
        processed_status: 'pending',
        processed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update document: ${updateError.message}` },
        { status: 500 }
      )
    }

    // TODO: Trigger background processing job
    // This could be a queue, webhook, or separate processor service
    // For now, the document is marked as pending and ready for processing

    return NextResponse.json({
      success: true,
      message: 'Document queued for reprocessing',
      documentId: updatedDoc.id,
    })
  } catch (error) {
    console.error('Reprocess error:', error)
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
