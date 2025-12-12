'use client'

import { useState, useEffect } from 'react'
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
    <nav className="space-y-2" aria-label="Table of contents">
      <h3 className="font-semibold text-sm text-muted-foreground mb-4">
        On This Page
      </h3>
      <ul className="space-y-1 text-sm">
        {sections.map(section => (
          <li
            key={section.id}
            style={{ paddingLeft: `${(section.level - 2) * 12}px` }}
          >
            <a
              href={`#${section.id}`}
              className={cn(
                'block py-1 hover:text-[hsl(var(--color-almanac-sage-600))] transition-colors',
                activeSection === section.id
                  ? 'text-[hsl(var(--color-almanac-sage-600))] font-medium border-l-2 border-[hsl(var(--color-almanac-sage-600))] pl-2 -ml-2'
                  : 'text-muted-foreground'
              )}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
