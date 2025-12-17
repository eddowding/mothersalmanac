-- Add missing processing columns to documents table
-- These columns track document processing status, timing, and results

-- Processing timing columns
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;

-- Processing result columns
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Add missing columns to document_chunks if not present
ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS section_title TEXT;

ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS page_number INTEGER;

ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS char_count INTEGER;

ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- Index for processing status queries
CREATE INDEX IF NOT EXISTS documents_processing_started_idx
ON public.documents(processing_started_at DESC)
WHERE processing_started_at IS NOT NULL;
