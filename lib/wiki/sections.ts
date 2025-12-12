/**
 * Extract sections and headings from markdown content
 */

export interface Section {
  id: string
  title: string
  level: number
}

/**
 * Extract heading sections from markdown content
 * @param content - Markdown content
 * @returns Array of section objects
 */
export function extractSections(content: string): Section[] {
  const sections: Section[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const title = match[2].trim()
      const id = slugify(title)

      sections.push({
        id,
        title,
        level
      })
    }
  }

  return sections
}

/**
 * Estimate reading time based on content length
 * @param content - Markdown content
 * @returns Estimated reading time in minutes
 */
export function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return Math.max(1, minutes)
}

/**
 * Convert text to slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
