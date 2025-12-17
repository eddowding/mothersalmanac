/**
 * Admin API Route: Document Processing
 *
 * POST /api/admin/process
 * - Trigger processing for a specific document via Trigger.dev
 * - Body: { documentId: string }
 *
 * GET /api/admin/process?documentId=xxx
 * - Get processing status for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tasks } from '@trigger.dev/sdk/v3';
import {
  processDocument,
  getProcessingStatus,
  canProcessDocument,
} from '@/lib/rag/processor';
import type { processDocumentTask } from '@/trigger/process-document';

const TRIGGER_ENABLED = !!process.env.TRIGGER_SECRET_KEY;

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

    if (TRIGGER_ENABLED) {
      // Try Trigger.dev for background processing (recommended)
      try {
        const handle = await tasks.trigger<typeof processDocumentTask>(
          'process-document',
          { documentId }
        );

        console.log(`[API] Triggered processing task: ${handle.id}`);

        return NextResponse.json({
          success: true,
          message: 'Processing queued via Trigger.dev',
          documentId,
          taskId: handle.id,
        });
      } catch (triggerError) {
        // Trigger.dev failed, fall back to sync processing
        console.warn(`[API] Trigger.dev failed, falling back to sync:`, triggerError);
      }
    }

    // Fallback: synchronous processing (will timeout on large files)
    console.log(`[API] Processing synchronously`);

    const result = await processDocument(documentId);

    if (result.status === 'failure') {
      return NextResponse.json(
        { error: result.error || 'Processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Processing completed',
      documentId,
      chunksCreated: result.chunksCreated,
      processingTime: result.processingTime,
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
