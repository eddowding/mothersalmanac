#!/usr/bin/env tsx

/**
 * Background script to regenerate stale wiki pages
 *
 * This script should be run via:
 * - Vercel Cron Jobs (recommended for production)
 * - Manual execution: npx tsx scripts/regenerate-stale-pages.ts
 * - CI/CD pipeline scheduled job
 *
 * Regenerates the top N most popular pages that have expired TTL
 */

import { getStalePages, cachePage } from '../lib/wiki/cache'
import { regenerateWikiPage } from '../lib/wiki/generator'

// Configuration
const MAX_PAGES_TO_REGENERATE = parseInt(process.env.REGEN_MAX_PAGES || '20', 10)
const DRY_RUN = process.env.DRY_RUN === 'true'

/**
 * Main execution function
 */
async function main() {
  console.log('===========================================')
  console.log('Wiki Page Background Regeneration')
  console.log('===========================================')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Max pages: ${MAX_PAGES_TO_REGENERATE}`)
  console.log(`Started: ${new Date().toISOString()}`)
  console.log()

  try {
    // Step 1: Get stale pages sorted by popularity
    console.log('Fetching stale pages...')
    const stalePages = await getStalePages(MAX_PAGES_TO_REGENERATE)

    if (stalePages.length === 0) {
      console.log('No stale pages found. All pages are up to date!')
      return
    }

    console.log(`Found ${stalePages.length} stale pages to regenerate`)
    console.log()

    // Step 2: Regenerate each page
    let successCount = 0
    let failureCount = 0

    for (const page of stalePages) {
      const pageNum = stalePages.indexOf(page) + 1
      console.log(`[${pageNum}/${stalePages.length}] ${page.slug}`)
      console.log(`  - Current confidence: ${(page.confidence_score * 100).toFixed(1)}%`)
      console.log(`  - Views: ${page.view_count}`)
      console.log(`  - Expired: ${new Date(page.ttl_expires_at).toISOString()}`)

      if (DRY_RUN) {
        console.log('  ’ [DRY RUN] Would regenerate')
        successCount++
      } else {
        try {
          // Regenerate page
          const regenerated = await regenerateWikiPage(page.slug)

          // Cache updated page
          await cachePage(regenerated)

          console.log(`   Regenerated successfully`)
          console.log(`    - New confidence: ${(regenerated.confidence_score * 100).toFixed(1)}%`)
          successCount++

          // Rate limiting: wait 2 seconds between regenerations
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`   Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          failureCount++
        }
      }

      console.log()
    }

    // Summary
    console.log('===========================================')
    console.log('Summary')
    console.log('===========================================')
    console.log(`Total stale pages: ${stalePages.length}`)
    console.log(`Successfully regenerated: ${successCount}`)
    console.log(`Failed: ${failureCount}`)
    console.log(`Completed: ${new Date().toISOString()}`)

    // Exit with error code if failures occurred
    if (failureCount > 0 && !DRY_RUN) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

// Execute
main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
