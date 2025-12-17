/**
 * Database Helpers for Document Chunks
 *
 * Provides functions for managing document chunks in Supabase.
 * Handles CRUD operations for chunks with vector embeddings.
 */

import { createClient } from './server';
import { createAdminClient } from './admin';
import type { ChunkMetadata } from '../rag/chunking';

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  chunk_index: number;
  section_title?: string;
  page_number?: number;
  char_count: number;
  token_count?: number;
  created_at: string;
}

export interface ChunkInsertData {
  content: string;
  embedding: number[];
  metadata: ChunkMetadata;
  chunk_index: number;
  token_count?: number;
}

export interface DocumentStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  total_tokens: number;
  processing_error?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
}

/**
 * Insert chunks for a document
 *
 * Uses admin client to bypass RLS for system operations.
 *
 * @param documentId - ID of the document
 * @param chunks - Array of chunks to insert
 * @returns Number of chunks inserted
 */
export async function insertChunks(
  documentId: string,
  chunks: ChunkInsertData[]
): Promise<number> {
  const supabase = createAdminClient();

  // Prepare chunk data for insertion
  const chunkData = chunks.map(chunk => ({
    document_id: documentId,
    content: chunk.content,
    embedding: JSON.stringify(chunk.embedding), // pgvector expects array as JSON
    chunk_index: chunk.chunk_index,
    section_title: chunk.metadata.section_title,
    page_number: chunk.metadata.page_number,
    char_count: chunk.metadata.char_count,
    token_count: chunk.token_count,
  }));

  // Insert in batches (Supabase has a limit on array size)
  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < chunkData.length; i += batchSize) {
    const batch = chunkData.slice(i, i + batchSize);

    const { error, count } = await (supabase as any)
      .from('document_chunks')
      .insert(batch)
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to insert chunks: ${error.message}`);
    }

    totalInserted += count || batch.length;
  }

  return totalInserted;
}

/**
 * Delete all chunks for a document
 *
 * @param documentId - ID of the document
 * @returns Number of chunks deleted
 */
export async function deleteChunksByDocument(
  documentId: string
): Promise<number> {
  const supabase = createAdminClient();

  const { error, count } = await supabase
    .from('document_chunks')
    .delete({ count: 'exact' })
    .eq('document_id', documentId);

  if (error) {
    throw new Error(`Failed to delete chunks: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get all chunks for a document
 *
 * @param documentId - ID of the document
 * @returns Array of chunks
 */
export async function getChunksByDocument(
  documentId: string
): Promise<DocumentChunk[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch chunks: ${error.message}`);
  }

  return data as DocumentChunk[];
}

/**
 * Get a single chunk by ID
 *
 * @param chunkId - ID of the chunk
 * @returns Chunk data
 */
export async function getChunkById(
  chunkId: string
): Promise<DocumentChunk | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('id', chunkId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch chunk: ${error.message}`);
  }

  return data as DocumentChunk;
}

/**
 * Update document status
 *
 * @param documentId - ID of the document
 * @param status - New status
 * @param metadata - Additional metadata to update
 */
export async function updateDocumentStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  metadata?: {
    chunk_count?: number;
    total_tokens?: number;
    processing_error?: string;
    processing_started_at?: string;
    processing_completed_at?: string;
  }
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: any = {
    processed_status: status,
    ...metadata,
  };

  const { error } = await (supabase as any)
    .from('documents')
    .update(updateData)
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to update document status: ${error.message}`);
  }
}

/**
 * Get document status
 *
 * @param documentId - ID of the document
 * @returns Document status information
 */
export async function getDocumentStatus(
  documentId: string
): Promise<DocumentStatus | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('id, status, chunk_count, total_tokens, processing_error, processing_started_at, processing_completed_at')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch document status: ${error.message}`);
  }

  return data as DocumentStatus;
}

/**
 * Search for similar chunks using vector similarity
 *
 * @param queryEmbedding - Query vector
 * @param options - Search options
 * @returns Array of similar chunks with similarity scores
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  options?: {
    threshold?: number;
    limit?: number;
    documentId?: string;
  }
): Promise<Array<{
  id: string;
  document_id: string;
  content: string;
  section_title?: string;
  page_number?: number;
  similarity: number;
  document_title: string;
  document_file_name: string;
}>> {
  const supabase = await createClient();

  const {
    threshold = 0.7,
    limit = 10,
    documentId,
  } = options || {};

  const { data, error } = await (supabase as any).rpc('search_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
    filter_document_id: documentId || null,
  });

  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }

  return data || [];
}

/**
 * Get chunk count for a document
 *
 * @param documentId - ID of the document
 * @returns Number of chunks
 */
export async function getChunkCount(documentId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', documentId);

  if (error) {
    throw new Error(`Failed to count chunks: ${error.message}`);
  }

  return count || 0;
}

/**
 * Batch update chunk token counts
 *
 * @param chunks - Array of chunks with IDs and token counts
 */
export async function updateChunkTokenCounts(
  chunks: Array<{ id: string; token_count: number }>
): Promise<void> {
  const supabase = createAdminClient();

  // Update in batches
  const batchSize = 50;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    // Use individual updates in parallel
    const updates = batch.map(chunk =>
      (supabase as any)
        .from('document_chunks')
        .update({ token_count: chunk.token_count })
        .eq('id', chunk.id)
    );

    const results = await Promise.all(updates);

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update token counts: ${errors[0].error?.message}`);
    }
  }
}

/**
 * Get total token count for all chunks in a document
 *
 * @param documentId - ID of the document
 * @returns Total token count
 */
export async function getTotalTokens(documentId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_chunks')
    .select('token_count')
    .eq('document_id', documentId);

  if (error) {
    throw new Error(`Failed to get token counts: ${error.message}`);
  }

  return data?.reduce((sum, chunk: any) => sum + (chunk.token_count || 0), 0) || 0;
}

/**
 * Delete document and all its chunks (cascade)
 *
 * @param documentId - ID of the document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Get document by ID
 *
 * @param documentId - ID of the document
 * @returns Document data
 */
export async function getDocument(documentId: string): Promise<any> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch document: ${error.message}`);
  }

  return data;
}

/**
 * Get document by ID using admin client (for background jobs)
 *
 * @param documentId - ID of the document
 * @returns Document data
 */
export async function getDocumentAdmin(documentId: string): Promise<any> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch document: ${error.message}`);
  }

  return data;
}

/**
 * List all documents for a user
 *
 * @param userId - ID of the user
 * @returns Array of documents
 */
export async function listDocuments(userId?: string): Promise<any[]> {
  const supabase = await createClient();

  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return data || [];
}
