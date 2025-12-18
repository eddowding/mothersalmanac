-- Fix search_chunks to use SECURITY DEFINER and correct column names
-- This allows the function to bypass RLS and query all document chunks
-- Required because wiki generation needs access to all knowledge base content

DROP FUNCTION IF EXISTS public.search_chunks(vector(1536), float, int, uuid);

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
    (dc.metadata->>'section_title')::text AS section_title,
    (dc.metadata->>'page_number')::integer AS page_number,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity,
    d.title AS document_title,
    d.title AS document_file_name
  FROM public.document_chunks dc
  JOIN public.documents d ON dc.document_id = d.id
  WHERE
    (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND d.processed_status = 'completed'
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_chunks(vector(1536), float, int, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_chunks(vector(1536), float, int, uuid) TO anon;
