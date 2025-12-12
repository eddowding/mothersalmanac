import { requireAdmin } from '@/lib/auth/actions'
import { SettingsForm } from '@/components/admin/SettingsForm'

/**
 * Admin Settings Page
 *
 * Configuration options:
 * - Default chunk size (slider: 500-3000 chars)
 * - Chunk overlap (slider: 50-500 chars)
 * - Similarity threshold (slider: 0.5-1.0)
 * - Max context tokens (slider: 2000-10000)
 * - Auto-process on upload (toggle)
 * - Embedding model (dropdown: voyage-3, etc.)
 *
 * Dangerous Zone:
 * - Reprocess all documents
 * - Clear all chunks (with confirmation)
 * - Regenerate all embeddings
 */

export default async function SettingsPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure knowledge base processing and search parameters
        </p>
      </div>

      {/* Settings Form */}
      <SettingsForm />
    </div>
  )
}
