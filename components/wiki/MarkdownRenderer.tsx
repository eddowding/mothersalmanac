'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { LinkWithPreview } from './LinkWithPreview'
import { EntityLink } from '@/types/wiki'
import { slugify } from '@/lib/wiki/slugs'

interface Props {
  content: string
  entities?: EntityLink[]
}

/**
 * Auto-link entities in content
 * Finds entity mentions and converts them to wiki links
 */
function linkifyEntities(content: string, entities: EntityLink[]): string {
  if (!entities || entities.length === 0) return content

  let result = content

  // Sort by length (longest first to avoid partial matches)
  const sorted = [...entities].sort((a, b) => b.text.length - a.text.length)

  for (const entity of sorted) {
    // Only linkify first occurrence to avoid over-linking
    const regex = new RegExp(`\\b${escapeRegex(entity.text)}\\b`, 'i')
    let replaced = false

    result = result.replace(regex, (match) => {
      if (replaced) return match
      replaced = true
      return `[${match}](/wiki/${entity.slug})`
    })
  }

  return result
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Enhanced markdown renderer with custom components
 * Features:
 * - Auto-linking of entities
 * - Syntax highlighting for code blocks
 * - Hover previews for internal links
 * - Semantic HTML with accessibility
 * - Custom styling for all markdown elements
 */
export function MarkdownRenderer({ content, entities = [] }: Props) {
  // Process content to add entity links
  const processedContent = linkifyEntities(content, entities)

  return (
    <div className="prose-almanac">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with anchor links
          h2: ({ children }) => {
            const id = slugify(children)
            return (
              <h2 id={id} className="font-serif text-3xl text-almanac-earth-700 dark:text-foreground mt-8 mb-4 scroll-mt-24 group">
                <a
                  href={`#${id}`}
                  className="no-underline hover:underline decoration-almanac-sage-400 dark:decoration-primary/50"
                  aria-label={`Link to section: ${children}`}
                >
                  {children}
                </a>
              </h2>
            )
          },
          h3: ({ children }) => {
            const id = slugify(children)
            return (
              <h3 id={id} className="font-serif text-2xl text-almanac-earth-700 dark:text-foreground mt-6 mb-3 scroll-mt-24 group">
                <a
                  href={`#${id}`}
                  className="no-underline hover:underline decoration-almanac-sage-400 dark:decoration-primary/50"
                  aria-label={`Link to section: ${children}`}
                >
                  {children}
                </a>
              </h3>
            )
          },
          h4: ({ children }) => (
            <h4 className="font-serif text-xl text-almanac-earth-700 dark:text-foreground mt-5 mb-2">
              {children}
            </h4>
          ),
          // Links with preview for internal wiki links
          a: ({ href, children }) => {
            // Check if internal wiki link
            if (href?.startsWith('/wiki/')) {
              return <LinkWithPreview href={href}>{children}</LinkWithPreview>
            }

            // External links
            if (href?.startsWith('http')) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-almanac-sage-700 dark:text-almanac-sage-400 underline decoration-1 hover:decoration-2 hover:text-almanac-sage-800 dark:hover:text-almanac-sage-300 transition-colors"
                >
                  {children}
                  <span className="inline-block ml-1 text-xs" aria-hidden="true">
                    ↗
                  </span>
                </a>
              )
            }

            // Regular links
            return (
              <a
                href={href}
                className="text-almanac-sage-700 dark:text-almanac-sage-400 underline decoration-1 hover:decoration-2 transition-colors"
              >
                {children}
              </a>
            )
          },
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-2 my-4 text-foreground marker:text-almanac-sage-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-2 my-4 text-foreground marker:text-almanac-sage-500">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed">{children}</li>
          ),
          // Code blocks with syntax highlighting
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            if (!inline && language) {
              return (
                <div className="my-6 rounded-lg overflow-hidden border border-border">
                  <SyntaxHighlighter
                    language={language}
                    style={tomorrow}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      background: 'hsl(var(--color-almanac-earth-50))',
                      fontSize: '0.875rem',
                    }}
                    showLineNumbers
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              )
            }

            // Inline code
            return (
              <code
                className="bg-almanac-cream-200 dark:bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-almanac-sage-700 dark:text-primary"
                {...props}
              >
                {children}
              </code>
            )
          },
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-almanac-sage-400 dark:border-primary/50 pl-4 my-6 italic bg-almanac-cream-50 dark:bg-muted/50 py-2 rounded-r">
              {children}
            </blockquote>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="text-foreground leading-relaxed my-4">{children}</p>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-almanac-cream-100 dark:bg-muted">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-almanac-earth-700 dark:text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-foreground border-t border-border">
              {children}
            </td>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-8 border-border" />
          ),
          // Strong/bold
          strong: ({ children }) => (
            <strong className="font-semibold text-almanac-earth-700 dark:text-foreground">
              {children}
            </strong>
          ),
          // Emphasis/italic
          em: ({ children }) => (
            <em className="italic text-almanac-earth-600 dark:text-muted-foreground">
              {children}
            </em>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
