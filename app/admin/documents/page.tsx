'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, FileText, Database, Clock, AlertCircle, Play, Trash2, LayoutGrid, List, ChevronDown, RefreshCw, Download, MoreHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentUploadZone } from '@/components/admin/DocumentUploadZone'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { Document, DocumentStatus } from '@/types/wiki'

interface DocumentStats {
  total: number
  totalChunks: number
  processedToday: number
  failed: number
}

const statusConfig: Record<DocumentStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    totalChunks: 0,
    processedToday: 0,
    failed: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [isDeletingFailed, setIsDeletingFailed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; document: Document | null }>({ open: false, document: null })
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const itemsPerPage = 20

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())

      const response = await fetch(`/api/admin/documents?${params}`)
      if (!response.ok) throw new Error('Failed to fetch documents')

      const data = await response.json()
      setDocuments(data.documents)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery, currentPage])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleReprocess(doc: Document) {
    setProcessingIds(prev => new Set(prev).add(doc.id))
    try {
      const resetResponse = await fetch(`/api/admin/documents/${doc.id}/reprocess`, { method: 'POST' })
      if (!resetResponse.ok) throw new Error('Failed to reset')

      const processResponse = await fetch('/api/admin/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      if (!processResponse.ok) throw new Error('Failed to start processing')

      toast.success('Processing started')
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, processed_status: 'processing' as DocumentStatus } : d))
    } catch {
      toast.error('Failed to reprocess')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(doc.id)
        return next
      })
    }
  }

  async function handleDelete(doc: Document) {
    try {
      const response = await fetch(`/api/admin/documents?id=${doc.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')

      toast.success('Document deleted')
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      setStats(prev => ({ ...prev, total: prev.total - 1 }))
      setDeleteDialog({ open: false, document: null })
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const response = await fetch(`/api/admin/documents/${doc.id}/download`)
      if (!response.ok) throw new Error('Download failed')
      const data = await response.json()
      if (data.url) window.open(data.url, '_blank')
    } catch {
      toast.error('Failed to download')
    }
  }

  async function processAllPending() {
    const pendingDocs = documents.filter(doc => doc.processed_status === 'pending')
    if (pendingDocs.length === 0) {
      toast.info('No pending documents')
      return
    }

    setIsProcessingAll(true)
    let success = 0

    for (const doc of pendingDocs) {
      try {
        const response = await fetch('/api/admin/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: doc.id }),
        })
        if (response.ok) {
          success++
          setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, processed_status: 'processing' as DocumentStatus } : d))
        }
      } catch { /* continue */ }
    }

    setIsProcessingAll(false)
    if (success > 0) toast.success(`Started ${success} job(s)`)
    setTimeout(fetchDocuments, 3000)
  }

  async function deleteAllFailed() {
    const failedDocs = documents.filter(doc => doc.processed_status === 'failed')
    if (failedDocs.length === 0) return

    if (!confirm(`Delete ${failedDocs.length} failed document(s)?`)) return

    setIsDeletingFailed(true)
    let success = 0

    for (const doc of failedDocs) {
      try {
        const response = await fetch(`/api/admin/documents?id=${doc.id}`, { method: 'DELETE' })
        if (response.ok) success++
      } catch { /* continue */ }
    }

    setIsDeletingFailed(false)
    if (success > 0) toast.success(`Deleted ${success} document(s)`)
    fetchDocuments()
  }

  const pendingCount = documents.filter(doc => doc.processed_status === 'pending').length
  const failedCount = documents.filter(doc => doc.processed_status === 'failed').length
  const processingCount = documents.filter(doc => doc.processed_status === 'processing').length
  const totalPages = Math.ceil(stats.total / itemsPerPage)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your knowledge base source documents
            </p>
          </div>
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={deleteAllFailed} disabled={isDeletingFailed} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-1.5" />
                {isDeletingFailed ? 'Deleting...' : `Delete ${failedCount} Failed`}
              </Button>
            )}
            {pendingCount > 0 && (
              <Button size="sm" onClick={processAllPending} disabled={isProcessingAll}>
                <Play className="h-4 w-4 mr-1.5" />
                {isProcessingAll ? 'Processing...' : `Process ${pendingCount} Pending`}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap items-center gap-6 py-3 px-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{stats.total} documents</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{stats.totalChunks.toLocaleString()} chunks</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{stats.processedToday} today</span>
          </div>
          {stats.failed > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 font-medium">{stats.failed} failed</span>
            </div>
          )}
          {processingCount > 0 && (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600">{processingCount} processing</span>
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <DocumentUploadZone onUploadComplete={fetchDocuments} />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as DocumentStatus | 'all'); setCurrentPage(1) }}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-md bg-background">
              <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="rounded-r-none">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-l-none">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Documents */}
        {isLoading ? (
          <Card>
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'No matching documents' : 'No documents yet. Upload some above!'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[45%]">Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const status = statusConfig[doc.processed_status]
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-md" title={doc.title}>
                              {doc.title}
                            </p>
                            {doc.author && (
                              <p className="text-xs text-muted-foreground truncate">by {doc.author}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                          {doc.processed_status === 'processing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.chunk_count > 0 ? doc.chunk_count.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.file_size ? formatFileSize(doc.file_size) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(doc.upload_date), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
                              <Download className="h-4 w-4 mr-2" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReprocess(doc)} disabled={processingIds.has(doc.id)}>
                              <RefreshCw className={`h-4 w-4 mr-2 ${processingIds.has(doc.id) ? 'animate-spin' : ''}`} /> Reprocess
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, document: doc })} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const status = statusConfig[doc.processed_status]
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground line-clamp-2 text-sm" title={doc.title}>
                            {doc.title}
                          </p>
                          {doc.author && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">by {doc.author}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReprocess(doc)} disabled={processingIds.has(doc.id)}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${processingIds.has(doc.id) ? 'animate-spin' : ''}`} /> Reprocess
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, document: doc })} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${status.color}`}>
                        {doc.processed_status === 'processing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                        {status.label}
                      </span>
                      {doc.chunk_count > 0 && (
                        <span className="text-muted-foreground">{doc.chunk_count} chunks</span>
                      )}
                      {doc.file_size && (
                        <span className="text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(doc.upload_date), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, document: open ? deleteDialog.document : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Document</DialogTitle>
              <DialogDescription>
                Delete "{deleteDialog.document?.title}"? This removes the document and all its chunks permanently.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog({ open: false, document: null })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteDialog.document && handleDelete(deleteDialog.document)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
