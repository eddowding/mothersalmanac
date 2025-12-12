/**
 * Main wiki page generation function
 *
 * This is the primary entry point for generating wiki pages.
 * It combines orchestration, throttling, and caching for production use.
 */

import { orchestratePageGeneration, getGenerationMetadata } from './orchestrator'
import { deduplicatedGeneration, checkRateLimit, checkCooldown, setCooldown } from './throttle'
import type { WikiPageGeneration, GenerationOptions } from './types'

/**
 * Generate a wiki page from a slug
 *
 * This is the main function to use for wiki page generation. It handles:
 * - Rate limiting
 * - Request deduplication
 * - Cooldown periods
 * - Full RAG pipeline
 *
 * @param slug - Page slug (e.g., "pregnancy-nutrition")
 * @param options - Generation options
 * @param requestId - Optional identifier for rate limiting (IP, user ID, etc.)
 * @returns Complete wiki page generation
 */
export async function generateWikiPage(
  slug: string,
  options: GenerationOptions = {},
  requestId?: string
): Promise<WikiPageGeneration> {
  // 1. Check rate limit if requestId provided
  if (requestId) {
    const rateLimit = checkRateLimit(requestId)

    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetInMs / 1000)} seconds.`
      )
    }
  }

  // 2. Check cooldown to prevent rapid regeneration
  const cooldown = checkCooldown(slug)

  if (cooldown.inCooldown) {
    throw new Error(
      `Page was recently generated. Please wait ${Math.ceil(cooldown.remainingMs / 1000)} seconds.`
    )
  }

  // 3. Use deduplication to prevent concurrent requests for same page
  const result = await deduplicatedGeneration(
    slug,
    () => orchestratePageGeneration(slug, options)
  )

  // 4. Set cooldown after successful generation
  setCooldown(slug, 30000) // 30 second cooldown

  return result
}

/**
 * Generate multiple wiki pages
 *
 * @param slugs - Array of page slugs
 * @param options - Generation options
 * @param requestId - Optional identifier for rate limiting
 * @returns Map of slug to generation result
 */
export async function generateWikiPages(
  slugs: string[],
  options: GenerationOptions = {},
  requestId?: string
): Promise<Map<string, WikiPageGeneration>> {
  // Check rate limit for batch operations
  if (requestId) {
    const rateLimit = checkRateLimit(requestId)

    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetInMs / 1000)} seconds.`
      )
    }
  }

  const results = new Map<string, WikiPageGeneration>()

  // Generate pages sequentially to avoid overwhelming the API
  for (const slug of slugs) {
    try {
      const result = await generateWikiPage(slug, options, requestId)
      results.set(slug, result)

      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed to generate ${slug}:`, error)
      // Continue with other pages even if one fails
    }
  }

  return results
}

/**
 * Get generation preview/metadata without actually generating
 *
 * Useful for showing users what sources are available and estimated cost
 * before committing to generation.
 *
 * @param slug - Page slug
 * @returns Metadata about potential generation
 */
export async function previewWikiPage(slug: string): Promise<{
  query: string
  sourceCount: number
  avgSimilarity: number
  estimatedTokens: number
  estimatedCost: number
  topicType: string
  feasible: boolean
  recommendations: string[]
}> {
  const metadata = await getGenerationMetadata(slug)

  // Determine if generation is feasible
  const feasible = metadata.sourceCount >= 3 && metadata.avgSimilarity >= 0.6

  // Provide recommendations
  const recommendations: string[] = []

  if (metadata.sourceCount < 3) {
    recommendations.push('Very few sources available - consider adding more documents to knowledge base')
  } else if (metadata.sourceCount < 5) {
    recommendations.push('Limited sources - page may lack depth')
  }

  if (metadata.avgSimilarity < 0.6) {
    recommendations.push('Low similarity scores - content may not be highly relevant')
  } else if (metadata.avgSimilarity < 0.7) {
    recommendations.push('Moderate similarity - try refining the topic or adding more specific sources')
  }

  if (metadata.estimatedCost > 0.05) {
    recommendations.push('High estimated cost - consider optimizing context size')
  }

  if (feasible) {
    recommendations.push('Page generation looks promising!')
  }

  return {
    ...metadata,
    feasible,
    recommendations,
  }
}

/**
 * Force regenerate a page (bypasses cooldown)
 *
 * Use with caution - should only be used for admin operations or debugging.
 *
 * @param slug - Page slug
 * @param options - Generation options
 * @returns Regenerated wiki page
 */
export async function forceRegenerateWikiPage(
  slug: string,
  options: GenerationOptions = {}
): Promise<WikiPageGeneration> {
  console.warn(`[Generation] Force regenerating: ${slug}`)

  // Bypass cooldown and deduplication
  const result = await orchestratePageGeneration(slug, options)

  // Reset cooldown
  setCooldown(slug, 30000)

  return result
}

/**
 * Check if a page can be generated
 *
 * Quick check without performing full search.
 *
 * @param slug - Page slug
 * @returns Whether generation is likely to succeed
 */
export async function canGenerateWikiPage(slug: string): Promise<{
  canGenerate: boolean
  reason?: string
}> {
  try {
    const metadata = await getGenerationMetadata(slug)

    if (metadata.sourceCount === 0) {
      return {
        canGenerate: false,
        reason: 'No relevant sources found in knowledge base',
      }
    }

    if (metadata.sourceCount < 3) {
      return {
        canGenerate: false,
        reason: 'Insufficient sources (need at least 3)',
      }
    }

    if (metadata.avgSimilarity < 0.5) {
      return {
        canGenerate: false,
        reason: 'Sources have low relevance to topic',
      }
    }

    return { canGenerate: true }
  } catch (error) {
    return {
      canGenerate: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Bulk check if multiple pages can be generated
 *
 * @param slugs - Array of page slugs
 * @returns Map of slug to generation feasibility
 */
export async function canGenerateWikiPages(
  slugs: string[]
): Promise<Map<string, { canGenerate: boolean; reason?: string }>> {
  const results = new Map<string, { canGenerate: boolean; reason?: string }>()

  // Check in parallel
  const checks = await Promise.allSettled(
    slugs.map(slug => canGenerateWikiPage(slug))
  )

  checks.forEach((result, index) => {
    const slug = slugs[index]

    if (result.status === 'fulfilled') {
      results.set(slug, result.value)
    } else {
      results.set(slug, {
        canGenerate: false,
        reason: 'Check failed: ' + result.reason?.message,
      })
    }
  })

  return results
}

// Re-export types and utilities for convenience
export type { WikiPageGeneration, GenerationOptions } from './types'
export { slugToTitle, queryToSlug } from './types'
export { getConfidenceBadge, calculateConfidence } from './confidence'
export { formatSourceReferences } from './sources'
export { estimateReadingTime } from './postprocess'
