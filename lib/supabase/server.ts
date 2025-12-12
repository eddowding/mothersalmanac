import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 * Uses cookies for session management with proper App Router integration.
 *
 * This client respects RLS policies and authenticates as the current user.
 * For admin operations that bypass RLS, use the admin client.
 *
 * Usage in Server Components:
 * ```ts
 * import { createClient } from '@/lib/supabase/server'
 *
 * export default async function Page() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('posts').select()
 *   // ...
 * }
 * ```
 *
 * Usage in Route Handlers:
 * ```ts
 * import { createClient } from '@/lib/supabase/server'
 *
 * export async function GET() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('posts').select()
 *   return Response.json(data)
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Type-safe Supabase client instance for server use
 */
export type SupabaseServer = Awaited<ReturnType<typeof createClient>>
