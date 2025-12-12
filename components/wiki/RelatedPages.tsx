import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, TrendingUp, Lightbulb } from 'lucide-react'
import { getRelatedPages } from '@/lib/wiki/graph'
import { cn } from '@/lib/utils'

interface RelatedPagesProps {
  slug: string
  limit?: number
  className?: string
}

/**
 * RelatedPages Component
 * Suggests similar topics based on entity overlap and link connections
 *
 * Features:
 * - Bidirectional link analysis
 * - Strength-based sorting
 * - Visual strength indicators
 * - "You might also like" section
 */
export async function RelatedPages({ slug, limit = 8, className }: RelatedPagesProps) {
  const relatedPages = await getRelatedPages(slug, limit)

  if (!relatedPages || relatedPages.length === 0) {
    return null
  }

  return (
    <Card className={cn('p-4 no-print', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-almanac-sage-600 dark:text-almanac-sage-400" aria-hidden="true" />
        <h3 className="font-semibold text-sm text-almanac-earth-700 dark:text-almanac-earth-300">
          You might also like
        </h3>
      </div>

      <ul className="space-y-2">
        {relatedPages.map((page) => (
          <RelatedPageItem key={page.slug} page={page} />
        ))}
      </ul>

      {relatedPages.length >= limit && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          Showing top {limit} related pages
        </p>
      )}
    </Card>
  )
}

interface RelatedPageItemProps {
  page: {
    slug: string
    title: string
    strength: number
  }
}

function RelatedPageItem({ page }: RelatedPageItemProps) {
  const strengthPercent = Math.round(page.strength * 100)
  const isStrongConnection = page.strength >= 0.7

  return (
    <li className="group">
      <Link
        href={`/wiki/${page.slug}`}
        className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ArrowRight
            className="h-3 w-3 text-almanac-sage-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm text-almanac-sage-700 dark:text-almanac-sage-400 group-hover:text-almanac-sage-900 dark:group-hover:text-almanac-sage-200 group-hover:translate-x-1 transition-all truncate">
            {page.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isStrongConnection && (
            <TrendingUp
              className="h-3 w-3 text-green-600 dark:text-green-500"
              aria-label="Strong connection"
            />
          )}
          <Badge
            variant="secondary"
            className={cn(
              'text-xs px-1.5 py-0',
              isStrongConnection
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
            )}
          >
            {strengthPercent}%
          </Badge>
        </div>
      </Link>
    </li>
  )
}

/**
 * Compact version for sidebar
 */
export async function RelatedPagesCompact({ slug, limit = 5 }: { slug: string; limit?: number }) {
  const relatedPages = await getRelatedPages(slug, limit)

  if (!relatedPages || relatedPages.length === 0) {
    return null
  }

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-muted-foreground mb-2">Related</h4>
      {relatedPages.map((page) => (
        <Link
          key={page.slug}
          href={`/wiki/${page.slug}`}
          className="block text-xs text-almanac-sage-600 dark:text-almanac-sage-500 hover:text-almanac-sage-900 dark:hover:text-almanac-sage-200 hover:underline transition-colors"
        >
          {page.title}
        </Link>
      ))}
    </div>
  )
}
