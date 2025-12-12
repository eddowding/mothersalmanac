/**
 * Test utilities for wiki page generation
 *
 * Run sample generations to test the RAG pipeline and evaluate quality.
 */

import { generateWikiPage, previewWikiPage, canGenerateWikiPage } from './generation'
import { getConfidenceBadge, analyzeConfidenceBreakdown } from './confidence'
import { estimateReadingTime } from './postprocess'
import type { WikiPageGeneration } from './types'

/**
 * Test topics covering different categories
 */
const TEST_TOPICS = [
  // Medical topics
  'teething-symptoms',
  'fever-in-babies',
  'common-cold-treatment',

  // Development topics
  'crawling-milestones',
  'speech-development',
  'potty-training',

  // Nutrition topics
  'introducing-solid-foods',
  'breastfeeding-tips',
  'toddler-nutrition',

  // Practical topics
  'sleep-training-methods',
  'diaper-changing',
  'baby-proofing',

  // Safety topics
  'car-seat-safety',
  'choking-hazards',
  'poison-prevention',
]

/**
 * Test generation for a single topic
 *
 * @param slug - Page slug to test
 * @returns Test results with detailed analysis
 */
export async function testSingleGeneration(slug: string): Promise<{
  success: boolean
  slug: string
  result?: WikiPageGeneration
  error?: string
  analysis?: {
    confidenceBadge: ReturnType<typeof getConfidenceBadge>
    confidenceBreakdown: ReturnType<typeof analyzeConfidenceBreakdown>
    readingTime: number
    wordCount: number
    citationCount: number
    sectionCount: number
  }
}> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${slug}`)
  console.log('='.repeat(60))

  try {
    // First, check if generation is feasible
    const canGenerate = await canGenerateWikiPage(slug)

    if (!canGenerate.canGenerate) {
      console.log(`L Cannot generate: ${canGenerate.reason}`)
      return {
        success: false,
        slug,
        error: canGenerate.reason,
      }
    }

    // Get preview
    const preview = await previewWikiPage(slug)
    console.log(`\n=Ê Preview:`)
    console.log(`   Sources: ${preview.sourceCount}`)
    console.log(`   Avg Similarity: ${(preview.avgSimilarity * 100).toFixed(1)}%`)
    console.log(`   Topic Type: ${preview.topicType}`)
    console.log(`   Estimated Cost: $${preview.estimatedCost.toFixed(4)}`)

    // Generate page
    console.log(`\n=€ Generating...`)
    const startTime = Date.now()
    const result = await generateWikiPage(slug)
    const duration = Date.now() - startTime

    // Analyze result
    const confidenceBadge = getConfidenceBadge(result.confidence_score || 0)
    const confidenceBreakdown = analyzeConfidenceBreakdown({
      sourceCount: result.sources_used?.length || 0,
      avgSimilarity: preview.avgSimilarity,
      contentLength: result.content.length,
      citationCount: (result.content.match(/\[\d+\]/g) || []).length,
      topicCoverage: 1.0, // Simplified for test
    })

    const readingTime = estimateReadingTime(result.content)
    const wordCount = result.content.split(/\s+/).length
    const citationCount = (result.content.match(/\[\d+\]/g) || []).length
    const sectionCount = (result.content.match(/^##\s+/gm) || []).length

    console.log(`\n Generated successfully in ${duration}ms`)
    console.log(`\n=È Results:`)
    console.log(`   Title: ${result.title}`)
    console.log(`   Confidence: ${(result.confidence_score || 0 * 100).toFixed(1)}% (${confidenceBadge.label})`)
    console.log(`   Length: ${result.content.length} chars (${wordCount} words)`)
    console.log(`   Reading Time: ${readingTime} min`)
    console.log(`   Sections: ${sectionCount}`)
    console.log(`   Citations: ${citationCount}`)
    console.log(`   Sources Used: ${result.sources_used?.length || 0}`)

    console.log(`\n=° Cost:`)
    console.log(`   Input Tokens: ${result.token_usage?.input || 0}`)
    console.log(`   Output Tokens: ${result.token_usage?.output || 0}`)
    console.log(`   Cost: $${(result.token_usage?.cost || 0).toFixed(4)}`)

    console.log(`\n<¯ Confidence Breakdown:`)
    confidenceBreakdown.breakdown.forEach(factor => {
      console.log(`   ${factor.factor}: ${(factor.score * 100).toFixed(1)}% (${factor.explanation})`)
    })

    return {
      success: true,
      slug,
      result,
      analysis: {
        confidenceBadge,
        confidenceBreakdown,
        readingTime,
        wordCount,
        citationCount,
        sectionCount,
      },
    }
  } catch (error) {
    console.log(`\nL Error: ${error instanceof Error ? error.message : 'Unknown error'}`)

    return {
      success: false,
      slug,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test generation across multiple topics
 *
 * @param topics - Array of topic slugs to test (optional, uses defaults)
 * @returns Summary of all test results
 */
export async function testMultipleGenerations(
  topics: string[] = TEST_TOPICS
): Promise<{
  totalTests: number
  successful: number
  failed: number
  results: Array<Awaited<ReturnType<typeof testSingleGeneration>>>
  summary: {
    avgConfidence: number
    avgReadingTime: number
    avgCost: number
    totalCost: number
  }
}> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing ${topics.length} wiki page generations`)
  console.log('='.repeat(60))

  const results: Array<Awaited<ReturnType<typeof testSingleGeneration>>> = []

  for (const slug of topics) {
    const result = await testSingleGeneration(slug)
    results.push(result)

    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Calculate summary statistics
  const successful = results.filter(r => r.success).length
  const failed = results.length - successful

  const successfulResults = results.filter(r => r.success && r.result)

  const avgConfidence = successfulResults.length > 0
    ? successfulResults.reduce((sum, r) => sum + (r.result!.confidence_score || 0), 0) / successfulResults.length
    : 0

  const avgReadingTime = successfulResults.length > 0
    ? successfulResults.reduce((sum, r) => sum + (r.analysis!.readingTime), 0) / successfulResults.length
    : 0

  const totalCost = successfulResults.reduce((sum, r) => sum + (r.result!.token_usage?.cost || 0), 0)
  const avgCost = successfulResults.length > 0 ? totalCost / successfulResults.length : 0

  // Print summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`\n Successful: ${successful}/${results.length}`)
  console.log(`L Failed: ${failed}/${results.length}`)

  if (successfulResults.length > 0) {
    console.log(`\n=Ê Averages:`)
    console.log(`   Confidence: ${(avgConfidence * 100).toFixed(1)}%`)
    console.log(`   Reading Time: ${avgReadingTime.toFixed(1)} min`)
    console.log(`   Cost per Page: $${avgCost.toFixed(4)}`)
    console.log(`   Total Cost: $${totalCost.toFixed(4)}`)
  }

  // List failures
  if (failed > 0) {
    console.log(`\nL Failed Topics:`)
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.slug}: ${r.error}`)
      })
  }

  return {
    totalTests: results.length,
    successful,
    failed,
    results,
    summary: {
      avgConfidence,
      avgReadingTime,
      avgCost,
      totalCost,
    },
  }
}

/**
 * Test generation preview functionality
 *
 * @param slugs - Topics to preview
 */
export async function testPreviews(slugs: string[] = TEST_TOPICS.slice(0, 5)): Promise<void> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing Preview Functionality`)
  console.log('='.repeat(60))

  for (const slug of slugs) {
    console.log(`\n=Ë Preview: ${slug}`)

    try {
      const preview = await previewWikiPage(slug)

      console.log(`   Sources: ${preview.sourceCount}`)
      console.log(`   Avg Similarity: ${(preview.avgSimilarity * 100).toFixed(1)}%`)
      console.log(`   Topic Type: ${preview.topicType}`)
      console.log(`   Estimated Tokens: ${preview.estimatedTokens}`)
      console.log(`   Estimated Cost: $${preview.estimatedCost.toFixed(4)}`)
      console.log(`   Feasible: ${preview.feasible ? '' : 'L'}`)

      if (preview.recommendations.length > 0) {
        console.log(`   Recommendations:`)
        preview.recommendations.forEach(rec => console.log(`     - ${rec}`))
      }
    } catch (error) {
      console.log(`   L Error: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }
}

/**
 * Export a test result to markdown file
 *
 * @param result - Test result
 * @param outputPath - Path to save markdown
 */
export function exportTestResult(
  result: Awaited<ReturnType<typeof testSingleGeneration>>,
  outputPath: string
): string {
  if (!result.success || !result.result) {
    return `# Test Failed: ${result.slug}\n\nError: ${result.error}`
  }

  const { result: page, analysis } = result

  return `# Test Result: ${result.slug}

## Metadata
- **Title**: ${page.title}
- **Confidence**: ${((page.confidence_score || 0) * 100).toFixed(1)}% (${analysis!.confidenceBadge.label})
- **Reading Time**: ${analysis!.readingTime} minutes
- **Word Count**: ${analysis!.wordCount}
- **Sections**: ${analysis!.sectionCount}
- **Citations**: ${analysis!.citationCount}
- **Sources Used**: ${page.sources_used?.length || 0}
- **Generation Time**: ${page.generation_time_ms}ms
- **Cost**: $${(page.token_usage?.cost || 0).toFixed(4)}

## Confidence Breakdown
${analysis!.confidenceBreakdown.breakdown.map(f => `- **${f.factor}**: ${(f.score * 100).toFixed(1)}% - ${f.explanation}`).join('\n')}

## Generated Content

${page.content}
`
}

/**
 * Quick test - generate a single page and show results
 */
export async function quickTest(slug: string = 'teething-symptoms'): Promise<void> {
  await testSingleGeneration(slug)
}

// Export test topics for convenience
export { TEST_TOPICS }
