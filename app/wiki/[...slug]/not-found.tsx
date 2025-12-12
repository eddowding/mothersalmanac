import Link from 'next/link'
import { BookOpen, Search, ArrowLeft, HelpCircle } from 'lucide-react'
import { WikiNav } from '@/components/WikiNav'
import { SearchBar } from '@/components/SearchBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Custom 404 page for wiki topics
 * Shown when:
 * - Topic doesn't exist in knowledge base
 * - Generation fails due to insufficient information
 * - Invalid slug format
 */
export default function WikiNotFound() {
  const popularTopics = [
    { name: 'Pregnancy Nutrition', slug: 'pregnancy-nutrition' },
    { name: 'Teething Symptoms', slug: 'teething-symptoms' },
    { name: 'Sleep Training', slug: 'sleep-training' },
    { name: 'Newborn Care', slug: 'newborn-care' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <WikiNav />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Icon and Message */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-almanac-cream-100 border-2 border-almanac-sage-200">
              <HelpCircle className="h-10 w-10 text-almanac-sage-600" />
            </div>

            <h1 className="font-serif text-4xl font-bold text-almanac-earth-700">
              Topic Not Found
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              We don't have enough information about this topic yet, or it
              might not be in our knowledge base.
            </p>
          </div>

          {/* Search Again */}
          <Card className="border-almanac-sage-200">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-almanac-earth-700">
                  <Search className="h-4 w-4" />
                  <span>Try searching for something else</span>
                </div>
                <SearchBar autoFocus placeholder="Search for a different topic..." />
              </div>
            </CardContent>
          </Card>

          {/* Popular Topics */}
          <div className="space-y-4 pt-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Popular Topics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {popularTopics.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/wiki/${topic.slug}`}
                  className="group"
                >
                  <Card className="hover:border-almanac-sage-400 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-almanac-sage-600 group-hover:text-almanac-sage-700" />
                        <span className="text-sm font-medium group-hover:text-almanac-sage-700 transition-colors">
                          {topic.name}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/help">
                <HelpCircle className="h-4 w-4 mr-2" />
                Get Help
              </Link>
            </Button>
          </div>

          {/* Additional Info */}
          <Card className="bg-almanac-cream-50 border-almanac-sage-200">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">
                  Have a question about something specific?
                </strong>
                <br />
                Try rephrasing your search with different keywords, or browse
                our popular topics above.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
