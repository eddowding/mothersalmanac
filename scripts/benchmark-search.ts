/**
 * Performance benchmark script for RAG search system
 *
 * Usage: npx tsx scripts/benchmark-search.ts
 */

import { vectorSearch, hybridSearch, smartSearch } from '../lib/rag/search'
import { assembleContext } from '../lib/rag/context'
import { getCacheStats, clearSearchCache } from '../lib/rag/cache'
import type { SearchOptions } from '../lib/rag/search'

interface BenchmarkResult {
  query: string
  strategy: string
  avgLatency: number
  p50: number
  p95: number
  p99: number
  avgSimilarity: number
  minSimilarity: number
  maxSimilarity: number
  avgResultCount: number
  errors: number
}

const TEST_QUERIES = [
  // Basic queries
  'What is gentle parenting?',
  'How to handle toddler tantrums?',
  'Sleep training methods',
  'Breastfeeding tips for newborns',

  // Specific queries
  'What does Dr. Sears say about co-sleeping?',
  'Montessori approach to discipline',
  'How to introduce solid foods at 6 months',

  // Comparative queries
  'Ferber method vs gentle sleep training',
  'Formula vs breastfeeding',
  'Different approaches to potty training',

  // Troubleshooting
  'Baby refusing bottle',
  'Toddler won\'t eat vegetables',
  'Separation anxiety strategies',
]

async function benchmarkStrategy(
  name: string,
  searchFn: (query: string, options?: SearchOptions) => Promise<any[]>,
  queries: string[],
  iterations: number = 3
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = []

  for (const query of queries) {
    const latencies: number[] = []
    const similarities: number[][] = []
    const resultCounts: number[] = []
    let errors = 0

    // Run multiple iterations
    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now()
        const searchResults = await searchFn(query, {
          threshold: 0.7,
          limit: 10,
        })
        const latency = performance.now() - start

        latencies.push(latency)
        resultCounts.push(searchResults.length)

        if (searchResults.length > 0) {
          similarities.push(searchResults.map(r => r.similarity))
        }
      } catch (error) {
        console.error(`Error in ${name} for query "${query}":`, error)
        errors++
      }
    }

    if (latencies.length === 0) continue

    // Calculate statistics
    const sortedLatencies = latencies.sort((a, b) => a - b)
    const allSimilarities = similarities.flat()

    results.push({
      query,
      strategy: name,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
      p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
      p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
      avgSimilarity: allSimilarities.length > 0
        ? allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length
        : 0,
      minSimilarity: allSimilarities.length > 0
        ? Math.min(...allSimilarities)
        : 0,
      maxSimilarity: allSimilarities.length > 0
        ? Math.max(...allSimilarities)
        : 0,
      avgResultCount: resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length,
      errors,
    })
  }

  return results
}

function printResults(results: BenchmarkResult[]) {
  console.log('\n=== PERFORMANCE BENCHMARK RESULTS ===\n')

  // Group by strategy
  const byStrategy = new Map<string, BenchmarkResult[]>()
  for (const result of results) {
    const existing = byStrategy.get(result.strategy) || []
    byStrategy.set(result.strategy, [...existing, result])
  }

  for (const [strategy, strategyResults] of Array.from(byStrategy.entries())) {
    console.log(`\n📊 ${strategy.toUpperCase()} SEARCH`)
    console.log('─'.repeat(80))

    // Overall statistics
    const avgLatency = strategyResults.reduce((a, b) => a + b.avgLatency, 0) / strategyResults.length
    const avgSimilarity = strategyResults.reduce((a, b) => a + b.avgSimilarity, 0) / strategyResults.length
    const avgResults = strategyResults.reduce((a, b) => a + b.avgResultCount, 0) / strategyResults.length

    const allP95 = strategyResults.map(r => r.p95).sort((a, b) => a - b)
    const overallP95 = allP95[Math.floor(allP95.length * 0.95)]

    console.log(`\nOverall Statistics:`)
    console.log(`  Avg Latency:    ${avgLatency.toFixed(2)}ms`)
    console.log(`  P95 Latency:    ${overallP95.toFixed(2)}ms`)
    console.log(`  Avg Similarity: ${avgSimilarity.toFixed(3)}`)
    console.log(`  Avg Results:    ${avgResults.toFixed(1)}`)

    // Individual queries
    console.log(`\nPer-Query Results:`)
    for (const result of strategyResults) {
      const status = result.avgSimilarity > 0.75 ? '✅' :
                     result.avgSimilarity > 0.6 ? '⚠️' : '❌'

      console.log(`\n  ${status} "${result.query}"`)
      console.log(`     Latency:    ${result.avgLatency.toFixed(2)}ms (p95: ${result.p95.toFixed(2)}ms)`)
      console.log(`     Similarity: ${result.avgSimilarity.toFixed(3)} (${result.minSimilarity.toFixed(3)} - ${result.maxSimilarity.toFixed(3)})`)
      console.log(`     Results:    ${result.avgResultCount.toFixed(1)}`)
      if (result.errors > 0) {
        console.log(`     ⚠️  Errors: ${result.errors}`)
      }
    }
  }
}

