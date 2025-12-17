-- Fix search_chunks to use SECURITY DEFINER
-- This allows the function to bypass RLS and query all document chunks
-- Required because wiki generation needs access to all knowledge base content,
-- not just the current user's documents

-- Drop existing search_chunks functions and recreate with SECURITY DEFINER
DROP FUNCTION IF EXISTS public.search_chunks(vector(1536), float, int, uuid);
DROP FUNCTION IF EXISTS public.search_chunks(vector, float, int, uuid);
DROP FUNCTION IF EXISTS public.search_chunks(vector(1536), float, int);
DROP FUNCTION IF EXISTS public.search_chunks(vector, float, int);

-- Recreate with SECURITY DEFINER to bypass RLS
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
SECURITY DEFINER
SET search_path = public, extensions
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

-- Grant execute to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.search_chunks(vector(1536), float, int, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_chunks(vector(1536), float, int, uuid) TO anon;
