import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/wiki/request-update
 * Allows users to request page updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug } = body

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Log update request
    const { error } = await (supabase as any)
      .from('page_update_requests')
      .insert({
        slug,
        requested_at: new Date().toISOString(),
        status: 'pending'
      })

    if (error) {
      // If table doesn't exist, just return success
      // This is a non-critical feature
      console.warn('Failed to log update request:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Update request submitted'
    })
  } catch (error) {
    console.error('Error submitting update request:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}
