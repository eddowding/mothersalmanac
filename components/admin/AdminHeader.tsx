'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { UserMenu } from '@/components/auth/UserMenu'

/**
 * Admin Header Component
 *
 * Features:
 * - Breadcrumb navigation
 * - Admin badge
 * - User menu
 */

interface AdminHeaderProps {
  profile: {
    id: string
    email: string
    name: string | null
    role: string
  }
}

export function AdminHeader({ profile }: AdminHeaderProps) {
  const pathname = usePathname()

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = segment.charAt(0).toUpperCase() + segment.slice(1)
    return { href, label }
  })

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={
                index === breadcrumbs.length - 1
                  ? 'font-medium'
                  : 'text-muted-foreground'
              }
            >
              {crumb.label}
            </span>
          </div>
        ))}
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="flex items-center gap-2">
          <Shield className="h-3 w-3" />
          Admin Access
        </Badge>
        <UserMenu
          user={{ id: profile.id, email: profile.email, name: profile.name }}
          isAdmin={true}
        />
      </div>
    </header>
  )
}
