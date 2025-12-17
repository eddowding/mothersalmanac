import { task, logger } from "@trigger.dev/sdk/v3";

/**
 * Document Processing Task
 *
 * Handles the full RAG pipeline for uploaded documents:
 * 1. Download from Supabase Storage
 * 2. Extract text (PDF, EPUB, DOCX, etc.)
 * 3. Chunk the text
 * 4. Generate embeddings via OpenAI
 * 5. Store chunks in database
 */
export const processDocumentTask = task({
  id: "process-document",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { documentId: string }) => {
    const { documentId } = payload;

    logger.info("Starting document processing", { documentId });

    // Dynamic import to avoid bundling issues
    const { processDocument } = await import("@/lib/rag/processor");

    const result = await processDocument(documentId);

    if (result.status === "failure") {
      logger.error("Document processing failed", {
        documentId,
        error: result.error
      });
      throw new Error(result.error || "Processing failed");
    }

    logger.info("Document processing completed", {
      documentId,
      chunksCreated: result.chunksCreated,
      totalTokens: result.totalTokens,
      processingTime: result.processingTime,
    });

    return result;
  },
});
