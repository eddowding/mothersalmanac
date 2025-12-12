import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getConfidenceBadge } from '@/lib/wiki/confidence'

interface ConfidenceBadgeProps {
  score: number
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const badge = getConfidenceBadge(score)

  const colorClass = {
    green: 'bg-green-100 text-green-800 hover:bg-green-200',
    blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    red: 'bg-red-100 text-red-800 hover:bg-red-200'
  }[badge.color]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={colorClass}>
            {badge.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{badge.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Score: {(score * 100).toFixed(0)}%
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
