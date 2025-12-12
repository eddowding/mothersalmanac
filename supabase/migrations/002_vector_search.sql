-- Mother's Almanac Vector Search Infrastructure
-- This migration creates tables for documents/chunks and RPC functions for vector search

-- =====================================================
-- ENABLE VECTOR EXTENSION
-- =====================================================
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- Stores source documents for the RAG system
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('book', 'article', 'manual', 'website', 'other')),
  source_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  processed_status TEXT NOT NULL DEFAULT 'pending' CHECK (processed_status IN ('pending', 'processing', 'completed', 'failed')),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON public.documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_processed_status ON public.documents(processed_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- =====================================================
-- CHUNKS TABLE
-- =====================================================
-- Stores text chunks with embeddings for vector search
CREATE TABLE IF NOT EXISTS public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chunks
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON public.chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON public.chunks(document_id, chunk_index);

-- Vector similarity search index (IVFFlat for fast approximate search)
-- Lists parameter: sqrt(rows) is a good starting point, 100 is reasonable for moderate datasets
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
ON public.chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full-text search index for hybrid search
CREATE INDEX IF NOT EXISTS idx_chunks_content_fts
ON public.chunks
USING gin(to_tsvector('english', content));

-- =====================================================
-- SEARCH ANALYTICS TABLE
-- =====================================================
-- Track search queries for analytics and improvement
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  avg_similarity FLOAT,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON public.search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics USING gin(to_tsvector('english', query));

-- =====================================================
-- RLS POLICIES FOR DOCUMENTS
-- =====================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Anyone can read completed documents (for RAG search)
CREATE POLICY "public_read_completed_documents" ON public.documents
  FOR SELECT
  USING (processed_status = 'completed');

-- Admins can manage all documents
CREATE POLICY "admins_manage_documents" ON public.documents
  FOR ALL
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- =====================================================
-- RLS POLICIES FOR CHUNKS
-- =====================================================
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

-- Anyone can read chunks from completed documents (for RAG search)
CREATE POLICY "public_read_chunks" ON public.chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND processed_status = 'completed'
    )
  );

-- Admins can manage all chunks
CREATE POLICY "admins_manage_chunks" ON public.chunks
  FOR ALL
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- =====================================================
-- RLS POLICIES FOR SEARCH ANALYTICS
-- =====================================================
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can read all analytics
CREATE POLICY "admins_read_analytics" ON public.search_analytics
  FOR SELECT
  USING ((SELECT is_admin()));

-- System can insert analytics (via service role in backend)
CREATE POLICY "system_insert_analytics" ON public.search_analytics
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- VECTOR SEARCH RPC FUNCTIONS
-- =====================================================

-- Enhanced vector similarity search with document metadata
CREATE OR REPLACE FUNCTION public.match_chunks_with_metadata(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_document_ids uuid[] DEFAULT NULL,
  filter_source_types text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float,
  document_title text,
  document_author text,
  source_type text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as chunk_id,
    c.document_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title as document_title,
    d.author as document_author,
    d.source_type
  FROM public.chunks c
  INNER JOIN public.documents d ON c.document_id = d.id
  WHERE
    (1 - (c.embedding <=> query_embedding)) > match_threshold
    AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
    AND (filter_source_types IS NULL OR d.source_type = ANY(filter_source_types))
    AND d.processed_status = 'completed'
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search combining vector + full-text search
CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float,
  relevance float,
  combined_score float,
  document_title text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as chunk_id,
    c.document_id,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> query_embedding)) as similarity,
    ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', query_text)) as relevance,
    ((1 - (c.embedding <=> query_embedding)) * 0.7 +
     ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', query_text)) * 0.3) as combined_score,
    d.title as document_title
  FROM public.chunks c
  INNER JOIN public.documents d ON c.document_id = d.id
  WHERE
    ((1 - (c.embedding <=> query_embedding)) > match_threshold
     OR to_tsvector('english', c.content) @@ plainto_tsquery('english', query_text))
    AND d.processed_status = 'completed'
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Get document coverage statistics for search results
CREATE OR REPLACE FUNCTION public.get_document_coverage(
  chunk_ids uuid[]
)
RETURNS TABLE (
  document_id uuid,
  document_title text,
  chunk_count bigint,
  total_chunks bigint,
  coverage_percent float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id as document_id,
    d.title as document_title,
    COUNT(DISTINCT c.id) as chunk_count,
    d.chunk_count as total_chunks,
    (COUNT(DISTINCT c.id)::float / NULLIF(d.chunk_count, 0)::float * 100) as coverage_percent
  FROM public.documents d
  LEFT JOIN public.chunks c ON c.document_id = d.id AND c.id = ANY(chunk_ids)
  WHERE d.id IN (SELECT document_id FROM public.chunks WHERE id = ANY(chunk_ids))
  GROUP BY d.id, d.title, d.chunk_count;
$$;

-- Search similar chunks by chunk ID (for finding related content)
CREATE OR REPLACE FUNCTION public.find_similar_chunks(
  source_chunk_id uuid,
  similarity_threshold float DEFAULT 0.8,
  limit_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_title text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  source_embedding vector(1536);
BEGIN
  -- Get the embedding of the source chunk
  SELECT embedding INTO source_embedding
  FROM public.chunks
  WHERE id = source_chunk_id;

  IF source_embedding IS NULL THEN
    RAISE EXCEPTION 'Chunk not found: %', source_chunk_id;
  END IF;

  RETURN QUERY
  SELECT
    c.id as chunk_id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> source_embedding) as similarity,
    d.title as document_title
  FROM public.chunks c
  INNER JOIN public.documents d ON c.document_id = d.id
  WHERE
    c.id != source_chunk_id
    AND (1 - (c.embedding <=> source_embedding)) > similarity_threshold
    AND d.processed_status = 'completed'
  ORDER BY c.embedding <=> source_embedding
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Grant access to tables
GRANT SELECT ON public.documents TO authenticated, anon;
GRANT SELECT ON public.chunks TO authenticated, anon;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.chunks TO authenticated;
GRANT INSERT ON public.search_analytics TO authenticated, anon;
GRANT SELECT ON public.search_analytics TO authenticated;

-- Grant execute on search functions
GRANT EXECUTE ON FUNCTION public.match_chunks_with_metadata TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hybrid_search TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_document_coverage TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.find_similar_chunks TO authenticated, anon;

-- =====================================================
-- HELPER FUNCTIONS FOR DOCUMENT MANAGEMENT
-- =====================================================

-- Update document chunk count when chunks are added/removed
CREATE OR REPLACE FUNCTION public.update_document_chunk_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.documents
    SET chunk_count = chunk_count + 1
    WHERE id = NEW.document_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.documents
    SET chunk_count = chunk_count - 1
    WHERE id = OLD.document_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER update_chunk_count_on_insert
  AFTER INSERT ON public.chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_chunk_count();

CREATE TRIGGER update_chunk_count_on_delete
  AFTER DELETE ON public.chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_chunk_count();
