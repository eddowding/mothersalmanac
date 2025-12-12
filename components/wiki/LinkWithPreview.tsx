'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface PagePreview {
  title: string
  excerpt: string
  confidence_score?: number
}

interface Props {
  href: string
  children: React.ReactNode
}

/**
 * Link with hover preview card
 * Fetches and displays a preview of the target wiki page on hover
 * Features:
 * - Lazy loading of preview data
 * - Positioning to stay within viewport
 * - Loading states
 * - Keyboard accessible
 */
export function LinkWithPreview({ href, children }: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<'top' | 'bottom'>('bottom')
  const linkRef = useRef<HTMLAnchorElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Extract slug from href
  const slug = href.replace('/wiki/', '')

  // Fetch preview data when hovering
  const { data: preview, isLoading } = useQuery<PagePreview>({
    queryKey: ['page-preview', slug],
    queryFn: async () => {
      const response = await fetch(`/api/wiki/preview?slug=${encodeURIComponent(slug)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch preview')
      }
      return response.json()
    },
    enabled: showPreview,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Calculate preview position to avoid viewport overflow
  useEffect(() => {
    if (!showPreview || !linkRef.current) return

    const rect = linkRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    // Show above if link is in bottom half of viewport
    if (rect.bottom > viewportHeight / 2) {
      setPreviewPosition('top')
    } else {
      setPreviewPosition('bottom')
    }
  }, [showPreview])

  // Handle keyboard events for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && showPreview) {
      setShowPreview(false)
    }
  }

  return (
    <span className="relative inline-block" onKeyDown={handleKeyDown}>
      <Link
        ref={linkRef}
        href={href}
        className="wiki-link-medium text-almanac-sage-700 dark:text-almanac-sage-400 underline decoration-1 hover:decoration-2 transition-all focus:outline-none focus:ring-2 focus:ring-almanac-sage-500 focus:ring-offset-2 rounded-sm"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        onFocus={() => setShowPreview(true)}
        onBlur={() => setShowPreview(false)}
        aria-describedby={showPreview ? `preview-${slug}` : undefined}
      >
        {children}
      </Link>

      {/* Preview card */}
      {showPreview && (
        <div
          ref={previewRef}
          id={`preview-${slug}`}
          role="tooltip"
          className={`
            absolute z-50 left-0 w-80 pointer-events-none
            ${previewPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            animate-in fade-in-0 zoom-in-95 duration-200
          `}
          style={{
            // Prevent preview from going off-screen
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          <Card className="p-4 shadow-lg border border-almanac-sage-200 dark:border-almanac-sage-700 bg-white dark:bg-gray-900">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Loading preview...</span>
              </div>
            ) : preview ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-almanac-earth-700 dark:text-almanac-earth-300">
                  {preview.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {preview.excerpt}
                </p>
                {preview.confidence_score !== undefined && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Confidence: {(preview.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Preview not available
              </div>
            )}
          </Card>
        </div>
      )}
    </span>
  )
}
