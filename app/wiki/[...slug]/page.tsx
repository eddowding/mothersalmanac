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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mothersalmanac.com'

/**
 * Generate metadata for wiki page (for SEO and social sharing)
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: slugArray } = await params
  const slug = sanitizeSlug(normalizeSlugArray(slugArray))
  const pageUrl = `${BASE_URL}/wiki/${slug}`

  try {
    // Try to get cached page for metadata
    const page = await getCachedPage(slug)

    if (page) {
      const description = page.excerpt || `Evidence-based guidance on ${page.title} for parents. Trusted sources, practical advice.`
      const sourceCount = page.metadata.sources_used?.length || 0
      const confidenceLabel = page.confidence_score >= 0.8 ? 'High confidence' :
                              page.confidence_score >= 0.6 ? 'Medium confidence' : 'Limited sources'

      return {
        title: `${page.title} | Mother's Almanac`,
        description,
        keywords: [page.title, 'parenting', 'children', 'baby', 'childcare', 'parenting advice'],
        authors: [{ name: "Mother's Almanac" }],
        openGraph: {
          title: `${page.title} — Mother's Almanac`,
          description,
          type: 'article',
          url: pageUrl,
          siteName: "Mother's Almanac",
          locale: 'en_GB',
          publishedTime: page.generated_at,
          modifiedTime: page.generated_at,
          authors: ["Mother's Almanac"],
          section: 'Parenting',
          tags: ['parenting', 'children', 'childcare', page.title.toLowerCase()],
          images: [
            {
              url: `${BASE_URL}/og-image.png`,
              width: 1200,
              height: 634,
              alt: `${page.title} - Mother's Almanac`,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title: `${page.title} — Mother's Almanac`,
          description,
          site: '@mothersalmanac',
          images: [`${BASE_URL}/og-image.png`],
        },
        alternates: {
          canonical: pageUrl,
        },
        other: {
          'article:published_time': page.generated_at,
          'article:modified_time': page.generated_at,
          'article:section': 'Parenting',
          'source-count': sourceCount.toString(),
          'confidence': confidenceLabel,
        },
      }
    }

    // Fallback metadata if page doesn't exist yet
    const fallbackTitle = slugToTitle(slug)
    const fallbackDescription = `Learn about ${fallbackTitle} with Mother's Almanac — evidence-based parenting guidance from trusted sources.`

    return {
      title: `${fallbackTitle} | Mother's Almanac`,
      description: fallbackDescription,
      openGraph: {
        title: `${fallbackTitle} — Mother's Almanac`,
        description: fallbackDescription,
        type: 'article',
        url: pageUrl,
        siteName: "Mother's Almanac",
        images: [`${BASE_URL}/og-image.png`],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fallbackTitle} — Mother's Almanac`,
        description: fallbackDescription,
        images: [`${BASE_URL}/og-image.png`],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    const fallbackTitle = slugToTitle(slug)
    return {
      title: `${fallbackTitle} | Mother's Almanac`,
      description: 'Evidence-based parenting guidance from trusted sources.',
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
