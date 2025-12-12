import { requireAdmin } from '@/lib/auth/actions'
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard'

/**
 * Analytics Dashboard Page
 *
 * Sections:
 * - Search Analytics: Top 20 searched queries, queries with no results, average similarity scores
 * - Document Analytics: Most referenced documents, document coverage, upload trends
 * - Usage Analytics: Wiki pages generated, chat conversations, user engagement
 */

export default async function AnalyticsPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Insights into knowledge base usage and performance
        </p>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />
    </div>
  )
}
