/**
 * Link injection for wiki pages
 * Converts entity mentions into markdown links with appropriate styling
 */

import type { EntityLink } from './entities'
import type { Entity } from './types'

/**
 * Link style classes based on page existence and confidence
 */
type LinkClass = 'wiki-link-strong' | 'wiki-link-medium' | 'wiki-link-weak' | 'wiki-link-ghost'

/**
 * Inject markdown links into content based on extracted entities
 *
 * @param content - Original markdown content
 * @param entities - Extracted entities with position information
 * @param existingPages - Set of slugs that have existing pages
 * @returns Content with markdown links injected
 */
export async function injectLinks(
  content: string,
  entities: EntityLink[],
  existingPages: Set<string>
): Promise<string> {
  let linkedContent = content

  // Sort entities by start index (descending) to avoid offset issues
  // When we replace text, we work backwards so earlier replacements don't affect later positions
  const sortedEntities = [...entities].sort((a, b) => (b.startIndex || 0) - (a.startIndex || 0))

  // Track which entity texts we've already linked (only link first occurrence)
  const linkedTexts = new Set<string>()

  for (const entity of sortedEntities) {
    const entityKey = entity.text.toLowerCase()

    // Skip if we've already linked this entity
    if (linkedTexts.has(entityKey)) {
      continue
    }

    // Skip entities without valid position data
    // When findEntityPosition doesn't find the entity, it returns {startIndex: 0, endIndex: 0}
    const startIdx = entity.startIndex ?? -1
    const endIdx = entity.endIndex ?? -1

    if (startIdx === 0 && endIdx === 0) {
      console.log(`[Link Injection] Skipping entity not found in content: ${entity.text}`)
      continue
    }

    if (startIdx < 0 || endIdx <= startIdx) {
      console.log(`[Link Injection] Skipping entity with invalid position (${startIdx}, ${endIdx}): ${entity.text}`)
      continue
    }

    // Check if this position already has a link around it
    if (isAlreadyLinked(linkedContent, startIdx, endIdx)) {
      continue
    }

    // Verify the text at this position actually matches the entity
    const textAtPosition = linkedContent.substring(startIdx, endIdx)
    if (textAtPosition.toLowerCase() !== entity.text.toLowerCase()) {
      console.log(`[Link Injection] Text mismatch at position: expected "${entity.text}", found "${textAtPosition}"`)
      continue
    }

    // Create plain markdown link
    // The WikiPageContent component will style these based on path
    const link = `[${entity.text}](/wiki/${entity.slug})`

    // Replace text with link
    linkedContent =
      linkedContent.substring(0, startIdx) +
      link +
      linkedContent.substring(endIdx)

    // Mark this entity as linked
    linkedTexts.add(entityKey)
  }

  return linkedContent
}

/**
 * Check if a position in the content is already part of a markdown link
 */
function isAlreadyLinked(
  content: string,
  startIndex: number,
  endIndex: number
): boolean {
  // Look backwards for an opening [
  let openBracket = -1
  for (let i = startIndex - 1; i >= 0; i--) {
    if (content[i] === '[') {
      openBracket = i
      break
    }
    // If we hit a closing bracket first, we're not in a link
    if (content[i] === ']') {
      break
    }
  }

  // If we found an opening bracket, check if there's a closing bracket after our text
  if (openBracket !== -1) {
    for (let i = endIndex; i < content.length; i++) {
      if (content[i] === ']') {
        // Check if this is followed by a link destination
        const afterClosing = content.substring(i + 1, i + 10)
        if (afterClosing.startsWith('(') || afterClosing.startsWith('[')) {
          return true
        }
        break
      }
      // If we hit another opening bracket, we're not in a link
      if (content[i] === '[') {
        break
      }
    }
  }

  return false
}

/**
 * Determine the appropriate CSS class for a link based on page existence and confidence
 * Works with both EntityLink and Entity types
 */
function getLinkClass(
  entity: EntityLink | Entity,
  existingPages: Set<string>
): LinkClass {
  // Get the slug - EntityLink has 'slug', Entity has 'normalizedSlug'
  const slug = 'slug' in entity ? entity.slug : entity.normalizedSlug

  if (existingPages.has(slug)) {
    // Green link - page exists
    return 'wiki-link-strong'
  }

  // Page doesn't exist yet - style based on confidence
  if (entity.confidence === 'strong') {
    // Blue link - will generate high-quality page
    return 'wiki-link-medium'
  }

  if (entity.confidence === 'medium') {
    // Dotted underline - partial information available
    return 'wiki-link-weak'
  }

  // Gray, dashed - minimal information
  return 'wiki-link-ghost'
}

/**
 * Remove all wiki links from content (for editing or re-processing)
 */
export function stripWikiLinks(content: string): string {
  // Regex to match wiki links: [text](/wiki/slug){: .class}
  const wikiLinkRegex = /\[([^\]]+)\]\(\/wiki\/[^)]+\)\{:\s*\.[^}]+\}/g

  // Replace with just the text
  return content.replace(wikiLinkRegex, '$1')
}

/**
 * Get all links from content (for analysis)
 */
export function extractLinks(content: string): Array<{
  text: string
  slug: string
  className: LinkClass
}> {
  const links: Array<{ text: string; slug: string; className: LinkClass }> = []

  // Regex to match wiki links with capture groups
  const wikiLinkRegex = /\[([^\]]+)\]\(\/wiki\/([^)]+)\)\{:\s*\.([^}]+)\}/g

  let match: RegExpExecArray | null
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      slug: match[2],
      className: match[3] as LinkClass
    })
  }

  return links
}

/**
 * Update link classes in existing content (e.g., after page is created)
 */
export function updateLinkClasses(
  content: string,
  slug: string,
  newClass: LinkClass
): string {
  // Regex to match links to a specific slug
  const linkRegex = new RegExp(
    `\\[([^\\]]+)\\]\\(\\/wiki\\/${slug}\\)\\{:\\s*\\.[^}]+\\}`,
    'g'
  )

  // Replace with updated class
  return content.replace(linkRegex, `[$1](/wiki/${slug}){: .${newClass}}`)
}

/**
 * Batch update links across multiple pages after a new page is created
 */
export async function batchUpdateLinksForNewPage(
  slug: string,
  affectedPages: Array<{ slug: string; content: string }>
): Promise<Map<string, string>> {
  const updatedContent = new Map<string, string>()

  for (const page of affectedPages) {
    // Update all links to the newly created page to be 'strong' (existing)
    const newContent = updateLinkClasses(page.content, slug, 'wiki-link-strong')

    // Only store if content actually changed
    if (newContent !== page.content) {
      updatedContent.set(page.slug, newContent)
    }
  }

  return updatedContent
}

/**
 * Preview what links would be injected without actually modifying content
 */
export function previewLinks(
  content: string,
  entities: EntityLink[],
  existingPages: Set<string>
): Array<{
  entity: EntityLink
  linkClass: LinkClass
  wouldLink: boolean
}> {
  const preview: Array<{
    entity: EntityLink
    linkClass: LinkClass
    wouldLink: boolean
  }> = []

  const linkedTexts = new Set<string>()

  for (const entity of entities) {
    const entityKey = entity.text.toLowerCase()
    const alreadyLinked = linkedTexts.has(entityKey)
    const isLinked = isAlreadyLinked(content, entity.startIndex || 0, entity.endIndex || 0)

    preview.push({
      entity,
      linkClass: getLinkClass(entity, existingPages),
      wouldLink: !alreadyLinked && !isLinked
    })

    linkedTexts.add(entityKey)
  }

  return preview
}
