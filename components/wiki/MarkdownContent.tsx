'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { Callout } from './Callout'
import { CodeBlock } from './CodeBlock'
import { slugify } from '@/lib/wiki/slugs'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose-almanac prose prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom components for special elements
          h2: ({ children }) => {
            const id = slugify(children)
            return (
              <h2 id={id} className="scroll-mt-20 group">
                <a href={`#${id}`} className="no-underline hover:underline">
                  {children}
                </a>
              </h2>
            )
          },
          h3: ({ children }) => {
            const id = slugify(children)
            return (
              <h3 id={id} className="scroll-mt-20 group">
                <a href={`#${id}`} className="no-underline hover:underline">
                  {children}
                </a>
              </h3>
            )
          },
          a: ({ href, children }) => {
            const isWikiLink = href?.startsWith('/wiki/')
            const isExternal = href?.startsWith('http')

            if (isExternal) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[hsl(var(--color-link-medium))] hover:underline"
                >
                  {children}
                </a>
              )
            }

            return (
              <Link
                href={href || '#'}
                className={isWikiLink ? getWikiLinkClass(href) : 'text-[hsl(var(--color-link-medium))] hover:underline'}
              >
                {children}
              </Link>
            )
          },
          blockquote: ({ children }) => (
            <Callout type="note">{children}</Callout>
          ),
          code: (props) => {
            const { node, inline, className, children, ...rest } = props as any
            if (inline) {
              return (
                <code className="text-[hsl(var(--color-almanac-sage-700))] bg-[hsl(var(--color-almanac-cream-100))] px-1.5 py-0.5 rounded text-sm">
                  {children}
                </code>
              )
            }
            const language = className?.replace('language-', '')
            return <CodeBlock code={String(children)} language={language} />
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full divide-y divide-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground bg-muted">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-foreground border-t border-border">
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Get wiki link class based on confidence
 * Parse link class from href attributes or metadata
 */
function getWikiLinkClass(href?: string): string {
  // TODO: Parse confidence from link metadata
  // For now, default to medium confidence
  return 'wiki-link-medium'
}
