import { Metadata } from 'next'

/**
 * SEO and metadata utilities for Mother's Almanac
 * Provides consistent metadata generation across all pages
 */

interface PageMetadata {
  title: string
  description: string
  keywords?: string[]
  authors?: { name: string; url?: string }[]
  ogImage?: string
  canonical?: string
  noindex?: boolean
  publishedTime?: string
  modifiedTime?: string
  type?: 'website' | 'article'
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mothersalmanac.com'
const SITE_NAME = "Mother's Almanac"
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`

/**
 * Generate comprehensive metadata for a page
 *
 * @param params - Page metadata parameters
 * @returns Next.js Metadata object
 */
export function generatePageMetadata(params: PageMetadata): Metadata {
  const {
    title,
    description,
    keywords = [],
    authors,
    ogImage = DEFAULT_OG_IMAGE,
    canonical,
    noindex = false,
    publishedTime,
    modifiedTime,
    type = 'website',
  } = params

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const url = canonical || BASE_URL

  return {
    title: fullTitle,
    description,
    keywords: [...keywords, 'wiki', 'knowledge base', 'AI', 'encyclopedia', 'almanac'],
    authors: authors || [{ name: SITE_NAME }],

    // Open Graph
    openGraph: {
      type,
      locale: 'en_US',
      url,
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@mothersalmanac',
    },

    // SEO
    robots: noindex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },

    // Canonical URL
    alternates: {
      canonical: url,
    },

    // Additional metadata
    category: 'reference',
  }
}

/**
 * Generate JSON-LD structured data for a wiki page
 *
 * @param params - Page parameters
 * @returns JSON-LD script object
 */
export function generateWikiJsonLd(params: {
  title: string
  description: string
  slug: string
  publishedTime: string
  modifiedTime: string
  viewCount: number
}): object {
  const { title, description, slug, publishedTime, modifiedTime, viewCount } = params
  const url = `${BASE_URL}/wiki/${slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished: publishedTime,
    dateModified: modifiedTime,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/ReadAction',
      userInteractionCount: viewCount,
    },
  }
}

/**
 * Generate JSON-LD structured data for the site
 *
 * @returns JSON-LD script object
 */
export function generateSiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    description: "A living encyclopedia powered by AI that grows with your questions",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/wiki/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
  }
}

/**
 * Generate JSON-LD breadcrumb list
 *
 * @param items - Breadcrumb items
 * @returns JSON-LD script object
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  }
}

/**
 * Generate Open Graph image URL with dynamic parameters
 *
 * @param params - Image parameters
 * @returns OG image URL
 */
export function generateOgImageUrl(params: {
  title: string
  description?: string
  type?: 'wiki' | 'home' | 'admin'
}): string {
  const searchParams = new URLSearchParams({
    title: params.title,
    ...(params.description && { description: params.description }),
    ...(params.type && { type: params.type }),
  })

  return `${BASE_URL}/api/og?${searchParams.toString()}`
}

/**
 * Extract plain text from markdown for meta descriptions
 *
 * @param markdown - Markdown content
 * @param maxLength - Maximum length (default: 160)
 * @returns Plain text description
 */
export function extractMetaDescription(
  markdown: string,
  maxLength: number = 160
): string {
  // Remove markdown formatting
  let text = markdown
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove bold/italic
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove lists
    .replace(/^[-*+]\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Truncate at word boundary
  if (text.length > maxLength) {
    text = text.substring(0, maxLength)
    const lastSpace = text.lastIndexOf(' ')
    if (lastSpace > 0) {
      text = text.substring(0, lastSpace)
    }
    text += '...'
  }

  return text
}
