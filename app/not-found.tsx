import Link from "next/link";
import { BookOpen, Home, Search } from "lucide-react";
import { WikiNav } from "@/components/WikiNav";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <WikiNav />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* 404 Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <BookOpen className="h-24 w-24 text-almanac-sage-300" />
              <div className="absolute -top-2 -right-2 bg-almanac-earth-100 rounded-full p-2">
                <span className="text-3xl font-bold text-almanac-earth-600">
                  ?
                </span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-almanac-earth-700">
              Page Not Found
            </h1>
            <p className="text-xl text-muted-foreground">
              This entry doesn&apos;t exist in the almanac... yet.
            </p>
          </div>

          {/* Search Section */}
          <Card className="border-almanac-sage-200 bg-almanac-cream-50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-almanac-sage-700">
                <Search className="h-5 w-5" />
                <p className="font-medium">Search for what you&apos;re looking for:</p>
              </div>
              <SearchBar
                placeholder="Ask the Almanac..."
                className="w-full"
                autoFocus
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              asChild
              className="bg-almanac-sage-600 hover:bg-almanac-sage-700 text-white"
            >
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/wiki">Browse Wiki</Link>
            </Button>
          </div>

          {/* Helpful Message */}
          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              If you think this page should exist, try searching for a related
              topic or{" "}
              <Link
                href="/help"
                className="text-almanac-sage-700 hover:underline font-medium"
              >
                contact support
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-auto">
        <div className="container mx-auto px-4 py-8">
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
