/**
 * Markdown post-processing for wiki pages
 *
 * Cleans, enhances, and normalizes generated markdown content
 * to ensure consistent formatting and improve readability.
 */

/**
 * Post-process generated markdown content
 *
 * Applies multiple transformations to clean and enhance the markdown.
 *
 * @param rawMarkdown - Raw markdown from Claude
 * @returns Processed markdown
 */
export function postProcessMarkdown(rawMarkdown: string): string {
  let processed = rawMarkdown

  // 1. Normalize line endings
  processed = normalizeLineEndings(processed)

  // 2. Fix heading levels (ensure only one h1)
  processed = normalizeHeadings(processed)

  // 3. Clean up extra whitespace
  processed = cleanWhitespace(processed)

  // 4. Enhance lists with consistent formatting
  processed = enhanceLists(processed)

  // 5. Add callout boxes for important warnings
  processed = wrapCallouts(processed)

  // 6. Ensure proper spacing around sections
  processed = addSectionSpacing(processed)

  return processed.trim()
}

/**
 * Normalize line endings to \n
 *
 * @param markdown - Markdown content
 * @returns Normalized markdown
 */
function normalizeLineEndings(markdown: string): string {
  return markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Normalize heading levels
 *
 * Ensures there's only one h1 (the title) and all other headings are h2+
 *
 * @param markdown - Markdown content
 * @returns Markdown with normalized headings
 */
export function normalizeHeadings(markdown: string): string {
  const lines = markdown.split('\n')
  let h1Found = false

  return lines
    .map(line => {
      // First h1 is the title - keep it
      if (line.match(/^#\s+/) && !h1Found) {
        h1Found = true
        return line
      }

      // Convert any other h1s to h2
      if (line.match(/^#\s+/)) {
        return '##' + line.substring(1)
      }

      return line
    })
    .join('\n')
}

/**
 * Clean up excessive whitespace
 *
 * @param markdown - Markdown content
 * @returns Cleaned markdown
 */
function cleanWhitespace(markdown: string): string {
  return markdown
    // Remove trailing spaces
    .replace(/[ \t]+$/gm, '')
    // Collapse 3+ blank lines into 2
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove spaces before/after emphasis markers
    .replace(/\*\s+/g, '*')
    .replace(/\s+\*/g, '*')
}

/**
 * Enhance lists with consistent formatting
 *
 * @param markdown - Markdown content
 * @returns Enhanced markdown
 */
export function enhanceLists(markdown: string): string {
  const lines = markdown.split('\n')
  let inList = false

  return lines
    .map((line, index) => {
      const isBulletPoint = /^[\s]*[-*]\s+/.test(line)
      const isNumberedPoint = /^[\s]*\d+\.\s+/.test(line)
      const isListItem = isBulletPoint || isNumberedPoint

      // Add blank line before list starts (if not already there)
      if (isListItem && !inList && index > 0 && lines[index - 1].trim() !== '') {
        inList = true
        return '\n' + line
      }

      // Add blank line after list ends
      if (!isListItem && inList && line.trim() !== '') {
        inList = false
        return '\n' + line
      }

      inList = isListItem

      return line
    })
    .join('\n')
}

/**
 * Wrap important warnings in callout boxes
 *
 * Detects phrases like "Important:", "Warning:", "Note:" and wraps them
 * in markdown blockquotes for emphasis.
 *
 * @param markdown - Markdown content
 * @returns Markdown with callouts
 */
export function wrapCallouts(markdown: string): string {
  const lines = markdown.split('\n')
  const processed: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for callout indicators
    const calloutMatch = line.match(/^\s*\*\*?(Important|Warning|Note|Tip|Caution|Red Flag)s?:?\*\*?/i)

    if (calloutMatch) {
      // Wrap this line and any continuation in a blockquote
      const calloutLines = [line]
      let j = i + 1

      // Collect continuation lines (until blank line or next heading)
      while (
        j < lines.length &&
        lines[j].trim() !== '' &&
        !lines[j].match(/^#+\s/)
      ) {
        calloutLines.push(lines[j])
        j++
      }

      // Add blockquote markers
      const wrapped = calloutLines.map(l => `> ${l}`).join('\n')
      processed.push(wrapped)

      // Skip the lines we already processed
      i = j - 1
    } else {
      processed.push(line)
    }
  }

  return processed.join('\n')
}

/**
 * Add consistent spacing around sections
 *
 * @param markdown - Markdown content
 * @returns Markdown with proper section spacing
 */
function addSectionSpacing(markdown: string): string {
  const lines = markdown.split('\n')
  const processed: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isHeading = /^#+\s/.test(line)

    // Add blank line before headings (except first line)
    if (isHeading && i > 0 && processed[processed.length - 1]?.trim() !== '') {
      processed.push('')
    }

    processed.push(line)

    // Add blank line after headings (if next line isn't blank)
    if (isHeading && i < lines.length - 1 && lines[i + 1].trim() !== '') {
      processed.push('')
    }
  }

  return processed.join('\n')
}

/**
 * Extract sections from markdown for table of contents
 *
 * @param markdown - Markdown content
 * @returns Array of section titles (h2 and h3)
 */
export function extractSections(markdown: string): Array<{
  level: number
  title: string
  slug: string
}> {
  const headingMatches = markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)
  const sections: Array<{ level: number; title: string; slug: string }> = []

  for (const match of headingMatches) {
    const level = match[1].length
    const title = match[2].trim()
    const slug = titleToSlug(title)

    sections.push({ level, title, slug })
  }

  return sections
}

/**
 * Convert heading title to URL-friendly slug
 *
 * @param title - Section title
 * @returns URL slug
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Generate table of contents markdown
 *
 * @param markdown - Markdown content
 * @returns TOC markdown
 */
export function generateTableOfContents(markdown: string): string {
  const sections = extractSections(markdown)

  if (sections.length === 0) {
    return ''
  }

  const tocLines = sections.map(section => {
    const indent = '  '.repeat(section.level - 2) // h2 = no indent, h3 = 2 spaces
    return `${indent}- [${section.title}](#${section.slug})`
  })

  return `## Table of Contents\n\n${tocLines.join('\n')}`
}

/**
 * Estimate reading time for markdown content
 *
 * @param markdown - Markdown content
 * @returns Reading time in minutes
 */
export function estimateReadingTime(markdown: string): number {
  // Strip markdown syntax for word count
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '')        // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
    .replace(/[#*_~`]/g, '')        // Remove formatting
    .replace(/\n+/g, ' ')           // Collapse newlines

  const words = plainText.trim().split(/\s+/).length
  const wordsPerMinute = 200

  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

/**
 * Add heading IDs for anchor links
 *
 * Transforms headings to include explicit IDs for better linking.
 *
 * @param markdown - Markdown content
 * @returns Markdown with heading IDs
 */
export function addHeadingIds(markdown: string): string {
  return markdown.replace(/^(#{2,6})\s+(.+)$/gm, (match, hashes, title) => {
    const slug = titleToSlug(title)
    return `${hashes} ${title} {#${slug}}`
  })
}

/**
 * Validate markdown structure
 *
 * Checks for common issues in generated markdown.
 *
 * @param markdown - Markdown content
 * @returns Validation results
 */
export function validateMarkdown(markdown: string): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for title (h1)
  if (!markdown.match(/^#\s+.+$/m)) {
    issues.push('Missing page title (h1)')
  }

  // Check for multiple h1s
  const h1Count = (markdown.match(/^#\s+/gm) || []).length
  if (h1Count > 1) {
    issues.push(`Multiple h1 headings found (${h1Count})`)
  }

  // Check for unclosed code blocks
  const codeBlockCount = (markdown.match(/```/g) || []).length
  if (codeBlockCount % 2 !== 0) {
    issues.push('Unclosed code block')
  }

  // Check for unmatched bold/italic
  const boldCount = (markdown.match(/\*\*/g) || []).length
  if (boldCount % 2 !== 0) {
    issues.push('Unmatched bold markers (**)')
  }

  // Check for orphaned list items (list items not in a list)
  const lines = markdown.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*[-*]\s+/.test(line)) {
      // Check if previous line is also a list or blank
      if (i > 0 && lines[i - 1].trim() !== '' && !/^\s*[-*\d.]\s+/.test(lines[i - 1])) {
        // This might be intentional, but flag it
        // Don't add duplicate warnings
        if (!issues.some(issue => issue.includes('List formatting'))) {
          issues.push('List formatting may need adjustment')
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Sanitize markdown to prevent XSS
 *
 * Removes potentially dangerous HTML tags and attributes.
 * Note: This is basic sanitization - use a proper library for production.
 *
 * @param markdown - Markdown content
 * @returns Sanitized markdown
 */
export function sanitizeMarkdown(markdown: string): string {
  return markdown
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove iframe
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object/embed
    .replace(/<(object|embed)[^>]*>/gi, '')
}

/**
 * Extract metadata from frontmatter (if present)
 *
 * @param markdown - Markdown content
 * @returns Extracted metadata and content without frontmatter
 */
export function extractFrontmatter(markdown: string): {
  metadata: Record<string, unknown>
  content: string
} {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!frontmatterMatch) {
    return { metadata: {}, content: markdown }
  }

  const frontmatter = frontmatterMatch[1]
  const content = frontmatterMatch[2]
  const metadata: Record<string, unknown> = {}

  // Simple key: value parsing
  frontmatter.split('\n').forEach(line => {
    const match = line.match(/^([^:]+):\s*(.+)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      metadata[key] = value
    }
  })

  return { metadata, content }
}
