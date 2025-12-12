/**
 * Anthropic Claude Client Library
 *
 * Provides utilities for interacting with Claude API for text generation.
 * Used for wiki page generation and entity extraction.
 */

import Anthropic from '@anthropic-ai/sdk'

/**
 * Message format for Claude conversations
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Options for Claude text generation
 */
export interface GenerationOptions {
  maxTokens?: number
  temperature?: number
  model?: string
  topP?: number
  topK?: number
}

/**
 * Result from Claude generation with metadata
 */
export interface GenerationResult {
  content: string
  stopReason: string | null
  usage: {
    inputTokens: number
    outputTokens: number
  }
  model: string
}

// Default model configuration
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.7

/**
 * Initialize Anthropic client instance
 * @returns Configured Anthropic client or null if no API key
 */
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.warn('[Anthropic] No API key found in environment')
    return null
  }

  return new Anthropic({
    apiKey,
  })
}

/**
 * Generate text using Claude with a system prompt and message history
 *
 * @param messages - Conversation history
 * @param systemPrompt - System instructions for Claude
 * @param options - Generation configuration options
 * @returns Generated text content
 */
export async function generateWithClaude(
  messages: ClaudeMessage[],
  systemPrompt: string,
  options: GenerationOptions = {}
): Promise<string> {
  const client = getAnthropicClient()

  if (!client) {
    throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.')
  }

  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL,
    topP,
    topK,
  } = options

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      ...(topP !== undefined && { top_p: topP }),
      ...(topK !== undefined && { top_k: topK }),
    })

    // Extract text content from response
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    return textContent
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error: ${error.message} (${error.status})`)
    }
    throw new Error(`Failed to generate with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
  messages: ClaudeMessage[],
  systemPrompt: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const client = getAnthropicClient()

  if (!client) {
    throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.')
  }

  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL,
    topP,
    topK,
  } = options

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      ...(topP !== undefined && { top_p: topP }),
      ...(topK !== undefined && { top_k: topK }),
    })

    // Extract text content
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    return {
      content: textContent,
      stopReason: response.stop_reason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error: ${error.message} (${error.status})`)
    }
    throw new Error(`Failed to generate with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
  options: GenerationOptions = {}
): Promise<string> {
  return generateWithClaude(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    options
  )
}

/**
 * Generate structured JSON output from Claude
 * Uses specific prompting to encourage valid JSON responses
 *
 * @param prompt - User prompt requesting JSON
 * @param systemPrompt - System instructions
 * @param options - Generation configuration
 * @returns Parsed JSON object
 */
export async function generateJSON<T = any>(
  prompt: string,
  systemPrompt: string = '',
  options: GenerationOptions = {}
): Promise<T> {
  const enhancedSystemPrompt = systemPrompt
    ? `${systemPrompt}\n\nIMPORTANT: Return your response as valid JSON only. Do not include any text before or after the JSON.`
    : 'Return your response as valid JSON only. Do not include any text before or after the JSON.'

  const enhancedPrompt = `${prompt}\n\nReturn only valid JSON, no other text.`

  const response = await generateWithClaude(
    [{ role: 'user', content: enhancedPrompt }],
    enhancedSystemPrompt,
    {
      ...options,
      temperature: options.temperature ?? 0, // Use 0 for more deterministic JSON
    }
  )

  try {
    // Try to extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    const jsonString = jsonMatch ? jsonMatch[0] : response

    return JSON.parse(jsonString) as T
  } catch (error) {
    throw new Error(`Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse:\n${response}`)
  }
}

/**
 * Stream text generation from Claude
 * Useful for real-time UX in chat interfaces
 *
 * @param messages - Conversation history
 * @param systemPrompt - System instructions
 * @param options - Generation configuration
 * @param onChunk - Callback for each text chunk
 * @returns Final complete text
 */
export async function generateWithStreaming(
  messages: ClaudeMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  options: GenerationOptions = {}
): Promise<string> {
  const client = getAnthropicClient()

  if (!client) {
    throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.')
  }

  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL,
  } = options

  try {
    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    let fullText = ''

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text
        fullText += text
        onChunk(text)
      }
    }

    return fullText
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error: ${error.message} (${error.status})`)
    }
    throw new Error(`Failed to stream from Claude: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Estimate cost for a generation request
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
  // Claude Sonnet 4.5 pricing (as of Dec 2024)
  // Verify with current Anthropic pricing
  const pricing = {
    'claude-sonnet-4-5-20250929': {
      inputCostPer1M: 3.0,   // $3 per 1M input tokens
      outputCostPer1M: 15.0, // $15 per 1M output tokens
    },
    'claude-sonnet-3-5-20241022': {
      inputCostPer1M: 3.0,
      outputCostPer1M: 15.0,
    },
    'claude-opus-3-20240229': {
      inputCostPer1M: 15.0,
      outputCostPer1M: 75.0,
    },
  }

  const modelPricing = pricing[model as keyof typeof pricing] || pricing['claude-sonnet-4-5-20250929']

  const inputCost = (inputTokens / 1_000_000) * modelPricing.inputCostPer1M
  const outputCost = (outputTokens / 1_000_000) * modelPricing.outputCostPer1M

  return inputCost + outputCost
}

/**
 * Export singleton client instance for direct use
 */
export const anthropic = getAnthropicClient()

/**
 * Check if Anthropic API is configured
 */
export function isConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
