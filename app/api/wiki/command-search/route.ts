import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Command Palette Search API
 *
 * Searches both wiki_pages and wiki_stubs for the command palette.
 * Returns combined results sorted by relevance and popularity.
 *
 * Query params:
 * - q: search query (required)
 *
 * Response:
 * {
 *   pages: WikiPage[] - existing wiki pages
 *   stubs: WikiStub[] - suggested topics (stubs)
 * }
 */

interface WikiPageResult {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  view_count: number;
  confidence_score: number;
}

interface WikiStubResult {
  id: string;
  slug: string;
  title: string;
  mention_count: number;
  confidence: "strong" | "medium" | "weak";
  category: string | null;
}
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const searchTerm = query.trim();
    const ilike = `%${searchTerm}%`;

    // Search wiki_pages
    // Look for matches in title and excerpt
    // Sort by relevance (title match first) then view_count
    const { data: pages, error: pagesError } = await supabase
      .from("wiki_pages")
      .select("id, slug, title, excerpt, view_count, confidence_score")
      .or(`title.ilike.${ilike},excerpt.ilike.${ilike}`)
      .eq("published", true)
      .order("view_count", { ascending: false })
      .limit(8)
      .returns<WikiPageResult[]>();

    if (pagesError) {
      console.error("Error searching wiki_pages:", pagesError);
      return NextResponse.json(
        { error: "Failed to search wiki pages" },
        { status: 500 }
      );
    }

    // Search wiki_stubs
    // Only return stubs that haven't been generated yet
    // Sort by mention_count (popularity) and confidence
    const { data: stubs, error: stubsError } = await supabase
      .from("wiki_stubs")
      .select("id, slug, title, mention_count, confidence, category")
      .ilike("title", ilike)
      .eq("is_generated", false)
      .order("mention_count", { ascending: false })
      .limit(5)
      .returns<WikiStubResult[]>();

    if (stubsError) {
      console.error("Error searching wiki_stubs:", stubsError);
      return NextResponse.json(
        { error: "Failed to search wiki stubs" },
        { status: 500 }
      );
    }

    // Sort pages: prioritise title matches over excerpt matches
    const sortedPages = (pages || []).sort((a, b) => {
      const aInTitle = a.title.toLowerCase().includes(searchTerm.toLowerCase());
      const bInTitle = b.title.toLowerCase().includes(searchTerm.toLowerCase());

      if (aInTitle && !bInTitle) return -1;
      if (!aInTitle && bInTitle) return 1;

      // If both match or both don't match in title, sort by view count
      return b.view_count - a.view_count;
    });

    // Sort stubs by confidence (strong > medium > weak) then mention_count
    const confidenceOrder = { strong: 3, medium: 2, weak: 1 };
    const sortedStubs = (stubs || []).sort((a, b) => {
      const confDiff =
        confidenceOrder[b.confidence as keyof typeof confidenceOrder] -
        confidenceOrder[a.confidence as keyof typeof confidenceOrder];

      if (confDiff !== 0) return confDiff;

      return b.mention_count - a.mention_count;
    });

    return NextResponse.json({
      pages: sortedPages,
      stubs: sortedStubs,
    });
  } catch (error) {
    console.error("Command search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
