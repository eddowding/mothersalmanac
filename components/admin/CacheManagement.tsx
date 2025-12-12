'use client'

/**
 * Cache Management Component
 *
 * Admin dashboard for managing the wiki cache.
 * Displays statistics, popular pages, and provides controls for:
 * - Cache invalidation
 * - Cache warming
 * - Page regeneration
 * - Cleanup operations
 */

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  RefreshCw,
  Trash2,
  Flame,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Zap,
} from 'lucide-react'

interface CacheStats {
  database: {
    totalPages: number
    publishedPages: number
    stalePages: number
    avgConfidence: number
    totalViews: number
  }
  runtime: {
    cacheHits: number
    cacheMisses: number
    hitRate: number
    regenerations: number
    invalidations: number
    warmings: number
    errors: number
    uptimeHours: number
  }
  popularPages: Array<{
    slug: string
    title: string
    views: number
    confidence: number
  }>
  lowConfidencePages: Array<{
    slug: string
    title: string
    confidence: number
  }>
  stalePagesList: Array<{
    slug: string
    title: string
    views: number
    confidence: number
    expiresAt: string
  }>
}

export function CacheManagement() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [operationInProgress, setOperationInProgress] = useState(false)
  const [slugInput, setSlugInput] = useState('')

  // Fetch cache statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/cache')
      if (!response.ok) throw new Error('Failed to fetch stats')

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
      toast.error('Failed to load cache statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Cache operations
  const handleInvalidatePage = async () => {
    if (!slugInput.trim()) {
      toast.error('Please enter a page slug')
      return
    }

    setOperationInProgress(true)
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalidate', slug: slugInput }),
      })

      if (!response.ok) throw new Error('Failed to invalidate page')

      toast.success(`Invalidated page: ${slugInput}`)
      setSlugInput('')
      fetchStats()
    } catch (error) {
      toast.error('Failed to invalidate page')
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleInvalidateAll = async () => {
    if (!confirm('Are you sure you want to invalidate ALL cached pages? This cannot be undone.')) {
      return
    }

    setOperationInProgress(true)
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalidate', all: true }),
      })

      if (!response.ok) throw new Error('Failed to invalidate all pages')

      const data = await response.json()
      toast.success(`Invalidated ${data.count} pages`)
      fetchStats()
    } catch (error) {
      toast.error('Failed to invalidate all pages')
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleWarmCache = async () => {
    setOperationInProgress(true)
    toast.info('Starting cache warming... This may take several minutes')

    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'warm' }),
      })

      if (!response.ok) throw new Error('Failed to warm cache')

      const data = await response.json()
      toast.success(data.message)
      fetchStats()
    } catch (error) {
      toast.error('Failed to warm cache')
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleRegeneratePage = async (slug: string) => {
    setOperationInProgress(true)
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', slug }),
      })

      if (!response.ok) throw new Error('Failed to regenerate page')

      const data = await response.json()
      toast.success(`Regenerated: ${slug} (confidence: ${data.confidence.toFixed(2)})`)
      fetchStats()
    } catch (error) {
      toast.error('Failed to regenerate page')
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleCleanup = async () => {
    setOperationInProgress(true)
    toast.info('Running cleanup...')

    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup', threshold: 0.3 }),
      })

      if (!response.ok) throw new Error('Failed to run cleanup')

      const data = await response.json()
      toast.success(data.message)
      fetchStats()
    } catch (error) {
      toast.error('Failed to run cleanup')
    } finally {
      setOperationInProgress(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading cache statistics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load cache statistics
          </div>
        </CardContent>
      </Card>
    )
  }

  const hitRate = (stats.runtime.hitRate * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.database.totalPages}</div>
            <p className="text-xs text-muted-foreground">
              {stats.database.publishedPages} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hitRate}%</div>
            <Progress value={parseFloat(hitRate)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stale Pages</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.database.stalePages}</div>
            <p className="text-xs text-muted-foreground">Need regeneration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.database.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg confidence: {(stats.database.avgConfidence * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Actions</CardTitle>
          <CardDescription>Manage wiki cache operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invalidate specific page */}
          <div className="flex gap-2">
            <Input
              placeholder="Page slug (e.g., pregnancy-nutrition)"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              disabled={operationInProgress}
            />
            <Button
              onClick={handleInvalidatePage}
              disabled={operationInProgress || !slugInput.trim()}
              variant="outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Invalidate
            </Button>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleWarmCache}
              disabled={operationInProgress}
              variant="default"
            >
              <Flame className="h-4 w-4 mr-2" />
              Warm Cache
            </Button>

            <Button
              onClick={handleCleanup}
              disabled={operationInProgress}
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Run Cleanup
            </Button>

            <Button
              onClick={handleInvalidateAll}
              disabled={operationInProgress}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Cache
            </Button>

            <Button onClick={fetchStats} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="popular">
        <TabsList>
          <TabsTrigger value="popular">Popular Pages</TabsTrigger>
          <TabsTrigger value="stale">Stale Pages</TabsTrigger>
          <TabsTrigger value="low-confidence">Low Confidence</TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.popularPages.map((page) => (
                  <div
                    key={page.slug}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{page.title}</div>
                      <div className="text-sm text-muted-foreground">{page.slug}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <Eye className="h-3 w-3 inline mr-1" />
                        {page.views}
                      </div>
                      <Badge variant={page.confidence > 0.7 ? 'default' : 'secondary'}>
                        {(page.confidence * 100).toFixed(0)}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRegeneratePage(page.slug)}
                        disabled={operationInProgress}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stale" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stale Pages (Expired TTL)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.stalePagesList.map((page) => (
                  <div
                    key={page.slug}
                    className="flex items-center justify-between p-3 rounded-lg border border-yellow-500/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{page.title}</div>
                      <div className="text-sm text-muted-foreground">{page.slug}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <Eye className="h-3 w-3 inline mr-1" />
                        {page.views}
                      </div>
                      <Badge variant="outline">{(page.confidence * 100).toFixed(0)}%</Badge>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleRegeneratePage(page.slug)}
                        disabled={operationInProgress}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-confidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Low Confidence Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.lowConfidencePages.map((page) => (
                  <div
                    key={page.slug}
                    className="flex items-center justify-between p-3 rounded-lg border border-red-500/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{page.title}</div>
                      <div className="text-sm text-muted-foreground">{page.slug}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="destructive">
                        {(page.confidence * 100).toFixed(0)}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleRegeneratePage(page.slug)}
                        disabled={operationInProgress}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
