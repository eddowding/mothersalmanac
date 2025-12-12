/**
 * Example integration showing how to use the wiki system
 * with your existing page generation logic
 *
 * This is a reference implementation - adapt to your needs
 */

import { generatePageWithLinks } from './generation-with-links'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WikiPageGeneration } from './types'
import Anthropic from '@anthropic-ai/sdk'

/**
 * EXAMPLE: Your existing wiki page generation function
 * Replace this with your actual implementation
 */
async function generateBasePage(slug: string): Promise<WikiPageGeneration> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
  })

  // Example: Generate content from Claude
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Write a comprehensive wiki page about "${slug.replace(/-/g, ' ')}" for a parenting knowledge base. Include practical advice, common concerns, and developmental insights.`
      }
    ]
  })

  const textContent = response.content.find(block => block.type === 'text')
  const content = textContent?.type === 'text' ? textContent.text : ''

  return {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    slug,
    content,
    summary: content.substring(0, 200) + '...',
    metadata: {
      generated_at: new Date().toISOString(),
      model: 'claude-3-5-sonnet-20241022'
    }
  }
}

/**
 * EXAMPLE: Store wiki page in database
 */
async function storeWikiPage(page: {
  slug: string
  title: string
  content: string
  linkedContent: string
  summary?: string
  metadata?: any
}): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await (supabase.from('wiki_pages') as any).upsert(
    {
      slug: page.slug,
      title: page.title,
      content: page.content,
      linked_content: page.linkedContent,
      summary: page.summary,
      status: 'published',
      generated_at: new Date().toISOString()
    },
    {
      onConflict: 'slug'
    }
  )

  if (error) {
    throw new Error(`Failed to store wiki page: ${error.message}`)
  }
}

/**
 * EXAMPLE 1: Generate a single page with links
 */
export async function createWikiPage(slug: string) {
  console.log(`Creating wiki page: ${slug}`)

  // Generate page with full linking system
  const page = await generatePageWithLinks(slug, generateBasePage)

  console.log(`Generated "${page.title}"`)
  console.log(`- ${page.linkCount} total links`)
  console.log(`- ${page.existingLinkCount} to existing pages`)
  console.log(`- ${page.candidateLinkCount} to future pages`)

  // Store in database
  await storeWikiPage({
    slug: page.slug,
    title: page.title,
    content: page.content,
    linkedContent: page.linkedContent,
    summary: page.summary,
    metadata: page.metadata
  })

  console.log(`Stored in database`)

  return page
}

/**
 * EXAMPLE 2: Seed wiki with initial pages
 */
export async function seedWiki() {
  const initialPages = [
    'sleep-training',
    'teething',
    'colic',
    'baby-led-weaning',
    'developmental-milestones',
    'attachment-parenting',
    'potty-training',
    'tantrums',
    'separation-anxiety',
    'pacifiers'
  ]

  console.log(`Seeding wiki with ${initialPages.length} pages...`)

  for (const slug of initialPages) {
    try {
      await createWikiPage(slug)
      console.log(`✓ ${slug}`)

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`✗ ${slug}: ${error}`)
    }
  }

  console.log('Seeding complete!')
}

/**
 * EXAMPLE 3: Get wiki page with related pages
 */
export async function getWikiPageWithRelated(slug: string) {
  const supabase = createAdminClient()

  // Get the page
  const { data: page, error } = await supabase
    .from('wiki_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !page) {
    return null
  }

  // Get related pages using the graph function
  const { data: related } = await (supabase as any).rpc('get_related_pages', {
    page_slug: slug,
    result_limit: 10
  })

  return {
    ...(page as any),
    relatedPages: related || []
  }
}

/**
 * EXAMPLE 4: Fetch page or generate if missing
 */
export async function getOrGenerateWikiPage(slug: string) {
  const supabase = createAdminClient()

  // Try to get existing page
  const { data: existing } = await supabase
    .from('wiki_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (existing) {
    console.log(`Page "${slug}" found in cache`)

    // Increment view count
    await (supabase as any).rpc('increment_page_views', { page_slug: slug })

    return existing
  }

  // Generate new page
  console.log(`Page "${slug}" not found, generating...`)
  const page = await createWikiPage(slug)

  return {
    ...page,
    content: page.linkedContent // Return linked content for display
  }
}

/**
 * EXAMPLE 5: Bulk generate from suggestions
 */
export async function generateFromSuggestions(limit: number = 10) {
  const { getSuggestedPages } = await import('./link-candidates')

  const suggestions = await getSuggestedPages(limit)

  console.log(`Found ${suggestions.length} suggested pages`)

  for (const suggestion of suggestions) {
    if (suggestion.confidence === 'strong') {
      try {
        console.log(`Generating: ${suggestion.entity}`)
        await createWikiPage(suggestion.normalizedSlug)
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Failed to generate ${suggestion.entity}:`, error)
      }
    }
  }
}

/**
 * EXAMPLE 6: Search wiki pages
 */
export async function searchWikiPages(query: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('wiki_pages')
    .select('slug, title, summary, view_count')
    .textSearch('title', query, {
      type: 'websearch',
      config: 'english'
    })
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  return data || []
}

/**
 * EXAMPLE 7: Get graph statistics
 */
export async function getWikiStats() {
  const { getGraphStats, getLinkCandidateStats } = await import('./index')

  const [graphStats, candidateStats] = await Promise.all([
    getGraphStats(),
    getLinkCandidateStats()
  ])

  return {
    graph: graphStats,
    candidates: candidateStats,
    summary: {
      totalPages: graphStats.totalPages,
      totalConnections: graphStats.totalConnections,
      avgConnections: graphStats.avgConnectionsPerPage,
      totalCandidates: candidateStats.total,
      candidatesWithoutPages: candidateStats.withoutPages,
      strongCandidates: candidateStats.strongConfidence
    }
  }
}
