/**
 * Test script for Mother's Almanac Wiki System
 *
 * Tests the complete RAG pipeline, caching, and page generation
 * Run with: npx tsx scripts/test-wiki-system.ts
 */

import { generateWikiPage, validateQuery, batchGeneratePages } from '../lib/wiki/generator'
import { getCachedPage, cachePage, isStale, getCacheStats } from '../lib/wiki/cache'
import { vectorSearch } from '../lib/rag/search'
import { assembleContext } from '../lib/rag/context'
import { queryToSlug, slugToTitle, isValidSlug } from '../lib/wiki/slugs'

// Test topics
const TEST_TOPICS = [
  'swaddling techniques',
  'teething symptoms',
  'pregnancy nutrition',
  'newborn sleep',
  'toddler tantrums'
]

// Color helpers for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green')
}

function logError(message: string) {
  log(`✗ ${message}`, 'red')
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue')
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Test 1: Slug Utilities
 */
async function testSlugUtilities() {
  logSection('Test 1: Slug Utilities')

  const tests = [
    { input: 'Pregnancy Nutrition', expected: 'pregnancy-nutrition' },
    { input: 'How to Swaddle?', expected: 'how-to-swaddle' },
    { input: 'Teething & Symptoms', expected: 'teething-symptoms' },
    { input: 'Multiple   Spaces', expected: 'multiple-spaces' },
  ]

  for (const test of tests) {
    const slug = queryToSlug(test.input)
    if (slug === test.expected) {
      logSuccess(`queryToSlug("${test.input}") = "${slug}"`)
    } else {
      logError(`queryToSlug("${test.input}") expected "${test.expected}", got "${slug}"`)
    }
  }

  // Test slug validation
  const validSlug = 'pregnancy-nutrition'
  const invalidSlug = '../etc/passwd'

  if (isValidSlug(validSlug)) {
    logSuccess(`isValidSlug("${validSlug}") = true`)
  } else {
    logError(`isValidSlug("${validSlug}") should be true`)
  }

  if (!isValidSlug(invalidSlug)) {
    logSuccess(`isValidSlug("${invalidSlug}") = false (correctly rejected)`)
  } else {
    logError(`isValidSlug("${invalidSlug}") should be false`)
  }

  // Test slug to title
  const title = slugToTitle('pregnancy-nutrition')
  if (title === 'Pregnancy Nutrition') {
    logSuccess(`slugToTitle("pregnancy-nutrition") = "${title}"`)
  } else {
    logError(`slugToTitle expected "Pregnancy Nutrition", got "${title}"`)
  }
}

/**
 * Test 2: Vector Search
 */
async function testVectorSearch() {
  logSection('Test 2: Vector Search')

  try {
    const query = 'swaddling techniques'
    logInfo(`Searching for: "${query}"`)

    const results = await vectorSearch(query, {
      threshold: 0.6,
      limit: 5,
    })

    if (results.length > 0) {
      logSuccess(`Found ${results.length} relevant chunks`)

      results.slice(0, 3).forEach((result, index) => {
        console.log(`\n  ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`)
        console.log(`     Source: ${result.document_title || 'Unknown'}`)
        console.log(`     Preview: ${result.content.substring(0, 100)}...`)
      })
    } else {
      logError('No results found - check if documents are uploaded')
    }
  } catch (error) {
    logError(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Test 3: Context Assembly
 */
async function testContextAssembly() {
  logSection('Test 3: Context Assembly')

  try {
    const query = 'teething symptoms'
    logInfo(`Searching for: "${query}"`)

    const results = await vectorSearch(query, {
      threshold: 0.6,
      limit: 10,
    })

    if (results.length === 0) {
      logError('No search results to assemble context from')
      return
    }

    const assembled = assembleContext(results, 6000, query)

    logSuccess(`Assembled context from ${assembled.chunksUsed} chunks`)
    logInfo(`Total tokens: ${assembled.tokensUsed}`)
    logInfo(`Truncated: ${assembled.truncated ? 'Yes' : 'No'}`)
    logInfo(`Sources: ${assembled.sources.length}`)

    if (assembled.sources.length > 0) {
      console.log('\n  Sources used:')
      assembled.sources.forEach((source, index) => {
        console.log(`    ${index + 1}. ${source}`)
      })
    }
  } catch (error) {
    logError(`Context assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Test 4: Query Validation
 */
async function testQueryValidation() {
  logSection('Test 4: Query Validation')

  const queries = [
    'teething symptoms',
    'swaddling',
    'quantum physics',  // Should have no results
    'xyz',  // Too short
  ]

  for (const query of queries) {
    const isValid = await validateQuery(query)
    if (isValid) {
      logSuccess(`"${query}" - Valid (has relevant content)`)
    } else {
      logError(`"${query}" - Invalid (no relevant content or too short)`)
    }
  }
}

/**
 * Test 5: Page Generation
 */
async function testPageGeneration() {
  logSection('Test 5: Page Generation')

  const topic = 'swaddling techniques'
  logInfo(`Generating page for: "${topic}"`)

  try {
    const startTime = Date.now()
    const page = await generateWikiPage(topic)
    const duration = Date.now() - startTime

    logSuccess(`Page generated in ${duration}ms`)
    console.log(`\n  Title: ${page.title}`)
    console.log(`  Slug: ${page.slug}`)
    console.log(`  Confidence: ${(page.confidence_score * 100).toFixed(1)}%`)
    console.log(`  Content length: ${page.content.length} chars`)
    console.log(`  Sources used: ${page.metadata.sources_used?.length || 0}`)

    if (page.metadata.token_usage) {
      console.log(`\n  Token usage:`)
      console.log(`    Input: ${page.metadata.token_usage.input_tokens}`)
      console.log(`    Output: ${page.metadata.token_usage.output_tokens}`)
      console.log(`    Cost: $${page.metadata.token_usage.total_cost.toFixed(4)}`)
    }

    return page
  } catch (error) {
    logError(`Page generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

/**
 * Test 6: Cache Operations
 */
async function testCacheOperations() {
  logSection('Test 6: Cache Operations')

  const topic = 'teething symptoms'
  const slug = queryToSlug(topic)

  try {
    // Generate a page
    logInfo(`Generating page for: "${topic}"`)
    const page = await generateWikiPage(topic)
    logSuccess('Page generated')

    // Cache it
    logInfo('Caching page...')
    await cachePage(page)
    logSuccess('Page cached')

    // Retrieve from cache
    logInfo('Retrieving from cache...')
    const cached = await getCachedPage(slug)

    if (cached) {
      logSuccess('Cache hit!')
      console.log(`  Title: ${cached.title}`)
      console.log(`  View count: ${cached.view_count}`)
      console.log(`  Generated: ${new Date(cached.generated_at).toLocaleString()}`)
      console.log(`  Expires: ${new Date(cached.ttl_expires_at).toLocaleString()}`)
      console.log(`  Stale: ${isStale(cached) ? 'Yes' : 'No'}`)
    } else {
      logError('Cache miss - page not found in cache')
    }

    // Test second retrieval (should be cached)
    logInfo('Second retrieval (should be instant)...')
    const startTime = Date.now()
    const cached2 = await getCachedPage(slug)
    const duration = Date.now() - startTime

    if (cached2) {
      logSuccess(`Cache hit in ${duration}ms`)
    }
  } catch (error) {
    logError(`Cache operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Test 7: Cache Statistics
 */
async function testCacheStats() {
  logSection('Test 7: Cache Statistics')

  try {
    const stats = await getCacheStats()

    console.log(`\n  Total pages: ${stats.total_pages}`)
    console.log(`  Stale pages: ${stats.stale_pages}`)
    console.log(`  Total views: ${stats.total_views}`)
    console.log(`  Avg confidence: ${(stats.avg_confidence * 100).toFixed(1)}%`)

    if (stats.total_pages > 0) {
      logSuccess('Cache statistics retrieved')
    } else {
      logInfo('No cached pages yet')
    }
  } catch (error) {
    logError(`Cache stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Test 8: Batch Generation
 */
async function testBatchGeneration() {
  logSection('Test 8: Batch Generation')

  const topics = TEST_TOPICS.slice(0, 3) // Test with first 3 topics

  logInfo(`Batch generating ${topics.length} pages...`)

  try {
    const pages = await batchGeneratePages(topics, {
      maxContextTokens: 4000, // Reduce for faster testing
    })

    logSuccess(`Generated ${pages.length}/${topics.length} pages`)

    pages.forEach((page, index) => {
      console.log(`\n  ${index + 1}. ${page.title}`)
      console.log(`     Confidence: ${(page.confidence_score * 100).toFixed(1)}%`)
      console.log(`     Published: ${page.published ? 'Yes' : 'No'}`)
    })
  } catch (error) {
    logError(`Batch generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n' + '█'.repeat(60))
  log('Mother\'s Almanac - Wiki System Test Suite', 'cyan')
  console.log('█'.repeat(60))

  try {
    // Run all tests
    await testSlugUtilities()
    await sleep(500)

    await testVectorSearch()
    await sleep(500)

    await testContextAssembly()
    await sleep(500)

    await testQueryValidation()
    await sleep(500)

    await testPageGeneration()
    await sleep(1000)

    await testCacheOperations()
    await sleep(500)

    await testCacheStats()
    await sleep(500)

    // Optional: Batch generation (slower)
    // await testBatchGeneration()

    // Final summary
    logSection('Test Summary')
    logSuccess('All tests completed!')
    logInfo('Check the output above for any errors')
    console.log('\n')

  } catch (error) {
    console.error('\n')
    logError('Test suite failed with error:')
    console.error(error)
    process.exit(1)
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      log('\nTests finished successfully', 'green')
      process.exit(0)
    })
    .catch((error) => {
      log('\nTests failed', 'red')
      console.error(error)
      process.exit(1)
    })
}

export {
  testSlugUtilities,
  testVectorSearch,
  testContextAssembly,
  testQueryValidation,
  testPageGeneration,
  testCacheOperations,
  testCacheStats,
  testBatchGeneration,
}
