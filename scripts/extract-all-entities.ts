/**
 * Batch entity extraction script
 * Re-extracts entities from all cached wiki pages and updates the link graph
 *
 * Usage:
 *   npx tsx scripts/extract-all-entities.ts
 *
 * Options:
 *   --limit N       Process only N pages (for testing)
 *   --force         Reprocess all pages even if already processed
 *   --dry-run       Preview what would be done without making changes
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { extractEntities } from '@/lib/wiki/entities'
import { batchUpsertLinkCandidates } from '@/lib/wiki/link-candidates'
import { recordPageConnections } from '@/lib/wiki/graph'

interface ExtractOptions {
  limit?: number
  force?: boolean
  dryRun?: boolean
}

/**
 * Get all wiki pages from the database
 */
async function getAllWikiPages(limit?: number) {
  const supabase = createAdminClient()

  let query = supabase
    .from('wiki_pages')
    .select('id, slug, title, content, status')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch wiki pages: ${error.message}`)
  }

  return data || []
}

/**
 * Extract entities from a single page
 */
async function processPage(
  page: {
    id: string
    slug: string
    title: string
    content: string
  },
  dryRun: boolean
): Promise<{
  slug: string
  entityCount: number
  linkCandidates: number
  success: boolean
  error?: string
}> {
  try {
    console.log(`\n📄 Processing: ${page.title} (${page.slug})`)

    // Extract entities
    const entities = await extractEntities(page.content)
    console.log(`   Found ${entities.length} entities`)

    if (entities.length === 0) {
      return {
        slug: page.slug,
        entityCount: 0,
        linkCandidates: 0,
        success: true
      }
    }

    if (!dryRun) {
      // Store link candidates
      const candidates = entities.map(entity => ({
        entity: entity.text,
        slug: entity.slug,
        confidence:
          entity.confidence === 'strong'
            ? ('strong' as const)
            : entity.confidence === 'medium'
            ? ('weak' as const)
            : ('ghost' as const)
      }))

      await batchUpsertLinkCandidates(candidates)
      console.log(`   Stored ${candidates.length} link candidates`)

      // Record page connections
      await recordPageConnections(page.slug, entities)
      console.log(`   Recorded page connections`)
    } else {
      console.log(`   [DRY RUN] Would store ${entities.length} candidates`)
    }

    // Display sample entities
    console.log(`   Sample entities:`)
    entities.slice(0, 5).forEach(e => {
      console.log(`     - ${e.text} (${e.confidence})`)
    })

    return {
      slug: page.slug,
      entityCount: entities.length,
      linkCandidates: entities.length,
      success: true
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      slug: page.slug,
      entityCount: 0,
      linkCandidates: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Main extraction function
 */
async function extractAllEntities(options: ExtractOptions = {}) {
  const { limit, dryRun = false } = options

  console.log('🚀 Starting batch entity extraction...\n')

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  if (limit) {
    console.log(`📊 Processing limit: ${limit} pages\n`)
  }

  // Fetch all pages
  console.log('📚 Fetching wiki pages...')
  const pages = await getAllWikiPages(limit)
  console.log(`   Found ${pages.length} published pages\n`)

  if (pages.length === 0) {
    console.log('✅ No pages to process')
    return
  }

  // Process each page
  const results = []
  let processed = 0
  let failed = 0

  for (const page of pages) {
    const result = await processPage(page, dryRun)
    results.push(result)

    if (result.success) {
      processed++
    } else {
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total pages: ${pages.length}`)
  console.log(`Processed: ${processed}`)
  console.log(`Failed: ${failed}`)
  console.log(
    `Total entities: ${results.reduce((sum, r) => sum + r.entityCount, 0)}`
  )
  console.log(
    `Total link candidates: ${results.reduce((sum, r) => sum + r.linkCandidates, 0)}`
  )

  if (failed > 0) {
    console.log('\n❌ Failed pages:')
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.slug}: ${r.error}`)
      })
  }

  console.log('\n✅ Batch extraction complete!')

  if (dryRun) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.')
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): ExtractOptions {
  const args = process.argv.slice(2)
  const options: ExtractOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10)
      i++
    } else if (arg === '--force') {
      options.force = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--help') {
      console.log(`
Batch Entity Extraction Script

Usage:
  npx tsx scripts/extract-all-entities.ts [options]

Options:
  --limit N       Process only N pages (for testing)
  --force         Reprocess all pages even if already processed
  --dry-run       Preview what would be done without making changes
  --help          Show this help message

Examples:
  # Process all pages
  npx tsx scripts/extract-all-entities.ts

  # Test on first 5 pages
  npx tsx scripts/extract-all-entities.ts --limit 5 --dry-run

  # Process only first 10 pages
  npx tsx scripts/extract-all-entities.ts --limit 10
      `)
      process.exit(0)
    }
  }

  return options
}

/**
 * Main entry point
 */
async function main() {
  try {
    const options = parseArgs()
    await extractAllEntities(options)
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { extractAllEntities }
