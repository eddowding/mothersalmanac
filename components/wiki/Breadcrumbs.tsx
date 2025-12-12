import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { generateBreadcrumbs } from '@/lib/wiki/slugs'

interface BreadcrumbsProps {
  slug: string
}

export function Breadcrumbs({ slug }: BreadcrumbsProps) {
  const crumbs = generateBreadcrumbs(slug)

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link href="/wiki" className="hover:text-foreground transition-colors">
        Wiki
      </Link>
      {crumbs.map((crumb, i) => (
        <div key={i} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          <Link
            href={crumb.href}
            className={i === crumbs.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground transition-colors'}
            aria-current={i === crumbs.length - 1 ? 'page' : undefined}
          >
            {crumb.label}
          </Link>
        </div>
      ))}
    </nav>
  )
}
