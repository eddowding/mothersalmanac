import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Statistical metric card component for admin dashboard
 *
 * Features:
 * - Displays metric value with optional icon
 * - Shows trend indicator (positive/negative)
 * - Optional subtitle/description
 * - Responsive sizing
 */

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value > 0
  const isNegativeTrend = trend && trend.value < 0

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {isPositiveTrend && (
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            )}
            {isNegativeTrend && (
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                isPositiveTrend && 'text-green-600 dark:text-green-400',
                isNegativeTrend && 'text-red-600 dark:text-red-400',
                !isPositiveTrend && !isNegativeTrend && 'text-muted-foreground'
              )}
            >
              {trend.value > 0 && '+'}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
