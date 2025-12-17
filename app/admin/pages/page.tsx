'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, FileText, Eye, Clock, TrendingUp, RefreshCw, Trash2, MoreHorizontal, ExternalLink, CheckCircle, Database, Sparkles, BookOpen, Cpu } from 'lucide-react'
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
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface WikiPage {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  view_count: number
  confidence_score: number | null
  source_count: number
  sources_used: string[]
  generation_source: 'ai_knowledge' | 'rag_documents'
  used_rag: boolean
  model_used: string | null
  created_at: string
  updated_at: string
  generated_at: string | null
}

interface PageStats {
  total: number
  published: number
  draft: number
  totalViews: number
  avgConfidence: number
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  published: { label: 'Published', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [stats, setStats] = useState<PageStats>({
    total: 0,
    published: 0,
    draft: 0,
    totalViews: 0,
    avgConfidence: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; page: WikiPage | null }>({ open: false, page: null })
  const [sourcesDialog, setSourcesDialog] = useState<{ open: boolean; page: WikiPage | null }>({ open: false, page: null })
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())
  const itemsPerPage = 20

  const fetchPages = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      params.append('sort', sortBy)
      params.append('order', sortOrder)
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())

      const response = await fetch(`/api/admin/pages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch pages')

      const data = await response.json()
      setPages(data.pages)
      setStats(data.stats)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Failed to fetch pages:', error)
      toast.error('Failed to load pages')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery, sortBy, sortOrder, currentPage])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  useEffect(() => {
    const timer = setTimeout(() => setCurrentPage(1), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleRegenerate(page: WikiPage) {
    setRegeneratingIds(prev => new Set(prev).add(page.id))
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: page.slug, action: 'regenerate' }),
      })
      if (!response.ok) throw new Error('Failed to regenerate')
      toast.success('Regeneration started')
      setTimeout(fetchPages, 5000)
    } catch {
      toast.error('Failed to regenerate')
    } finally {
      setRegeneratingIds(prev => {
        const next = new Set(prev)
        next.delete(page.id)
        return next
      })
    }
  }

  async function handleDelete(page: WikiPage) {
    try {
      const response = await fetch(`/api/admin/pages?slug=${page.slug}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      toast.success('Page deleted')
      setPages(prev => prev.filter(p => p.id !== page.id))
      setStats(prev => ({ ...prev, total: prev.total - 1 }))
      setDeleteDialog({ open: false, page: null })
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleStatusChange(page: WikiPage, newStatus: string) {
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: page.slug, status: newStatus }),
      })
      if (!response.ok) throw new Error('Update failed')
      toast.success(`Status changed to ${newStatus}`)
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: newStatus as any } : p))
    } catch {
      toast.error('Failed to update status')
    }
  }

  function getConfidenceColor(score: number | null): string {
    if (score === null) return 'text-muted-foreground'
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Wiki Pages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage generated wiki content
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap items-center gap-6 py-3 px-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{stats.total} pages</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">{stats.published} published</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{stats.totalViews.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{(stats.avgConfidence * 100).toFixed(0)}% avg confidence</span>
          </div>
          {stats.draft > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">{stats.draft} drafts</span>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[130px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
                <SelectItem value="view_count">Views</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="confidence_score">Confidence</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="bg-background"
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </Button>
          </div>
        </div>

        {/* Pages Table */}
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
        ) : pages.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'No matching pages' : 'No pages generated yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[35%]">Page</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => {
                  const status = statusConfig[page.status]
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <Link href={`/wiki/${page.slug}`} target="_blank" className="font-medium text-foreground hover:text-primary truncate block max-w-md">
                              {page.title}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">/{page.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {page.used_rag ? (
                          <button
                            onClick={() => setSourcesDialog({ open: true, page })}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                          >
                            <Database className="h-3 w-3" />
                            RAG ({page.source_count})
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            <Sparkles className="h-3 w-3" />
                            AI Only
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {page.view_count.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getConfidenceColor(page.confidence_score)}`}>
                          {page.confidence_score !== null ? `${(page.confidence_score * 100).toFixed(0)}%` : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/wiki/${page.slug}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" /> View Page
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRegenerate(page)} disabled={regeneratingIds.has(page.id)}>
                              <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingIds.has(page.id) ? 'animate-spin' : ''}`} />
                              Regenerate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {page.status !== 'published' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(page, 'published')}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Publish
                              </DropdownMenuItem>
                            )}
                            {page.status !== 'draft' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(page, 'draft')}>
                                <Clock className="h-4 w-4 mr-2" /> Set as Draft
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, page })} className="text-red-600">
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
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, page: open ? deleteDialog.page : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Page</DialogTitle>
              <DialogDescription>
                Delete "{deleteDialog.page?.title}"? This removes the page permanently. Users will see a 404 until it's regenerated.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog({ open: false, page: null })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteDialog.page && handleDelete(deleteDialog.page)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sources Dialog */}
        <Dialog open={sourcesDialog.open} onOpenChange={(open) => setSourcesDialog({ open, page: open ? sourcesDialog.page : null })}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Generation Details
              </DialogTitle>
              <DialogDescription>
                Information about how "{sourcesDialog.page?.title}" was generated
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Model Used */}
              {sourcesDialog.page?.model_used && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Cpu className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Model Used</p>
                    <p className="text-sm font-medium">{sourcesDialog.page.model_used}</p>
                  </div>
                </div>
              )}

              {/* Sources */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Source Documents ({sourcesDialog.page?.sources_used?.length || 0})
                </h4>
                {sourcesDialog.page?.sources_used && sourcesDialog.page.sources_used.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sourcesDialog.page.sources_used.map((source, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                      >
                        <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{source}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                    No source documents — generated from AI knowledge only.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSourcesDialog({ open: false, page: null })}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
