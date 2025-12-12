/**
 * Admin API Route: Batch Document Processing
 *
 * POST /api/admin/process/batch
 * - Process multiple documents at once
 * - Body: { documentIds: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processDocumentsBatch } from '@/lib/rag/processor';

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
    const { documentIds } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid documentIds array' },
        { status: 400 }
      );
    }

    // Limit batch size
    if (documentIds.length > 50) {
      return NextResponse.json(
        { error: 'Batch size cannot exceed 50 documents' },
        { status: 400 }
      );
    }

    // Process in background
    processDocumentsBatch(documentIds).catch(error => {
      console.error('[API] Batch processing failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Batch processing started',
      documentCount: documentIds.length,
    });

  } catch (error) {
    console.error('[API] Batch process error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
