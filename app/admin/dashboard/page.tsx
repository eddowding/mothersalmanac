import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAnalyticsSummary, getTopWikiPages, getPopularSearches } from '@/lib/analytics/tracking'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, TrendingUp, DollarSign, Zap, FileText, Search, Users, AlertCircle } from 'lucide-react'

/**
 * Admin Dashboard
 * Real-time stats, cost monitoring, and system health
 */

export default async function AdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">System overview and analytics</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Suspense fallback={<StatsLoading />}>
            <OverviewStats />
          </Suspense>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Suspense fallback={<StatsLoading />}>
            <PerformanceStats />
          </Suspense>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <Suspense fallback={<StatsLoading />}>
            <CostStats />
          </Suspense>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Suspense fallback={<StatsLoading />}>
            <ContentStats />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

async function OverviewStats() {
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  const todayStats = await getAnalyticsSummary({
    startDate: startOfDay,
    endDate: endOfDay,
  })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const weekStats = await getAnalyticsSummary({
    startDate: sevenDaysAgo.toISOString(),
    endDate: endOfDay,
  })

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Page Views Today"
          value={todayStats.pageViews.toLocaleString()}
          description="Total page views"
          icon={Activity}
          trend="+12%"
        />
        <StatCard
          title="Searches Today"
          value={todayStats.searches.toLocaleString()}
          description="User searches"
          icon={Search}
          trend="+8%"
        />
        <StatCard
          title="Generations Today"
          value={todayStats.generations.total.toLocaleString()}
          description={`${todayStats.generations.successRate.toFixed(1)}% success rate`}
          icon={FileText}
          trend={`${todayStats.generations.successful} successful`}
        />
        <StatCard
          title="Cost Today"
          value={`$${todayStats.performance.totalCost}`}
          description="API usage cost"
          icon={DollarSign}
          trend="Last 24h"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Page Views</span>
                <span className="font-semibold">{weekStats.pageViews.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Searches</span>
                <span className="font-semibold">{weekStats.searches.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Generations</span>
                <span className="font-semibold">{weekStats.generations.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Cost</span>
                <span className="font-semibold">${weekStats.performance.totalCost}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Suspense fallback={<div>Loading...</div>}>
          <SystemHealthCard />
        </Suspense>
      </div>
    </>
  )
}

async function PerformanceStats() {
  const supabase = await createClient()

  const { data: recentGenerations } = await supabase
    .from('analytics_generations')
    .select('duration_ms, tokens_used, success')
    .order('generated_at', { ascending: false })
    .limit(100)

  type GenerationData = {
    duration_ms: number
    tokens_used: number
    success: boolean
  }

  const generations = (recentGenerations || []) as GenerationData[]

  const avgDuration =
    generations.length > 0
      ? generations.reduce((sum, g) => sum + g.duration_ms, 0) / generations.length
      : 0

  const avgTokens =
    generations.length > 0
      ? generations.reduce((sum, g) => sum + g.tokens_used, 0) / generations.length
      : 0

  const successRate =
    generations.length > 0
      ? (generations.filter((g) => g.success).length / generations.length) * 100
      : 0

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StatCard
        title="Avg Generation Time"
        value={`${(avgDuration / 1000).toFixed(2)}s`}
        description="Last 100 generations"
        icon={Zap}
      />
      <StatCard
        title="Avg Tokens Used"
        value={Math.round(avgTokens).toLocaleString()}
        description="Per generation"
        icon={Activity}
      />
      <StatCard
        title="Success Rate"
        value={`${successRate.toFixed(1)}%`}
        description="Last 100 generations"
        icon={TrendingUp}
      />
    </div>
  )
}

async function CostStats() {
  const supabase = await createClient()

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const { data: monthCosts } = await supabase
    .from('analytics_costs')
    .select('estimated_cost, type, tokens_used')
    .gte('tracked_at', startOfMonth)

  type CostData = {
    estimated_cost: number
    type: string
    tokens_used: number
  }

  const costs = (monthCosts || []) as CostData[]

  const totalCost = costs.reduce((sum, c) => sum + c.estimated_cost, 0)
  const totalTokens = costs.reduce((sum, c) => sum + c.tokens_used, 0)

  const costByType = costs.reduce(
    (acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + c.estimated_cost
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Month-to-Date Cost"
          value={`$${totalCost.toFixed(2)}`}
          description="All API usage"
          icon={DollarSign}
        />
        <StatCard
          title="Total Tokens"
          value={totalTokens.toLocaleString()}
          description="This month"
          icon={Activity}
        />
        <StatCard
          title="Avg Cost/Day"
          value={`$${(totalCost / new Date().getDate()).toFixed(2)}`}
          description="Based on MTD"
          icon={TrendingUp}
        />
      </div>

      {costByType && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>By operation type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(costByType).map(([type, cost]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                  <span className="font-semibold">${cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

async function ContentStats() {
  const topPages = await getTopWikiPages(10)
  const popularSearches = await getPopularSearches({ limit: 10 })

  const supabase = await createClient()
  const { count: totalPages } = await supabase
    .from('wiki_cache')
    .select('*', { count: 'exact', head: true })

  const { count: lowConfidence } = await supabase
    .from('wiki_cache')
    .select('*', { count: 'exact', head: true })
    .lt('confidence', 0.5)

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Total Wiki Pages"
          value={totalPages?.toLocaleString() || '0'}
          description="Cached pages"
          icon={FileText}
        />
        <StatCard
          title="Low Confidence"
          value={lowConfidence?.toLocaleString() || '0'}
          description="Pages below 50%"
          icon={AlertCircle}
        />
        <StatCard
          title="Top Page Views"
          value={topPages && topPages.length > 0 ? (topPages[0] as any).view_count.toLocaleString() : '0'}
          description={topPages && topPages.length > 0 ? (topPages[0] as any).title : 'No data'}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Wiki Pages</CardTitle>
            <CardDescription>By view count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPages.map((page: any, index: number) => (
                <div key={page.slug} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-400 w-6">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{page.title}</p>
                    <p className="text-xs text-gray-500">/{page.slug}</p>
                  </div>
                  <span className="text-sm font-semibold">{page.view_count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Searches</CardTitle>
            <CardDescription>Most searched queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularSearches.map((search: any, index: number) => (
                <div key={search.query} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-400 w-6">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{search.query}</p>
                  </div>
                  <span className="text-sm font-semibold">{search.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

async function SystemHealthCard() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/health`, {
    cache: 'no-store',
  })

  const health = await response.json()

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
        <CardDescription>Current status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Overall Status</span>
            <span
              className={`font-semibold ${
                health.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'
              }`}
            >
              {health.status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Database</span>
            <span
              className={`font-semibold ${
                health.checks.database?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {health.checks.database?.status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Response Time</span>
            <span className="font-semibold">{health.responseTime}ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  description: string
  icon: any
  trend?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
        {trend && (
          <p className="text-xs text-green-600 mt-1 font-medium">{trend}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatsLoading() {
  return (
    <div className="grid gap-6 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-0 pb-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
