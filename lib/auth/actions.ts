'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Auth action functions for Mother's Almanac
 *
 * All functions are server actions (use server directive)
 * They handle authentication operations and cache revalidation
 */

// =====================================================
// SIGN IN ACTIONS
// =====================================================

/**
 * Sign in with magic link email
 *
 * Sends a magic link to the user's email address.
 * User clicks the link to authenticate.
 *
 * @param email - User's email address
 * @returns Success status and optional error message
 */
export async function signInWithEmail(email: string) {
  const supabase = await createClient()

  // Get the site URL for redirect
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Sign in with OAuth provider (Google or GitHub)
 *
 * Initiates OAuth flow and redirects to provider.
 * User is redirected back to /auth/callback after authentication.
 *
 * @param provider - OAuth provider ('google' or 'github')
 */
export async function signInWithOAuth(provider: 'google' | 'github') {
  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (data.url) {
    // Redirect to OAuth provider
    redirect(data.url)
  }

  return { success: false, error: 'No redirect URL returned' }
}

// =====================================================
// SIGN OUT ACTION
// =====================================================

/**
 * Sign out the current user
 *
 * Clears the session and redirects to home page
 */
export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

// =====================================================
// USER QUERY FUNCTIONS
// =====================================================

/**
 * Get the current authenticated user
 *
 * Returns null if not authenticated
 *
 * @returns User object or null
 */
export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

/**
 * Get the current user's profile
 *
 * Returns null if not authenticated or profile doesn't exist
 *
 * @returns User profile object or null
 */
export async function getCurrentUserProfile(): Promise<{
  id: string
  email: string
  name: string | null
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
} | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as {
    id: string
    email: string
    name: string | null
    role: 'admin' | 'user'
    created_at: string
    updated_at: string
  } | null
}

/**
 * Check if the current user is an admin
 *
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin() {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'admin'
}

/**
 * Require authentication
 *
 * Redirects to home if user is not authenticated
 * Use this in server components that require auth
 *
 * @returns User object
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/?message=Please sign in to access this page')
  }

  return user
}

/**
 * Require admin role
 *
 * Redirects to home if user is not admin
 * Use this in server components that require admin access
 *
 * @returns User profile object with guaranteed admin role
 */
export async function requireAdmin(): Promise<{
  id: string
  email: string
  name: string | null
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}> {
  const profile = await getCurrentUserProfile()

  if (!profile || (profile as any).role !== 'admin') {
    redirect('/?message=Unauthorized - admin access required')
  }

  return profile as {
    id: string
    email: string
    name: string | null
    role: 'admin' | 'user'
    created_at: string
    updated_at: string
  }
}
