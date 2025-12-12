'use client'

import { useState } from 'react'
import { signOut } from '@/lib/auth/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, History, Shield, LogOut } from 'lucide-react'
import Link from 'next/link'

/**
 * UserMenu Component
 *
 * Dropdown menu for authenticated users with:
 * - User avatar/initial badge
 * - Profile link
 * - Chat history link
 * - Admin link (conditional)
 * - Sign out button
 *
 * Usage:
 * ```tsx
 * <UserMenu
 *   user={{ email: 'user@example.com', name: 'John Doe' }}
 *   isAdmin={false}
 * />
 * ```
 */

interface UserMenuProps {
  user: {
    id: string
    email?: string
    name?: string | null
  }
  isAdmin: boolean
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      setLoading(false)
    }
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (user.name) {
      const parts = user.name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return user.name.slice(0, 2).toUpperCase()
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const displayName = user.name || user.email || 'User'
  const displayEmail = user.email || ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Badge
            variant="secondary"
            className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold"
          >
            {getInitials()}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-gray-500">{displayEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/chat/history" className="cursor-pointer">
            <History className="mr-2 h-4 w-4" />
            <span>Chat History</span>
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={loading}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{loading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
