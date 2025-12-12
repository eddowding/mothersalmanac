-- Mother's Almanac Wiki Caching Enhancement
-- This migration adds caching and performance fields to the wiki_pages table

-- =====================================================
-- ADD CACHING FIELDS TO WIKI_PAGES
-- =====================================================

-- Add confidence score for generated content quality tracking
ALTER TABLE public.wiki_pages
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Add generation timestamp to track when content was created
ALTER TABLE public.wiki_pages
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();

-- Add TTL expiration timestamp for cache invalidation
ALTER TABLE public.wiki_pages
ADD COLUMN IF NOT EXISTS ttl_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours');

-- Add metadata JSONB column for flexible storage of generation info
ALTER TABLE public.wiki_pages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add regeneration count to track how many times content has been regenerated
ALTER TABLE public.wiki_pages
ADD COLUMN IF NOT EXISTS regeneration_count INTEGER DEFAULT 0;

-- =====================================================
-- INDEXES FOR CACHE PERFORMANCE
-- =====================================================

-- Index for finding stale pages that need regeneration
CREATE INDEX IF NOT EXISTS wiki_pages_ttl_expires_at_idx ON public.wiki_pages(ttl_expires_at);

-- Index for sorting by view count (popular pages)
CREATE INDEX IF NOT EXISTS wiki_pages_view_count_idx ON public.wiki_pages(view_count DESC);

-- Index for filtering by confidence score
CREATE INDEX IF NOT EXISTS wiki_pages_confidence_score_idx ON public.wiki_pages(confidence_score);

-- Composite index for finding popular stale pages
CREATE INDEX IF NOT EXISTS wiki_pages_stale_popular_idx ON public.wiki_pages(ttl_expires_at, view_count DESC)
WHERE ttl_expires_at < NOW();

-- GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS wiki_pages_metadata_idx ON public.wiki_pages USING GIN(metadata);

-- =====================================================
-- VIEW COUNT INCREMENT FUNCTION
-- =====================================================

-- Fire-and-forget function to increment view count
-- Uses SECURITY DEFINER to bypass RLS for public view counting
CREATE OR REPLACE FUNCTION public.increment_page_view(page_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wiki_pages
  SET view_count = view_count + 1
  WHERE slug = page_slug;
END;
$$;

-- Grant execute to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.increment_page_view(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_page_view(TEXT) TO authenticated;

-- =====================================================
-- CACHE STATISTICS VIEW
-- =====================================================

-- Create a view for cache statistics (admin use only)
CREATE OR REPLACE VIEW public.wiki_cache_stats AS
SELECT
  COUNT(*) as total_pages,
  COUNT(*) FILTER (WHERE ttl_expires_at < NOW()) as stale_pages,
  COUNT(*) FILTER (WHERE published = true) as published_pages,
  AVG(confidence_score) as avg_confidence,
  SUM(view_count) as total_views,
  MAX(view_count) as max_views,
  AVG(view_count) as avg_views,
  COUNT(*) FILTER (WHERE regeneration_count > 0) as regenerated_pages,
  AVG(regeneration_count) as avg_regenerations
FROM public.wiki_pages;

-- RLS for the view (admin only)
ALTER VIEW public.wiki_cache_stats SET (security_invoker = on);

-- Grant access to authenticated users (RLS will handle admin check via underlying table)
GRANT SELECT ON public.wiki_cache_stats TO authenticated;

-- =====================================================
-- STALE PAGES FUNCTION
-- =====================================================

-- Function to get stale pages ordered by popularity
CREATE OR REPLACE FUNCTION public.get_stale_pages(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  view_count INTEGER,
  ttl_expires_at TIMESTAMPTZ,
  confidence_score NUMERIC,
  regeneration_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wp.id,
    wp.slug,
    wp.title,
    wp.view_count,
    wp.ttl_expires_at,
    wp.confidence_score,
    wp.regeneration_count
  FROM public.wiki_pages wp
  WHERE wp.ttl_expires_at < NOW()
  ORDER BY wp.view_count DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute to authenticated users (for admin cron jobs)
GRANT EXECUTE ON FUNCTION public.get_stale_pages(INTEGER) TO authenticated;

-- =====================================================
-- UPDATE EXISTING ROWS
-- =====================================================

-- Set default values for existing wiki pages
UPDATE public.wiki_pages
SET
  confidence_score = 0.75,
  generated_at = created_at,
  ttl_expires_at = created_at + INTERVAL '48 hours',
  metadata = '{}'::jsonb,
  regeneration_count = 0
WHERE confidence_score IS NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.wiki_pages.confidence_score IS 'Confidence score (0-1) of the generated content quality';
COMMENT ON COLUMN public.wiki_pages.generated_at IS 'Timestamp when the content was generated';
COMMENT ON COLUMN public.wiki_pages.ttl_expires_at IS 'Timestamp when the cached content expires and should be regenerated';
COMMENT ON COLUMN public.wiki_pages.metadata IS 'JSON metadata including sources_used, entity_links, generation_time_ms, etc.';
COMMENT ON COLUMN public.wiki_pages.regeneration_count IS 'Number of times this page has been regenerated';
COMMENT ON FUNCTION public.increment_page_view(TEXT) IS 'Increments the view count for a wiki page by slug';
COMMENT ON FUNCTION public.get_stale_pages(INTEGER) IS 'Returns stale pages ordered by popularity for regeneration';
