/**
 * Slug and breadcrumb utilities for wiki navigation
 * Handles conversion between user queries, URL-friendly slugs, and human-readable titles
 */

export interface Breadcrumb {
  label: string
  href: string
}

/**
 * Generate breadcrumbs from a wiki page slug
 * @param slug - Wiki page slug (e.g., "pregnancy/nutrition/calcium")
 * @returns Array of breadcrumb objects
 */
export function generateBreadcrumbs(slug: string): Breadcrumb[] {
  const parts = slug.split('/').filter(Boolean)
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Home', href: '/' }
  ]

  let currentPath = ''
  for (const part of parts) {
    currentPath += (currentPath ? '/' : '') + part
    breadcrumbs.push({
      label: slugToTitle(part),
      href: `/wiki/${currentPath}`
    })
  }

  return breadcrumbs
}

/**
 * Convert slug to human-readable title
 * @param slug - URL slug (e.g., "pregnancy-nutrition")
 * @returns Human-readable title (e.g., "Pregnancy Nutrition")
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => {
      if (word.length === 0) return ''
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Format a slug part into a readable label (legacy compatibility)
 * @param part - Slug part (e.g., "nutrition")
 * @returns Formatted label (e.g., "Nutrition")
 * @deprecated Use slugToTitle instead
 */
function formatSlugPart(part: string): string {
  return slugToTitle(part)
}

/**
 * Convert text to a URL-friendly slug
 * @param text - Text to slugify
 * @returns Slug
 */
export function slugify(text: string | React.ReactNode): string {
  if (typeof text !== 'string') {
    // Handle React nodes by extracting text content
    const textContent = extractTextContent(text)
    return slugify(textContent)
  }

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * Normalize user query to slug format (alias for slugify for clarity)
 * @param query - User's search query (e.g., "Pregnancy Nutrition?")
 * @returns URL-friendly slug (e.g., "pregnancy-nutrition")
 */
export function queryToSlug(query: string): string {
  return query
    .toLowerCase()
    // Remove special characters except hyphens and spaces
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim()
    // Replace spaces with hyphens
    .replace(/\s/g, '-')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
}

/**
 * Normalize slug array from Next.js catch-all route
 * @param slugArray - Slug array from Next.js params
 * @returns Normalized slug string
 */
export function normalizeSlugArray(slugArray: string | string[]): string {
  if (Array.isArray(slugArray)) {
    return slugArray.join('/')
  }
  return slugArray
}

/**
 * Validate slug format
 * @param slug - Slug to validate
 * @returns true if slug is valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0) return false
  // Only allow lowercase letters, numbers, hyphens, and forward slashes
  return /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/.test(slug)
}

/**
 * Extract keywords from slug for search/SEO
 * @param slug - Slug to extract keywords from
 * @returns Array of keywords
 */
export function extractKeywords(slug: string): string[] {
  return slug.replace(/\//g, '-').split('-').filter(word => word.length > 0)
}

/**
 * Sanitize slug input to prevent XSS and path traversal
 * @param slug - Raw slug input
 * @returns Sanitized slug
 */
export function sanitizeSlug(slug: string): string {
  // Remove any path traversal attempts
  const cleaned = slug.replace(/\.\./g, '')
  // Ensure only valid characters
  return queryToSlug(cleaned)
}

/**
 * Extract text content from React nodes
 */
function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return node.toString()
  if (Array.isArray(node)) return node.map(extractTextContent).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    const nodeWithProps = node as { props: { children?: React.ReactNode } }
    return extractTextContent(nodeWithProps.props.children)
  }
  return ''
}
