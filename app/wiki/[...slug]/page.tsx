import { Metadata } from 'next'
import { WikiPageContent } from '@/components/wiki/WikiPageContent'
import { WikiPageStreaming } from '@/components/wiki/WikiPageStreaming'
import { getCachedPage, isStale, incrementPageView, type CachedPage } from '@/lib/wiki/cache'
import { normalizeSlugArray, slugToTitle, sanitizeSlug } from '@/lib/wiki/slugs'

interface PageProps {
  params: Promise<{
    slug: string[]
  }>
}

/**
 * Generate metadata for wiki page (for SEO)
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: slugArray } = await params
  const slug = sanitizeSlug(normalizeSlugArray(slugArray))

  try {
    // Try to get cached page for metadata
    const page = await getCachedPage(slug)

    if (page) {
      return {
        title: `${page.title} | Mother's Almanac`,
        description: page.excerpt || `Learn about ${page.title} with Mother's Almanac - your comprehensive parenting knowledge companion.`,
        openGraph: {
          title: page.title,
          description: page.excerpt || undefined,
          type: 'article',
          publishedTime: page.generated_at,
          modifiedTime: page.generated_at,
        },
        twitter: {
          card: 'summary_large_image',
          title: page.title,
          description: page.excerpt || undefined,
        },
      }
    }

    // Fallback metadata if page doesn't exist yet
    const fallbackTitle = slugToTitle(slug)
    return {
      title: `${fallbackTitle} | Mother's Almanac`,
      description: `Learn about ${fallbackTitle} with Mother's Almanac - your comprehensive parenting knowledge companion.`,
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    const fallbackTitle = slugToTitle(slug)
    return {
      title: `${fallbackTitle} | Mother's Almanac`,
      description: 'Your comprehensive parenting knowledge companion.',
    }
  }
}

/**
 * Wiki page route handler
 * Cache-first with streaming generation for new pages
 */
export default async function WikiPage({ params }: PageProps) {
  const { slug: slugArray } = await params
  const slug = sanitizeSlug(normalizeSlugArray(slugArray))

  console.log(`[WikiPage] Requested: ${slug}`)

  // Check cache first
  const page = await getCachedPage(slug)

  // If we have a fresh cached page, render it immediately
  if (page && !isStale(page)) {
    console.log(`[WikiPage] Cache HIT for: ${slug}`)
    incrementPageView(slug)
    return <WikiPageContent page={page} />
  }

  // If stale, still show it but could trigger background refresh
  if (page && isStale(page)) {
    console.log(`[WikiPage] Cache STALE for: ${slug}, serving cached version`)
    incrementPageView(slug)
    return <WikiPageContent page={page} />
  }

  // No cached page - use streaming generation
  console.log(`[WikiPage] Cache MISS for: ${slug}, streaming generation`)
  return <WikiPageStreaming slug={slug} />
}

/**
 * Configure dynamic route behavior
 * - Dynamic: Generate pages on-demand
 * - No static generation at build time
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable ISR, we handle caching manually
