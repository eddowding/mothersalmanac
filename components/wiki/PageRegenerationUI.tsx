'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RefreshCw, History, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PageRegenerationUIProps {
  slug: string
  isAdmin: boolean
  currentVersion?: {
    generatedAt: string
    model?: string
    confidenceScore?: number
  }
  className?: string
}

/**
 * PageRegenerationUI Component
 * Allows admins to regenerate pages and users to request updates
 *
 * Features:
 * - Admin: Regenerate button with confirmation
 * - User: Request update (queued for admin review)
 * - Show generation history
 * - Compare versions (future)
 * - Loading states
 */
export function PageRegenerationUI({
  slug,
  isAdmin,
  currentVersion,
  className
}: PageRegenerationUIProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [requestPending, setRequestPending] = useState(false)
  const router = useRouter()

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setShowConfirmDialog(false)

    try {
      const response = await fetch('/api/wiki/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate page')
      }

      toast.success('Page regenerated successfully')
      router.refresh()
    } catch (error) {
      console.error('Regeneration error:', error)
      toast.error('Failed to regenerate page')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleRequestUpdate = async () => {
    setRequestPending(true)

    try {
      const response = await fetch('/api/wiki/request-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      })

      if (!response.ok) {
        throw new Error('Failed to request update')
      }

      toast.success('Update request submitted')
      setRequestPending(true)
    } catch (error) {
      console.error('Request error:', error)
      toast.error('Failed to submit request')
      setRequestPending(false)
    }
  }

  if (isAdmin) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isRegenerating}
              className="gap-2"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </>
              )}
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate Page</DialogTitle>
              <DialogDescription>
                This will regenerate the entire page content using the latest sources and AI model.
                The current version will be archived.
              </DialogDescription>
            </DialogHeader>

            {currentVersion && (
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current Version</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Generated</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(currentVersion.generatedAt), {
                        addSuffix: true
                      })}
                    </span>
                  </div>
                  {currentVersion.model && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <Badge variant="secondary" className="text-xs">
                        {currentVersion.model}
                      </Badge>
                    </div>
                  )}
                  {currentVersion.confidenceScore !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Quality</span>
                      <Badge
                        variant={currentVersion.confidenceScore >= 0.7 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {(currentVersion.confidenceScore * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Regeneration may take 30-60 seconds. The page will automatically refresh when complete.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="gap-2"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Confirm Regeneration
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <GenerationHistory slug={slug} />
      </div>
    )
  }

  // User view - request update
  return (
    <div className={className}>
      {requestPending ? (
        <Badge variant="secondary" className="gap-1.5">
          <Clock className="h-3 w-3" />
          Update requested
        </Badge>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRequestUpdate}
          className="gap-2 text-xs"
        >
          <AlertCircle className="h-3 w-3" />
          Request update
        </Button>
      )}
    </div>
  )
}

/**
 * Generation History Component
 * Shows recent generations with timestamps
 */
function GenerationHistory({ slug }: { slug: string }) {
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/wiki/history?slug=${encodeURIComponent(slug)}`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={showHistory} onOpenChange={setShowHistory}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadHistory}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          History
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generation History</DialogTitle>
          <DialogDescription>
            Recent versions of this page
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No history available
            </div>
          ) : (
            history.map((version, index) => (
              <HistoryItem
                key={version.id || index}
                version={version}
                isLatest={index === 0}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HistoryItem({ version, isLatest }: { version: any; isLatest: boolean }) {
  return (
    <Card className={cn(
      'border',
      isLatest && 'border-primary bg-primary/5'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(version.generated_at), {
                  addSuffix: true
                })}
              </p>
              {isLatest && (
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {version.model && <span>Model: {version.model}</span>}
              {version.confidence_score !== undefined && (
                <span>Quality: {(version.confidence_score * 100).toFixed(0)}%</span>
              )}
              {version.generation_time_ms && (
                <span>Generated in {(version.generation_time_ms / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
          {version.confidence_score >= 0.8 && (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
