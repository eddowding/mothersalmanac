'use client'

import { format } from 'date-fns'
import { Share2, MessageSquare, Edit3, Calendar, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  viewCount: number
  generatedAt: string
  confidence: number
  slug: string
}

/**
 * Page footer component
 * Features:
 * - View statistics
 * - Last generated timestamp
 * - Action buttons (share, suggest edit, discuss)
 * - Social sharing
 * - Print-friendly (hidden in print)
 */
export function PageFooter({ viewCount, generatedAt, confidence, slug }: Props) {
  const [sharing, setSharing] = useState(false)

  /**
   * Handle share button click
   * Uses Web Share API if available, otherwise copies to clipboard
   */
  const handleShare = async () => {
    setSharing(true)

    const shareData = {
      title: document.title,
      text: 'Check out this article from Mother\'s Almanac',
      url: window.location.href,
    }

    try {
      // Try Web Share API first (mobile)
      if (navigator.share) {
        await navigator.share(shareData)
        toast.success('Shared successfully!')
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      // User cancelled or error occurred
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to share')
      }
    } finally {
      setSharing(false)
    }
  }

  /**
   * Handle suggest edit button
   */
  const handleSuggestEdit = () => {
    // TODO: Implement edit suggestion flow
    toast.info('Edit suggestion feature coming soon!')
  }

  /**
   * Handle discuss button
   */
  const handleDiscuss = () => {
    // TODO: Implement discussion/chat feature
    toast.info('Discussion feature coming soon!')
  }

  return (
    <footer className="wiki-page-footer mt-16 border-t border-border no-print">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Statistics row */}
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong className="text-foreground">{viewCount.toLocaleString()}</strong>{' '}
                {viewCount === 1 ? 'view' : 'views'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>
                Last generated{' '}
                <time dateTime={generatedAt} className="text-foreground">
                  {format(new Date(generatedAt), 'PPP')}
                </time>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-almanac-cream-100 dark:bg-gray-800 text-foreground">
                {(confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Actions row */}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={sharing}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSuggestEdit}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Suggest Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscuss}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Discuss
              </Button>
            </div>

            {/* Print button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This page was automatically generated from trusted sources. While we strive for
              accuracy, information may be incomplete or require updates. Please verify critical
              information from primary sources.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
