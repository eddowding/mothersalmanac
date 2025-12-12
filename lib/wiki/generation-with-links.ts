/**
 * Complete wiki page generation pipeline with entity extraction and linking
 * Integrates all components: generation, entity extraction, link candidates, injection, and graph
 */

import { extractEntities, type EntityLink } from './entities'
import {
  upsertLinkCandidate,
  checkPageExists,
  markPageAsExisting,
  batchUpsertLinkCandidates
} from './link-candidates'
import { injectLinks } from './link-injection'
import { recordPageConnections } from './graph'
import type { WikiPageGeneration, Entity } from './types'

/**
 * Extended wiki page generation result with links
 */
export interface WikiPageWithLinks extends WikiPageGeneration {
  linkedContent: string
  entities: Entity[]
  linkCount: number
  existingLinkCount: number
  candidateLinkCount: number
}

/**
 * Generate a wiki page with complete entity extraction and linking
 * This is the main entry point for generating wiki pages with the full linking system
 *
 * @param slug - The slug of the page to generate
 * @param generateBasePage - Function to generate the base page content (from your existing generation.ts)
 * @returns Complete wiki page with linked content
 */
export async function generatePageWithLinks(
  slug: string,
  generateBasePage: (slug: string) => Promise<WikiPageGeneration>
): Promise<WikiPageWithLinks> {
  console.log(`[Wiki] Generating page with links: ${slug}`)

  // Step 1: Generate base page content
  console.log('[Wiki] Step 1/6: Generating base content...')
  const basePage = await generateBasePage(slug)

  // Step 2: Extract entities from content
  console.log('[Wiki] Step 2/6: Extracting entities...')
  const entities = await extractEntities(basePage.content)
  console.log(`[Wiki] Found ${entities.length} entities`)

  // Step 3: Store link candidates (batch for efficiency)
  console.log('[Wiki] Step 3/6: Storing link candidates...')
  const candidates = entities.map(entity => ({
    entity: entity.text,
    slug: entity.slug,
    confidence: entity.confidence === 'strong' ? 'strong' as const :
                entity.confidence === 'medium' ? 'weak' as const :
                'ghost' as const
  }))
  await batchUpsertLinkCandidates(candidates)

  // Step 4: Check which pages exist
  console.log('[Wiki] Step 4/6: Checking existing pages...')
  const existingPages = new Set<string>()

  // Check in parallel for better performance
  const existenceChecks = await Promise.all(
    entities.map(async entity => ({
      slug: entity.slug,
      exists: await checkPageExists(entity.slug)
    }))
  )

  existenceChecks.forEach(({ slug, exists }) => {
    if (exists) {
      existingPages.add(slug)
    }
  })

  console.log(`[Wiki] ${existingPages.size} pages already exist`)

  // Step 5: Inject links into content
  console.log('[Wiki] Step 5/6: Injecting links...')
  const linkedContent = await injectLinks(
    basePage.content,
    entities,
    existingPages
  )

  // Step 6: Record page connections in graph
  console.log('[Wiki] Step 6/6: Recording page connections...')
  await recordPageConnections(slug, entities)

  // Mark this page as existing for future link candidates
  await markPageAsExisting(slug)

  // Calculate statistics
  const linkCount = entities.length
  const existingLinkCount = entities.filter(e =>
    existingPages.has(e.slug)
  ).length
  const candidateLinkCount = linkCount - existingLinkCount

  console.log(`[Wiki] Complete! ${linkCount} links (${existingLinkCount} existing, ${candidateLinkCount} candidates)`)

  // Convert EntityLink[] to Entity[] for the return type
  const convertedEntities: Entity[] = entities.map(e => ({
    text: e.text,
    normalizedSlug: e.slug,
    type: 'concept' as const,
    confidence: (e.confidence === 'ghost' ? 'weak' : e.confidence) as any,
    context: e.context,
    startIndex: e.startIndex || 0,
    endIndex: e.endIndex || 0
  }))

  return {
    ...basePage,
    linkedContent,
    entities: convertedEntities,
    linkCount,
    existingLinkCount,
    candidateLinkCount,
    metadata: {
      ...basePage.metadata,
      entity_links: entities.map(e => ({
        entity: e.text,
        slug: e.slug,
        confidence: e.confidence
      }))
    }
  }
}

