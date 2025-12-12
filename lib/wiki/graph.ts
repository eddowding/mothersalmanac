/**
 * Page connection graph for the wiki system
 * Tracks relationships between wiki pages for discovery and navigation
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { Entity, PageConnection, RelatedPage } from './types'
import type { EntityLink } from './entities'

/**
 * Record page-to-page connections based on extracted entities
 * Creates edges in the wiki page graph
 *
 * @param fromSlug - The slug of the page containing the links
 * @param entities - Entities extracted from that page
 */
export async function recordPageConnections(
  fromSlug: string,
  entities: EntityLink[]
): Promise<void> {
  const supabase = createAdminClient()

  // Convert entities to connections
  const connections = entities.map(entity => ({
    from_slug: fromSlug,
    to_slug: entity.slug,
    link_text: entity.text,
    strength: confidenceToStrength(entity.confidence)
  }))

  // Batch upsert connections
  // On conflict (same from/to pair), update the strength and link text
  const { error } = await (supabase
    .from('page_connections') as any)
    .upsert(connections, {
      onConflict: 'from_slug,to_slug',
      ignoreDuplicates: false
    })

  if (error) {
    throw new Error(`Failed to record page connections: ${error.message}`)
  }
}

/**
 * Convert entity confidence to connection strength (0-1)
 */
function confidenceToStrength(confidence: 'strong' | 'medium' | 'weak' | 'ghost'): number {
  switch (confidence) {
    case 'strong':
      return 1.0
    case 'medium':
      return 0.6
    case 'weak':
      return 0.3
    case 'ghost':
      return 0.1
  }
}

/**
 * Get related pages for a given page (both incoming and outgoing links)
 * Useful for "Related Pages" sections and discovery
 *
 * @param slug - The slug of the page
 * @param limit - Maximum number of related pages to return
 * @returns Array of related pages sorted by connection strength
 */
export async function getRelatedPages(
  slug: string,
  limit: number = 10
): Promise<RelatedPage[]> {
  const supabase = createAdminClient()

  // Pages this page links to (outgoing)
  const { data: outgoing, error: outgoingError } = await supabase
    .from('page_connections')
    .select(`
      to_slug,
      strength,
      wiki_pages!page_connections_to_slug_fkey(
        title,
        slug
      )
    `)
    .eq('from_slug', slug)
    .not('wiki_pages', 'is', null)
    .limit(limit)

  if (outgoingError) {
    console.warn('Error fetching outgoing connections:', outgoingError)
  }

  // Pages that link to this page (incoming)
  const { data: incoming, error: incomingError } = await supabase
    .from('page_connections')
    .select(`
      from_slug,
      strength,
      wiki_pages!page_connections_from_slug_fkey(
        title,
        slug
      )
    `)
    .eq('to_slug', slug)
    .not('wiki_pages', 'is', null)
    .limit(limit)

  if (incomingError) {
    console.warn('Error fetching incoming connections:', incomingError)
  }

  // Combine and transform results
  const relatedMap = new Map<string, RelatedPage>()

  type ConnectionRow = { wiki_pages?: any; strength: number }

  // Process outgoing links
  const outgoingRows = outgoing as ConnectionRow[] | null
  outgoingRows?.forEach(row => {
    if (row.wiki_pages) {
      const page = Array.isArray(row.wiki_pages) ? row.wiki_pages[0] : row.wiki_pages
      if (page && page.slug) {
        relatedMap.set(page.slug, {
          slug: page.slug,
          title: page.title,
          strength: row.strength
        })
      }
    }
  })

  // Process incoming links (boost strength if bidirectional)
  const incomingRows = incoming as ConnectionRow[] | null
  incomingRows?.forEach(row => {
    if (row.wiki_pages) {
      const page = Array.isArray(row.wiki_pages) ? row.wiki_pages[0] : row.wiki_pages
      if (page && page.slug) {
        const existing = relatedMap.get(page.slug)
        if (existing) {
          // Bidirectional link - boost strength
          existing.strength = Math.min(1.0, existing.strength + row.strength * 0.5)
        } else {
          relatedMap.set(page.slug, {
            slug: page.slug,
            title: page.title,
            strength: row.strength
          })
        }
      }
    }
  })

  // Convert to array and sort by strength
  return Array.from(relatedMap.values())
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit)
}

/**
 * Get pages that link to this page (backlinks)
 *
 * @param slug - The slug of the page
 * @param limit - Maximum number of backlinks to return
 */
