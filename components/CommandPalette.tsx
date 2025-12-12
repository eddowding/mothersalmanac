"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Lightbulb,
  Clock,
  Plus,
  TrendingUp,
  Sparkles,
} from "lucide-react";

interface WikiPage {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  view_count: number;
  confidence_score: number;
}

interface WikiStub {
  id: string;
  slug: string;
  title: string;
  mention_count: number;
  confidence: "strong" | "medium" | "weak";
  category: string | null;
}

interface CommandSearchResult {
  pages: WikiPage[];
  stubs: WikiStub[];
}

const CONFIDENCE_BADGES = {
  strong: { label: "Strong", variant: "default" as const },
  medium: { label: "Medium", variant: "secondary" as const },
  weak: { label: "Weak", variant: "outline" as const },
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("almanac-command-searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);

  // Save search to recent
  const saveToRecent = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setRecentSearches((prev) => {
      const updated = [
        searchQuery,
        ...prev.filter((s) => s !== searchQuery),
      ].slice(0, 10); // Keep 10 most recent
      localStorage.setItem("almanac-command-searches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prevOpen) => !prevOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch search results with debouncing via react-query
  const { data, isLoading } = useQuery<CommandSearchResult>({
    queryKey: ["command-search", query],
    queryFn: async () => {
      if (!query.trim()) {
        return { pages: [], stubs: [] };
      }

      const res = await fetch(
        `/api/wiki/command-search?q=${encodeURIComponent(query)}`
      );

      if (!res.ok) {
        throw new Error("Search failed");
      }

      return res.json();
    },
    enabled: query.length > 0,
    staleTime: 30000, // 30 seconds
  });

  const handleSelect = useCallback(
    (slug: string, title: string) => {
      saveToRecent(title);
      setOpen(false);
      setQuery("");
      router.push(`/wiki/${slug}`);
    },
    [router, saveToRecent]
  );

  const handleCreateNew = useCallback(() => {
    if (!query.trim()) return;
    saveToRecent(query);
    setOpen(false);
    const slug = query.toLowerCase().replace(/\s+/g, "-");
    setQuery("");
    router.push(`/wiki/${slug}`);
  }, [query, router, saveToRecent]);

  const handleRecentSelect = useCallback(
    (search: string) => {
      setQuery(search);
      // Don't close - let user see results
    },
    []
  );

  // Get confidence badge for page (based on confidence_score)
  const getPageConfidenceBadge = (score: number) => {
    if (score >= 0.8) return CONFIDENCE_BADGES.strong;
    if (score >= 0.5) return CONFIDENCE_BADGES.medium;
    return CONFIDENCE_BADGES.weak;
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search the Almanac..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!query && recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent Searches">
              {recentSearches.slice(0, 5).map((search, idx) => (
                <CommandItem
                  key={idx}
                  value={`recent-${search}`}
                  onSelect={() => handleRecentSelect(search)}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{search}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {query && (
          <>
            {isLoading && (
              <CommandEmpty>
                <div className="flex items-center justify-center gap-2 py-4">
                  <Sparkles className="h-4 w-4 animate-pulse text-almanac-sage-600" />
                  <span className="text-sm text-muted-foreground">
                    Searching...
                  </span>
                </div>
              </CommandEmpty>
            )}

            {!isLoading && data && (
              <>
                {/* Existing Pages */}
                {data.pages.length > 0 && (
                  <CommandGroup heading="Existing Pages">
                    {data.pages.map((page) => {
                      const confidence = getPageConfidenceBadge(
                        page.confidence_score
                      );
                      return (
                        <CommandItem
                          key={page.id}
                          value={page.slug}
                          onSelect={() => handleSelect(page.slug, page.title)}
                          className="flex items-start gap-3 py-3"
                        >
                          <FileText className="h-4 w-4 mt-0.5 text-almanac-sage-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">
                                {page.title}
                              </span>
                              <Badge
                                variant={confidence.variant}
                                className="shrink-0 text-xs"
                              >
                                {confidence.label}
                              </Badge>
                            </div>
                            {page.excerpt && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {page.excerpt}
                              </p>
                            )}
                            {page.view_count > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {page.view_count} views
                                </span>
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {/* Suggested Topics (Stubs) */}
                {data.stubs.length > 0 && (
                  <>
                    {data.pages.length > 0 && <CommandSeparator />}
                    <CommandGroup heading="Suggested Topics">
                      {data.stubs.map((stub) => {
                        const confidence = CONFIDENCE_BADGES[stub.confidence];
                        return (
                          <CommandItem
                            key={stub.id}
                            value={`stub-${stub.slug}`}
                            onSelect={() => handleSelect(stub.slug, stub.title)}
                            className="flex items-start gap-3 py-3"
                          >
                            <Lightbulb className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">
                                  {stub.title}
                                </span>
                                <Badge
                                  variant={confidence.variant}
                                  className="shrink-0 text-xs"
                                >
                                  {confidence.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Mentioned {stub.mention_count} time
                                {stub.mention_count !== 1 ? "s" : ""}
                                {stub.category && ` • ${stub.category}`}
                              </p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}

                {/* No results */}
                {!isLoading &&
                  data.pages.length === 0 &&
                  data.stubs.length === 0 && (
                    <CommandEmpty>
                      <div className="flex flex-col items-center gap-3 py-6">
                        <p className="text-sm text-muted-foreground">
                          No results found for &quot;{query}&quot;
                        </p>
                      </div>
                    </CommandEmpty>
                  )}

                {/* Create new page option */}
                {query.trim() && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateNew}
                        className="flex items-center gap-3 py-3 text-almanac-sage-700"
                      >
                        <Plus className="h-4 w-4" />
                        <span>
                          Create page for &quot;{query.trim()}&quot;
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
