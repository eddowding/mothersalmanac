import { requireAdmin } from '@/lib/auth/actions'
import { ChunkBrowser } from '@/components/admin/ChunkBrowser'

/**
 * Chunk Browser Page
 *
 * Features:
 * - View all chunks with pagination
 * - Filter by document
 * - Search chunk content (full-text)
 * - View embedding (first 10 dimensions, expandable)
 * - Similarity test: input text, see similar chunks
 * - Edit chunk content (with re-embed button)
 * - Delete individual chunks
 * - Metadata display
 */

export default async function ChunksPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chunks Browser</h1>
        <p className="text-muted-foreground mt-1">
          Browse, search, and manage document chunks and embeddings
        </p>
      </div>

      {/* Chunk Browser Component */}
      <ChunkBrowser />
    </div>
  )
}
