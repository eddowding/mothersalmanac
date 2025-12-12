#!/usr/bin/env tsx
/**
 * Test Script for Wiki Generator
 *
 * Demonstrates the complete RAG pipeline with a sample query.
 * Usage: npm run test:wiki
 */

import { generateWikiPage, WikiGenerationError } from '@/lib/wiki/generator'
import { getEntityStats } from '@/lib/wiki/entities'

// Test query - update this to test different topics
const TEST_QUERY = process.argv[2] || 'swaddling techniques'

async function main() {
  console.log('=====================================')
  console.log('Wiki Generator Test')
  console.log('=====================================\n')

  console.log(`Query: "${TEST_QUERY}"\n`)

  try {
    // Generate page
    const startTime = Date.now()
    const page = await generateWikiPage(TEST_QUERY, {
      maxContextTokens: 8000,
      similarityThreshold: 0.75,
      maxResults: 15,
      temperature: 0.7,
      extractEntities: true,
    })
    const totalTime = Date.now() - startTime

    // Display results
    console.log('\n=====================================')
    console.log('GENERATION SUCCESSFUL')
    console.log('=====================================\n')

    console.log('TITLE:')
    console.log(page.title)
    console.log()

    console.log('CONFIDENCE SCORE:')
    console.log(`${(page.confidence_score * 100).toFixed(1)}%`)
    console.log()

    console.log('METADATA:')
    console.log(`- Generated at: ${page.generated_at}`)
    console.log(`- Model: ${page.metadata.model}`)
    console.log(`- Generation time: ${page.metadata.generation_time_ms}ms (Total: ${totalTime}ms)`)
    console.log(`- Query: ${page.metadata.query}`)
    console.log()

    console.log('SEARCH STATS:')
    console.log(`- Total results: ${page.metadata.search_stats.total_results}`)
    console.log(`- Chunks used: ${page.metadata.chunk_count}`)
    console.log(`- Avg similarity: ${(page.metadata.search_stats.avg_similarity * 100).toFixed(1)}%`)
    console.log(`- Min similarity: ${(page.metadata.search_stats.min_similarity * 100).toFixed(1)}%`)
    console.log(`- Max similarity: ${(page.metadata.search_stats.max_similarity * 100).toFixed(1)}%`)
    console.log()

    console.log('TOKEN USAGE:')
    console.log(`- Input tokens: ${page.metadata.token_usage.input_tokens.toLocaleString()}`)
    console.log(`- Output tokens: ${page.metadata.token_usage.output_tokens.toLocaleString()}`)
    console.log(`- Total tokens: ${(page.metadata.token_usage.input_tokens + page.metadata.token_usage.output_tokens).toLocaleString()}`)
    console.log(`- Cost: $${page.metadata.token_usage.total_cost.toFixed(4)}`)
    console.log()

    console.log('SOURCES:')
    page.metadata.sources_used.forEach((source, i) => {
      console.log(`  ${i + 1}. ${source}`)
    })
    console.log()

    if (page.metadata.entity_links.length > 0) {
      console.log('ENTITY LINKS:')

      // Convert DB format to EntityLink format for stats
      const entityLinksForStats = page.metadata.entity_links.map(e => ({
        text: e.entity,
        slug: e.slug,
        confidence: e.confidence as 'strong' | 'medium' | 'weak' | 'ghost',
        context: '', // Not stored in metadata
      }))

      const stats = getEntityStats(entityLinksForStats)
      console.log(`- Total entities: ${stats.total}`)
      console.log(`- Unique slugs: ${stats.uniqueSlugs}`)
      console.log(`- By confidence:`)
      console.log(`  - Strong: ${stats.byConfidence.strong}`)
      console.log(`  - Medium: ${stats.byConfidence.medium}`)
      console.log(`  - Weak: ${stats.byConfidence.weak}`)
      console.log()

      console.log('Top entities:')
      page.metadata.entity_links.slice(0, 10).forEach(entity => {
        console.log(`  - "${entity.entity}" (${entity.confidence}) -> /${entity.slug}`)
      })
      console.log()
    }

    console.log('CONTENT PREVIEW (First 500 chars):')
    console.log('---')
    console.log(page.content.substring(0, 500) + '...')
    console.log('---\n')

    console.log('FULL CONTENT:')
    console.log('=====================================')
    console.log(page.content)
    console.log('=====================================\n')

    // Save to file for inspection
    const fs = await import('fs/promises')
    const outputPath = `/Users/eddowding/Sites/mothersalmanac/test-output-${Date.now()}.md`
    await fs.writeFile(
      outputPath,
      `# ${page.title}\n\n` +
      `**Generated:** ${page.generated_at}\n` +
      `**Confidence:** ${(page.confidence_score * 100).toFixed(1)}%\n` +
      `**Cost:** $${page.metadata.token_usage.total_cost.toFixed(4)}\n\n` +
      `---\n\n` +
      page.content
    )
    console.log(`Full content saved to: ${outputPath}\n`)

    // Cost projection
    console.log('COST PROJECTIONS:')
    const costPer100 = page.metadata.token_usage.total_cost * 100
    const costPer1000 = page.metadata.token_usage.total_cost * 1000
    console.log(`- 100 pages: $${costPer100.toFixed(2)}`)
    console.log(`- 1,000 pages: $${costPer1000.toFixed(2)}`)
    console.log()

    console.log('SUCCESS!')
    process.exit(0)

  } catch (error) {
    console.error('\n=====================================')
    console.error('GENERATION FAILED')
    console.error('=====================================\n')

    if (error instanceof WikiGenerationError) {
      console.error(`Error Code: ${error.code}`)
      console.error(`Message: ${error.message}`)
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
      console.error(`Stack: ${error.stack}`)
    } else {
      console.error('Unknown error:', error)
    }

    console.error('\nFAILURE!')
    process.exit(1)
  }
}

// Run the test
main()
