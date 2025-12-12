'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Boxes,
  Search,
  BarChart3,
  Settings,
  BookOpen,
  Lightbulb,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

/**
 * Admin Sidebar Navigation
 *
 * Features:
 * - Active route highlighting
 * - Icon-based navigation
 * - Grouped sections
 * - Responsive design
 */

const navigation = [
  {
    title: 'Dashboard',
    items: [
      {
        title: 'Overview',
        href: '/admin',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Knowledge Base',
    items: [
      {
        title: 'Documents',
        href: '/admin/documents',
        icon: FileText,
      },
      {
        title: 'Chunks Browser',
        href: '/admin/chunks',
        icon: Boxes,
      },
      {
        title: 'Topic Suggestions',
        href: '/admin/stubs',
        icon: Lightbulb,
      },
      {
        title: 'Search Testing',
        href: '/admin/search',
        icon: Search,
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
      },
      {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
      },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Logo/Title */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Mother's Almanac</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-6">
            {navigation.map((section) => (
              <div key={section.title}>
                <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </h2>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Back to Main Site</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
