-- Wiki stubs: suggested topics from entity extraction
-- These are topics mentioned in wiki pages that don't have their own page yet

CREATE TABLE IF NOT EXISTS wiki_stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mentioned_in TEXT[] DEFAULT '{}',  -- slugs of pages that mention this stub
  mention_count INTEGER DEFAULT 1,
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('strong', 'medium', 'weak')),
  category TEXT,  -- optional category like 'health', 'development', 'feeding', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_at TIMESTAMPTZ,  -- null until page is generated
  is_generated BOOLEAN DEFAULT FALSE
);

-- Index for search suggestions
CREATE INDEX IF NOT EXISTS idx_wiki_stubs_slug ON wiki_stubs(slug);
CREATE INDEX IF NOT EXISTS idx_wiki_stubs_title ON wiki_stubs USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_wiki_stubs_mention_count ON wiki_stubs(mention_count DESC);
CREATE INDEX IF NOT EXISTS idx_wiki_stubs_is_generated ON wiki_stubs(is_generated);

-- Enable RLS
ALTER TABLE wiki_stubs ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "wiki_stubs_read" ON wiki_stubs FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "wiki_stubs_admin_insert" ON wiki_stubs FOR INSERT WITH CHECK ((SELECT is_admin()));
CREATE POLICY "wiki_stubs_admin_update" ON wiki_stubs FOR UPDATE USING ((SELECT is_admin()));
CREATE POLICY "wiki_stubs_admin_delete" ON wiki_stubs FOR DELETE USING ((SELECT is_admin()));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_wiki_stubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wiki_stubs_updated_at
  BEFORE UPDATE ON wiki_stubs
  FOR EACH ROW
  EXECUTE FUNCTION update_wiki_stubs_updated_at();
