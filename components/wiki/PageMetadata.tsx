import { Eye, Clock, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface PageMetadataProps {
  viewCount: number
  lastUpdated: string
  readingTime: number
}

export function PageMetadata({ viewCount, lastUpdated, readingTime }: PageMetadataProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
      <span className="flex items-center gap-1">
        <Eye className="h-4 w-4" />
        {viewCount.toLocaleString()} views
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        {readingTime} min read
      </span>
      <span className="flex items-center gap-1">
        <Calendar className="h-4 w-4" />
        Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
      </span>
    </div>
  )
}
