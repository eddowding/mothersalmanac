import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback route handler
 *
 * This route is called by Supabase after OAuth authentication or magic link email.
 * It exchanges the code for a session and redirects the user.
 *
 * IMPORTANT: This URL must be added to Supabase's Redirect URLs:
 * - http://localhost:3000/auth/callback (development)
 * - https://yourdomain.com/auth/callback (production)
 *
 * Flow:
 * 1. User clicks OAuth button or magic link
 * 2. Supabase redirects to this callback with a code
 * 3. We exchange the code for a session
 * 4. Session is stored in cookies
 * 5. User is redirected to origin or home
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      // Redirect to home with error message
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(error.message)}`
      )
    }
  }

  // URL to redirect to after sign in process completes
  // Support 'next' parameter for custom redirects (e.g., /admin)
  return NextResponse.redirect(`${origin}${next}`)
}
