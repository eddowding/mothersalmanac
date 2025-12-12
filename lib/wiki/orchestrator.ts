/**
 * Generation orchestrator for wiki pages
 *
 * Coordinates the entire RAG pipeline:
 * 1. Vector search
 * 2. Context assembly
 * 3. Claude generation
 * 4. Post-processing
 * 5. Confidence scoring
 */

import { vectorSearch } from '../rag/search'
import { assembleContext } from '../rag/context'
import { estimateTokens } from '../rag/tokens'
import { generatePageWithClaude, estimateClaudeTokens, calculateClaudeCost } from './claude'
import { getPromptForTopic, getMinimalPrompt, classifyTopic } from './prompts'
import { postProcessMarkdown, estimateReadingTime } from './postprocess'
import { createSourceMetadata, deduplicateSources, filterToCitedSources } from './sources'
import { calculateConfidence, calculateTopicCoverage } from './confidence'
import { slugToTitle } from './types'
import type { WikiPageGeneration, GenerationOptions } from './types'

/**
 * Default generation options
 */
const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  maxTokens: 8000,       // Context budget
  threshold: 0.7,        // Similarity threshold
  maxSources: 15,        // Max sources to retrieve
  temperature: 0.7,      // Claude temperature
}

/**
 * Orchestrate complete wiki page generation
 *
 * This is the main function that ties together the entire RAG pipeline.
 *
 * @param slug - Page slug to generate
 * @param options - Generation options
 * @returns Complete wiki page generation result
 */
export async function orchestratePageGeneration(
  slug: string,
  options: GenerationOptions = {}
): Promise<WikiPageGeneration> {
  const startTime = Date.now()
  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    console.log(`[Orchestrator] Starting generation for: ${slug}`)

    // 1. Convert slug to query
    const query = slugToTitle(slug)
    console.log(`[Orchestrator] Query: ${query}`)

    // 2. Perform vector search
    console.log(`[Orchestrator] Performing vector search...`)
    const searchResults = await vectorSearch(query, {
      threshold: opts.threshold,
      limit: opts.maxSources,
    })

    console.log(`[Orchestrator] Found ${searchResults.length} search results`)

    // Handle no results case
    if (searchResults.length === 0) {
      console.log(`[Orchestrator] No content found for: ${slug}`)
      return createMinimalPage(slug, Date.now() - startTime)
    }

    // 3. Prepare sources
    console.log(`[Orchestrator] Preparing source metadata...`)
    let sources = createSourceMetadata(searchResults)
    sources = deduplicateSources(sources)

    // 4. Assemble context
    console.log(`[Orchestrator] Assembling context...`)
    const { context, tokensUsed } = assembleContext(
      searchResults,
      opts.maxTokens,
      query
    )

    console.log(`[Orchestrator] Context assembled: ${tokensUsed} tokens`)

    // 5. Determine topic type and get appropriate prompt
    const topicType = classifyTopic(query)
    console.log(`[Orchestrator] Topic type: ${topicType}`)

    // 6. Generate with Claude
    console.log(`[Orchestrator] Generating content with Claude...`)
    const claudeResponse = await generatePageWithClaude({
      topic: query,
      context,
      sources,
    })

    console.log(`[Orchestrator] Content generated: ${claudeResponse.content.length} chars`)

    // 7. Post-process markdown
    console.log(`[Orchestrator] Post-processing markdown...`)
    const processedContent = postProcessMarkdown(claudeResponse.content)

    // 8. Filter sources to only cited ones
    const citedSources = filterToCitedSources(sources, processedContent)
    console.log(`[Orchestrator] ${citedSources.length} sources actually cited`)

    // 9. Calculate confidence score
    console.log(`[Orchestrator] Calculating confidence score...`)
    const avgSimilarity = searchResults.length > 0
      ? searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length
      : 0

    const topicCoverage = calculateTopicCoverage(query, processedContent)

    const confidence = calculateConfidence({
      sourceCount: searchResults.length,
      avgSimilarity,
      contentLength: processedContent.length,
      citationCount: claudeResponse.citations,
      topicCoverage,
    })

    console.log(`[Orchestrator] Confidence score: ${(confidence * 100).toFixed(1)}%`)

    // 10. Calculate token usage and cost
    const tokenEstimate = estimateClaudeTokens(context, query)
    const actualOutputTokens = estimateTokens(processedContent)
    const cost = calculateClaudeCost(tokenEstimate.input, actualOutputTokens)

    const generationTime = Date.now() - startTime
    console.log(`[Orchestrator] Generation complete in ${generationTime}ms`)

    return {
      title: claudeResponse.title || query,
      slug,
      content: processedContent,
      confidence_score: confidence,
      sources_used: searchResults.map(r => r.document_id),
      generation_time_ms: generationTime,
      token_usage: {
        input: tokenEstimate.input,
        output: actualOutputTokens,
        cost,
      },
      metadata: {
        generated_at: new Date().toISOString(),
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      },
    }
  } catch (error) {
    console.error(`[Orchestrator] Error generating page for ${slug}:`, error)

    // Return minimal page on error
    return createMinimalPage(
      slug,
      Date.now() - startTime,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Create a minimal page when no content is available
 *
 * @param slug - Page slug
 * @param generationTime - Time spent attempting generation
 * @param errorMessage - Optional error message
 * @returns Minimal wiki page
 */
function createMinimalPage(
  slug: string,
  generationTime: number,
  errorMessage?: string
): WikiPageGeneration {
  const title = slugToTitle(slug)

  const content = errorMessage
    ? `# ${title}\n\nWe encountered an issue generating this page: ${errorMessage}\n\nPlease try again later or [search for related topics](/).`
    : `# ${title}\n\nWe don't have enough information about this topic yet.\n\nThis could mean:\n- We haven't added relevant sources to our knowledge base yet\n- The topic might be phrased differently in our sources\n- This is a very specific or emerging topic\n\nPlease check back later or try:\n- Searching for related topics\n- Browsing our [knowledge base](/library)\n- [Suggesting this topic](/suggest) for future coverage\n\n## Related Searches\n\nTry searching for:\n- General parenting advice\n- Child development topics\n- Health and wellness information`

  return {
    title,
    slug,
    content,
    confidence_score: 0,
    sources_used: [],
    generation_time_ms: generationTime,
    token_usage: {
      input: 0,
      output: 0,
      cost: 0,
    },
    metadata: {
      generated_at: new Date().toISOString(),
      model: 'none',
    },
  }
}

/**
 * Batch generate multiple pages
 *
 * @param slugs - Array of page slugs to generate
 * @param options - Generation options
 * @param concurrency - Number of concurrent generations (default: 3)
 * @returns Map of slug to generation result
 */
export async function batchGeneratePages(
  slugs: string[],
  options: GenerationOptions = {},
  concurrency: number = 3
): Promise<Map<string, WikiPageGeneration>> {
  const results = new Map<string, WikiPageGeneration>()

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(slug => orchestratePageGeneration(slug, options))
    )

    batchResults.forEach((result, index) => {
      const slug = batch[index]

      if (result.status === 'fulfilled') {
        results.set(slug, result.value)
      } else {
        console.error(`[Orchestrator] Batch generation failed for ${slug}:`, result.reason)
        results.set(slug, createMinimalPage(slug, 0, result.reason?.message))
      }
    })
  }

  return results
}

