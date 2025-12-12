'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  Loader2,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface SearchResult {
  slug: string
  title: string
  excerpt: string
  confidence: 'strong' | 'medium' | 'weak' | 'ghost'
  pageExists: boolean
  relevanceScore: number
  viewCount?: number
}

interface InstantSearchProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onResultClick?: () => void
}

const STORAGE_KEY_RECENT = 'wiki-recent-searches'
const STORAGE_KEY_POPULAR = 'wiki-popular-topics'

/**
 * InstantSearch Component
 * Real-time search with instant results as you type
 *
 * Features:
 * - Instant results with debouncing
 * - Show link confidence in results
 * - Recent searches (localStorage)
 * - Popular topics
 * - Keyboard navigation
 * - Empty state suggestions
 */
export function InstantSearch({
  placeholder = 'Search wiki...',
  className,
  autoFocus = false,
  onResultClick
}: InstantSearchProps) {
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem(STORAGE_KEY_RECENT)
    if (recent) {
      try {
        setRecentSearches(JSON.parse(recent).slice(0, 5))
      } catch (e) {
        console.error('Failed to parse recent searches:', e)
      }
    }
  }, [])

  // Debounced search query
  const debouncedQuery = useDebounce(query, 300)

  // Fetch search results
  const { data: results, isLoading } = useQuery<SearchResult[]>({
    queryKey: ['instant-search', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/wiki/search?q=${encodeURIComponent(debouncedQuery)}&instant=true`
      )
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      return data.results || []
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
  })

  // Fetch popular topics
  const { data: popularTopics } = useQuery<SearchResult[]>({
    queryKey: ['popular-topics'],
    queryFn: async () => {
      const response = await fetch('/api/wiki/popular')
      if (!response.ok) throw new Error('Failed to fetch popular topics')
      const data = await response.json()
      return data.topics || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Handle search submission
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    // Add to recent searches
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated))

    // Navigate or trigger callback
    if (onResultClick) {
      onResultClick()
    }
    setShowResults(false)
    setQuery('')
  }

  // Handle result click
  const handleResultClick = (slug: string, title: string) => {
    handleSearch(title)
    router.push(`/wiki/${slug}`)
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false)
      inputRef.current?.blur()
    }
    if (e.key === 'Enter' && query.trim()) {
      const topResult = results?.[0]
      if (topResult) {
        handleResultClick(topResult.slug, topResult.title)
      }
    }
  }

  const clearQuery = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  const hasResults = results && results.length > 0
  const showEmpty = debouncedQuery.length >= 2 && !isLoading && !hasResults

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearQuery}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <Card
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[500px] overflow-y-auto shadow-xl"
        >
          {/* Search results */}
          {hasResults && (
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-3 py-2">
                Results for "{debouncedQuery}"
              </p>
              <div className="space-y-1">
                {results.map((result) => (
                  <SearchResultItem
                    key={result.slug}
                    result={result}
                    onClick={() => handleResultClick(result.slug, result.title)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No results for "{debouncedQuery}"
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/wiki/${debouncedQuery.toLowerCase().replace(/\s+/g, '-')}`)}
                className="gap-2"
              >
                <Sparkles className="h-3 w-3" />
                Generate page for "{debouncedQuery}"
              </Button>
            </div>
          )}

          {/* Recent searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-2 border-b">
              <p className="text-xs text-muted-foreground px-3 py-2 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Recent searches
              </p>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                  >
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular topics */}
          {!query && popularTopics && popularTopics.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-3 py-2 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Popular topics
              </p>
              <div className="space-y-1">
                {popularTopics.slice(0, 5).map((topic) => (
                  <SearchResultItem
                    key={topic.slug}
                    result={topic}
                    onClick={() => handleResultClick(topic.slug, topic.title)}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

interface SearchResultItemProps {
  result: SearchResult
  onClick: () => void
  compact?: boolean
}

function SearchResultItem({ result, onClick, compact = false }: SearchResultItemProps) {
  const confidenceColors = {
    strong: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    weak: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    ghost: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-500'
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {result.title}
            </p>
            {!result.pageExists && (
              <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-500 shrink-0" />
            )}
          </div>
          {!compact && result.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {result.excerpt}
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={cn('text-xs shrink-0', confidenceColors[result.confidence])}
        >
          {result.confidence}
        </Badge>
      </div>
      {!compact && result.viewCount !== undefined && result.viewCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {result.viewCount} views
        </p>
      )}
    </button>
  )
}

/**
 * Debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
