'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, Sparkles, HelpCircle, Ghost } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PagePreview {
  title: string
  excerpt: string
  confidence_score?: number
  pageExists: boolean
  mentionCount?: number
}

interface SmartLinkProps {
  href: string
  children: React.ReactNode
  confidence?: 'strong' | 'medium' | 'weak' | 'ghost'
  className?: string
  showIcon?: boolean
}

/**
 * SmartLink Component
 * Intelligent wiki links with confidence-based styling and hover previews
 *
 * Features:
 * - Color-coded by confidence level
 * - Hover preview with page snippet
 * - Click generates page if needed
 * - Tooltip showing link type
 * - Accessibility support
 */
export function SmartLink({
  href,
  children,
  confidence = 'medium',
  className,
  showIcon = false
}: SmartLinkProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<'top' | 'bottom'>('bottom')
  const linkRef = useRef<HTMLAnchorElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Extract slug from href
  const slug = href.replace('/wiki/', '')

  // Fetch preview data when hovering
  const { data: preview, isLoading } = useQuery<PagePreview>({
    queryKey: ['smart-link-preview', slug],
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

  // Handle mouse enter with slight delay
  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true)
    }, 300) // 300ms delay before showing preview
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowPreview(false)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Handle keyboard events for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && showPreview) {
      setShowPreview(false)
    }
  }

  // Get styling based on confidence
  const linkStyles = getLinkStyles(confidence)
  const ConfidenceIcon = getConfidenceIcon(confidence)

  return (
    <span className="relative inline-block" onKeyDown={handleKeyDown}>
      <Link
        ref={linkRef}
        href={href}
        className={cn(
          'inline-flex items-center gap-1 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-sm',
          linkStyles.link,
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-describedby={showPreview ? `smart-preview-${slug}` : undefined}
      >
        {children}
        {showIcon && (
          <ConfidenceIcon
            className={cn('h-3 w-3', linkStyles.icon)}
            aria-hidden="true"
          />
        )}
      </Link>

      {/* Preview card */}
      {showPreview && (
        <div
          id={`smart-preview-${slug}`}
          role="tooltip"
          className={cn(
            'absolute z-50 left-0 w-80 pointer-events-none',
            previewPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            'animate-in fade-in-0 zoom-in-95 duration-200'
          )}
          style={{
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          <Card className={cn(
            'p-4 shadow-xl border-2',
            linkStyles.previewBorder,
            'bg-white dark:bg-card'
          )}>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Loading preview...</span>
              </div>
            ) : preview ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-almanac-earth-700 dark:text-foreground">
                    {preview.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn('text-xs shrink-0', linkStyles.badge)}
                  >
                    {confidence}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {preview.excerpt}
                </p>

                <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
                  {preview.confidence_score !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Quality:</span>
                      <span>{(preview.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {preview.mentionCount !== undefined && preview.mentionCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Mentions:</span>
                      <span>{preview.mentionCount}</span>
                    </div>
                  )}
                  {!preview.pageExists && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium">Will generate</span>
                    </div>
                  )}
                </div>
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

/**
 * Get styling based on confidence level
 */
function getLinkStyles(confidence: 'strong' | 'medium' | 'weak' | 'ghost') {
  const styles = {
    strong: {
      link: cn(
        'text-green-700 dark:text-green-400',
        'border-b-2 border-green-500 dark:border-green-600',
        'hover:bg-green-50 dark:hover:bg-green-950',
        'focus:ring-green-500'
      ),
      icon: 'text-green-600 dark:text-green-500',
      badge: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-700',
      previewBorder: 'border-green-300 dark:border-green-700'
    },
    medium: {
      link: cn(
        'text-blue-700 dark:text-blue-400',
        'border-b-2 border-blue-500 dark:border-blue-600',
        'hover:bg-blue-50 dark:hover:bg-blue-950',
        'focus:ring-blue-500'
      ),
      icon: 'text-blue-600 dark:text-blue-500',
      badge: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-700',
      previewBorder: 'border-blue-300 dark:border-blue-700'
    },
    weak: {
      link: cn(
        'text-amber-700 dark:text-amber-400',
        'border-b border-dotted border-amber-500 dark:border-amber-600',
        'hover:bg-amber-50 dark:hover:bg-amber-950',
        'focus:ring-amber-500'
      ),
      icon: 'text-amber-600 dark:text-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700',
      previewBorder: 'border-amber-300 dark:border-amber-700'
    },
    ghost: {
      link: cn(
        'text-gray-600 dark:text-gray-400',
        'border-b border-dotted border-gray-400 dark:border-gray-600',
        'hover:bg-muted',
        'focus:ring-muted-foreground',
        'opacity-75'
      ),
      icon: 'text-muted-foreground',
      badge: 'bg-muted text-muted-foreground border-border',
      previewBorder: 'border-border'
    }
  }

  return styles[confidence]
}

/**
 * Get icon based on confidence level
 */
function getConfidenceIcon(confidence: 'strong' | 'medium' | 'weak' | 'ghost') {
  const icons = {
    strong: ExternalLink,
    medium: Sparkles,
    weak: HelpCircle,
    ghost: Ghost
  }

  return icons[confidence]
}

/**
 * Compact version of SmartLink for inline use
 */
export function SmartLinkCompact({ href, children, confidence = 'medium' }: SmartLinkProps) {
  const linkStyles = getLinkStyles(confidence)

  return (
    <Link
      href={href}
      className={cn(
        'inline transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-sm',
        linkStyles.link
      )}
    >
      {children}
    </Link>
  )
}
