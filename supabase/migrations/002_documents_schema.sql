-- Mother's Almanac Document Management Schema
-- This migration creates tables for document upload and chunk management

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- Stores uploaded documents and their metadata
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('book', 'article', 'pdf', 'website', 'other')),
  file_path TEXT,
  file_size BIGINT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  processed_status TEXT NOT NULL DEFAULT 'pending' CHECK (processed_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(processed_status);
CREATE INDEX IF NOT EXISTS documents_upload_date_idx ON public.documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS documents_source_type_idx ON public.documents(source_type);
CREATE INDEX IF NOT EXISTS documents_title_idx ON public.documents USING gin(to_tsvector('english', title));

-- =====================================================
-- DOCUMENT CHUNKS TABLE
-- =====================================================
-- Stores processed document chunks with embeddings for RAG
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_chunk_index_idx ON public.document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS document_chunks_content_idx ON public.document_chunks USING gin(to_tsvector('english', content));

-- Create vector similarity search index (using ivfflat for performance)
-- Note: Requires pgvector extension
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON public.document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- =====================================================
-- COMPUTED COLUMN FUNCTION
-- =====================================================
-- Function to count chunks for a document
CREATE OR REPLACE FUNCTION public.get_document_chunk_count(doc_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.document_chunks
  WHERE document_id = doc_id;
$$;

-- =====================================================
-- RLS POLICIES FOR DOCUMENTS
-- =====================================================
-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with documents
CREATE POLICY "admins_manage_documents" ON public.documents
  FOR ALL
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- Users can read completed documents (for RAG queries)
CREATE POLICY "users_read_completed_documents" ON public.documents
  FOR SELECT
  USING (processed_status = 'completed' AND auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES FOR DOCUMENT CHUNKS
-- =====================================================
-- Enable RLS on document chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with chunks
CREATE POLICY "admins_manage_chunks" ON public.document_chunks
  FOR ALL
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- Users can read chunks from completed documents (for RAG queries)
CREATE POLICY "users_read_chunks" ON public.document_chunks
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND processed_status = 'completed'
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
-- Apply updated_at trigger to documents
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Grant authenticated users access to tables
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.document_chunks TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_document_chunk_count(UUID) TO authenticated;

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================
-- Note: This must be run manually in Supabase Dashboard or via SQL
-- The 'documents' bucket should be created with these settings:
-- - Bucket name: documents
-- - Public: false (private bucket)
-- - File size limit: 52428800 (50MB)
-- - Allowed MIME types: application/pdf, text/plain, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
-- Admins can upload
CREATE POLICY "admins_upload_documents" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (SELECT is_admin())
  );

-- Admins can read all documents
CREATE POLICY "admins_read_documents" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT is_admin())
  );

-- Admins can delete documents
CREATE POLICY "admins_delete_documents" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT is_admin())
  );
