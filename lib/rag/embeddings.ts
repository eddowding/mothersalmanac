/**
 * Embedding Generation Library
 *
 * Generates vector embeddings using Voyage AI (via Anthropic).
 * Supports batch processing, rate limiting, and cost estimation.
 */

import Anthropic from '@anthropic-ai/sdk';

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
const EMBEDDING_MODEL = 'voyage-3';
const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY = 1000; // 1 second between batches
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Cost estimation (approximate - verify with Anthropic pricing)
const COST_PER_1M_TOKENS = 0.10; // $0.10 per 1M tokens

/**
 * Initialize Anthropic client
 */
function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Anthropic({ apiKey });
}

/**
 * Generate embedding for a single text using Voyage AI
 *
 * @param text - Text to generate embedding for
 * @returns Embedding result with vector and metadata
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  const client = getAnthropicClient();

  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Normalize text
  const normalizedText = text.trim();

  // If no API key, use mock embeddings (for development/testing)
  if (!client) {
    console.warn('[Embeddings] No API key found, using mock embeddings');
    return {
      embedding: generateMockEmbedding(normalizedText),
      model: EMBEDDING_MODEL,
      tokens: estimateTokens(normalizedText),
    };
  }

  try {
    // Note: This uses the embeddings endpoint via Anthropic SDK
    // The actual API call format may vary based on Anthropic's implementation
    const response = await retryWithBackoff(async () => {
      // Using Anthropic's message API as a proxy for embeddings
      // In production, use the dedicated embeddings endpoint
      return await makeEmbeddingRequest(client, normalizedText);
    });

    return {
      embedding: response.embedding,
      model: EMBEDDING_MODEL,
      tokens: estimateTokens(normalizedText),
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
 * More efficient than individual calls. Automatically batches requests
 * and handles rate limiting.
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
      `Filtered out ${texts.length - validTexts.length} empty texts`
    );
  }

  const results: EmbeddingResult[] = [];

  // Process in batches
  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const batchPromises = batch.map(text => generateEmbedding(text));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults);

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

  return {
    embeddings,
    model: EMBEDDING_MODEL,
    totalTokens,
    estimatedCost,
  };
}

/**
 * Make embedding request via Anthropic API
 *
 * Note: This is a placeholder. The actual implementation depends on
 * Anthropic's embeddings API format. Update this when using the official endpoint.
 */
async function makeEmbeddingRequest(
  client: Anthropic | null,
  text: string
): Promise<{ embedding: number[] }> {
  // PLACEHOLDER: Replace with actual Anthropic embeddings API call
  // For now, we'll simulate the response structure

  // In production, use something like:
  // const response = await client.embeddings.create({
  //   model: EMBEDDING_MODEL,
  //   input: text,
  // });
  // return { embedding: response.data[0].embedding };

  // TEMPORARY: Generate a mock embedding for development
  // Remove this and use actual API when available
  console.warn('Using mock embedding generation - replace with actual API call');

  return {
    embedding: generateMockEmbedding(text),
  };
}

/**
 * Generate mock embedding for development/testing
 * REMOVE IN PRODUCTION - Use actual Voyage AI API
 */
function generateMockEmbedding(text: string): number[] {
  // Create deterministic mock embedding based on text
  const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding: number[] = [];

  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    // Generate pseudo-random number based on seed and index
    const value = Math.sin(seed * (i + 1) * 0.1) * Math.cos(seed * (i + 1) * 0.05);
    embedding.push(value);
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  return embedding.map(val => val / magnitude);
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
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
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
  const totalTokens = estimateTokens(totalLength.toString());
  const totalCost = (totalTokens / 1_000_000) * COST_PER_1M_TOKENS;
  const averageTokensPerText = Math.ceil(totalTokens / texts.length);

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
