import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { getBacklinks } from '@/lib/wiki/graph'
import { cn } from '@/lib/utils'

interface BacklinksProps {
  slug: string
  className?: string
}

/**
 * Backlinks Component
 * Shows pages that link to the current page (bidirectional discovery)
 *
 * Features:
 * - Lists all pages referencing this page
 * - Shows link context (the text used to link)
 * - Displays link strength indicator
 * - Sorted by relevance
 */
export async function Backlinks({ slug, className }: BacklinksProps) {
  const backlinks = await getBacklinks(slug, 20)

  if (!backlinks || backlinks.length === 0) {
    return null
  }

  return (
    <Card className={cn('p-4 no-print', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-almanac-earth-700 dark:text-almanac-earth-300 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Pages that link here
        </h3>
        <Badge variant="secondary" className="text-xs">
          {backlinks.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {backlinks.map((backlink) => (
          <BacklinkItem key={backlink.slug} backlink={backlink} />
        ))}
      </div>

      {backlinks.length >= 20 && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          Showing top 20 backlinks
        </p>
      )}
    </Card>
  )
}

interface BacklinkItemProps {
  backlink: {
    slug: string
    title: string
    linkText: string
    strength: number
  }
}

function BacklinkItem({ backlink }: BacklinkItemProps) {
  const strengthColor = getStrengthColor(backlink.strength)

  return (
    <div className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
      <div
        className={cn(
          'mt-1 h-2 w-2 rounded-full shrink-0',
          strengthColor
        )}
        aria-hidden="true"
        title={`Link strength: ${(backlink.strength * 100).toFixed(0)}%`}
      />

      <div className="flex-1 min-w-0">
        <Link
          href={`/wiki/${backlink.slug}`}
          className="text-sm text-almanac-sage-700 dark:text-almanac-sage-400 hover:text-almanac-sage-900 dark:hover:text-almanac-sage-200 font-medium block group-hover:underline transition-colors"
        >
          {backlink.title}
        </Link>

        {backlink.linkText && backlink.linkText !== backlink.title && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            Referenced as: "{backlink.linkText}"
          </p>
        )}
      </div>

      {backlink.strength >= 0.8 && (
        <TrendingUp
          className="h-3 w-3 text-green-600 dark:text-green-500 shrink-0 mt-1"
          aria-label="Strong connection"
        />
      )}
    </div>
  )
}

/**
 * Get color for strength indicator
 */
function getStrengthColor(strength: number): string {
  if (strength >= 0.8) {
    return 'bg-green-500 dark:bg-green-600'
  }
  if (strength >= 0.5) {
    return 'bg-blue-500 dark:bg-blue-600'
  }
  if (strength >= 0.3) {
    return 'bg-amber-500 dark:bg-amber-600'
  }
  return 'bg-gray-400 dark:bg-gray-600'
}

/**
 * Compact version showing just count
 */
export async function BacklinksCount({ slug }: { slug: string }) {
  const backlinks = await getBacklinks(slug, 100)
  const count = backlinks?.length || 0

  if (count === 0) return null

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <ArrowLeft className="h-3 w-3" aria-hidden="true" />
      <span>{count} {count === 1 ? 'page links' : 'pages link'} here</span>
    </div>
  )
}
