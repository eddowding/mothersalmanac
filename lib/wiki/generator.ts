/**
 * Wiki Page Generator using RAG Pipeline
 *
 * Complete retrieval-augmented generation pipeline:
 * 1. Vector search for relevant content
 * 2. Context assembly and deduplication
 * 3. Claude generation with structured prompts
 * 4. Entity extraction for cross-linking
 * 5. Quality scoring and metadata
 */

import { generate as routerGenerate, estimateCost as routerEstimateCost, type RoutingContext } from '@/lib/ai/router'
import { vectorSearch, type SearchResult } from '@/lib/rag/search'
import { assembleContext } from '@/lib/rag/context'
import {
  boostOfficialSources,
  analyzeOfficialStats,
  enforceDiversity,
  shouldUseWebAugmentation,
  type BoostedSearchResult,
} from '@/lib/rag/prioritization'
import {
  fetchAuthoritativeContentCached,
  buildAugmentedContext,
  type CachedWebAugmentationResult,
} from '@/lib/rag/web-augmentation'
import { buildWikiPrompt, buildHybridWikiPrompt } from './prompts'
import { extractEntities, type EntityLink } from './entities'
import { extractTitle, validateQuery, queryToSlug } from './utils'
import { injectLinks } from './link-injection'

/**
 * RAG quality assessment result
 */
export interface RAGQualityAssessment {
  mode: 'pure_rag' | 'hybrid' | 'pure_ai'
  avgSimilarity: number
  uniqueSources: number
  highQualityChunks: number  // Chunks with similarity > 0.5
  qualityScore: number
  reason: string
}

/**
 * Assess the quality of RAG search results and determine generation mode
 *
 * Three modes:
 * - pure_rag: High quality results, use RAG exclusively
 * - hybrid: Mediocre results, use RAG + AI knowledge
 * - pure_ai: Poor results, use AI knowledge only
 *
 * @param results - Search results to assess
 * @returns Quality assessment with mode recommendation
 */
function assessRAGQuality(results: SearchResult[]): RAGQualityAssessment {
  if (results.length === 0) {
    return {
      mode: 'pure_ai',
      avgSimilarity: 0,
      uniqueSources: 0,
      highQualityChunks: 0,
      qualityScore: 0,
      reason: 'No search results found',
    }
  }

  // Calculate metrics
  const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length
  const uniqueSources = new Set(results.map(r => r.document_id)).size
  const highQualityChunks = results.filter(r => r.similarity > 0.5).length

  // Quality score: weighted combination
  // - 50% from average similarity
  // - 30% from unique sources (normalized to 0-1, ideal is 3+ sources)
  // - 20% from high quality chunk ratio
  const sourceScore = Math.min(uniqueSources / 3, 1)
  const hqRatio = highQualityChunks / results.length
  const qualityScore = avgSimilarity * 0.5 + sourceScore * 0.3 + hqRatio * 0.2

  // Determine mode based on quality thresholds
  let mode: 'pure_rag' | 'hybrid' | 'pure_ai'
  let reason: string

  if (avgSimilarity >= 0.6 && highQualityChunks >= 5 && uniqueSources >= 2) {
    mode = 'pure_rag'
    reason = `High confidence: ${highQualityChunks} quality chunks from ${uniqueSources} sources (avg: ${(avgSimilarity * 100).toFixed(0)}%)`
  } else if (avgSimilarity >= 0.45 && highQualityChunks >= 3 && uniqueSources >= 1) {
    mode = 'hybrid'
    reason = `Medium confidence: ${highQualityChunks} quality chunks from ${uniqueSources} sources (avg: ${(avgSimilarity * 100).toFixed(0)}%), supplementing with AI knowledge`
  } else if (results.length >= 3 && avgSimilarity >= 0.35) {
    mode = 'hybrid'
    reason = `Low quality matches: avg ${(avgSimilarity * 100).toFixed(0)}% similarity, heavily supplementing with AI knowledge`
  } else {
    mode = 'pure_ai'
    reason = `Insufficient quality: ${results.length} chunks with avg ${(avgSimilarity * 100).toFixed(0)}% similarity`
  }

  return {
    mode,
    avgSimilarity,
    uniqueSources,
    highQualityChunks,
    qualityScore,
    reason,
  }
}

