/**
 * Document Processing Pipeline
 *
 * Main orchestrator for the RAG pipeline:
 * 1. Fetch document from Supabase Storage
 * 2. Extract text from file
 * 3. Chunk the text
 * 4. Generate embeddings
 * 5. Store chunks with vectors in database
 */

import { createAdminClient } from '../supabase/admin';
import { extractText, cleanExtractedText } from './extractors';
import { chunkDocument } from './chunking';
import { generateEmbeddings } from './embeddings';
import {
  updateDocumentStatus,
  insertChunks,
  deleteChunksByDocument,
  getDocument,
  getDocumentAdmin,
} from '../supabase/chunks';

export interface ProcessingResult {
  documentId: string;
  chunksCreated: number;
  totalTokens: number;
  processingTime: number;
  status: 'success' | 'failure';
  error?: string;
}

export interface ProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  preserveSections?: boolean;
  retryOnFailure?: boolean;
}

/**
 * Process a document through the complete RAG pipeline
 *
 * @param documentId - ID of the document to process
 * @param options - Processing options
 * @returns Processing result with metrics
 */
export async function processDocument(
  documentId: string,
  options?: ProcessingOptions
): Promise<ProcessingResult> {
  const startTime = Date.now();

  const {
    chunkSize = 1500,
    chunkOverlap = 200,
    preserveSections = true,
    retryOnFailure = true,
  } = options || {};

  try {
    console.log(`[Processor] Starting processing for document ${documentId}`);

    // Step 1: Update status to processing
    await updateDocumentStatus(documentId, 'processing', {
      processing_started_at: new Date().toISOString(),
    });

    // Step 2: Fetch document metadata
    const document = await getDocumentAdmin(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const metadata = (document.metadata || {}) as Record<string, any>;
    const fileName =
      document.file_name ||
      metadata.original_filename ||
      metadata.file_name ||
      document.file_path?.split('/').pop() ||
      document.title ||
      'document';

    const mimeType = document.mime_type || metadata.content_type || metadata.mime_type;

    console.log(`[Processor] Document found: ${document.title} (${fileName})`);

    // Step 3: Download file from Supabase Storage
    const fileBuffer = await downloadFile(document.file_path);
    console.log(`[Processor] Downloaded file: ${fileBuffer.length} bytes`);

    // Step 4: Extract text from file (fallback to stored metadata/path when mime or name missing)
    const extractionResult = await extractText(fileBuffer, mimeType, fileName);
    const cleanText = cleanExtractedText(extractionResult.text);
    console.log(`[Processor] Extracted text: ${cleanText.length} characters, ${extractionResult.metadata.wordCount} words`);

    if (cleanText.length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    // Step 5: Chunk the text
    const chunks = await chunkDocument(documentId, cleanText, {
      chunkSize,
      chunkOverlap,
      preserveSections,
    });
    console.log(`[Processor] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('No chunks were created from the document');
    }

    // Step 6: Generate embeddings for all chunks
    const chunkContents = chunks.map(c => c.content);
    const embeddingResults = await generateEmbeddings(chunkContents);
    console.log(`[Processor] Generated ${embeddingResults.length} embeddings`);

    // Step 7: Combine chunks with embeddings
    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: embeddingResults[index].embedding,
      metadata: chunk.metadata,
      chunk_index: chunk.metadata.chunk_index,
      token_count: embeddingResults[index].tokens,
    }));

    // Step 8: Delete old chunks if any (reprocessing scenario)
    const deletedCount = await deleteChunksByDocument(documentId);
    if (deletedCount > 0) {
      console.log(`[Processor] Deleted ${deletedCount} old chunks`);
    }

    // Step 9: Insert new chunks into database
    const insertedCount = await insertChunks(documentId, chunksWithEmbeddings);
    console.log(`[Processor] Inserted ${insertedCount} chunks into database`);

    // Step 10: Calculate total tokens
    const totalTokens = embeddingResults.reduce((sum, r) => sum + r.tokens, 0);

    // Step 11: Update document status to completed
    await updateDocumentStatus(documentId, 'completed', {
      chunk_count: insertedCount,
      total_tokens: totalTokens,
      processing_completed_at: new Date().toISOString(),
      processing_error: undefined,
    });

    const processingTime = Date.now() - startTime;
    console.log(`[Processor] Processing completed in ${processingTime}ms`);

    return {
      documentId,
      chunksCreated: insertedCount,
      totalTokens,
      processingTime,
      status: 'success',
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[Processor] Processing failed: ${errorMessage}`);

    // Update document status to failed
    try {
      await updateDocumentStatus(documentId, 'failed', {
        processing_error: errorMessage,
        processing_completed_at: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error('[Processor] Failed to update error status:', updateError);
    }

    return {
      documentId,
      chunksCreated: 0,
      totalTokens: 0,
      processingTime,
      status: 'failure',
      error: errorMessage,
    };
  }
}

/**
 * Download file from Supabase Storage
 *
 * @param filePath - Storage path of the file
 * @returns File buffer
 */
async function downloadFile(filePath: string): Promise<Buffer> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data received from storage');
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Process multiple documents in batch
 *
 * @param documentIds - Array of document IDs to process
 * @param options - Processing options
 * @returns Array of processing results
 */
export async function processDocumentsBatch(
  documentIds: string[],
  options?: ProcessingOptions
): Promise<ProcessingResult[]> {
  console.log(`[Processor] Starting batch processing for ${documentIds.length} documents`);

  const results: ProcessingResult[] = [];

  // Process documents sequentially to avoid overwhelming the system
  for (const documentId of documentIds) {
    try {
      const result = await processDocument(documentId, options);
      results.push(result);
    } catch (error) {
      console.error(`[Processor] Batch processing failed for document ${documentId}:`, error);
      results.push({
        documentId,
        chunksCreated: 0,
        totalTokens: 0,
        processingTime: 0,
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`[Processor] Batch processing completed: ${successCount}/${documentIds.length} successful`);

  return results;
}

/**
 * Reprocess a document (delete old chunks and recreate)
 *
 * @param documentId - ID of the document to reprocess
 * @param options - Processing options
 * @returns Processing result
 */
export async function reprocessDocument(
  documentId: string,
  options?: ProcessingOptions
): Promise<ProcessingResult> {
  console.log(`[Processor] Reprocessing document ${documentId}`);

  // Delete existing chunks
  const deletedCount = await deleteChunksByDocument(documentId);
  console.log(`[Processor] Deleted ${deletedCount} existing chunks`);

  // Reset document status
  await updateDocumentStatus(documentId, 'pending');

  // Process the document
  return processDocument(documentId, options);
}

/**
 * Estimate processing cost for a document
 *
 * @param fileSizeBytes - File size in bytes
 * @param options - Processing options
 * @returns Cost estimation
 */
export function estimateProcessingCost(
  fileSizeBytes: number,
  options?: ProcessingOptions
): {
  estimatedChunks: number;
  estimatedTokens: number;
  estimatedCostUSD: number;
  estimatedTime: number;
} {
  const { chunkSize = 1500, chunkOverlap = 200 } = options || {};

  // Rough estimates (1 MB ≈ 1,000,000 characters for text files)
  const estimatedCharacters = fileSizeBytes;
  const estimatedChunks = Math.ceil(estimatedCharacters / (chunkSize - chunkOverlap));
  const estimatedTokens = Math.ceil(estimatedCharacters / 4); // ~4 chars per token
  const estimatedCostUSD = (estimatedTokens / 1_000_000) * 0.10; // $0.10 per 1M tokens
  const estimatedTime = estimatedChunks * 100; // ~100ms per chunk

  return {
    estimatedChunks,
    estimatedTokens,
    estimatedCostUSD,
    estimatedTime,
  };
}

/**
 * Get processing status for a document
 *
 * @param documentId - ID of the document
 * @returns Processing status
 */
export async function getProcessingStatus(
  documentId: string
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: {
    startedAt?: string;
    completedAt?: string;
    chunkCount?: number;
    totalTokens?: number;
    error?: string;
  };
}> {
  const document = await getDocument(documentId);

  if (!document) {
    throw new Error('Document not found');
  }

  return {
    status: document.processed_status,
    progress: {
      startedAt: document.processing_started_at,
      completedAt: document.processing_completed_at,
      chunkCount: document.chunk_count,
      totalTokens: document.total_tokens,
      error: document.processing_error,
    },
  };
}

/**
 * Check if a document is ready for processing
 *
 * @param documentId - ID of the document
 * @returns Whether document can be processed
 */
export async function canProcessDocument(
  documentId: string
): Promise<{ can: boolean; reason?: string }> {
  const document = await getDocument(documentId);

  if (!document) {
    return { can: false, reason: 'Document not found' };
  }

  if (document.processed_status === 'processing') {
    return { can: false, reason: 'Document is already being processed' };
  }

  if (document.processed_status === 'completed') {
    return { can: true, reason: 'Document can be reprocessed' };
  }

  return { can: true };
}

/**
 * Process pending documents (for background jobs)
 *
 * @param limit - Maximum number of documents to process
 * @returns Array of processing results
 */
export async function processPendingDocuments(
  limit: number = 10
): Promise<ProcessingResult[]> {
  const supabase = createAdminClient();

  // Fetch pending documents
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch pending documents: ${error.message}`);
  }

  if (!documents || documents.length === 0) {
    console.log('[Processor] No pending documents to process');
    return [];
  }

  console.log(`[Processor] Found ${documents.length} pending documents`);

  const documentIds = (documents as any[]).map(d => d.id);
  return processDocumentsBatch(documentIds);
}
