'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { FileText, Search as SearchIcon, Users, TrendingUp } from 'lucide-react'
import { StatCard } from './StatCard'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Analytics Dashboard Component
 *
 * Displays comprehensive analytics across search, documents, and usage
 */

interface AnalyticsData {
  overview: {
    totalSearches: number
    avgSimilarity: number
    topDocumentCoverage: number
    activeUsers: number
  }
  topQueries: Array<{ query: string; count: number; avgSimilarity: number }>
  documentStats: Array<{ title: string; referenceCount: number; coverage: number }>
  searchVolume: Array<{ date: string; count: number }>
  documentUploads: Array<{ date: string; count: number }>
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load analytics data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Searches"
          value={data.overview.totalSearches}
          description="All-time search queries"
          icon={SearchIcon}
        />
        <StatCard
          title="Avg Similarity"
          value={`${(data.overview.avgSimilarity * 100).toFixed(1)}%`}
          description="Search result quality"
          icon={TrendingUp}
        />
        <StatCard
          title="Document Coverage"
          value={`${data.overview.topDocumentCoverage}%`}
          description="Documents used in searches"
          icon={FileText}
        />
        <StatCard
          title="Active Users"
          value={data.overview.activeUsers}
          description="Last 30 days"
          icon={Users}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search Analytics</TabsTrigger>
          <TabsTrigger value="documents">Document Analytics</TabsTrigger>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
        </TabsList>

        {/* Search Analytics */}
        <TabsContent value="search" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Top Search Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topQueries.slice(0, 10).map((query, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{query.query}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {query.count} searches
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {(query.avgSimilarity * 100).toFixed(1)}% avg similarity
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Search Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Search Volume (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.searchVolume}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Document Analytics */}
        <TabsContent value="documents" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Most Referenced Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Most Referenced Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.documentStats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="referenceCount" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Document Coverage */}
            <Card>
              <CardHeader>
                <CardTitle>Document Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.documentStats.slice(0, 5)}
                      dataKey="coverage"
                      nameKey="title"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {data.documentStats.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Trends */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Uploads Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.documentUploads}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
