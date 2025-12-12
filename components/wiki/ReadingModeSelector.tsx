'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { BookOpen, Zap, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ReadingMode = 'quick' | 'deep' | 'source'

interface ReadingModeConfig {
  id: ReadingMode
  label: string
  description: string
  icon: typeof BookOpen
}

const READING_MODES: ReadingModeConfig[] = [
  {
    id: 'quick',
    label: 'Quick Read',
    description: 'Key facts and bullet points',
    icon: Zap
  },
  {
    id: 'deep',
    label: 'Deep Dive',
    description: 'Full comprehensive content',
    icon: BookOpen
  },
  {
    id: 'source',
    label: 'Source Mode',
    description: 'Heavy citations and references',
    icon: FileText
  }
]

const STORAGE_KEY = 'wiki-reading-mode'

interface ReadingModeSelectorProps {
  className?: string
  onModeChange?: (mode: ReadingMode) => void
}

/**
 * ReadingModeSelector Component
 * Toggle between different reading modes with localStorage persistence
 *
 * Modes:
 * - Quick: Key facts, bullet points, summaries
 * - Deep: Full comprehensive content (default)
 * - Source: Heavy citations, footnotes, references
 */
export function ReadingModeSelector({ className, onModeChange }: ReadingModeSelectorProps) {
  const [mode, setMode] = useState<ReadingMode>('deep')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY) as ReadingMode | null
    if (savedMode && READING_MODES.some(m => m.id === savedMode)) {
      setMode(savedMode)
    }
    setIsLoaded(true)
  }, [])

  // Apply mode to document
  useEffect(() => {
    if (!isLoaded) return

    // Remove all mode classes
    document.body.classList.remove('reading-mode-quick', 'reading-mode-deep', 'reading-mode-source')

    // Add current mode class
    document.body.classList.add(`reading-mode-${mode}`)

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, mode)

    // Notify parent
    onModeChange?.(mode)
  }, [mode, isLoaded, onModeChange])

  const handleModeChange = (newMode: ReadingMode) => {
    setMode(newMode)
  }

  const currentMode = READING_MODES.find(m => m.id === mode) || READING_MODES[1]
  const Icon = currentMode.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{currentMode.label}</span>
          <span className="sm:hidden">Mode</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Reading Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {READING_MODES.map((modeConfig) => {
          const ModeIcon = modeConfig.icon
          const isActive = mode === modeConfig.id

          return (
            <DropdownMenuItem
              key={modeConfig.id}
              onClick={() => handleModeChange(modeConfig.id)}
              className="flex items-start gap-3 py-3 cursor-pointer"
            >
              <ModeIcon
                className={cn(
                  'h-4 w-4 mt-0.5 shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'text-primary'
                    )}
                  >
                    {modeConfig.label}
                  </span>
                  {isActive && (
                    <Check className="h-3 w-3 text-primary" aria-label="Active mode" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {modeConfig.description}
                </p>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Badge showing current mode (for mobile/compact layouts)
 */
export function ReadingModeBadge() {
  const [mode, setMode] = useState<ReadingMode>('deep')

  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY) as ReadingMode | null
    if (savedMode && READING_MODES.some(m => m.id === savedMode)) {
      setMode(savedMode)
    }
  }, [])

  const currentMode = READING_MODES.find(m => m.id === mode)
  if (!currentMode) return null

  const Icon = currentMode.icon

  return (
    <Badge variant="secondary" className="gap-1.5">
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className="text-xs">{currentMode.label}</span>
    </Badge>
  )
}

/**
 * Hook to use reading mode in components
 */
export function useReadingMode(): ReadingMode {
  const [mode, setMode] = useState<ReadingMode>('deep')

  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY) as ReadingMode | null
    if (savedMode && READING_MODES.some(m => m.id === savedMode)) {
      setMode(savedMode)
    }

    // Listen for changes
    const handleStorageChange = () => {
      const newMode = localStorage.getItem(STORAGE_KEY) as ReadingMode | null
      if (newMode && READING_MODES.some(m => m.id === newMode)) {
        setMode(newMode)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return mode
}