function printComparison(results: BenchmarkResult[]) {
  console.log('\n\n=== STRATEGY COMPARISON ===\n')

  const strategies = Array.from(new Set(results.map(r => r.strategy)))

  const comparison = strategies.map(strategy => {
    const strategyResults = results.filter(r => r.strategy === strategy)
    return {
      strategy,
      avgLatency: strategyResults.reduce((a, b) => a + b.avgLatency, 0) / strategyResults.length,
      avgSimilarity: strategyResults.reduce((a, b) => a + b.avgSimilarity, 0) / strategyResults.length,
      avgResults: strategyResults.reduce((a, b) => a + b.avgResultCount, 0) / strategyResults.length,
      errors: strategyResults.reduce((a, b) => a + b.errors, 0),
    }
  })

  console.log('Strategy        | Latency | Similarity | Results | Errors')
  console.log('─'.repeat(65))
  for (const c of comparison) {
    const latencyStr = `${c.avgLatency.toFixed(0)}ms`.padEnd(7)
    const simStr = c.avgSimilarity.toFixed(3).padEnd(10)
    const resultsStr = c.avgResults.toFixed(1).padEnd(7)
    const errorsStr = c.errors.toString().padEnd(6)

    console.log(`${c.strategy.padEnd(15)} | ${latencyStr} | ${simStr} | ${resultsStr} | ${errorsStr}`)
  }

  // Recommendations
  console.log('\n📋 Recommendations:')

  const fastest = comparison.sort((a, b) => a.avgLatency - b.avgLatency)[0]
  console.log(`  • Fastest: ${fastest.strategy} (${fastest.avgLatency.toFixed(0)}ms avg)`)

  const bestQuality = comparison.sort((a, b) => b.avgSimilarity - a.avgSimilarity)[0]
  console.log(`  • Best Quality: ${bestQuality.strategy} (${bestQuality.avgSimilarity.toFixed(3)} avg similarity)`)

  const mostResults = comparison.sort((a, b) => b.avgResults - a.avgResults)[0]
  console.log(`  • Most Results: ${mostResults.strategy} (${mostResults.avgResults.toFixed(1)} avg results)`)
}

function printTargetComparison(results: BenchmarkResult[]) {
  console.log('\n\n=== TARGET METRICS COMPARISON ===\n')

  const targets = {
    latencyP95: 200,
    avgSimilarity: 0.75,
    minSimilarity: 0.6,
  }

  const strategies = Array.from(new Set(results.map(r => r.strategy)))

  for (const strategy of strategies) {
    const strategyResults = results.filter(r => r.strategy === strategy)
    const allP95 = strategyResults.map(r => r.p95).sort((a, b) => a - b)
    const p95 = allP95[Math.floor(allP95.length * 0.95)]
    const avgSim = strategyResults.reduce((a, b) => a + b.avgSimilarity, 0) / strategyResults.length
    const minSim = Math.min(...strategyResults.map(r => r.minSimilarity))

    console.log(`${strategy}:`)
    console.log(`  P95 Latency: ${p95.toFixed(0)}ms ${p95 < targets.latencyP95 ? '✅' : '❌'} (target: < ${targets.latencyP95}ms)`)
    console.log(`  Avg Similarity: ${avgSim.toFixed(3)} ${avgSim > targets.avgSimilarity ? '✅' : '❌'} (target: > ${targets.avgSimilarity})`)
    console.log(`  Min Similarity: ${minSim.toFixed(3)} ${minSim > targets.minSimilarity ? '✅' : '⚠️'} (target: > ${targets.minSimilarity})`)
    console.log()
  }
}

async function main() {
  console.log('🚀 Starting RAG Search Performance Benchmark\n')
  console.log(`Test Queries: ${TEST_QUERIES.length}`)
  console.log(`Iterations per query: 3`)
  console.log(`Strategies: vector, hybrid, smart\n`)

  // Clear cache to get fair results
  clearSearchCache()
  console.log('✅ Cache cleared\n')

  const allResults: BenchmarkResult[] = []

  // Benchmark Vector Search
  console.log('Running Vector Search benchmark...')
  const vectorResults = await benchmarkStrategy('vector', vectorSearch, TEST_QUERIES)
  allResults.push(...vectorResults)

  // Benchmark Hybrid Search
  console.log('Running Hybrid Search benchmark...')
  const hybridResults = await benchmarkStrategy('hybrid', hybridSearch, TEST_QUERIES)
  allResults.push(...hybridResults)

  // Benchmark Smart Search
  console.log('Running Smart Search benchmark...')
  const smartResults = await benchmarkStrategy('smart', smartSearch, TEST_QUERIES)
  allResults.push(...smartResults)

  // Print results
  printResults(allResults)
  printComparison(allResults)
  printTargetComparison(allResults)

  // Cache statistics (after running queries)
  const cacheStats = getCacheStats()
  console.log('\n\n=== CACHE STATISTICS ===\n')
  console.log(`  Size: ${cacheStats.size}/${cacheStats.maxSize}`)
  console.log(`  TTL: ${cacheStats.ttlMinutes} minutes`)
  console.log(`  Top cached queries:`)
  for (const entry of cacheStats.entries.slice(0, 5)) {
    console.log(`    - "${entry.query}" (${entry.hits} hits, ${entry.age}s old)`)
  }

  console.log('\n✅ Benchmark complete!\n')
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { benchmarkStrategy }
export type { BenchmarkResult }
