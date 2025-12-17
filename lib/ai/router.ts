/**
 * AI Model Router
 *
 * Intelligently routes generation requests to the most cost-effective model
 * while maintaining quality. Uses tiered strategy:
 *
 * - RAG-backed generation → Gemini 2.0 Flash (30x cheaper, context provides accuracy)
 * - Fallback/no sources → Claude Sonnet (higher quality when no context)
 * - Entity extraction → Claude Haiku (fast, structured output)
 */

import { generateWithMetadata as claudeGenerate, estimateGenerationCost as claudeCost } from '@/lib/anthropic/client';
import { generateWithMetadata as geminiGenerate, estimateGenerationCost as geminiCost, isConfigured as geminiConfigured } from '@/lib/google/client';

export type ModelProvider = 'claude' | 'gemini';
export type TaskType = 'wiki_generation' | 'entity_extraction' | 'chat' | 'general';

/**
 * Message format (shared between providers)
 */
export interface RouterMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Generation options
 */
export interface RouterGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

/**
 * Context for routing decision
 */
export interface RoutingContext {
  taskType: TaskType;
  hasRagContext: boolean;       // Whether RAG sources were found
  ragConfidence?: number;        // Average similarity score of RAG results
  forceProvider?: ModelProvider; // Override automatic routing
}

/**
 * Result from generation
 */
export interface RouterGenerationResult {
  content: string;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  provider: ModelProvider;
  estimatedCost: number;
  routingReason: string;
}

// Model configuration
const MODELS = {
  // Claude models
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-3-5-haiku-20241022',

  // Gemini models (3 Flash Preview - Pro-level intelligence at Flash speed)
  geminiFlash: 'gemini-3-flash-preview',
  geminiFlashLite: 'gemini-2.5-flash-lite',
};

// Confidence threshold below which we use higher-quality model
const RAG_CONFIDENCE_THRESHOLD = 0.75;

/**
 * Determine which model/provider to use based on context
 */
export function selectModel(context: RoutingContext): {
  provider: ModelProvider;
  model: string;
  reason: string;
} {
  // Force provider if specified
  if (context.forceProvider) {
    const model = context.forceProvider === 'gemini' ? MODELS.geminiFlash : MODELS.sonnet;
    return {
      provider: context.forceProvider,
      model,
      reason: `Forced to ${context.forceProvider}`,
    };
  }

  // Check if Gemini is available
  const geminiAvailable = geminiConfigured();

  // Task-specific routing
  switch (context.taskType) {
    case 'entity_extraction':
      // Haiku is fast and accurate for structured extraction
      return {
        provider: 'claude',
        model: MODELS.haiku,
        reason: 'Haiku for fast entity extraction',
      };

    case 'wiki_generation':
      if (context.hasRagContext) {
        // Strong RAG context - use cheap Gemini
        if (geminiAvailable && (context.ragConfidence ?? 0) >= RAG_CONFIDENCE_THRESHOLD) {
          return {
            provider: 'gemini',
            model: MODELS.geminiFlash,
            reason: `Gemini for RAG-backed generation (confidence: ${((context.ragConfidence ?? 0) * 100).toFixed(0)}%)`,
          };
        }
        // Weak RAG context or Gemini unavailable - use Sonnet
        if (!geminiAvailable) {
          return {
            provider: 'claude',
            model: MODELS.sonnet,
            reason: 'Sonnet (Gemini not configured)',
          };
        }
        return {
          provider: 'claude',
          model: MODELS.sonnet,
          reason: `Sonnet for low-confidence RAG (confidence: ${((context.ragConfidence ?? 0) * 100).toFixed(0)}%)`,
        };
      }
      // No RAG context (fallback) - use higher quality Sonnet
      return {
        provider: 'claude',
        model: MODELS.sonnet,
        reason: 'Sonnet for AI fallback (no RAG sources)',
      };

    case 'chat':
      // Chat uses Gemini when RAG context available, otherwise Sonnet
      if (context.hasRagContext && geminiAvailable) {
        return {
          provider: 'gemini',
          model: MODELS.geminiFlash,
          reason: 'Gemini for RAG-backed chat',
        };
      }
      return {
        provider: 'claude',
        model: MODELS.sonnet,
        reason: 'Sonnet for general chat',
      };

    case 'general':
    default:
      // Default to Sonnet for general tasks
      return {
        provider: 'claude',
        model: MODELS.sonnet,
        reason: 'Sonnet for general tasks',
      };
  }
}

/**
 * Generate text using the appropriate model based on context
 *
 * @param messages - Conversation history
 * @param systemPrompt - System instructions
 * @param context - Routing context
 * @param options - Generation options
 * @returns Generation result with provider info
 */
export async function generate(
  messages: RouterMessage[],
  systemPrompt: string,
  context: RoutingContext,
  options: RouterGenerationOptions = {}
): Promise<RouterGenerationResult> {
  const { provider, model, reason } = selectModel(context);

  console.log(`[Router] Selected ${provider}/${model}: ${reason}`);

  const genOptions = {
    ...options,
    model,
  };

  if (provider === 'gemini') {
    const result = await geminiGenerate(messages, systemPrompt, genOptions);
    const cost = geminiCost(result.usage.inputTokens, result.usage.outputTokens, model);

    return {
      ...result,
      provider,
      estimatedCost: cost,
      routingReason: reason,
    };
  }

  // Claude
  const result = await claudeGenerate(messages, systemPrompt, genOptions);
  const cost = claudeCost(result.usage.inputTokens, result.usage.outputTokens, model);

  return {
    ...result,
    provider,
    estimatedCost: cost,
    routingReason: reason,
  };
}

/**
 * Estimate cost for a generation based on routing context
 *
 * @param inputTokens - Estimated input tokens
 * @param outputTokens - Estimated output tokens
 * @param context - Routing context
 * @returns Estimated cost in USD
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  context: RoutingContext
): { cost: number; provider: ModelProvider; model: string } {
  const { provider, model } = selectModel(context);

  const cost = provider === 'gemini'
    ? geminiCost(inputTokens, outputTokens, model)
    : claudeCost(inputTokens, outputTokens, model);

  return { cost, provider, model };
}

/**
 * Get configuration status for all providers
 */
export function getProviderStatus(): {
  claude: { configured: boolean; models: string[] };
  gemini: { configured: boolean; models: string[] };
} {
  return {
    claude: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      models: [MODELS.sonnet, MODELS.haiku],
    },
    gemini: {
      configured: geminiConfigured(),
      models: [MODELS.geminiFlash, MODELS.geminiFlashLite],
    },
  };
}

/**
 * Get all available models
 */
export function getAvailableModels() {
  return MODELS;
}
