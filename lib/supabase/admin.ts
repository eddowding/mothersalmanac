import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * ADMIN SUPABASE CLIENT - USE WITH EXTREME CAUTION
 *
 * This client uses the service role key and BYPASSES ALL RLS POLICIES.
 * It has full read/write access to the entire database.
 *
 * SECURITY RULES:
 * 1. NEVER expose this client to the browser/client side
 * 2. NEVER use in Client Components
 * 3. ONLY use in:
 *    - Server Actions (with proper authorization checks)
 *    - Route Handlers (with proper authorization checks)
 *    - Background jobs
 *    - Database administration tasks
 * 4. ALWAYS verify user permissions before operations
 * 5. Use regular server client when possible - only use admin when RLS bypass needed
 *
 * Common use cases:
 * - Page view counting (public data, needs to bypass auth)
 * - System-level operations (migrations, cleanup jobs)
 * - Admin dashboard operations (after verifying admin role)
 * - Background processing (webhooks, scheduled tasks)
 *
 * Example safe usage in Server Action:
 * ```ts
 * 'use server'
 * import { createAdminClient } from '@/lib/supabase/admin'
 * import { isAdmin } from '@/lib/auth/actions'
 *
 * export async function deleteUser(userId: string) {
 *   // Verify the current user is admin
 *   const admin = await isAdmin()
 *   if (!admin) throw new Error('Unauthorized')
 *
 *   // Now safe to use admin client
 *   const supabase = createAdminClient()
 *   return await supabase.from('user_profiles').delete().eq('id', userId)
 * }
 * ```
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations.'
    )
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Type-safe admin Supabase client instance
 */
export type SupabaseAdmin = ReturnType<typeof createAdminClient>