/**
 * Regenerate a page with fresh content
 *
 * Similar to orchestratePageGeneration but with logging for regeneration.
 *
 * @param slug - Page slug to regenerate
 * @param options - Generation options
 * @returns Updated wiki page
 */
export async function regeneratePage(
  slug: string,
  options: GenerationOptions = {}
): Promise<WikiPageGeneration> {
  console.log(`[Orchestrator] Regenerating page: ${slug}`)
  return orchestratePageGeneration(slug, options)
}

/**
 * Preview generation without saving
 *
 * Useful for testing or showing previews to users before committing.
 *
 * @param slug - Page slug
 * @param options - Generation options
 * @returns Preview of generated page
 */
export async function previewGeneration(
  slug: string,
  options: GenerationOptions = {}
): Promise<WikiPageGeneration> {
  console.log(`[Orchestrator] Generating preview for: ${slug}`)
  return orchestratePageGeneration(slug, options)
}

/**
 * Get generation metadata without full generation
 *
 * Performs search and context assembly to estimate what a generation
 * would look like, without actually calling Claude.
 *
 * @param slug - Page slug
 * @returns Metadata about potential generation
 */
export async function getGenerationMetadata(
  slug: string
): Promise<{
  query: string
  sourceCount: number
  avgSimilarity: number
  estimatedTokens: number
  estimatedCost: number
  topicType: string
}> {
  const query = slugToTitle(slug)

  const searchResults = await vectorSearch(query, {
    threshold: 0.7,
    limit: 15,
  })

  const { context, tokensUsed } = assembleContext(searchResults, 8000, query)

  const avgSimilarity = searchResults.length > 0
    ? searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length
    : 0

  const tokenEstimate = estimateClaudeTokens(context, query)
  const estimatedCost = calculateClaudeCost(tokenEstimate.input, tokenEstimate.output)

  return {
    query,
    sourceCount: searchResults.length,
    avgSimilarity,
    estimatedTokens: tokensUsed,
    estimatedCost,
    topicType: classifyTopic(query),
  }
}
