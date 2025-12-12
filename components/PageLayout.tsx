import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageLayoutProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  sidebar?: ReactNode;
  title?: string;
  subtitle?: string;
}

export function PageLayout({
  children,
  breadcrumbs,
  sidebar,
  title,
  subtitle,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-2 text-sm overflow-x-auto">
              <Link
                href="/"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Page Header */}
      {(title || subtitle) && (
        <div className="border-b border-border bg-background">
          <div className="container mx-auto px-4 py-8">
            {title && (
              <h1 className="font-serif text-4xl font-bold text-almanac-earth-700 mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Main Content Area */}
          <main className="min-w-0">
            <div className="max-w-4xl">{children}</div>
          </main>

          {/* Sidebar (if provided) */}
          {sidebar && (
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                    Table of Contents
                  </h3>
                  <Separator className="mb-3" />
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    {sidebar}
                  </ScrollArea>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif font-semibold mb-3">
                Mother&apos;s Almanac
              </h3>
              <p className="text-sm text-muted-foreground">
                Your dynamic knowledge repository that grows with your curiosity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/wiki"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Browse Wiki
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Help
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="text-center text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} Mother&apos;s Almanac. All
              rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