/**
 * Select diverse chunks from search results
 *
 * Ensures representation from multiple source documents rather than
 * all chunks coming from a single book.
 *
 * Strategy:
 * 1. Group by source document
 * 2. Select top 2-3 chunks from EACH source
 * 3. Sort by similarity within groups
 * 4. Cap at maxChunks total
 *
 * @param results - Search results to diversify
 * @param maxChunksPerSource - Max chunks from each source (default: 3)
 * @param maxTotalChunks - Total max chunks (default: 15)
 * @returns Diverse selection of chunks
 */
function selectDiverseSources(
  results: SearchResult[],
  maxChunksPerSource: number = 3,
  maxTotalChunks: number = 15
): SearchResult[] {
  if (results.length === 0) return []

  // Group by source document
  const bySource = new Map<string, SearchResult[]>()
  for (const result of results) {
    const sourceId = result.document_id
    const existing = bySource.get(sourceId) || []
    existing.push(result)
    bySource.set(sourceId, existing)
  }

  // Sort sources by their best chunk's similarity
  const sortedSources = Array.from(bySource.entries())
    .map(([sourceId, chunks]) => ({
      sourceId,
      chunks: chunks.sort((a, b) => b.similarity - a.similarity),
      bestSimilarity: Math.max(...chunks.map(c => c.similarity)),
    }))
    .sort((a, b) => b.bestSimilarity - a.bestSimilarity)

  // Select top chunks from each source
  const selected: SearchResult[] = []
  let sourcesUsed = 0

  // First pass: get best chunks from each source
  for (const { chunks } of sortedSources) {
    if (selected.length >= maxTotalChunks) break

    const toAdd = chunks.slice(0, maxChunksPerSource)
    selected.push(...toAdd)
    sourcesUsed++
  }

  // Sort final selection by similarity
  selected.sort((a, b) => b.similarity - a.similarity)

  console.log(`[Wiki Generator] Diversified: ${selected.length} chunks from ${sourcesUsed} sources`)

  return selected.slice(0, maxTotalChunks)
}

// Re-export utilities for convenience
export { validateQuery, queryToSlug } from './utils'

/**
 * Complete generated page with metadata
 */
/**
 * Generated page ready for database insertion
 * Matches the wiki_pages table Insert type
 */
export interface GeneratedPage {
  slug: string
  title: string
  content: string
  excerpt: string
  confidence_score: number
  generated_at: string
  ttl_expires_at: string
  published: boolean
  metadata: {
    sources_used: string[]
    entity_links: Array<{entity: string, slug: string, confidence: string}>
    reading_mode: string
    query: string
    chunk_count: number
    generation_time_ms: number
    token_usage: {
      input_tokens: number
      output_tokens: number
      total_cost: number
    }
    model: string
    provider: string
    routing_reason: string
    search_stats: {
      total_results: number
      avg_similarity: number
      min_similarity: number
      max_similarity: number
    }
    ai_fallback?: boolean
    generation_source?: 'ai_knowledge' | 'rag_documents' | 'hybrid'
  }
}

/**
 * Options for page generation
 */
export interface GeneratePageOptions {
  maxContextTokens?: number      // Max tokens for RAG context (default: 8000)
  similarityThreshold?: number    // Min similarity for search (default: 0.7)
  maxResults?: number             // Max search results (default: 15)
  temperature?: number            // Claude temperature (default: 0.7)
  extractEntities?: boolean       // Extract linkable entities (default: true)
}

/**
 * Default generation options
 */
const DEFAULT_OPTIONS: Required<GeneratePageOptions> = {
  maxContextTokens: 8000,
  similarityThreshold: 0.7,
  maxResults: 15,
  temperature: 0.7,
  extractEntities: true,
}

/**
 * Custom error for wiki generation failures
 */
export class WikiGenerationError extends Error {
  constructor(
    public code: 'NO_SOURCES_FOUND' | 'GENERATION_FAILED' | 'RATE_LIMITED' | 'INVALID_QUERY',
    message: string
  ) {
    super(message)
    this.name = 'WikiGenerationError'
  }
}

