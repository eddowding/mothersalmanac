import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalloutProps {
  type?: 'note' | 'warning' | 'tip' | 'caution'
  children: React.ReactNode
}

export function Callout({ type = 'note', children }: CalloutProps) {
  const config = {
    note: {
      icon: Info,
      className: 'bg-blue-50 border-blue-200 text-blue-900'
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-yellow-50 border-yellow-200 text-yellow-900'
    },
    tip: {
      icon: CheckCircle,
      className: 'bg-green-50 border-green-200 text-green-900'
    },
    caution: {
      icon: AlertCircle,
      className: 'bg-red-50 border-red-200 text-red-900'
    }
  }[type]

  const Icon = config.icon

  return (
    <div className={cn('border-l-4 p-4 my-4', config.className)}>
      <div className="flex gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="prose-sm">{children}</div>
      </div>
    </div>
  )
}
