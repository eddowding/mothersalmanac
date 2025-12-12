'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Document, DocumentStatus } from '@/types/wiki'

interface DocumentCardProps {
  document: Document
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function DocumentCard({
  document,
  onDelete,
  onReprocess,
}: DocumentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)

  async function handleDownload() {
    try {
      toast.loading('Preparing download...')
      const response = await fetch(
        `/api/admin/documents/${document.id}/download`
      )

      if (!response.ok) {
        throw new Error('Download failed')
      }

      const data = await response.json()

      if (data.url) {
        window.open(data.url, '_blank')
        toast.success('Download started')
      } else {
        throw new Error('No download URL')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to download document'
      )
    }
  }

  async function handleReprocess() {
    setIsReprocessing(true)
    try {
      const response = await fetch(
        `/api/admin/documents/${document.id}/reprocess`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        throw new Error('Reprocessing failed')
      }

      toast.success('Document queued for reprocessing')
      onReprocess(document.id)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to reprocess document'
      )
    } finally {
      setIsReprocessing(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/documents?id=${document.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      toast.success('Document deleted successfully')
      onDelete(document.id)
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete document'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const status = statusConfig[document.processed_status]
  const uploadDate = new Date(document.upload_date)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">
                  {document.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {document.author && (
                    <span className="block">By {document.author}</span>
                  )}
                  <span className="block text-xs mt-1">
                    Uploaded {formatDistanceToNow(uploadDate, { addSuffix: true })}
                  </span>
                </CardDescription>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Original
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleReprocess}
                  disabled={isReprocessing}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isReprocessing ? 'animate-spin' : ''
                    }`}
                  />
                  Re-process
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant="outline" className="capitalize">
              {document.source_type}
            </Badge>
            {document.chunk_count > 0 && (
              <Badge variant="outline">
                {document.chunk_count} chunk{document.chunk_count !== 1 ? 's' : ''}
              </Badge>
            )}
            {document.file_size && (
              <Badge variant="outline">
                {formatFileSize(document.file_size)}
              </Badge>
            )}
          </div>

          {document.processed_at && (
            <p className="text-xs text-gray-500 mt-2">
              Processed{' '}
              {formatDistanceToNow(new Date(document.processed_at), {
                addSuffix: true,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{document.title}"? This will
              remove the document and all its chunks. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
