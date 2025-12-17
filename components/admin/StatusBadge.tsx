import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Status badge component with color-coded indicators
 *
 * Supports common status types:
 * - pending: Yellow/warning
 * - processing: Blue/info with spinner
 * - completed/success: Green
 * - failed/error: Red
 */

type StatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'success' | 'error' | 'strong' | 'medium' | 'weak' | 'ghost'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
}

const statusConfig: Record<StatusType, {
  icon: typeof Clock | typeof Loader2 | typeof CheckCircle2 | typeof XCircle | typeof AlertCircle
  label: string
  className: string
  animated?: boolean
}> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    animated: true,
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  success: {
    icon: CheckCircle2,
    label: 'Success',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  strong: {
    icon: CheckCircle2,
    label: 'Strong',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  medium: {
    icon: Clock,
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  weak: {
    icon: AlertCircle,
    label: 'Weak',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  ghost: {
    icon: XCircle,
    label: 'Ghost',
    className: 'bg-muted text-muted-foreground',
  },
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant="secondary"
      className={cn('flex items-center gap-1.5 w-fit', config.className, className)}
    >
      <Icon className={cn('h-3 w-3', config.animated && 'animate-spin')} />
      <span>{label || config.label}</span>
    </Badge>
  )
}
