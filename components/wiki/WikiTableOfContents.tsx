'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TocSection {
  id: string
  title: string
  level: number // 2 for ##, 3 for ###, 4 for ####
}

interface WikiTableOfContentsProps {
  content: string
  className?: string
}

/**
 * Parse markdown content to extract headings and build TOC structure
 */
function parseHeadings(content: string): TocSection[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  const sections: TocSection[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length // Count # symbols
    const title = match[2].trim()

    // Generate slug-style ID from title
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    sections.push({ id, title, level })
  }

  return sections
}

export function WikiTableOfContents({ content, className }: WikiTableOfContentsProps) {
  // Default collapsed on mobile for better UX
  const [isCollapsed, setIsCollapsed] = useState(false)
  const sections = useMemo(() => parseHeadings(content), [content])

  // Don't render if there are no sections
  if (sections.length === 0) {
    return null
  }

  return (
    <nav
      className={cn(
        'mb-8 border border-almanac-sage-200 bg-almanac-cream-50 rounded-lg overflow-hidden',
        // Desktop: float right with max width
        'lg:float-right lg:ml-6 lg:mb-4 lg:max-w-[300px]',
        // Mobile: full width, default collapsed on first load for better UX
        'w-full lg:w-auto',
        className
      )}
      aria-label="Table of contents"
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-almanac-sage-50 border-b border-almanac-sage-200">
        <h2 className="font-serif text-lg font-semibold text-almanac-earth-700">
          Contents
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-6 w-6 hover:bg-almanac-sage-100"
          aria-label={isCollapsed ? 'Show table of contents' : 'Hide table of contents'}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* TOC List */}
      {!isCollapsed && (
        <div className="px-4 py-4">
          <ol className="space-y-2 text-sm">
            {sections.map((section, index) => {
              // Calculate indentation based on heading level
              const indent = (section.level - 2) * 16 // 0px for h2, 16px for h3, 32px for h4

              return (
                <li
                  key={`${section.id}-${index}`}
                  style={{ paddingLeft: `${indent}px` }}
                  className="list-none"
                >
                  <a
                    href={`#${section.id}`}
                    className={cn(
                      'block py-1 text-almanac-sage-700 hover:text-almanac-sage-900',
                      'hover:underline transition-colors',
                      section.level === 2 && 'font-medium'
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      const element = document.getElementById(section.id)
                      if (element) {
                        // Smooth scroll with offset for fixed headers
                        const yOffset = -80
                        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
                        window.scrollTo({ top: y, behavior: 'smooth' })
                      }
                    }}
                  >
                    {section.title}
                  </a>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </nav>
  )
}
