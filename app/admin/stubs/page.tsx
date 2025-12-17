import { requireAdmin } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/admin/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Sparkles, TrendingUp, Clock } from 'lucide-react'
import { StubsTable } from '@/components/admin/StubsTable'

/**
 * Admin Stubs Management Page
 *
 * Displays suggested topics extracted from entity links
 * that don't have wiki pages yet.
 */
export default async function AdminStubsPage() {
  await requireAdmin()

  const supabase = await createClient()

  // Fetch stub statistics
  const [totalStubs, highConfidence, recentStubs] = await Promise.all([
    supabase
      .from('wiki_stubs')
      .select('id', { count: 'exact', head: true })
      .eq('is_generated', false),
    supabase
      .from('wiki_stubs')
      .select('id', { count: 'exact', head: true })
      .eq('is_generated', false)
      .eq('confidence', 'strong'),
    supabase
      .from('wiki_stubs')
      .select('*')
      .eq('is_generated', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Get top stubs by mention count
  const { data: topStubs } = await supabase
    .from('wiki_stubs')
    .select('*')
    .eq('is_generated', false)
    .order('mention_count', { ascending: false })
    .limit(50)

  // Type assertion for stubs data
  type StubRow = {
    id: string
    slug: string
    title: string
    mentioned_in: string[]
    mention_count: number
    confidence: 'strong' | 'medium' | 'weak'
    category: string | null
    created_at: string
    is_generated: boolean
  }
  const typedStubs = (topStubs || []) as StubRow[]

  // Calculate average mentions
  const avgMentions = typedStubs.length > 0
    ? Math.round(typedStubs.reduce((sum, s) => sum + (s.mention_count || 0), 0) / typedStubs.length)
    : 0

  const stats = {
    totalStubs: totalStubs.count || 0,
    highConfidence: highConfidence.count || 0,
    avgMentions,
    recentCount: recentStubs.data?.length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Topic Suggestions</h1>
        <p className="text-muted-foreground mt-1">
          Topics mentioned in wiki pages that don&apos;t have their own page yet
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Suggestions"
          value={stats.totalStubs}
          description="Topics waiting to be generated"
          icon={Lightbulb}
        />

        <StatCard
          title="High Confidence"
          value={stats.highConfidence}
          description="Strong candidates for generation"
          icon={Sparkles}
        />

        <StatCard
          title="Avg Mentions"
          value={stats.avgMentions}
          description="Average times topics are referenced"
          icon={TrendingUp}
        />

        <StatCard
          title="Recent Discoveries"
          value={stats.recentCount}
          description="Topics found in last 24 hours"
          icon={Clock}
        />
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Suggested Topics</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Click Generate to create a wiki page for any topic
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Strong
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Medium
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              Weak
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <StubsTable stubs={typedStubs} />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentStubs.data && recentStubs.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Discovered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentStubs.data.map((stub: any) => (
                <div
                  key={stub.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{stub.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Mentioned in {stub.mention_count} page{stub.mention_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge
                    variant={
                      stub.confidence === 'strong'
                        ? 'default'
                        : stub.confidence === 'medium'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {stub.confidence}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