export async function getBacklinks(
  slug: string,
  limit: number = 20
): Promise<Array<{
  slug: string
  title: string
  linkText: string
  strength: number
}>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('page_connections')
    .select(`
      from_slug,
      link_text,
      strength,
      wiki_pages!page_connections_from_slug_fkey(
        title,
        slug
      )
    `)
    .eq('to_slug', slug)
    .not('wiki_pages', 'is', null)
    .order('strength', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get backlinks: ${error.message}`)
  }

  type BacklinkRow = { wiki_pages?: any; link_text: string; strength: number }
  return ((data || []) as BacklinkRow[])
    .filter(row => row.wiki_pages)
    .map(row => {
      const page = Array.isArray(row.wiki_pages) ? row.wiki_pages[0] : row.wiki_pages
      return {
        slug: page.slug,
        title: page.title,
        linkText: row.link_text,
        strength: row.strength
      }
    })
}

/**
 * Get outgoing links from this page
 *
 * @param slug - The slug of the page
 */
export async function getOutgoingLinks(
  slug: string
): Promise<Array<{
  slug: string
  title: string
  linkText: string
  strength: number
  pageExists: boolean
}>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('page_connections')
    .select(`
      to_slug,
      link_text,
      strength,
      wiki_pages!page_connections_to_slug_fkey(
        title,
        slug
      )
    `)
    .eq('from_slug', slug)
    .order('strength', { ascending: false })

  if (error) {
    throw new Error(`Failed to get outgoing links: ${error.message}`)
  }

  type OutgoingRow = { wiki_pages?: any; to_slug: string; link_text: string; strength: number }
  return ((data || []) as OutgoingRow[]).map(row => {
    const pageExists = !!row.wiki_pages
    const page = Array.isArray(row.wiki_pages) ? row.wiki_pages[0] : row.wiki_pages

    return {
      slug: row.to_slug,
      title: page?.title || row.link_text,
      linkText: row.link_text,
      strength: row.strength,
      pageExists
    }
  })
}

/**
 * Get graph statistics
 */
export async function getGraphStats(): Promise<{
  totalPages: number
  totalConnections: number
  avgConnectionsPerPage: number
  mostConnectedPages: Array<{
    slug: string
    title: string
    connectionCount: number
  }>
}> {
  const supabase = createAdminClient()

  // Total connections
  const { count: totalConnections } = await supabase
    .from('page_connections')
    .select('*', { count: 'exact', head: true })

  // Total pages
  const { count: totalPages } = await supabase
    .from('wiki_pages')
    .select('*', { count: 'exact', head: true })

  // Most connected pages (by incoming links)
  const { data: mostConnected } = await supabase
    .from('page_connections')
    .select('to_slug')
    .limit(1000) // Get enough to aggregate

  // Count connections per page
  const connectionCounts = new Map<string, number>()
  type SlugRow = { to_slug: string }
  const mostConnectedRows = mostConnected as SlugRow[] | null
  mostConnectedRows?.forEach(row => {
    connectionCounts.set(row.to_slug, (connectionCounts.get(row.to_slug) || 0) + 1)
  })

  // Get page titles for top connected pages
  const topSlugs = Array.from(connectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug]) => slug)

  const { data: pageData } = await supabase
    .from('wiki_pages')
    .select('slug, title')
    .in('slug', topSlugs)

  type PageRow = { slug: string; title: string }
  const pages = pageData as PageRow[] | null
  const mostConnectedPages = topSlugs
    .map(slug => ({
      slug,
      title: pages?.find(p => p.slug === slug)?.title || slug,
      connectionCount: connectionCounts.get(slug) || 0
    }))
    .filter(p => p.connectionCount > 0)

  return {
    totalPages: totalPages || 0,
    totalConnections: totalConnections || 0,
    avgConnectionsPerPage: totalPages
      ? (totalConnections || 0) / totalPages
      : 0,
    mostConnectedPages
  }
}

/**
 * Find orphaned pages (pages with no incoming or outgoing links)
 */
export async function findOrphanedPages(): Promise<Array<{
  slug: string
  title: string
}>> {
  const supabase = createAdminClient()

  // Get all pages
  const { data: allPages } = await supabase
    .from('wiki_pages')
    .select('slug, title')

  type PageRow = { slug: string; title: string }
  const pages = allPages as PageRow[] | null
  if (!pages) return []

  // Get all pages with connections (either direction)
  const { data: connected } = await supabase
    .from('page_connections')
    .select('from_slug, to_slug')

  const connectedSlugs = new Set<string>()
  type ConnectionRow = { from_slug: string; to_slug: string }
  const connections = connected as ConnectionRow[] | null
  connections?.forEach(conn => {
    connectedSlugs.add(conn.from_slug)
    connectedSlugs.add(conn.to_slug)
  })

  // Find pages not in connected set
  return pages
    .filter(page => !connectedSlugs.has(page.slug))
    .map(page => ({
      slug: page.slug,
      title: page.title
    }))
}

/**
 * Delete all connections for a page (when page is deleted)
 */
export async function deletePageConnections(slug: string): Promise<void> {
  const supabase = createAdminClient()

  // Delete both incoming and outgoing connections
  const { error: fromError } = await supabase
    .from('page_connections')
    .delete()
    .eq('from_slug', slug)

  const { error: toError } = await supabase
    .from('page_connections')
    .delete()
    .eq('to_slug', slug)

  if (fromError || toError) {
    throw new Error('Failed to delete page connections')
  }
}
