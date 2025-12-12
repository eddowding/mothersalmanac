import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy for Mother's Almanac (Next.js 16 convention, formerly middleware.ts)
 *
 * Responsibilities:
 * 1. Refresh Supabase session on every request
 * 2. Protect admin routes (require authentication + admin role)
 * 3. Protect authenticated routes (require authentication)
 * 4. Allow public access to wiki pages and homepage
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Route protection logic
  const isAdminRoute = pathname.startsWith('/admin')
  const isChatHistoryRoute = pathname.startsWith('/chat/history')
  const isAuthRoute = pathname.startsWith('/auth')

  // Protect admin routes
  if (isAdminRoute) {
    if (!user) {
      // Not authenticated - redirect to home with message
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.set('message', 'Please sign in to access admin')
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      // Authenticated but not admin - redirect to home with message
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.set('message', 'Unauthorized - admin access required')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Protect chat history route (requires authentication only)
  if (isChatHistoryRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('message', 'Please sign in to view chat history')
    return NextResponse.redirect(redirectUrl)
  }

  // Allow all other routes (wiki, homepage, auth callback, etc.)
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
