/**
 * Google Gemini Client Library
 *
 * Provides utilities for interacting with Gemini API for text generation.
 * Used for cost-effective wiki page generation when RAG context is available.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

/**
 * Message format for Gemini conversations (matching Claude interface)
 */
export interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Options for Gemini text generation
 */
export interface GeminiGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  topP?: number;
  topK?: number;
}

/**
 * Result from Gemini generation with metadata
 */
export interface GeminiGenerationResult {
  content: string;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

// Default model configuration - Gemini 2.0 Flash is 30x cheaper than Sonnet
const DEFAULT_MODEL = 'gemini-2.0-flash-exp';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

// Singleton client
let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Initialize Gemini client instance
 * @returns Configured Gemini client or null if no API key
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  if (geminiClient) return geminiClient;

  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.warn('[Gemini] No API key found in environment');
    return null;
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

/**
 * Convert messages to Gemini format
 * Gemini expects a specific history format
 */
function convertMessages(messages: GeminiMessage[]): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

/**
 * Generate text using Gemini with a system prompt and message history
 *
 * @param messages - Conversation history
 * @param systemPrompt - System instructions for Gemini
 * @param options - Generation configuration options
 * @returns Generated text content
 */
export async function generateWithGemini(
  messages: GeminiMessage[],
  systemPrompt: string,
  options: GeminiGenerationOptions = {}
): Promise<string> {
  const client = getGeminiClient();

  if (!client) {
    throw new Error('Google AI API key not configured. Set GOOGLE_AI_API_KEY environment variable.');
  }

  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL,
    topP,
    topK,
  } = options;

  try {
    const genModel = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        ...(topP !== undefined && { topP }),
        ...(topK !== undefined && { topK }),
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const history = convertMessages(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1];

    const chat = genModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return response.text();
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate text with full response metadata
 *
 * @param messages - Conversation history
 * @param systemPrompt - System instructions
 * @param options - Generation configuration
 * @returns Full generation result with usage statistics
 */
export async function generateWithMetadata(
  messages: GeminiMessage[],
  systemPrompt: string,
  options: GeminiGenerationOptions = {}
): Promise<GeminiGenerationResult> {
  const client = getGeminiClient();

  if (!client) {
    throw new Error('Google AI API key not configured. Set GOOGLE_AI_API_KEY environment variable.');
  }

  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL,
    topP,
    topK,
  } = options;

  try {
    const genModel = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        ...(topP !== undefined && { topP }),
        ...(topK !== undefined && { topK }),
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const history = convertMessages(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1];

    const chat = genModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    // Extract usage metadata
    const usageMetadata = response.usageMetadata;

    return {
      content: response.text(),
      stopReason: response.candidates?.[0]?.finishReason || null,
      usage: {
        inputTokens: usageMetadata?.promptTokenCount || 0,
        outputTokens: usageMetadata?.candidatesTokenCount || 0,
      },
      model,
    };
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a simple completion from a single prompt
 * Convenience wrapper for single-turn generation
 *
 * @param prompt - User prompt
 * @param systemPrompt - Optional system instructions
 * @param options - Generation configuration
 * @returns Generated text
 */
export async function generateCompletion(
  prompt: string,
  systemPrompt: string = '',
  options: GeminiGenerationOptions = {}
): Promise<string> {
  return generateWithGemini(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    options
  );
}

/**
 * Stream text generation from Gemini
 * Useful for real-time UX in chat interfaces
 *
 * @param messages - Conversation history
 * @param systemPrompt - System instructions
 * @param onChunk - Callback for each text chunk
 * @param options - Generation configuration
 * @returns Final complete text
 */
export async function generateWithStreaming(
  messages: GeminiMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  options: GeminiGenerationOptions = {}
): Promise<string> {
  const client = getGeminiClient();

  if (!client) {
    throw new Error('Google AI API key not configured. Set GOOGLE_AI_API_KEY environment variable.');
  }

  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL,
  } = options;

  try {
    const genModel = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const history = convertMessages(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1];

    const chat = genModel.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    let fullText = '';

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      onChunk(text);
    }

    return fullText;
  } catch (error) {
    throw new Error(`Gemini streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Estimate cost for a generation request
 * Gemini 2.0 Flash pricing
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - Model being used
 * @returns Estimated cost in USD
 */
export function estimateGenerationCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  // Gemini 2.0 Flash pricing (as of Dec 2024)
  const pricing: Record<string, { inputCostPer1M: number; outputCostPer1M: number }> = {
    'gemini-2.0-flash-exp': {
      inputCostPer1M: 0.10,   // $0.10 per 1M input tokens
      outputCostPer1M: 0.40,  // $0.40 per 1M output tokens
    },
    'gemini-2.0-flash-lite': {
      inputCostPer1M: 0.075,
      outputCostPer1M: 0.30,
    },
    'gemini-1.5-flash': {
      inputCostPer1M: 0.075,
      outputCostPer1M: 0.30,
    },
    'gemini-1.5-pro': {
      inputCostPer1M: 1.25,
      outputCostPer1M: 5.00,
    },
  };

  const modelPricing = pricing[model] || pricing['gemini-2.0-flash-exp'];

  const inputCost = (inputTokens / 1_000_000) * modelPricing.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.outputCostPer1M;

  return inputCost + outputCost;
}

/**
 * Check if Gemini API is configured
 */
export function isConfigured(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

/**
 * Get available Gemini models
 */
export function getAvailableModels() {
  return {
    flash: 'gemini-2.0-flash-exp',
    flashLite: 'gemini-2.0-flash-lite',
    flash15: 'gemini-1.5-flash',
    pro: 'gemini-1.5-pro',
  };
}
