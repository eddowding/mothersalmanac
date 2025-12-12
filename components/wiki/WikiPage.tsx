'use client'

import { WikiPage as WikiPageType } from '@/types/wiki'
import { MarkdownRenderer } from './MarkdownRenderer'
import { PageHeader } from './PageHeader'
import { PageFooter } from './PageFooter'
import { TableOfContents } from './TableOfContents'
import { SourceAttribution } from './SourceAttribution'
import { useMemo } from 'react'

interface Props {
  page: WikiPageType
}

/**
 * Main wiki page component with grid layout
 * Features:
 * - Responsive design with sidebar TOC on desktop
 * - Source attribution section
 * - Page metadata and footer
 * - Accessible semantic HTML
 */
export function WikiPage({ page }: Props) {
  // Extract sections for table of contents
  const sections = useMemo(() => {
    const headingRegex = /^(#{2,3})\s+(.+)$/gm
    const matches = Array.from(page.content.matchAll(headingRegex))

    return matches.map((match, i) => ({
      id: `heading-${i}`,
      title: match[2],
      level: match[1].length
    }))
  }, [page.content])

  // Transform entity_links from database format to EntityLink format
  const entities = useMemo(() => {
    if (!page.metadata.entity_links) return []
    return page.metadata.entity_links.map(link => ({
      text: link.entity,
      slug: link.slug,
      confidence: undefined
    }))
  }, [page.metadata.entity_links])

  return (
    <div className="wiki-page min-h-screen">
      <PageHeader
        title={page.title}
        metadata={page.metadata}
        confidence={page.confidence_score}
        viewCount={page.view_count}
        generatedAt={page.generated_at}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 max-w-7xl mx-auto">
          {/* Main content */}
          <article className="min-w-0">
            <MarkdownRenderer
              content={page.content}
              entities={entities}
            />

            {/* Source attribution */}
            {page.metadata.sources_used && page.metadata.sources_used.length > 0 && (
              <SourceAttribution
                sources={page.metadata.sources_used}
                className="mt-12"
              />
            )}
          </article>

          {/* Sidebar - Table of contents (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents sections={sections} />
            </div>
          </aside>
        </div>
      </div>

      <PageFooter
        viewCount={page.view_count}
        generatedAt={page.generated_at}
        confidence={page.confidence_score}
        slug={page.slug}
      />
    </div>
  )
}
