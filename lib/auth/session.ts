'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef } from 'react'

/**
 * Session refresh utilities for client-side auth management
 *
 * Supabase sessions expire after a certain time (default 1 hour).
 * These utilities help manage session refresh on the client side.
 */

// Session expiry time in milliseconds (55 minutes - refresh before 60 min expiry)
const SESSION_REFRESH_INTERVAL = 55 * 60 * 1000

/**
 * Hook to automatically refresh Supabase session
 *
 * Call this in your root layout or app component to ensure
 * sessions are refreshed before they expire.
 *
 * Usage:
 * ```tsx
 * 'use client'
 * import { useSessionRefresh } from '@/lib/auth/session'
 *
 * export default function ClientLayout({ children }) {
 *   useSessionRefresh()
 *   return <>{children}</>
 * }
 * ```
 */
export function useSessionRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()

    // Function to refresh session
    const refreshSession = async () => {
      try {
        const { error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('Session refresh error:', error)
        }
      } catch (err) {
        console.error('Session refresh failed:', err)
      }
    }

    // Refresh immediately on mount
    refreshSession()

    // Set up interval to refresh periodically
    intervalRef.current = setInterval(refreshSession, SESSION_REFRESH_INTERVAL)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}

/**
 * Subscribe to auth state changes
 *
 * This hook allows you to react to auth state changes (sign in, sign out, etc.)
 *
 * Usage:
 * ```tsx
 * import { useAuthStateChange } from '@/lib/auth/session'
 *
 * export default function MyComponent() {
 *   useAuthStateChange((event, session) => {
 *     if (event === 'SIGNED_IN') {
 *       console.log('User signed in:', session?.user)
 *     } else if (event === 'SIGNED_OUT') {
 *       console.log('User signed out')
 *     }
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useAuthStateChange(
  callback: (
    event: string,
    session: { user: { id: string; email?: string } } | null
  ) => void
) {
  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [callback])
}

/**
 * Manual session refresh
 *
 * Call this function to manually refresh the session.
 * Useful when you need to refresh immediately (e.g., after a long idle period)
 *
 * @returns Promise with success status and optional error
 */
export async function refreshSession() {
  const supabase = createClient()

  try {
    const { error } = await supabase.auth.refreshSession()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get current session
 *
 * Returns the current session if authenticated, null otherwise
 *
 * @returns Promise with session or null
 */
export async function getSession() {
  const supabase = createClient()

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error('Get session error:', error)
      return null
    }

    return session
  } catch (err) {
    console.error('Get session failed:', err)
    return null
  }
}
