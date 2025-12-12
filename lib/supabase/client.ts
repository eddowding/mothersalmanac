import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Browser-side Supabase client for Client Components and client-side operations.
 * Uses @supabase/ssr for automatic cookie handling in App Router.
 *
 * IMPORTANT: This client has anon key access only (respects RLS).
 * Use the server client for Server Components and Route Handlers.
 * NEVER use the admin client on the client side.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Type-safe Supabase client instance for browser use
 */
export type SupabaseClient = ReturnType<typeof createClient>
