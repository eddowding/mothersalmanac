import { requireAdmin } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Boxes,
  Clock,
  AlertCircle,
  HardDrive,
  DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Admin Dashboard Overview Page
 *
 * Protected route that requires admin role.
 * Displays comprehensive system statistics and management tools.
 *
 * Features:
 * - Key metrics cards
 * - Recent document activity
 * - Processing status
 * - Quick actions
 *
 * Security:
 * - requireAdmin() checks auth and admin role
 * - Middleware also protects /admin/* routes
 * - Uses server-side Supabase client with RLS
 */

export default async function AdminPage() {
  // Require admin access (redirects if not admin)
  await requireAdmin()

  // Fetch admin statistics
  const supabase = await createClient()

  const [
    totalDocuments,
    totalChunks,
    processingDocuments,
    failedDocuments,
    recentDocuments,
  ] = await Promise.all([
    supabase.from('documents').select('id', { count: 'exact', head: true }),
    supabase.from('document_chunks').select('id', { count: 'exact', head: true }),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
    supabase
      .from('documents')
      .select(
        `
        id,
        title,
        status,
        created_at,
        chunk_count,
        file_size,
        user_profiles (
          name,
          email
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Calculate storage
  const { data: storageData } = await supabase.from('documents').select('file_size')
  const totalStorage = storageData?.reduce(
    (sum, doc: any) => sum + (doc.file_size || 0),
    0
  ) || 0
  const storageMB = (totalStorage / 1024 / 1024).toFixed(2)

  // Calculate tokens and cost estimate
  const { data: tokenData } = await supabase.from('documents').select('total_tokens')
  const totalTokens = tokenData?.reduce(
    (sum, doc: any) => sum + (doc.total_tokens || 0),
    0
  ) || 0
  const estimatedCost = (totalTokens / 1_000_000) * 0.1

  const stats = {
    totalDocuments: totalDocuments.count || 0,
    totalChunks: totalChunks.count || 0,
    avgChunksPerDoc:
      totalDocuments.count && totalChunks.count
        ? Math.round(totalChunks.count / totalDocuments.count)
        : 0,
    processingQueue: processingDocuments.count || 0,
    failedUploads: failedDocuments.count || 0,
    storageUsedMB: storageMB,
    estimatedCost: estimatedCost.toFixed(2),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Knowledge base administration overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/documents">Manage Documents</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Documents"
          value={stats.totalDocuments}
          description="Uploaded knowledge base documents"
          icon={FileText}
        />

        <StatCard
          title="Total Chunks"
          value={stats.totalChunks}
          description={`Avg ${stats.avgChunksPerDoc} chunks per document`}
          icon={Boxes}
        />

        <StatCard
          title="Processing Queue"
          value={stats.processingQueue}
          description={
            stats.processingQueue > 0
              ? 'Documents being processed'
              : 'No pending documents'
          }
          icon={Clock}
        />

        <StatCard
          title="Failed Uploads"
          value={stats.failedUploads}
          description={
            stats.failedUploads > 0
              ? 'Needs attention'
              : 'All uploads successful'
          }
          icon={AlertCircle}
        />

        <StatCard
          title="Storage Used"
          value={`${stats.storageUsedMB} MB`}
          description="Total document storage"
          icon={HardDrive}
        />

        <StatCard
          title="Embeddings Cost"
          value={`$${stats.estimatedCost}`}
          description="Estimated embedding generation cost"
          icon={DollarSign}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDocuments.data && recentDocuments.data.length > 0 ? (
            <div className="space-y-4">
              {recentDocuments.data.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <Link
                      href={`/admin/documents/${doc.id}`}
                      className="font-medium hover:underline"
                    >
                      {doc.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(doc.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      <span>•</span>
                      <span>{doc.chunk_count || 0} chunks</span>
                      {doc.user_profiles && (
                        <>
                          <span>•</span>
                          <span>
                            {doc.user_profiles.name || doc.user_profiles.email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded yet</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/admin/documents">Upload First Document</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {(stats.failedUploads > 0 || stats.processingQueue > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.failedUploads > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">
                      {stats.failedUploads} failed upload
                      {stats.failedUploads > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review and retry failed document processing
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link href="/admin/documents?status=failed">Review</Link>
                </Button>
              </div>
            )}
            {stats.processingQueue > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">
                      {stats.processingQueue} document
                      {stats.processingQueue > 1 ? 's' : ''} processing
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Currently being chunked and embedded
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link href="/admin/documents?status=processing">Monitor</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
