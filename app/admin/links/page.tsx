import { requireAdmin } from '@/lib/auth/actions'
import {
  getSuggestedPages,
  getAllLinkCandidates,
  getLinkCandidateStats
} from '@/lib/wiki/link-candidates'
import { getGraphStats } from '@/lib/wiki/graph'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Link2,
  Network,
  FileQuestion,
  TrendingUp,
  ExternalLink,
  GitBranch
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

/**
 * Admin page for managing wiki link candidates and page graph
 *
 * Shows:
 * - Link candidate statistics
 * - Suggested pages to create
 * - Graph connectivity metrics
 * - Most connected pages
 *
 * Protected by requireAdmin()
 */

export default async function AdminLinksPage() {
  // Require admin access
  await requireAdmin()

  // Fetch statistics and candidates
  const [stats, suggestions, graphStats, allCandidates] = await Promise.all([
    getLinkCandidateStats(),
    getSuggestedPages(50),
    getGraphStats(),
    getAllLinkCandidates({ pageExists: false, minMentions: 2 })
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wiki Links</h1>
          <p className="text-muted-foreground mt-1">
            Manage link candidates and page graph connections
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin">
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Candidates"
          value={stats.total}
          description={`${stats.withoutPages} without pages`}
          icon={Link2}
        />

        <StatCard
          title="Strong Confidence"
          value={stats.strongConfidence}
          description="High-priority candidates"
          icon={TrendingUp}
        />

        <StatCard
          title="Total Pages"
          value={graphStats.totalPages}
          description={`${graphStats.totalConnections} connections`}
          icon={Network}
        />

        <StatCard
          title="Avg Connections"
          value={graphStats.avgConnectionsPerPage.toFixed(1)}
          description="Per page"
          icon={GitBranch}
        />
      </div>

      {/* Most Connected Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Most Connected Pages</CardTitle>
          <CardDescription>
            Pages with the most incoming links (hubs in the knowledge graph)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {graphStats.mostConnectedPages.length > 0 ? (
            <div className="space-y-3">
              {graphStats.mostConnectedPages.map((page, index) => (
                <div
                  key={page.slug}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{page.title}</p>
                      <p className="text-sm text-muted-foreground">
                        /{page.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-lg">{page.connectionCount}</p>
                      <p className="text-xs text-muted-foreground">connections</p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/wiki/${page.slug}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No page connections yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Pages to Create */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Pages to Create</CardTitle>
          <CardDescription>
            Frequently mentioned topics that don't have wiki pages yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length > 0 ? (
            <div className="space-y-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Entity</th>
                    <th className="text-left py-2 px-3 font-medium">Slug</th>
                    <th className="text-center py-2 px-3 font-medium">Mentions</th>
                    <th className="text-center py-2 px-3 font-medium">Confidence</th>
                    <th className="text-right py-2 px-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((candidate) => (
                    <tr key={candidate.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-medium">{candidate.entity}</p>
                      </td>
                      <td className="py-3 px-3">
                        <code className="text-sm text-muted-foreground">
                          {candidate.normalizedSlug}
                        </code>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {candidate.mentionedCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={candidate.confidence} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/wiki/${candidate.normalizedSlug}`}>
                              View
                            </Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/admin/wiki/generate?slug=${candidate.normalizedSlug}`}>
                              Generate
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No suggested pages to create</p>
              <p className="text-sm mt-1">
                Link candidates will appear here as pages are generated
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Candidates (with filters) */}
      <Card>
        <CardHeader>
          <CardTitle>All Link Candidates</CardTitle>
          <CardDescription>
            All entities mentioned across wiki pages (minimum 2 mentions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allCandidates.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {allCandidates.filter(c => c.confidence === 'strong').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Strong</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {allCandidates.filter(c => c.confidence === 'weak').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Weak</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {allCandidates.filter(c => c.confidence === 'ghost').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ghost</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold">{allCandidates.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Entity</th>
                      <th className="text-center py-2 px-2">Mentions</th>
                      <th className="text-center py-2 px-2">Confidence</th>
                      <th className="text-left py-2 px-2">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCandidates
                      .sort((a, b) => b.mentionedCount - a.mentionedCount)
                      .map((candidate) => (
                        <tr key={candidate.id} className="border-b hover:bg-accent/50">
                          <td className="py-2 px-2">{candidate.entity}</td>
                          <td className="py-2 px-2 text-center">
                            {candidate.mentionedCount}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <StatusBadge status={candidate.confidence} />
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            {format(new Date(candidate.lastSeenAt), 'MMM d, yyyy')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No link candidates found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
