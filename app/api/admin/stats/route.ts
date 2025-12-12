import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/stats
 *
 * Fetches comprehensive dashboard statistics for admin overview
 *
 * Returns:
 * - Document counts and trends
 * - Chunk statistics
 * - Processing metrics
 * - Storage usage
 * - Recent activity
 */

export async function GET() {
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

    // Fetch all statistics in parallel
    const [
      totalDocuments,
      totalChunks,
      processingDocuments,
      failedDocuments,
      recentDocuments,
      documentsByDay,
    ] = await Promise.all([
      // Total documents count
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true }),

      // Total chunks count with avg per document
      supabase
        .from('document_chunks')
        .select('id', { count: 'exact', head: true }),

      // Processing/pending documents
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'processing']),

      // Failed documents
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),

      // Recent documents
      supabase
        .from('documents')
        .select('id, title, status, created_at, chunk_count, user_id')
        .order('created_at', { ascending: false })
        .limit(10),

      // Documents uploaded over last 30 days (aggregated by day)
      (supabase as any).rpc('get_documents_by_day', { days: 30 }).catch(() => ({
        data: null,
        error: { message: 'Function not found' },
      })),
    ])

    // Calculate storage (estimate based on file_size)
    const { data: storageData } = await supabase
      .from('documents')
      .select('file_size')

    const totalStorage = storageData?.reduce(
      (sum, doc: any) => sum + (doc.file_size || 0),
      0
    ) || 0

    // Estimate embeddings cost (rough estimate: $0.10 per 1M tokens)
    const { data: tokenData } = await supabase
      .from('documents')
      .select('total_tokens')

    const totalTokens = tokenData?.reduce(
      (sum, doc: any) => sum + (doc.total_tokens || 0),
      0
    ) || 0

    const estimatedCost = (totalTokens / 1_000_000) * 0.1

    return NextResponse.json({
      stats: {
        totalDocuments: totalDocuments.count || 0,
        totalChunks: totalChunks.count || 0,
        avgChunksPerDoc:
          totalDocuments.count && totalChunks.count
            ? Math.round(totalChunks.count / totalDocuments.count)
            : 0,
        processingQueue: processingDocuments.count || 0,
        failedUploads: failedDocuments.count || 0,
        storageUsed: totalStorage,
        storageUsedMB: (totalStorage / 1024 / 1024).toFixed(2),
        totalTokens,
        estimatedCost: estimatedCost.toFixed(2),
      },
      recentDocuments: recentDocuments.data || [],
      documentsByDay: documentsByDay.data || [],
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
