'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Section {
  id: string
  title: string
  level: number
}

interface TableOfContentsProps {
  sections: Section[]
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Intersection Observer to track active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -80% 0px' }
    )

    sections.forEach(section => {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [sections])

  if (sections.length === 0) return null

  return (
    <nav
      className="rounded-lg border border-border bg-card shadow-sm"
      aria-label="Table of contents"
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
        aria-expanded={!isCollapsed}
      >
        <span className="font-semibold text-sm text-foreground">Contents</span>
        <ChevronUp
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isCollapsed && 'rotate-180'
          )}
        />
      </button>

      {/* TOC List */}
      {!isCollapsed && (
        <ul className="px-4 pb-4 space-y-1 text-sm max-h-[60vh] overflow-y-auto">
          {sections.map(section => (
            <li
              key={section.id}
              style={{ paddingLeft: `${(section.level - 2) * 12}px` }}
            >
              <a
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById(section.id)
                  if (element) {
                    const yOffset = -80
                    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
                    window.scrollTo({ top: y, behavior: 'smooth' })
                  }
                }}
                className={cn(
                  'block py-1.5 hover:text-primary transition-colors',
                  activeSection === section.id
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
