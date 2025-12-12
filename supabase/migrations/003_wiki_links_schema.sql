-- Mother's Almanac Wiki Links and Graph Schema
-- This migration creates tables for wiki page connections, link candidates, and pages

-- =====================================================
-- WIKI PAGES TABLE
-- =====================================================
-- Stores generated wiki pages with metadata
CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Original content without links
  linked_content TEXT, -- Content with markdown links injected
  summary TEXT,

  -- Generation metadata
  confidence_score FLOAT,
  source_count INTEGER DEFAULT 0,
  citation_count INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  model TEXT,

  -- Page status
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),

  -- Analytics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_at TIMESTAMPTZ
);

-- Indexes for wiki_pages
CREATE INDEX IF NOT EXISTS wiki_pages_slug_idx ON public.wiki_pages(slug);
CREATE INDEX IF NOT EXISTS wiki_pages_status_idx ON public.wiki_pages(status);
CREATE INDEX IF NOT EXISTS wiki_pages_created_at_idx ON public.wiki_pages(created_at DESC);
CREATE INDEX IF NOT EXISTS wiki_pages_view_count_idx ON public.wiki_pages(view_count DESC);

-- Full-text search index on title and content
CREATE INDEX IF NOT EXISTS wiki_pages_search_idx ON public.wiki_pages
  USING GIN (to_tsvector('english', title || ' ' || content));

-- =====================================================
-- LINK CANDIDATES TABLE
-- =====================================================
-- Tracks entities that could become wiki pages
CREATE TABLE IF NOT EXISTS public.link_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL, -- Original entity text (e.g., "sleep training")
  normalized_slug TEXT NOT NULL UNIQUE, -- Normalized slug (e.g., "sleep-training")
  confidence TEXT NOT NULL DEFAULT 'weak' CHECK (confidence IN ('strong', 'weak', 'ghost')),

  -- Tracking
  mentioned_count INTEGER NOT NULL DEFAULT 1, -- How many times this entity appears
  page_exists BOOLEAN NOT NULL DEFAULT false, -- Whether a wiki page exists for this

  -- Timestamps
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for link_candidates
CREATE INDEX IF NOT EXISTS link_candidates_slug_idx ON public.link_candidates(normalized_slug);
CREATE INDEX IF NOT EXISTS link_candidates_exists_idx ON public.link_candidates(page_exists);
CREATE INDEX IF NOT EXISTS link_candidates_mentioned_idx ON public.link_candidates(mentioned_count DESC);
CREATE INDEX IF NOT EXISTS link_candidates_confidence_idx ON public.link_candidates(confidence);

-- =====================================================
-- PAGE CONNECTIONS TABLE (GRAPH)
-- =====================================================
-- Tracks relationships between wiki pages
CREATE TABLE IF NOT EXISTS public.page_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_slug TEXT NOT NULL, -- Source page slug
  to_slug TEXT NOT NULL, -- Target page slug
  link_text TEXT NOT NULL, -- The text used for the link
  strength FLOAT NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1), -- Connection strength (0-1)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique connections
  UNIQUE(from_slug, to_slug)
);

-- Indexes for page_connections
CREATE INDEX IF NOT EXISTS page_connections_from_idx ON public.page_connections(from_slug);
CREATE INDEX IF NOT EXISTS page_connections_to_idx ON public.page_connections(to_slug);
CREATE INDEX IF NOT EXISTS page_connections_strength_idx ON public.page_connections(strength DESC);

-- Foreign key constraints (after wiki_pages table exists)
-- Note: We use TEXT for slugs instead of FK to allow connections to non-existent pages
-- This supports the "ghost link" concept where we track connections before pages exist

-- =====================================================
-- RLS POLICIES FOR WIKI_PAGES
-- =====================================================
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read published pages
CREATE POLICY "anyone_read_published_pages" ON public.wiki_pages
  FOR SELECT
  USING (status = 'published');

-- Admins can do everything
CREATE POLICY "admins_all_pages" ON public.wiki_pages
  FOR ALL
  USING ((SELECT is_admin()));

-- System can insert/update pages (for generation)
CREATE POLICY "system_manage_pages" ON public.wiki_pages
  FOR ALL
  USING (true);

-- =====================================================
-- RLS POLICIES FOR LINK_CANDIDATES
-- =====================================================
ALTER TABLE public.link_candidates ENABLE ROW LEVEL SECURITY;

-- Anyone can read link candidates
CREATE POLICY "anyone_read_candidates" ON public.link_candidates
  FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "admins_manage_candidates" ON public.link_candidates
  FOR ALL
  USING ((SELECT is_admin()));

