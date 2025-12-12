/**
 * Admin API Route: Document Processing
 *
 * POST /api/admin/process
 * - Trigger processing for a specific document
 * - Body: { documentId: string }
 *
 * GET /api/admin/process?documentId=xxx
 * - Get processing status for a document
 *
 * POST /api/admin/process/batch
 * - Process multiple documents
 * - Body: { documentIds: string[] }
 *
 * POST /api/admin/process/pending
 * - Process all pending documents
 * - Body: { limit?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  processDocument,
  processDocumentsBatch,
  getProcessingStatus,
  canProcessDocument,
  processPendingDocuments,
} from '@/lib/rag/processor';

/**
 * POST: Trigger document processing
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((profile as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing documentId' },
        { status: 400 }
      );
    }

    // Check if document can be processed
    const { can, reason } = await canProcessDocument(documentId);
    if (!can) {
      return NextResponse.json(
        { error: reason || 'Cannot process document' },
        { status: 400 }
      );
    }

    // Start processing in background (don't await)
    // In production, use a job queue like Inngest or BullMQ
    processDocument(documentId).catch(error => {
      console.error('[API] Background processing failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Processing started',
      documentId,
    });

  } catch (error) {
    console.error('[API] Process document error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Get processing status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((profile as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing documentId parameter' },
        { status: 400 }
      );
    }

    const status = await getProcessingStatus(documentId);

    return NextResponse.json({
      success: true,
      documentId,
      ...status,
    });

  } catch (error) {
    console.error('[API] Get processing status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
