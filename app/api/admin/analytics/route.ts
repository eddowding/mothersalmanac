import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/analytics
 *
 * Fetches comprehensive analytics data from Supabase
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

    // Fetch real analytics from Supabase

    // Get wiki page stats
    const { data: wikiPages } = await supabase
      .from('wiki_pages')
      .select('id, title, view_count, confidence_score, created_at')
      .order('view_count', { ascending: false }) as { data: Array<{ id: string; title: string; view_count: number; confidence_score: number; created_at: string }> | null }

    // Get document stats
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, chunk_count, created_at, processed_status') as { data: Array<{ id: string; title: string; chunk_count: number; created_at: string; processed_status: string }> | null }

    // Get document chunks for coverage calculation
    const { count: totalChunks } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })

    // Calculate overview stats
    const totalViews = wikiPages?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0
    const avgConfidence = wikiPages?.length
      ? wikiPages.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / wikiPages.length
      : 0
    const completedDocs = documents?.filter(d => d.processed_status === 'completed').length || 0
    const totalDocs = documents?.length || 0

    // Get top wiki pages as "top queries" (since we're tracking what's viewed most)
    const topQueries = (wikiPages || []).slice(0, 10).map(p => ({
      query: p.title || 'Untitled',
      count: p.view_count || 0,
      avgSimilarity: p.confidence_score || 0,
    }))

    // Get document stats with chunk counts
    const documentStats = (documents || [])
      .filter(d => d.processed_status === 'completed')
      .slice(0, 10)
      .map(d => ({
        title: d.title || 'Untitled',
        referenceCount: d.chunk_count || 0,
        coverage: Math.round((d.chunk_count || 0) / Math.max(totalChunks || 1, 1) * 100),
      }))

    // Generate view volume from wiki pages (group by date)
    const viewsByDate = new Map<string, number>()
    const now = Date.now()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      viewsByDate.set(date, 0)
    }

    // Count pages created by date as a proxy for activity
    wikiPages?.forEach(p => {
      const date = p.created_at?.split('T')[0]
      if (date && viewsByDate.has(date)) {
        viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1)
      }
    })

    const searchVolume = Array.from(viewsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }))

    // Document uploads by date
    const uploadsByDate = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      uploadsByDate.set(date, 0)
    }

    documents?.forEach(d => {
      const date = d.created_at?.split('T')[0]
      if (date && uploadsByDate.has(date)) {
        uploadsByDate.set(date, (uploadsByDate.get(date) || 0) + 1)
      }
    })

    const documentUploads = Array.from(uploadsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }))

    const analyticsData = {
      overview: {
        totalSearches: totalViews,
        avgSimilarity: avgConfidence,
        topDocumentCoverage: totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0,
        activeUsers: wikiPages?.length || 0,
      },
      topQueries,
      documentStats,
      searchVolume,
      documentUploads,
      // PostHog dashboard link for detailed user analytics
      posthogDashboard: 'https://eu.posthog.com/project/84724/dashboard/235757',
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
