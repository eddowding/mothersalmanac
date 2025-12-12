'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Rabbit,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  TrendingUp,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ReadingPathItem {
  slug: string
  title: string
  reason: string
  depth: number
  isRead: boolean
}

interface RabbitHoleProps {
  currentSlug: string
  className?: string
}

const STORAGE_KEY_PATH = 'wiki-rabbit-hole-path'
const STORAGE_KEY_READ = 'wiki-rabbit-hole-read'

/**
 * RabbitHole Component
 * Auto-suggest next pages to read and build a reading path
 *
 * Features:
 * - AI-suggested next topics based on current page
 * - Build and track reading path
 * - Mark pages as read
 * - Reading progress indicator
 * - "Continue exploring" recommendations
 * - Reset/start new path
 */
export function RabbitHole({ currentSlug, className }: RabbitHoleProps) {
  const [readingPath, setReadingPath] = useState<ReadingPathItem[]>([])
  const [readPages, setReadPages] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<ReadingPathItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load saved state from localStorage
  useEffect(() => {
    const savedPath = localStorage.getItem(STORAGE_KEY_PATH)
    const savedRead = localStorage.getItem(STORAGE_KEY_READ)

    if (savedPath) {
      try {
        setReadingPath(JSON.parse(savedPath))
      } catch (e) {
        console.error('Failed to parse reading path:', e)
      }
    }

    if (savedRead) {
      try {
        setReadPages(new Set(JSON.parse(savedRead)))
      } catch (e) {
        console.error('Failed to parse read pages:', e)
      }
    }
  }, [])

  // Save state to localStorage
  useEffect(() => {
    if (readingPath.length > 0) {
      localStorage.setItem(STORAGE_KEY_PATH, JSON.stringify(readingPath))
    }
    if (readPages.size > 0) {
      localStorage.setItem(STORAGE_KEY_READ, JSON.stringify([...readPages]))
    }
  }, [readingPath, readPages])

  // Mark current page as read
  useEffect(() => {
    if (!readPages.has(currentSlug)) {
      setReadPages(prev => new Set([...prev, currentSlug]))
    }
  }, [currentSlug, readPages])

  // Fetch suggestions for next pages
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/wiki/suggest-next?slug=${encodeURIComponent(currentSlug)}&limit=5`
        )
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuggestions()
  }, [currentSlug])

  const addToPath = (item: ReadingPathItem) => {
    if (readingPath.some(p => p.slug === item.slug)) return

    const newPath = [
      ...readingPath,
      {
        ...item,
        depth: readingPath.length,
        isRead: readPages.has(item.slug)
      }
    ]
    setReadingPath(newPath)
  }

  const resetPath = () => {
    setReadingPath([])
    setReadPages(new Set())
    localStorage.removeItem(STORAGE_KEY_PATH)
    localStorage.removeItem(STORAGE_KEY_READ)
  }

  const navigateAndAdd = (suggestion: ReadingPathItem) => {
    addToPath(suggestion)
    router.push(`/wiki/${suggestion.slug}`)
  }

  const progressPercent = readingPath.length > 0
    ? (readPages.size / readingPath.length) * 100
    : 0

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rabbit className="h-5 w-5 text-almanac-sage-600 dark:text-almanac-sage-400" />
          <h3 className="font-semibold text-sm text-almanac-earth-700 dark:text-almanac-earth-300">
            Rabbit Hole Mode
          </h3>
        </div>
        {readingPath.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetPath}
            className="gap-2 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Reading progress */}
      {readingPath.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Reading progress</span>
            <Badge variant="secondary" className="text-xs">
              {readPages.size} / {readingPath.length}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Current path */}
      {readingPath.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Your reading path
          </p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {readingPath.map((item, index) => (
              <PathItem
                key={item.slug}
                item={item}
                index={index}
                isRead={readPages.has(item.slug)}
                isCurrent={item.slug === currentSlug}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {readingPath.length === 0 ? 'Start your journey' : 'Continue exploring'}
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 rounded-md bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No suggestions available
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.slug}
                suggestion={suggestion}
                onSelect={() => navigateAndAdd(suggestion)}
                isInPath={readingPath.some(p => p.slug === suggestion.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

interface PathItemProps {
  item: ReadingPathItem
  index: number
  isRead: boolean
  isCurrent: boolean
}

function PathItem({ item, index, isRead, isCurrent }: PathItemProps) {
  return (
    <Link
      href={`/wiki/${item.slug}`}
      className={cn(
        'block p-2 rounded-md text-sm transition-colors group',
        isCurrent
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">
            {index + 1}.
          </span>
          {isRead ? (
            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500 shrink-0" />
          ) : (
            <div className="h-3 w-3 rounded-full border-2 border-muted-foreground shrink-0" />
          )}
          <span
            className={cn(
              'truncate',
              isCurrent && 'font-medium text-primary',
              isRead && !isCurrent && 'text-muted-foreground'
            )}
          >
            {item.title}
          </span>
        </div>
        <ArrowRight
          className={cn(
            'h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
            isCurrent && 'opacity-100'
          )}
        />
      </div>
    </Link>
  )
}

interface SuggestionCardProps {
  suggestion: ReadingPathItem
  onSelect: () => void
  isInPath: boolean
}

function SuggestionCard({ suggestion, onSelect, isInPath }: SuggestionCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={isInPath}
      className={cn(
        'w-full text-left p-3 rounded-md border transition-all group',
        isInPath
          ? 'opacity-50 cursor-not-allowed bg-muted'
          : 'hover:border-primary hover:shadow-md hover:scale-[1.02]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1 group-hover:text-primary transition-colors truncate">
            {suggestion.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {suggestion.reason}
          </p>
        </div>
        {!isInPath && (
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
        )}
      </div>
      {isInPath && (
        <Badge variant="secondary" className="text-xs mt-2">
          Already in path
        </Badge>
      )}
    </button>
  )
}

/**
 * Compact version for sidebar
 */
export function RabbitHoleCompact({ currentSlug }: { currentSlug: string }) {
  const [nextSuggestion, setNextSuggestion] = useState<ReadingPathItem | null>(null)

  useEffect(() => {
    const fetchNext = async () => {
      try {
        const response = await fetch(
          `/api/wiki/suggest-next?slug=${encodeURIComponent(currentSlug)}&limit=1`
        )
        if (response.ok) {
          const data = await response.json()
          setNextSuggestion(data.suggestions?.[0] || null)
        }
      } catch (error) {
        console.error('Failed to fetch suggestion:', error)
      }
    }

    fetchNext()
  }, [currentSlug])

  if (!nextSuggestion) return null

  return (
    <Link
      href={`/wiki/${nextSuggestion.slug}`}
      className="block p-3 rounded-md border border-dashed border-almanac-sage-300 dark:border-almanac-sage-700 hover:border-solid hover:border-primary hover:bg-primary/5 transition-all group"
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-3 w-3 text-almanac-sage-600 dark:text-almanac-sage-400" />
        <p className="text-xs font-medium text-muted-foreground">Next up</p>
      </div>
      <p className="text-sm font-medium group-hover:text-primary transition-colors">
        {nextSuggestion.title}
      </p>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        {nextSuggestion.reason}
      </p>
    </Link>
  )
}
