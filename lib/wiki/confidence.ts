/**
 * Confidence scoring utilities for wiki pages
 *
 * Calculates confidence scores based on multiple factors including
 * source count, similarity scores, content quality, and citation usage.
 */

import type { ConfidenceFactors } from './types'

export interface ConfidenceBadge {
  label: string
  color: 'green' | 'blue' | 'yellow' | 'red'
  description: string
}

/**
 * Get confidence badge information based on score
 * @param score - Confidence score between 0 and 1
 * @returns Badge configuration
 */
export function getConfidenceBadge(score: number): ConfidenceBadge {
  if (score >= 0.8) {
    return {
      label: 'High Confidence',
      color: 'green',
      description: 'This information is well-supported by multiple reliable sources.'
    }
  }

  if (score >= 0.6) {
    return {
      label: 'Medium Confidence',
      color: 'blue',
      description: 'This information is supported by sources but may have some gaps.'
    }
  }

  if (score >= 0.4) {
    return {
      label: 'Low Confidence',
      color: 'yellow',
      description: 'This information has limited source support. Use with caution.'
    }
  }

  return {
    label: 'Very Low Confidence',
    color: 'red',
    description: 'This information is speculative or has minimal source support.'
  }
}

/**
 * Calculate confidence score based on multiple factors
 *
 * Uses a weighted scoring system to evaluate the quality and reliability
 * of generated wiki content.
 *
 * @param factors - Individual scoring factors
 * @returns Overall confidence score (0.0 - 1.0)
 */
export function calculateConfidence(factors: ConfidenceFactors): number {
  // Weighted scoring - these add up to 1.0
  const weights = {
    sourceCount: 0.3,      // Having multiple sources is very important
    avgSimilarity: 0.3,    // High similarity means relevant content
    contentLength: 0.15,   // Comprehensive content indicates good coverage
    citationCount: 0.15,   // Citations show sources were actually used
    topicCoverage: 0.1,    // Query terms appearing in content
  }

  // Normalize each factor to 0-1 scale
  const scores = {
    // More sources = higher confidence (diminishing returns after 10)
    sourceCount: Math.min(factors.sourceCount / 10, 1),

    // Already normalized (similarity is 0-1)
    avgSimilarity: factors.avgSimilarity,

    // Longer content = more comprehensive (ideal around 3000 chars)
    contentLength: Math.min(factors.contentLength / 3000, 1),

    // More citations = better sourcing (ideal around 5+)
    citationCount: Math.min(factors.citationCount / 5, 1),

    // Topic coverage already normalized (0-1)
    topicCoverage: factors.topicCoverage,
  }

  // Calculate weighted sum
  const confidence = Object.entries(weights).reduce(
    (total, [key, weight]) => {
      const score = scores[key as keyof typeof scores]
      return total + score * weight
    },
    0
  )

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, confidence))
}

/**
 * Calculate topic coverage score
 *
 * Measures how many of the query terms appear in the generated content,
 * indicating that the content is on-topic.
 *
 * @param query - Original search query/topic
 * @param content - Generated markdown content
 * @returns Coverage score (0.0 - 1.0)
 */
export function calculateTopicCoverage(query: string, content: string): number {
  // Extract meaningful terms from query (filter out common words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2 && !stopWords.has(term))

  if (queryTerms.length === 0) {
    return 1.0 // If no meaningful terms, assume full coverage
  }

  const contentLower = content.toLowerCase()

  // Count how many query terms appear in content
  const matchingTerms = queryTerms.filter(term => contentLower.includes(term))

  return matchingTerms.length / queryTerms.length
}

/**
 * Analyze confidence breakdown
 *
 * Provides detailed breakdown of confidence scoring for debugging
 * and transparency.
 *
 * @param factors - Confidence factors
 * @returns Detailed breakdown with scores and explanations
 */
export function analyzeConfidenceBreakdown(factors: ConfidenceFactors): {
  overall: number
  breakdown: Array<{
    factor: string
    score: number
    weight: number
    contribution: number
    explanation: string
  }>
} {
  const weights = {
    sourceCount: 0.3,
    avgSimilarity: 0.3,
    contentLength: 0.15,
    citationCount: 0.15,
    topicCoverage: 0.1,
  }

  const breakdown = [
    {
      factor: 'Source Count',
      score: Math.min(factors.sourceCount / 10, 1),
      weight: weights.sourceCount,
      contribution: Math.min(factors.sourceCount / 10, 1) * weights.sourceCount,
      explanation: `${factors.sourceCount} sources found (ideal: 10+)`,
    },
    {
      factor: 'Average Similarity',
      score: factors.avgSimilarity,
      weight: weights.avgSimilarity,
      contribution: factors.avgSimilarity * weights.avgSimilarity,
      explanation: `${(factors.avgSimilarity * 100).toFixed(1)}% average similarity`,
    },
    {
      factor: 'Content Length',
      score: Math.min(factors.contentLength / 3000, 1),
      weight: weights.contentLength,
      contribution: Math.min(factors.contentLength / 3000, 1) * weights.contentLength,
      explanation: `${factors.contentLength} characters (ideal: 3000+)`,
    },
    {
      factor: 'Citation Count',
      score: Math.min(factors.citationCount / 5, 1),
      weight: weights.citationCount,
      contribution: Math.min(factors.citationCount / 5, 1) * weights.citationCount,
      explanation: `${factors.citationCount} citations used (ideal: 5+)`,
    },
    {
      factor: 'Topic Coverage',
      score: factors.topicCoverage,
      weight: weights.topicCoverage,
      contribution: factors.topicCoverage * weights.topicCoverage,
      explanation: `${(factors.topicCoverage * 100).toFixed(1)}% of query terms covered`,
    },
  ]

  const overall = breakdown.reduce((sum, item) => sum + item.contribution, 0)

  return {
    overall: Math.max(0, Math.min(1, overall)),
    breakdown,
  }
}

/**
 * Get quality tier based on confidence score
 *
 * @param score - Confidence score (0-1)
 * @returns Quality tier name
 */
export function getQualityTier(score: number): string {
  if (score >= 0.8) return 'excellent'
  if (score >= 0.6) return 'good'
  if (score >= 0.4) return 'fair'
  return 'poor'
}

/**
 * Check if confidence is sufficient for publishing
 *
 * @param score - Confidence score (0-1)
 * @param threshold - Minimum acceptable score (default: 0.6)
 * @returns Whether the content should be published
 */
export function isPublishable(score: number, threshold: number = 0.6): boolean {
  return score >= threshold
}

/**
 * Get recommendations for improving confidence
 *
 * @param factors - Current confidence factors
 * @returns Array of improvement suggestions
 */
export function getImprovementRecommendations(factors: ConfidenceFactors): string[] {
  const recommendations: string[] = []

  if (factors.sourceCount < 5) {
    recommendations.push('Add more source documents to the knowledge base')
  }

  if (factors.avgSimilarity < 0.7) {
    recommendations.push('Improve search query or add more relevant content to knowledge base')
  }

  if (factors.contentLength < 1500) {
    recommendations.push('Generated content is too brief - adjust prompt or context')
  }

  if (factors.citationCount < 3) {
    recommendations.push('Encourage more source citations in the prompt')
  }

  if (factors.topicCoverage < 0.8) {
    recommendations.push('Content may be off-topic - refine search query or context')
  }

  return recommendations
}