/**
 * Regenerate links for an existing page
 * Useful when you want to update links without regenerating content
 *
 * @param slug - The slug of the existing page
 * @param content - The existing content
 * @param title - The page title
 */
export async function regenerateLinks(
  slug: string,
  content: string,
  title: string
): Promise<{
  linkedContent: string
  entities: EntityLink[]
  linkCount: number
}> {
  console.log(`[Wiki] Regenerating links for: ${slug}`)

  // Extract entities
  const entities = await extractEntities(content)

  // Update link candidates
  await batchUpsertLinkCandidates(
    entities.map(e => ({
      entity: e.text,
      slug: e.slug,
      confidence: e.confidence === 'strong' ? 'strong' as const :
                  e.confidence === 'medium' ? 'weak' as const :
                  'ghost' as const
    }))
  )

  // Check existing pages
  const existingPages = new Set<string>()
  const existenceChecks = await Promise.all(
    entities.map(async entity => ({
      slug: entity.slug,
      exists: await checkPageExists(entity.slug)
    }))
  )
  existenceChecks.forEach(({ slug, exists }) => {
    if (exists) existingPages.add(slug)
  })

  // Inject links
  const linkedContent = await injectLinks(content, entities, existingPages)

  // Update graph connections
  await recordPageConnections(slug, entities)

  return {
    linkedContent,
    entities,
    linkCount: entities.length
  }
}

/**
 * Batch generate multiple pages with links
 * Useful for seeding the wiki or bulk regeneration
 *
 * @param slugs - Array of slugs to generate
 * @param generateBasePage - Page generation function
 * @param onProgress - Optional progress callback
 */
export async function batchGenerateWithLinks(
  slugs: string[],
  generateBasePage: (slug: string) => Promise<WikiPageGeneration>,
  onProgress?: (current: number, total: number, slug: string) => void
): Promise<WikiPageWithLinks[]> {
  const results: WikiPageWithLinks[] = []

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]

    if (onProgress) {
      onProgress(i + 1, slugs.length, slug)
    }

    try {
      const page = await generatePageWithLinks(slug, generateBasePage)
      results.push(page)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed to generate ${slug}:`, error)
      // Continue with next page
    }
  }

  return results
}

/**
 * Update all links in existing pages after a new page is created
 * This upgrades ghost/weak links to strong links
 *
 * @param newPageSlug - The slug of the newly created page
 */
export async function updateExistingPagesForNewPage(
  newPageSlug: string
): Promise<{
  updatedPages: number
  updatedLinks: number
}> {
  // This would query the database for pages that link to this slug
  // and update their linked content to mark the link as 'strong'

  // Implementation would depend on your wiki_pages table structure
  // For now, return a placeholder

  console.log(`[Wiki] Would update links for new page: ${newPageSlug}`)

  return {
    updatedPages: 0,
    updatedLinks: 0
  }
}

/**
 * Get link statistics for a page
 */
export function getLinkStats(page: WikiPageWithLinks): {
  total: number
  strong: number
  medium: number
  weak: number
  ghost: number
  existingPages: number
  candidatePages: number
} {
  const stats = {
    total: page.entities.length,
    strong: 0,
    medium: 0,
    weak: 0,
    ghost: 0,
    existingPages: page.existingLinkCount,
    candidatePages: page.candidateLinkCount
  }

  page.entities.forEach(entity => {
    if (entity.confidence === 'strong') stats.strong++
    else if (entity.confidence === 'medium') stats.medium++
    else stats.weak++
  })

  return stats
}

/**
 * Validate that a page generation has proper links
 */
export function validatePageLinks(page: WikiPageWithLinks): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check that linkedContent is different from base content
  if (page.linkedContent === page.content) {
    warnings.push('No links were injected into content')
  }

  // Check that entities were found
  if (page.entities.length === 0) {
    warnings.push('No entities were extracted from content')
  }

  // Check that link count matches entities
  if (page.linkCount !== page.entities.length) {
    errors.push(`Link count mismatch: ${page.linkCount} vs ${page.entities.length} entities`)
  }

  // Check metadata
  if (!page.metadata?.entity_links) {
    errors.push('Missing entity_links in metadata')
  } else if (page.metadata.entity_links.length !== page.entities.length) {
    errors.push('Metadata entity_links count does not match entities')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
