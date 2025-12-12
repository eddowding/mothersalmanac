import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Network,
  Zap,
  ArrowRight,
} from "lucide-react";
import { WikiNav } from "@/components/WikiNav";
import { SearchBar } from "@/components/SearchBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Knowledge",
      description:
        "Ask any question and receive comprehensive, well-researched answers that become permanent wiki entries.",
    },
    {
      icon: Network,
      title: "Interconnected Learning",
      description:
        "Every topic links to related concepts, creating a web of knowledge that mirrors how you think.",
    },
    {
      icon: Zap,
      title: "Grows With You",
      description:
        "The almanac evolves based on your curiosity, building a personalized knowledge repository over time.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <WikiNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-almanac-cream-50 to-background border-b border-border">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <Badge
              variant="secondary"
              className="bg-almanac-sage-100 text-almanac-sage-800 border-almanac-sage-300"
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Your Personal Knowledge Companion
            </Badge>

            {/* Heading */}
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-almanac-earth-700 leading-tight">
              Ask the Almanac
              <span className="block text-almanac-sage-700 mt-2">
                Anything
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A living encyclopedia that grows with your curiosity. Every
              question you ask becomes a permanent entry in your personal
              knowledge repository.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto pt-4">
              <SearchBar
                placeholder="What would you like to learn about?"
                className="w-full"
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-3">
                Try asking about history, science, culture, or anything else
                that sparks your curiosity
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-almanac-earth-700 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Mother&apos;s Almanac combines AI intelligence with traditional
              wiki organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                className="border-almanac-sage-200 hover:border-almanac-sage-400 transition-colors"
              >
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-almanac-sage-600 mb-3" />
                  <CardTitle className="font-serif text-almanac-earth-700">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background to-almanac-cream-50">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-almanac-earth-700">
              Start Building Your Knowledge
            </h2>
            <p className="text-xl text-muted-foreground">
              Create an account to save your searches, bookmark favorite
              entries, and watch your personal almanac grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                asChild
                className="bg-almanac-sage-600 hover:bg-almanac-sage-700 text-white"
              >
                <Link href="/auth/signup">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 font-serif font-semibold text-lg mb-3">
                <BookOpen className="h-6 w-6 text-almanac-sage-600" />
                Mother&apos;s Almanac
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Your dynamic knowledge repository that grows with your
                curiosity. Powered by AI, organized like a traditional almanac.
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
                    Help Center
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
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
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
