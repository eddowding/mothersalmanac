import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Health check endpoint
 * Returns system status and health metrics
 *
 * GET /api/health
 */

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {}

  try {
    // Check database connectivity
    const dbStart = Date.now()
    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('wiki_cache')
        .select('id', { count: 'exact', head: true })
        .limit(1)

      if (error) throw error

      checks.database = {
        status: 'healthy',
        latency: Date.now() - dbStart,
      }
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Check Anthropic API (without actually calling it - just verify config)
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    checks.anthropic = {
      status: anthropicApiKey ? 'configured' : 'not_configured',
    }

    // Check Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    checks.supabase = {
      status:
        supabaseUrl && supabaseKey && supabaseServiceKey
          ? 'configured'
          : 'misconfigured',
    }

    // Get system metrics
    const supabase = await createClient()

    // Total wiki pages
    const { count: totalPages } = await supabase
      .from('wiki_cache')
      .select('*', { count: 'exact', head: true })

    // Pages generated today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count: pagesToday } = await supabase
      .from('wiki_cache')
      .select('*', { count: 'exact', head: true })
      .gte('generated_at', todayStart.toISOString())

    // Low confidence pages
    const { count: lowConfidencePages } = await supabase
      .from('wiki_cache')
      .select('*', { count: 'exact', head: true })
      .lt('confidence', 0.5)

    // Failed generations today
    const { count: failedToday } = await supabase
      .from('analytics_generations')
      .select('*', { count: 'exact', head: true })
      .eq('success', false)
      .gte('generated_at', todayStart.toISOString())

    const metrics = {
      totalPages: totalPages || 0,
      pagesGeneratedToday: pagesToday || 0,
      lowConfidencePages: lowConfidencePages || 0,
      failedGenerationsToday: failedToday || 0,
    }

    // Determine overall status
    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy' || check.status === 'configured'
    )

    const status = allHealthy ? 'healthy' : 'degraded'

    const response = {
      status,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks,
      metrics,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
    }

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Health check error:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  }
}
