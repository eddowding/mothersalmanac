'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatDistanceToNow } from 'date-fns'
import { Eye, Clock, Calendar, Award, AlertCircle, BookOpen, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { WikiNav } from '@/components/WikiNav'
import { generateBreadcrumbs, slugify } from '@/lib/wiki/slugs'
import type { CachedPage } from '@/lib/wiki/cache'
import Link from 'next/link'
import { TableOfContents } from '@/components/wiki/TableOfContents'

/**
 * Convert [[wiki links]] to standard markdown links
 * [[Topic Name]] -> [Topic Name](/wiki/topic-name)
 */
function preprocessWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, topic) => {
    const slug = slugify(topic)
    return `[${topic}](/wiki/${slug})`
  })
}

/**
 * Strip markdown links from text: [text](/url) -> text
 */
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

/**
 * Extract sections from markdown content for TOC
 */
function extractSections(content: string): Array<{ id: string; title: string; level: number }> {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  const matches = Array.from(content.matchAll(headingRegex))

  return matches.map(match => {
    const level = match[1].length
    const rawTitle = match[2].trim()
    const title = stripMarkdownLinks(rawTitle)
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    return { id, title, level }
  })
}

interface WikiPageContentProps {
  page: CachedPage
}

/**
 * Get confidence badge styling
 */
function getConfidenceBadge(score: number): { label: string; variant: string; description: string } {
  if (score >= 0.8) {
    return {
      label: 'High Confidence',
      variant: 'default',
      description: 'Based on comprehensive sources',
    }
  } else if (score >= 0.6) {
    return {
      label: 'Medium Confidence',
      variant: 'secondary',
      description: 'Based on available sources',
    }
  } else {
    return {
      label: 'Limited Information',
      variant: 'outline',
      description: 'Limited sources available',
    }
  }
}

/**
 * Estimate reading time from word count
 */
function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Generate a slug-style ID from heading text
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function WikiPageContent({ page }: WikiPageContentProps) {
  const breadcrumbs = generateBreadcrumbs(page.slug)
  const readingTime = estimateReadingTime(page.content)
  const confidenceBadge = getConfidenceBadge(page.confidence_score)
  const sections = useMemo(() => extractSections(page.content), [page.content])

  return (
    <div className="min-h-screen flex flex-col">
      <WikiNav />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumbs - full width */}
        <nav className="mb-6 max-w-7xl mx-auto" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                <Link
                  href={crumb.href}
                  className="hover:text-almanac-sage-700 dark:hover:text-almanac-sage-300 transition-colors"
                >
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 max-w-7xl mx-auto">
          {/* Main content column */}
          <div className="min-w-0">
            {/* Page Header */}
            <header className="mb-8 space-y-4">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-almanac-earth-700 dark:text-foreground">
                {page.title}
              </h1>

              {/* Metadata Bar */}
              <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{page.view_count} views</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{readingTime} min read</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Updated {formatDistanceToNow(new Date(page.generated_at), { addSuffix: true })}
                  </span>
                </div>

                <Badge
                  variant={confidenceBadge.variant as any}
                  className="flex items-center gap-1"
                  title={confidenceBadge.description}
                >
                  <Award className="h-3 w-3" />
                  {confidenceBadge.label}
                </Badge>
              </div>

              {/* Excerpt */}
              {page.excerpt && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {page.excerpt}
                </p>
              )}
            </header>

            {/* Main Content */}
            <article className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-serif prose-headings:text-almanac-earth-700 dark:prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateHeadingId(text)
                  return (
                    <h2 id={id} className="scroll-mt-24" {...props}>
                      {children}
                    </h2>
                  )
                },
                h3: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateHeadingId(text)
                  return (
                    <h3 id={id} className="scroll-mt-24" {...props}>
                      {children}
                    </h3>
                  )
                },
                h4: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateHeadingId(text)
                  return (
                    <h4 id={id} className="scroll-mt-24" {...props}>
                      {children}
                    </h4>
                  )
                },
                a: ({ href, children, ...props }) => {
                  // Check if this is a wiki link
                  if (href?.startsWith('/wiki/')) {
                    return (
                      <Link
                        href={href}
                        className="text-almanac-sage-700 dark:text-almanac-sage-400 underline decoration-almanac-sage-300 dark:decoration-almanac-sage-600 decoration-2 underline-offset-2 hover:decoration-almanac-sage-600 dark:hover:decoration-almanac-sage-500 hover:text-almanac-sage-800 dark:hover:text-almanac-sage-300 transition-colors"
                        {...props}
                      >
                        {children}
                      </Link>
                    )
                  }
                  // Regular external links
                  return (
                    <a
                      href={href}
                      className="text-almanac-sage-700 dark:text-almanac-sage-400 hover:text-almanac-sage-800 dark:hover:text-almanac-sage-300 no-underline hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  )
                },
              }}
            >
              {preprocessWikiLinks(page.content)}
            </ReactMarkdown>
          </article>

          {/* Source Attribution */}
          {page.metadata.sources_used && page.metadata.sources_used.length > 0 && (
            <Card className="mt-12 border-almanac-sage-200 bg-almanac-cream-50 dark:bg-card dark:border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-almanac-sage-600 dark:text-almanac-sage-400" />
                  <h2 className="font-serif text-xl font-semibold text-almanac-earth-700 dark:text-foreground">
                    Sources
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  This page was synthesised from {page.metadata.sources_used.length} trusted
                  {' '}
                  {page.metadata.sources_used.length === 1 ? 'source' : 'sources'}:
                </p>
                <ol className="space-y-2 list-decimal list-inside">
                  {page.metadata.sources_used.map((source, index) => (
                    <li key={index} className="text-sm text-foreground">
                      {source}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground mt-4 italic">
                  Sources are cited for attribution. We do not reproduce copyrighted content.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Disclaimers */}
          <div className="mt-8 space-y-4">
            {/* Medical Disclaimer */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50">
              <CardContent className="pt-5 pb-5">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                      Medical Disclaimer
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300/90">
                      This information is for general educational purposes only and is not a substitute
                      for professional medical advice, diagnosis, or treatment. Always consult your GP,
                      midwife, health visitor, or other qualified healthcare provider with any questions
                      about your child's health or medical condition.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Generation Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800/50">
              <CardContent className="pt-5 pb-5">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                      About This Page
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300/90">
                      This page was generated using AI from the sources listed above. While we strive
                      for accuracy, AI-generated content may contain errors or omissions. Information
                      is current as of the generation date and may not reflect the latest research or
                      guidelines. We recommend verifying important information from primary sources.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>

          {/* Sidebar - Table of contents (desktop only) */}
          <aside className="hidden lg:block self-start sticky top-20">
            <TableOfContents sections={sections} />
          </aside>
        </div>

        {/* Related Pages / Entity Links - full width below grid */}
        {page.metadata.entity_links && page.metadata.entity_links.length > 0 && (
          <div className="mt-12 space-y-4 max-w-7xl mx-auto">
            <Separator />
            <h2 className="font-serif text-2xl font-semibold text-almanac-earth-700 dark:text-foreground">
              Related Topics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {page.metadata.entity_links.map((link, index) => (
                <Link
                  key={index}
                  href={`/wiki/${link.slug}`}
                  className="group"
                >
                  <Card className="hover:border-almanac-sage-400 transition-colors">
                    <CardContent className="p-4">
                      <span className="text-sm font-medium group-hover:text-almanac-sage-700 dark:group-hover:text-almanac-sage-300 transition-colors">
                        {link.entity}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
