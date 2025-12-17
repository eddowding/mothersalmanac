'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useEffect, useState } from 'react'

interface ThemeProviderProps {
  children: React.ReactNode
}

/**
 * Get the appropriate theme based on user's local time
 * Light mode: 6am - 7pm (6:00 - 19:00)
 * Dark mode: 7pm - 6am (19:00 - 6:00)
 */
function getTimeBasedTheme(): 'light' | 'dark' {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 19 ? 'light' : 'dark'
}

/**
 * Calculate milliseconds until next theme change
 */
function getMillisecondsUntilNextChange(): number {
  const now = new Date()
  const hour = now.getHours()

  // Calculate the next transition time
  let nextTransition: Date
  if (hour >= 6 && hour < 19) {
    // Currently daytime, next transition at 7pm (19:00)
    nextTransition = new Date(now)
    nextTransition.setHours(19, 0, 0, 0)
  } else if (hour >= 19) {
    // Currently evening, next transition at 6am tomorrow
    nextTransition = new Date(now)
    nextTransition.setDate(nextTransition.getDate() + 1)
    nextTransition.setHours(6, 0, 0, 0)
  } else {
    // Currently early morning (before 6am), next transition at 6am today
    nextTransition = new Date(now)
    nextTransition.setHours(6, 0, 0, 0)
  }

  return nextTransition.getTime() - now.getTime()
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [defaultTheme, setDefaultTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Set initial theme based on time
    const initialTheme = getTimeBasedTheme()
    setDefaultTheme(initialTheme)
    setMounted(true)

    // Set up timer to auto-switch at the transition time
    const scheduleNextSwitch = () => {
      const msUntilChange = getMillisecondsUntilNextChange()

      return setTimeout(() => {
        // Force theme change by updating the HTML class
        const newTheme = getTimeBasedTheme()
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(newTheme)

        // Schedule the next switch
        scheduleNextSwitch()
      }, msUntilChange)
    }

    const timerId = scheduleNextSwitch()

    return () => clearTimeout(timerId)
  }, [])

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    )
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}
