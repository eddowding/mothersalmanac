-- Mother's Almanac Knowledge Base Schema
-- This migration creates tables for document management and vector embeddings

-- =====================================================
-- ENABLE VECTOR EXTENSION
-- =====================================================
-- Enable pgvector for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- Stores uploaded documents for the knowledge base
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT NOT NULL, -- Size in bytes
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  chunk_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(status);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON public.documents(created_at DESC);

-- =====================================================
-- DOCUMENT CHUNKS TABLE
-- =====================================================
-- Stores chunked text with vector embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- Voyage AI embeddings are 1536 dimensions
  chunk_index INTEGER NOT NULL,
  section_title TEXT,
  page_number INTEGER,
  char_count INTEGER NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for document chunks
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_chunk_index_idx ON public.document_chunks(document_id, chunk_index);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- =====================================================
-- RLS POLICIES FOR DOCUMENTS
-- =====================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Users can read their own documents
CREATE POLICY "users_select_own_documents" ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "users_insert_own_documents" ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "users_update_own_documents" ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "users_delete_own_documents" ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can read all documents
CREATE POLICY "admins_select_all_documents" ON public.documents
  FOR SELECT
  USING ((SELECT is_admin()));

-- Admins can update any document (for processing status)
CREATE POLICY "admins_update_all_documents" ON public.documents
  FOR UPDATE
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- =====================================================
-- RLS POLICIES FOR DOCUMENT CHUNKS
-- =====================================================
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Users can read chunks from their own documents
CREATE POLICY "users_select_own_chunks" ON public.document_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND user_id = auth.uid()
    )
  );

-- System/admin can insert chunks (during processing)
CREATE POLICY "admin_insert_chunks" ON public.document_chunks
  FOR INSERT
  WITH CHECK ((SELECT is_admin()));

-- Users can delete chunks from their own documents (via CASCADE)
CREATE POLICY "users_delete_own_chunks" ON public.document_chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND user_id = auth.uid()
    )
  );

-- Admins can read all chunks
CREATE POLICY "admins_select_all_chunks" ON public.document_chunks
  FOR SELECT
  USING ((SELECT is_admin()));

-- Admins can delete any chunks
CREATE POLICY "admins_delete_all_chunks" ON public.document_chunks
  FOR DELETE
  USING ((SELECT is_admin()));

-- =====================================================
-- VECTOR SEARCH FUNCTION
-- =====================================================
-- Function to search for similar chunks using vector similarity
CREATE OR REPLACE FUNCTION public.search_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  section_title text,
  page_number integer,
  similarity float,
  document_title text,
  document_file_name text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.section_title,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    d.file_name AS document_file_name
  FROM public.document_chunks dc
  JOIN public.documents d ON dc.document_id = d.id
  WHERE
    (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND d.status = 'completed'
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_chunks TO authenticated;

-- =====================================================
-- STORAGE BUCKET FOR DOCUMENTS
-- =====================================================
-- Note: Run this via Supabase dashboard or separate command
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', false);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================
-- Users can upload to their own folder
-- CREATE POLICY "users_upload_own_documents"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'documents'
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Users can read their own documents
-- CREATE POLICY "users_read_own_documents"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'documents'
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Users can delete their own documents
-- CREATE POLICY "users_delete_own_documents"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'documents'
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Admins can access all documents
-- CREATE POLICY "admins_all_documents"
-- ON storage.objects FOR ALL
-- USING (
--   bucket_id = 'documents'
--   AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
-- );
