import { WikiGenerating } from '@/components/wiki/WikiGenerating'
import { WikiNav } from '@/components/WikiNav'

/**
 * Loading state for wiki pages
 * Shown while page is being generated or retrieved from cache
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <WikiNav />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <WikiGenerating />
        </div>
      </main>
    </div>
  )
}
