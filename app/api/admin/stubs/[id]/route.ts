import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/admin/stubs/[id]
 * Delete a stub suggestion
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const supabase = await createClient()

    const { error } = await supabase
      .from('wiki_stubs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete stub:', error)
      return NextResponse.json(
        { error: 'Failed to delete stub' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete stub error:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: 401 }
    )
  }
}
