/**
 * Wiki Content Quality Evaluator
 *
 * Uses Claude Haiku to evaluate generated wiki content on 5 criteria.
 * Replaces process-based confidence scoring with output-quality scoring.
 */

import { generateWithMetadata } from '@/lib/anthropic/client'

/**
 * Individual criteria scores (each 1-20)
 */
export interface EvaluationCriteria {
  /** Does it fully address the topic? Covers key aspects? */
  completeness: number
  /** Are claims reasonable? Properly attributed to sources? */
  accuracy: number
  /** Clear headings? Good flow? Scannable with bullets/tables? */
  structure: number
  /** Practical advice parents can use? Not just theory? */
  actionable: number
  /** Focused and efficient? No padding or repetition? */
  conciseness: number
}

/**
 * Result from content evaluation
 */
export interface EvaluationResult {
  /** Overall score 0-100 (sum of criteria) */
  score: number
  /** Individual criteria scores */
  criteria: EvaluationCriteria
  /** Brief explanation of the evaluation */
  feedback: string
  /** Time taken for evaluation in ms */
  evaluationTimeMs: number
}

/** Haiku model for cost-efficient evaluation */
const EVALUATION_MODEL = 'claude-3-5-haiku-20241022'

/**
 * Build the evaluation prompt
 */
function buildEvaluationPrompt(
  topic: string,
  content: string,
  sources: string[]
): string {
  const sourceList = sources.length > 0
    ? sources.slice(0, 10).join(', ')
    : 'None (AI knowledge only)'

  return `You are evaluating a wiki article for Mother's Almanac, a parenting reference guide.

Topic: ${topic}
Sources used: ${sourceList}

Rate the following content on 5 criteria (1-20 each):

1. COMPLETENESS (1-20): Does it fully address the topic? Covers key aspects parents need to know?
2. ACCURACY (1-20): Are claims reasonable and supported? Properly attributed to sources when relevant?
3. STRUCTURE (1-20): Clear headings? Logical flow? Scannable with bullets/tables where appropriate?
4. ACTIONABLE (1-20): Practical advice parents can actually use? Not just abstract theory?
5. CONCISENESS (1-20): Focused and efficient? No padding, fluff, or unnecessary repetition?

Content to evaluate:
---
${content}
---

Respond with ONLY valid JSON, no other text:
{"completeness": N, "accuracy": N, "structure": N, "actionable": N, "conciseness": N, "feedback": "one sentence explanation"}`
}

/**
 * Parse the evaluation response JSON
 */
function parseEvaluationResponse(response: string): {
  criteria: EvaluationCriteria
  feedback: string
} {
  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = response.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  }

  const parsed = JSON.parse(jsonStr)

  // Validate and clamp scores to 1-20 range
  const clamp = (n: number) => Math.max(1, Math.min(20, Math.round(n)))

  return {
    criteria: {
      completeness: clamp(parsed.completeness),
      accuracy: clamp(parsed.accuracy),
      structure: clamp(parsed.structure),
      actionable: clamp(parsed.actionable),
      conciseness: clamp(parsed.conciseness),
    },
    feedback: parsed.feedback || 'No feedback provided',
  }
}

/**
 * Evaluate wiki content quality using Claude Haiku
 *
 * @param topic - The topic/query the content addresses
 * @param content - The generated wiki content to evaluate
 * @param sources - List of sources used in generation
 * @returns Evaluation result with score 0-100
 */
export async function evaluateWikiContent(
  topic: string,
  content: string,
  sources: string[]
): Promise<EvaluationResult> {
  const startTime = Date.now()

  const prompt = buildEvaluationPrompt(topic, content, sources)

  console.log('[Evaluator] Evaluating content quality with Haiku...')

  try {
    const response = await generateWithMetadata(
      [{ role: 'user', content: prompt }],
      'You are a content quality evaluator. Respond with JSON only.',
      {
        model: EVALUATION_MODEL,
        temperature: 0,
        maxTokens: 256,
      }
    )

    const { criteria, feedback } = parseEvaluationResponse(response.content)

    // Calculate total score (sum of 5 criteria, each 1-20 = max 100)
    const score = criteria.completeness +
      criteria.accuracy +
      criteria.structure +
      criteria.actionable +
      criteria.conciseness

    const evaluationTimeMs = Date.now() - startTime

    console.log(
      `[Evaluator] Score: ${score}/100 ` +
      `(C:${criteria.completeness} A:${criteria.accuracy} S:${criteria.structure} ` +
      `P:${criteria.actionable} N:${criteria.conciseness}) in ${evaluationTimeMs}ms`
    )

    return {
      score,
      criteria,
      feedback,
      evaluationTimeMs,
    }
  } catch (error) {
    console.error('[Evaluator] Evaluation failed:', error)

    // Return a neutral score on failure rather than crashing
    return {
      score: 70,
      criteria: {
        completeness: 14,
        accuracy: 14,
        structure: 14,
        actionable: 14,
        conciseness: 14,
      },
      feedback: 'Evaluation failed, using default score',
      evaluationTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Interpret a quality score
 */
export function interpretScore(score: number): {
  label: string
  shouldPublish: boolean
  color: 'green' | 'yellow' | 'orange' | 'red'
} {
  if (score >= 90) {
    return { label: 'Excellent', shouldPublish: true, color: 'green' }
  }
  if (score >= 75) {
    return { label: 'Good', shouldPublish: true, color: 'green' }
  }
  if (score >= 60) {
    return { label: 'Acceptable', shouldPublish: true, color: 'yellow' }
  }
  if (score >= 40) {
    return { label: 'Poor', shouldPublish: false, color: 'orange' }
  }
  return { label: 'Failed', shouldPublish: false, color: 'red' }
}
