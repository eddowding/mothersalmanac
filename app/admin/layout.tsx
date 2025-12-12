import { requireAdmin } from '@/lib/auth/actions'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

/**
 * Admin Layout
 *
 * Protected layout for all admin routes with:
 * - Side navigation
 * - Top bar with breadcrumbs
 * - User info display
 * - Responsive design
 *
 * Security:
 * - requireAdmin() checks auth and admin role
 * - Middleware also protects /admin/* routes
 */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require admin access (redirects if not admin)
  const profile = await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader profile={profile} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
