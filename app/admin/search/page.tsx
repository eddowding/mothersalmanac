import { requireAdmin } from '@/lib/auth/actions'
import { SearchTester } from '@/components/admin/SearchTester'

/**
 * Search Testing Tool Page
 *
 * Features:
 * - Query input with search button
 * - Search mode selector: Vector Only, Hybrid, Keyword Only
 * - Threshold slider (0.5 - 1.0)
 * - Results limit slider (1 - 50)
 * - Source type filter (checkboxes)
 * - Results Display with similarity scores
 * - Debug information (query embedding preview, latency, context size)
 */

export default async function SearchTestingPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Testing</h1>
        <p className="text-muted-foreground mt-1">
          Test and debug vector search functionality with detailed insights
        </p>
      </div>

      {/* Search Tester Component */}
      <SearchTester />
    </div>
  )
}
