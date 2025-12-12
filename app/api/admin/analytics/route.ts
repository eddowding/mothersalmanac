import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/analytics
 *
 * Fetches comprehensive analytics data
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

    // Fetch mock analytics data
    // In production, these would be real queries to search_logs, usage_stats, etc.
    const analyticsData = {
      overview: {
        totalSearches: 1247,
        avgSimilarity: 0.78,
        topDocumentCoverage: 85,
        activeUsers: 42,
      },
      topQueries: [
        { query: 'pregnancy symptoms', count: 145, avgSimilarity: 0.82 },
        { query: 'baby sleep schedule', count: 128, avgSimilarity: 0.79 },
        { query: 'breastfeeding tips', count: 112, avgSimilarity: 0.85 },
        { query: 'toddler nutrition', count: 98, avgSimilarity: 0.76 },
        { query: 'postpartum recovery', count: 87, avgSimilarity: 0.81 },
        { query: 'newborn care basics', count: 76, avgSimilarity: 0.83 },
        { query: 'teething remedies', count: 65, avgSimilarity: 0.77 },
        { query: 'child development milestones', count: 58, avgSimilarity: 0.80 },
        { query: 'potty training', count: 52, avgSimilarity: 0.74 },
        { query: 'family meal planning', count: 48, avgSimilarity: 0.78 },
      ],
      documentStats: [
        { title: 'Pregnancy Guide', referenceCount: 234, coverage: 92 },
        { title: 'Baby Sleep Handbook', referenceCount: 198, coverage: 88 },
        { title: 'Breastfeeding Manual', referenceCount: 187, coverage: 85 },
        { title: 'Toddler Nutrition', referenceCount: 156, coverage: 78 },
        { title: 'Child Development', referenceCount: 145, coverage: 82 },
      ],
      searchVolume: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        count: Math.floor(Math.random() * 50) + 20,
      })),
      documentUploads: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        count: Math.floor(Math.random() * 5),
      })),
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
