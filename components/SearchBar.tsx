"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = "Ask the Almanac...",
  className = "",
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch with Radix UI IDs
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("almanac-recent-searches");
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
      ].slice(0, 5); // Keep only 5 most recent
      localStorage.setItem("almanac-recent-searches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    saveToRecent(query);
    router.push(`/wiki/${encodeURIComponent(query)}`);
    setQuery("");
    setIsOpen(false);
  };

  // Note: ⌘K keyboard shortcut is now handled by CommandPalette component
  // This SearchBar maintains its own simple form functionality

  const handleRecentClick = (search: string) => {
    setQuery(search);
    router.push(`/wiki/${encodeURIComponent(search)}`);
    setIsOpen(false);
  };

  // Render basic form during SSR to avoid hydration mismatch with Radix UI
  const formContent = (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center ${className}`}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => mounted && setIsOpen(true)}
          autoFocus={autoFocus}
          className="pl-10 pr-20 h-11 bg-card border-border focus-visible:ring-almanac-sage-500"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-block pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
      <Button
        type="submit"
        size="sm"
        className="ml-2 bg-almanac-sage-600 hover:bg-almanac-sage-700 text-white"
      >
        Search
      </Button>
    </form>
  );

  // Before mount, render without Popover to avoid hydration mismatch
  if (!mounted) {
    return formContent;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {formContent}
      </PopoverTrigger>

      {recentSearches.length > 0 && (
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-2"
        >
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">
              Recent searches
            </p>
            {recentSearches.map((search, idx) => (
              <button
                key={idx}
                onClick={() => handleRecentClick(search)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left transition-colors"
              >
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1 truncate">{search}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
