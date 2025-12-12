import { MetadataRoute } from 'next'
import { getAllCachedPages } from '@/lib/wiki/cache'

/**
 * Generate dynamic sitemap for Mother's Almanac
 * Includes all published wiki pages plus static routes
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mothersalmanac.com'

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Dynamic wiki pages
  try {
    const wikiPages = await getAllCachedPages()

    const wikiRoutes: MetadataRoute.Sitemap = wikiPages.map(page => ({
      url: `${baseUrl}/wiki/${page.slug}`,
      lastModified: new Date(page.generated_at),
      changeFrequency: 'weekly',
      priority: calculatePriority(page.view_count),
    }))

    return [...staticRoutes, ...wikiRoutes]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return at least static routes if wiki pages fail
    return staticRoutes
  }
}

/**
 * Calculate priority based on page views
 * More popular pages get higher priority
 *
 * @param viewCount - Number of page views
 * @returns Priority value (0.0-1.0)
 */
function calculatePriority(viewCount: number): number {
  if (viewCount >= 1000) return 0.9
  if (viewCount >= 500) return 0.8
  if (viewCount >= 100) return 0.7
  if (viewCount >= 50) return 0.6
  return 0.5
}
