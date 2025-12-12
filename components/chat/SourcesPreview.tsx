/**
 * SourcesPreview Component
 *
 * Shows source citations used in the AI response
 */

'use client'

import { MessageSource } from '@/lib/chat/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { BookOpen, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export interface SourcesPreviewProps {
  sources: MessageSource[]
}

export function SourcesPreview({ sources }: SourcesPreviewProps) {
  const [selectedSource, setSelectedSource] = useState<MessageSource | null>(null)

  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <BookOpen className="w-3 h-3" />
        Sources:
      </span>

      {sources.slice(0, 3).map((source, index) => (
        <Popover key={source.chunkId}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedSource(source)}
            >
              [{index + 1}] {source.title.substring(0, 20)}
              {source.title.length > 20 ? '...' : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm">{source.title}</h4>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-4">
                {source.content}
              </p>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Relevance: {Math.round(source.relevance * 100)}%
                </Badge>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ))}

      {sources.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{sources.length - 3} more
        </span>
      )}
    </div>
  )
}
