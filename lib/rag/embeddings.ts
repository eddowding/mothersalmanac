/**
 * Embedding Generation Library
 *
 * Generates vector embeddings using OpenAI text-embedding-3-small.
 * Supports batch processing, rate limiting, and cost estimation.
 */

import OpenAI from 'openai';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  totalTokens: number;
  estimatedCost: number;
}

// Embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 100; // OpenAI supports up to 2048 inputs per request
const RATE_LIMIT_DELAY = 200; // 200ms between batches
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Cost estimation - OpenAI text-embedding-3-small pricing
const COST_PER_1M_TOKENS = 0.02; // $0.02 per 1M tokens

// Singleton client
let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * Generate embedding for a single text using OpenAI
 *
 * @param text - Text to generate embedding for
 * @returns Embedding result with vector and metadata
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const client = getOpenAIClient();
  const normalizedText = text.trim();

  // If no API key, throw error (no more mock embeddings in production)
  if (!client) {
    throw new Error(
      'OpenAI API key not configured. Set OPENAI_API_KEY environment variable for embeddings.'
    );
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: normalizedText,
        dimensions: EMBEDDING_DIMENSION,
      });
    });

    return {
      embedding: response.data[0].embedding,
      model: response.model,
      tokens: response.usage.total_tokens,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 *
 * More efficient than individual calls. Uses OpenAI's batch embedding API.
 *
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding results
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) {
    return [];
  }

  // Validate all texts
  const validTexts = texts.filter(text => text && text.trim().length > 0);
  if (validTexts.length !== texts.length) {
    console.warn(
      `[Embeddings] Filtered out ${texts.length - validTexts.length} empty texts`
    );
  }

  const client = getOpenAIClient();
  if (!client) {
    throw new Error(
      'OpenAI API key not configured. Set OPENAI_API_KEY environment variable for embeddings.'
    );
  }

  const results: EmbeddingResult[] = [];

  // Process in batches
  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE).map(t => t.trim());

    console.log(
      `[Embeddings] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validTexts.length / BATCH_SIZE)} (${batch.length} texts)`
    );

    try {
      const response = await retryWithBackoff(async () => {
        return await client.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch,
          dimensions: EMBEDDING_DIMENSION,
        });
      });

      // Map response to results in order
      const tokensPerText = Math.ceil(response.usage.total_tokens / batch.length);

      for (const item of response.data) {
        results.push({
          embedding: item.embedding,
          model: response.model,
          tokens: tokensPerText,
        });
      }
    } catch (error) {
      console.error(`[Embeddings] Batch failed:`, error);
      throw error;
    }

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < validTexts.length) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  return results;
}

/**
 * Generate embeddings with detailed cost and performance metrics
 *
 * @param texts - Array of texts to embed
 * @returns Batch result with embeddings and metrics
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<BatchEmbeddingResult> {
  const startTime = Date.now();
  const results = await generateEmbeddings(texts);

  const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
  const estimatedCost = (totalTokens / 1_000_000) * COST_PER_1M_TOKENS;

  const embeddings = results.map(r => r.embedding);

  console.log(
    `[Embeddings] Batch complete: ${texts.length} texts, ${totalTokens} tokens, $${estimatedCost.toFixed(4)} cost, ${Date.now() - startTime}ms`
  );

  return {
    embeddings,
    model: EMBEDDING_MODEL,
    totalTokens,
    estimatedCost,
  };
}

/**
 * Retry logic with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    // Check if error is retryable
    if (isRetryableError(error)) {
      console.warn(`[Embeddings] Retrying in ${delay}ms... (${retries} retries left)`);
      await sleep(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }

    throw error;
  }
}

/**
 * Check if error should be retried
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    // Retry on rate limits and server errors
    return error.status === 429 || (error.status >= 500 && error.status < 600);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset')
    );
  }
  return false;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Estimate token count for text
 * Uses rough approximation: ~4 characters per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate embedding cost for text
 *
 * @param textLength - Length of text in characters
 * @returns Cost estimation
 */
export function estimateEmbeddingCost(
  textLength: number
): { tokens: number; cost: number } {
  const tokens = estimateTokens(textLength.toString());
  const cost = (tokens / 1_000_000) * COST_PER_1M_TOKENS;

  return { tokens, cost };
}

/**
 * Estimate cost for batch of texts
 *
 * @param texts - Array of texts
 * @returns Total cost estimation
 */
export function estimateBatchCost(texts: string[]): {
  totalTokens: number;
  totalCost: number;
  averageTokensPerText: number;
} {
  const totalLength = texts.reduce((sum, text) => sum + text.length, 0);
  const totalTokens = Math.ceil(totalLength / 4);
  const totalCost = (totalTokens / 1_000_000) * COST_PER_1M_TOKENS;
  const averageTokensPerText = texts.length > 0 ? Math.ceil(totalTokens / texts.length) : 0;

  return {
    totalTokens,
    totalCost,
    averageTokensPerText,
  };
}

/**
 * Validate embedding dimensions
 */
export function validateEmbedding(embedding: number[]): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(embedding)) {
    return { valid: false, error: 'Embedding must be an array' };
  }

  if (embedding.length !== EMBEDDING_DIMENSION) {
    return {
      valid: false,
      error: `Embedding must have ${EMBEDDING_DIMENSION} dimensions, got ${embedding.length}`,
    };
  }

  if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
    return { valid: false, error: 'Embedding must contain only valid numbers' };
  }

  return { valid: true };
}

/**
 * Get embedding model configuration
 */
export function getEmbeddingConfig() {
  return {
    model: EMBEDDING_MODEL,
    dimension: EMBEDDING_DIMENSION,
    batchSize: BATCH_SIZE,
    rateLimitDelay: RATE_LIMIT_DELAY,
    costPer1MTokens: COST_PER_1M_TOKENS,
  };
}

/**
 * Check if embeddings API is configured
 */
export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