-- System can insert/update
CREATE POLICY "system_manage_candidates" ON public.link_candidates
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "system_update_candidates" ON public.link_candidates
  FOR UPDATE
  USING (true);

-- =====================================================
-- RLS POLICIES FOR PAGE_CONNECTIONS
-- =====================================================
ALTER TABLE public.page_connections ENABLE ROW LEVEL SECURITY;

-- Anyone can read connections
CREATE POLICY "anyone_read_connections" ON public.page_connections
  FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "admins_manage_connections" ON public.page_connections
  FOR ALL
  USING ((SELECT is_admin()));

-- System can insert/update
CREATE POLICY "system_manage_connections" ON public.page_connections
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "system_update_connections" ON public.page_connections
  FOR UPDATE
  USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get related pages (used by graph.ts)
CREATE OR REPLACE FUNCTION public.get_related_pages(
  page_slug TEXT,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  slug TEXT,
  title TEXT,
  strength FLOAT,
  direction TEXT -- 'outgoing', 'incoming', or 'bidirectional'
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH outgoing AS (
    SELECT
      pc.to_slug as slug,
      pc.strength,
      'outgoing' as direction
    FROM public.page_connections pc
    WHERE pc.from_slug = page_slug
  ),
  incoming AS (
    SELECT
      pc.from_slug as slug,
      pc.strength,
      'incoming' as direction
    FROM public.page_connections pc
    WHERE pc.to_slug = page_slug
  ),
  combined AS (
    SELECT * FROM outgoing
    UNION ALL
    SELECT * FROM incoming
  ),
  aggregated AS (
    SELECT
      c.slug,
      MAX(c.strength) as max_strength,
      COUNT(*) as direction_count,
      CASE
        WHEN COUNT(*) > 1 THEN 'bidirectional'
        ELSE MAX(c.direction)
      END as direction
    FROM combined c
    GROUP BY c.slug
  )
  SELECT
    a.slug,
    wp.title,
    a.max_strength as strength,
    a.direction
  FROM aggregated a
  LEFT JOIN public.wiki_pages wp ON wp.slug = a.slug
  WHERE wp.status = 'published'
  ORDER BY a.max_strength DESC, a.direction_count DESC
  LIMIT result_limit;
END;
$$;

-- Function to update page view count
CREATE OR REPLACE FUNCTION public.increment_page_views(page_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.wiki_pages
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE slug = page_slug;
END;
$$;

-- Function to sync link candidates with wiki pages
CREATE OR REPLACE FUNCTION public.sync_link_candidates()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark candidates as having pages if they exist
  UPDATE public.link_candidates lc
  SET page_exists = true
  WHERE EXISTS (
    SELECT 1 FROM public.wiki_pages wp
    WHERE wp.slug = lc.normalized_slug
    AND wp.status = 'published'
  )
  AND lc.page_exists = false;

  -- Mark candidates as not having pages if they were deleted
  UPDATE public.link_candidates lc
  SET page_exists = false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wiki_pages wp
    WHERE wp.slug = lc.normalized_slug
    AND wp.status = 'published'
  )
  AND lc.page_exists = true;
END;
$$;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER wiki_pages_updated_at
  BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER link_candidates_updated_at
  BEFORE UPDATE ON public.link_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER page_connections_updated_at
  BEFORE UPDATE ON public.page_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.wiki_pages TO anon, authenticated;
GRANT SELECT ON public.link_candidates TO anon, authenticated;
GRANT SELECT ON public.page_connections TO anon, authenticated;

GRANT ALL ON public.wiki_pages TO service_role;
GRANT ALL ON public.link_candidates TO service_role;
GRANT ALL ON public.page_connections TO service_role;

GRANT EXECUTE ON FUNCTION public.get_related_pages TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_page_views TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_link_candidates TO service_role;

-- =====================================================
-- SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- =====================================================
-- Uncomment to add sample data for testing

-- INSERT INTO public.wiki_pages (slug, title, content, status) VALUES
--   ('sleep-training', 'Sleep Training', '# Sleep Training\n\nSleep training is...', 'published'),
--   ('teething', 'Teething', '# Teething\n\nTeething is...', 'published');

-- INSERT INTO public.link_candidates (entity, normalized_slug, confidence, mentioned_count) VALUES
--   ('sleep training', 'sleep-training', 'strong', 5),
--   ('teething', 'teething', 'strong', 3),
--   ('colic', 'colic', 'weak', 2);

-- INSERT INTO public.page_connections (from_slug, to_slug, link_text, strength) VALUES
--   ('sleep-training', 'teething', 'teething', 0.8),
--   ('teething', 'sleep-training', 'sleep training', 0.7);
