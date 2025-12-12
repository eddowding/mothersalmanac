'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Document } from '@/types/wiki'

interface SourceAttributionProps {
  sources: string[] // Document IDs
  className?: string
}

interface SourceDetail {
  id: string
  title: string
  author?: string | null
  source_type: string
}

export function SourceAttribution({ sources, className }: SourceAttributionProps) {
  const [expanded, setExpanded] = useState(false)
  const [sourceDetails, setSourceDetails] = useState<SourceDetail[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch source details on expand
  useEffect(() => {
    if (expanded && sourceDetails.length === 0 && sources.length > 0) {
      fetchSourceDetails()
    }
  }, [expanded, sources])

  const fetchSourceDetails = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call to fetch document details
      // For now, use placeholder data
      const details: SourceDetail[] = sources.map((id, index) => ({
        id,
        title: `Source Document ${index + 1}`,
        author: null,
        source_type: 'book'
      }))
      setSourceDetails(details)
    } catch (error) {
      console.error('Failed to fetch source details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!sources || sources.length === 0) return null

  return (
    <Card className={cn('p-6 border-[hsl(var(--color-almanac-sage-200))] no-print', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={expanded}
        aria-controls="source-details"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[hsl(var(--color-almanac-sage-600))]" />
          <h3 className="font-semibold text-lg text-[hsl(var(--color-almanac-earth-700))]">
            Sources ({sources.length})
          </h3>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 transition-transform text-muted-foreground',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div id="source-details" className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading sources...</div>
          ) : (
            sourceDetails.map((source, i) => (
              <div
                key={source.id}
                className="text-sm border-l-2 border-[hsl(var(--color-almanac-sage-300))] pl-3"
              >
                <div className="font-medium text-foreground">
                  [{i + 1}] {source.title}
                </div>
                {source.author && (
                  <div className="text-muted-foreground">by {source.author}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1 capitalize">
                  {source.source_type}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}