// Rate limiting (simple in-memory)
const generationTimestamps: number[] = []
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 10 // 10 generations per minute

/**
 * Check and enforce rate limiting
 */
export async function checkRateLimit(): Promise<void> {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW

  // Remove old timestamps
  while (generationTimestamps.length > 0 && generationTimestamps[0] < windowStart) {
    generationTimestamps.shift()
  }

  if (generationTimestamps.length >= RATE_LIMIT_MAX) {
    throw new WikiGenerationError(
      'RATE_LIMITED',
      `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} generations per minute. Please wait.`
    )
  }

  generationTimestamps.push(now)
}

/**
 * Generate a wiki page from a query using RAG pipeline
 *
 * Complete implementation following the specification:
 * - Vector search for relevant content chunks
 * - Context assembly with deduplication
 * - Claude generation with optimized prompts
 * - Entity extraction for cross-linking
 * - Confidence scoring
 *
 * @param query - User query (e.g., "swaddling techniques")
 * @param options - Generation options
 * @returns Generated page with full metadata
 * @throws WikiGenerationError if generation fails
 */
export async function generateWikiPage(
  query: string,
  options: GeneratePageOptions = {}
): Promise<GeneratedPage> {
  const startTime = Date.now()
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Validate query
  const validation = validateQuery(query)
  if (!validation.valid) {
    throw new WikiGenerationError('INVALID_QUERY', validation.error || 'Invalid query')
  }

  const normalizedQuery = validation.normalized!

  // Check rate limit
  await checkRateLimit()

  console.log(`[Wiki Generator] Starting generation for: "${normalizedQuery}"`)

  try {
    // Step 1: Vector search for relevant content with broad retrieval
    console.log('[Wiki Generator] Step 1: Vector search (broad retrieval)...')

    // First, get a broad set of results with lower threshold for diversification
    let allResults = await vectorSearch(normalizedQuery, {
      threshold: 0.35, // Low threshold to get diverse sources
      limit: 30,       // More results to select from
    })

    console.log(`[Wiki Generator] Initial search: ${allResults.length} chunks at 0.35 threshold`)

    // If no results at all, try even lower
    if (allResults.length === 0) {
      allResults = await vectorSearch(normalizedQuery, {
        threshold: 0.25,
        limit: 30,
      })
      console.log(`[Wiki Generator] Retry search: ${allResults.length} chunks at 0.25 threshold`)
    }

    // Step 2: Boost official sources (NHS, WHO, CDC, etc.)
    console.log('[Wiki Generator] Step 2: Boosting official sources...')
    const boostedResults = boostOfficialSources(allResults)
    const officialStats = analyzeOfficialStats(boostedResults)
    console.log(`[Wiki Generator] Official sources: ${officialStats.official_count}/${officialStats.total_count} (${officialStats.boosted_count} boosted)`)

    // Step 3: Apply source diversification with diversity enforcement
    console.log('[Wiki Generator] Step 3: Diversifying sources...')
    const diversifiedBoosted = enforceDiversity(boostedResults, 0.7, 30) // Enforce max 70% official before final selection
    const diversifiedResults = selectDiverseSources(diversifiedBoosted as SearchResult[], 3, opts.maxResults)

    // Step 4: Assess quality of diversified results
    console.log('[Wiki Generator] Step 4: Assessing RAG quality...')
    const quality = assessRAGQuality(diversifiedResults)
    console.log(`[Wiki Generator] Quality assessment: ${quality.mode} - ${quality.reason}`)

    let context = ''
    let sources: any[] = []
    let searchStats: any = null
    let systemPrompt = ''
    let usedAIFallback = quality.mode === 'pure_ai'
    let generationMode = quality.mode
    let webAugmentationUsed = false
    let webSourceCount = 0
    let webFetchedAt: Date | undefined
    let webCached = false

    if (quality.mode === 'pure_ai') {
      // Fallback: Use Claude's general knowledge when no sources found
      console.log(`[Wiki Generator] Using AI general knowledge fallback`)

      systemPrompt = `You are writing for Mother's Almanac, a quick-reference guide for parents.

Write an almanac entry about: "${normalizedQuery}"

# Guidelines
- Use your general knowledge about parenting and child development
- Be concise and factual—this is a reference, not a blog
- Use British English spelling (colour, behaviour, organise)

# Required Structure
1. **Title + Definition** — # heading, then one-sentence definition
2. **Quick Facts table** — Age, Duration, Prevalence (adapt fields to topic)
3. **Key Information** — 2-3 short sections with ## headings, bullet points preferred
4. **How-To** (if applicable) — Numbered steps
5. **See also** — 3-5 related topics as [[wiki links]]

# Rules
- Target 250-400 words maximum
- No emotional padding ("you're not alone", "this too shall pass")
- Tables for comparisons, bullet points over prose
- End with: *Note: General guidance only. Consult a healthcare provider for specific concerns.*

Write the almanac entry now.`

      searchStats = {
        total_results: diversifiedResults.length,
        avg_similarity: quality.avgSimilarity,
        max_similarity: diversifiedResults.length > 0 ? Math.max(...diversifiedResults.map(r => r.similarity)) : 0,
        min_similarity: diversifiedResults.length > 0 ? Math.min(...diversifiedResults.map(r => r.similarity)) : 0
      }
    } else {
      console.log(`[Wiki Generator] Using ${diversifiedResults.length} diversified chunks from ${quality.uniqueSources} sources`)

      // Calculate search statistics
      searchStats = calculateSearchStats(diversifiedResults)

      // Assemble context from diversified chunks
      console.log('[Wiki Generator] Step 4: Assembling context...')
      const assembled = assembleContext(diversifiedResults, opts.maxContextTokens, normalizedQuery)
      context = assembled.context
      sources = assembled.sources

      if (!context || context.length === 0) {
        console.log(`[Wiki Generator] Context assembly failed, using AI fallback`)
        usedAIFallback = true
        generationMode = 'pure_ai'
        systemPrompt = `You are writing for Mother's Almanac, a quick-reference guide. Write a concise almanac entry about: "${normalizedQuery}"

Use your general knowledge. Include: definition, quick facts table, key information (bullets), and "See also" links. Target 250-400 words. No emotional filler.`
      } else {
        console.log(`[Wiki Generator] Context assembled: ${context.length} chars, ${sources.length} sources`)

        // Step 5: Check for web augmentation (for ALL modes, not just hybrid)
        let finalContext = context
        if (shouldUseWebAugmentation(diversifiedResults, normalizedQuery)) {
          console.log('[Wiki Generator] Step 5: Fetching authoritative web sources (cached)...')
          try {
            const webResult = await fetchAuthoritativeContentCached(normalizedQuery, ['nhs.uk', 'cdc.gov', 'who.int'])
            if (webResult.successCount > 0) {
              const cacheStatus = webResult.cached ? 'cached' : 'fresh'
              console.log(`[Wiki Generator] Web augmentation: ${webResult.successCount} sources (${cacheStatus}) in ${webResult.fetchTimeMs}ms`)
              finalContext = buildAugmentedContext(context, webResult.context, webResult.fetchedAt)
              webAugmentationUsed = true
              webSourceCount = webResult.successCount
              webFetchedAt = webResult.fetchedAt
              webCached = webResult.cached
              // Add web sources to sources list
              for (const src of webResult.sources) {
                if (src.success) {
                  sources.push(`${src.domain}: ${src.title}`)
                }
              }
            } else {
              console.log('[Wiki Generator] Web augmentation: no sources retrieved')
            }
          } catch (webError) {
            console.warn('[Wiki Generator] Web augmentation failed:', webError)
            // Continue without web augmentation
          }
        }

        // Step 6: Build prompt based on quality mode
        console.log(`[Wiki Generator] Step 6: Building ${quality.mode} prompt...`)
        if (quality.mode === 'pure_rag') {
          systemPrompt = buildWikiPrompt(normalizedQuery, finalContext)
        } else {
          // Hybrid mode: use context but allow AI supplementation
          systemPrompt = buildHybridWikiPrompt(normalizedQuery, finalContext)
        }
      }
    }

    // Step 7: Generate with AI (router selects optimal model)
    const routingContext: RoutingContext = {
      taskType: 'wiki_generation',
      hasRagContext: generationMode !== 'pure_ai',
      ragConfidence: quality.avgSimilarity,
    }

    console.log(`[Wiki Generator] Step 7: Generating with AI (mode: ${generationMode}, confidence: ${(quality.avgSimilarity * 100).toFixed(0)}%)...`)
    const response = await routerGenerate(
      [
        {
          role: 'user',
          content: `Write a comprehensive article about: ${normalizedQuery}`,
        },
      ],
      systemPrompt,
      routingContext,
      {
        temperature: opts.temperature,
        maxTokens: 4096,
      }
    )

    let content = response.content

    if (!content || content.length < 100) {
      throw new WikiGenerationError(
        'GENERATION_FAILED',
        'Generated content is too short or empty'
      )
    }

    console.log(`[Wiki Generator] Generated ${content.length} chars`)

    // Step 7: Extract title from content
    const title = extractTitle(content, normalizedQuery)

    // Step 8: Extract entities for linking (optional)
    let entityLinks: EntityLink[] = []
    if (opts.extractEntities) {
      console.log('[Wiki Generator] Step 8: Extracting entities...')
      try {
        entityLinks = await extractEntities(content)
        console.log(`[Wiki Generator] Found ${entityLinks.length} linkable entities`)

        // Step 8b: Inject links into content
        if (entityLinks.length > 0) {
          console.log('[Wiki Generator] Step 8b: Injecting inline links...')
          // Get list of existing pages for smart linking
          const existingPages = new Set(entityLinks.map(e => e.slug))
          content = await injectLinks(content, entityLinks, existingPages)
          console.log(`[Wiki Generator] Injected ${entityLinks.length} inline links`)
        }
      } catch (error) {
        console.warn('[Wiki Generator] Entity extraction failed:', error)
        // Continue without entities - not critical
      }
    }

    // Step 9: Calculate confidence score based on generation mode
    let confidence: number
    if (generationMode === 'pure_ai') {
      confidence = 0.70  // AI-only gets 70% baseline
    } else if (generationMode === 'hybrid') {
      // Hybrid: blend of RAG quality and AI baseline
      // Start at 65% and add bonus for RAG quality (up to 80%)
      confidence = 0.65 + (quality.qualityScore * 0.15)
    } else {
      // Pure RAG: calculate from search results
      confidence = calculateConfidence(diversifiedResults, content, sources.length)
    }

    // Add official source bonus (up to 5% boost for using NHS/WHO/CDC sources)
    const officialBonus = Math.min(officialStats.official_ratio * 0.07, 0.05)
    confidence = Math.min(confidence + officialBonus, 1.0)

    console.log(`[Wiki Generator] Confidence: ${(confidence * 100).toFixed(1)}% (official bonus: +${(officialBonus * 100).toFixed(1)}%)`)

    // Step 8: Get cost from router response
    const totalCost = response.estimatedCost

    const generationTime = Date.now() - startTime

    console.log(
      `[Wiki Generator] Generation complete in ${generationTime}ms, ` +
      `provider: ${response.provider}, model: ${response.model}, ` +
      `cost: $${totalCost.toFixed(4)}, ` +
      `tokens: ${response.usage.inputTokens + response.usage.outputTokens}`
    )

    // Generate excerpt from content
    const excerpt = generateExcerpt(content)

    // Calculate TTL expiration (48 hours default)
    const ttlHours = 48
    const ttlExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()

    // Convert entity links to database format
    const dbEntityLinks = entityLinks.map(entity => ({
      entity: entity.text,
      slug: entity.slug,
      confidence: entity.confidence,
    }))

    // Determine if should be published based on confidence
    const shouldPublish = confidence >= 0.6

    // Generate slug from query
    const slug = queryToSlug(normalizedQuery)

    return {
      slug,
      title,
      content,
      excerpt,
      confidence_score: confidence,
      generated_at: new Date().toISOString(),
      ttl_expires_at: ttlExpiresAt,
      published: shouldPublish,
      metadata: {
        sources_used: sources,
        entity_links: dbEntityLinks,
        reading_mode: 'standard',
        query: normalizedQuery,
        chunk_count: diversifiedResults.length,
        generation_time_ms: generationTime,
        token_usage: {
          input_tokens: response.usage.inputTokens,
          output_tokens: response.usage.outputTokens,
          total_cost: totalCost,
        },
        model: response.model,
        provider: response.provider,
        routing_reason: response.routingReason,
        search_stats: {
          ...searchStats,
          unique_sources: quality.uniqueSources,
          high_quality_chunks: quality.highQualityChunks,
          generation_mode: generationMode,
          // Official source tracking
          official_source_count: officialStats.official_count,
          official_source_ratio: officialStats.official_ratio,
          boosted_count: officialStats.boosted_count,
          // Web augmentation tracking
          web_augmentation_used: webAugmentationUsed,
          web_source_count: webSourceCount,
          web_fetched_at: webFetchedAt?.toISOString(),
          web_cached: webCached,
        },
        ai_fallback: generationMode === 'pure_ai',
        generation_source: generationMode === 'pure_ai' ? 'ai_knowledge' : (generationMode === 'hybrid' ? 'hybrid' : 'rag_documents'),
      },
    }
  } catch (error) {
    // Log error details
    console.error('[Wiki Generator] Generation failed:', error)

    // Re-throw WikiGenerationError as-is
    if (error instanceof WikiGenerationError) {
      throw error
    }

    // Wrap other errors
    throw new WikiGenerationError(
      'GENERATION_FAILED',
      `Failed to generate wiki page: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Calculate confidence score based on multiple factors
 *
 * Factors:
 * - Average similarity of search results (50%)
 * - Number of sources (25%)
 * - Content length (25%)
 *
 * @param results - Search results used
 * @param content - Generated content
 * @param sourceCount - Number of unique sources
 * @returns Confidence score (0-1)
 */
function calculateConfidence(
  results: SearchResult[],
  content: string,
  sourceCount: number
): number {
  if (results.length === 0) {
    return 0
  }

  // Average similarity score (0-1)
  const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length

  // Source count score (normalized to 0-1, ideal is 5-10 sources)
  const sourceScore = Math.min(sourceCount / 10, 1)

  // Content length score (normalized to 0-1, ideal is 1000-3000 chars)
  const lengthScore = Math.min(content.length / 3000, 1)

  // Weighted combination
  const confidence = avgSimilarity * 0.5 + sourceScore * 0.25 + lengthScore * 0.25

  return Math.min(Math.max(confidence, 0), 1) // Clamp to 0-1
}

/**
 * Calculate search result statistics
 *
 * @param results - Search results
 * @returns Statistics object
 */
function calculateSearchStats(results: SearchResult[]): {
  total_results: number
  avg_similarity: number
  min_similarity: number
  max_similarity: number
} {
  if (results.length === 0) {
    return {
      total_results: 0,
      avg_similarity: 0,
      min_similarity: 0,
      max_similarity: 0,
    }
  }

  const similarities = results.map(r => r.similarity)

  return {
    total_results: results.length,
    avg_similarity: similarities.reduce((sum, s) => sum + s, 0) / similarities.length,
    min_similarity: Math.min(...similarities),
    max_similarity: Math.max(...similarities),
  }
}

/**
 * Generate excerpt from content
 * Extracts first 200 chars of meaningful text
 *
 * @param content - Full markdown content
 * @returns Excerpt string
 */
function generateExcerpt(content: string): string {
  const plainText = content
    // Remove headings
    .replace(/^#+\s+.+$/gm, '')
    // Remove table rows (lines with |)
    .replace(/^\|.*\|$/gm, '')
    // Remove table separators
    .replace(/^\s*[-|:]+\s*$/gm, '')
    // Remove wiki links [[text]]
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    // Remove bold
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Remove italic
    .replace(/\*(.+?)\*/g, '$1')
    // Remove links but keep text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Collapse multiple newlines
    .replace(/\n{2,}/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Get first 200 chars ending at word boundary
  const excerpt = plainText.substring(0, 200)
  const lastSpace = excerpt.lastIndexOf(' ')
  return lastSpace > 0 ? excerpt.substring(0, lastSpace) + '...' : excerpt + '...'
}

/**
 * Estimate cost for generating a page from context length
 *
 * @param contextLength - Length of RAG context
 * @param outputLength - Expected output length (default: 3000)
 * @param hasRagContext - Whether RAG sources are available (affects model selection)
 * @returns Cost estimate in USD
 */
export function estimatePageGenerationCost(
  contextLength: number,
  outputLength: number = 3000,
  hasRagContext: boolean = true
): number {
  // Rough token estimation: ~4 chars per token
  const inputTokens = Math.ceil((contextLength + 2000) / 4) // Context + prompt
  const outputTokens = Math.ceil(outputLength / 4)

  const { cost } = routerEstimateCost(inputTokens, outputTokens, {
    taskType: 'wiki_generation',
    hasRagContext,
    ragConfidence: hasRagContext ? 0.8 : 0, // Assume decent confidence for estimation
  })

  return cost
}

/**
 * Batch generate multiple pages
 *
 * @param queries - Array of queries
 * @param options - Generation options
 * @returns Array of generated pages (may be partial if some fail)
 */
export async function batchGeneratePages(
  queries: string[],
  options: GeneratePageOptions = {}
): Promise<GeneratedPage[]> {
  console.log(`[Wiki Generator] Batch generating ${queries.length} pages...`)

  const results: GeneratedPage[] = []
  const errors: Array<{ query: string; error: Error }> = []

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i]

    try {
      console.log(`[Wiki Generator] [${i + 1}/${queries.length}] Generating: ${query}`)
      const page = await generateWikiPage(query, options)
      results.push(page)

      // Delay between generations to avoid rate limits
      if (i < queries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`[Wiki Generator] Failed to generate "${query}":`, error)
      errors.push({
        query,
        error: error instanceof Error ? error : new Error('Unknown error'),
      })
    }
  }

  console.log(
    `[Wiki Generator] Batch complete: ${results.length}/${queries.length} succeeded, ` +
    `${errors.length} failed`
  )

  if (errors.length > 0) {
    console.error('[Wiki Generator] Failed queries:', errors.map(e => e.query))
  }

  return results
}

/**
 * Validate that a query can generate a useful page
 * Performs lightweight check before full generation
 *
 * @param query - Query to validate
 * @returns Promise resolving to true if valid
 */
export async function canGeneratePage(query: string): Promise<boolean> {
  const validation = validateQuery(query)
  if (!validation.valid) {
    return false
  }

  try {
    // Quick search with low threshold
    const results = await vectorSearch(validation.normalized!, {
      threshold: 0.5,
      limit: 1,
    })

    return results.length > 0
  } catch {
    return false
  }
}

/**
 * Regenerate an existing wiki page by slug
 * Fetches the original query from metadata and regenerates the page
 *
 * @param slug - Page slug to regenerate
 * @returns Regenerated page with metadata
 * @throws WikiGenerationError if page not found or regeneration fails
 */
export async function regenerateWikiPage(slug: string): Promise<GeneratedPage> {
  // Note: This function requires Supabase client
  // Import dynamically to avoid circular dependencies
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  // Fetch existing page to get original query
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('metadata')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    throw new WikiGenerationError(
      'INVALID_QUERY',
      `Page with slug "${slug}" not found`
    )
  }

  // Type assertion needed for metadata field
  const pageData = data as { metadata?: { query?: string } | null }
  const metadata = pageData.metadata

  if (!metadata?.query) {
    throw new WikiGenerationError(
      'INVALID_QUERY',
      `Page "${slug}" is missing query metadata and cannot be regenerated`
    )
  }

  const query = metadata.query

  console.log(`[Regenerate] Regenerating "${slug}" from query: "${query}"`)

  // Generate new version of the page
  const generatedPage = await generateWikiPage(query, {
    temperature: 0.7,
    extractEntities: true,
  })

  // Override the generated slug with the original slug to maintain the URL
  return {
    ...generatedPage,
    slug, // Preserve the original slug
  }
}
