/**
 * Claude integration for wiki page generation
 *
 * Handles all interactions with Anthropic's Claude API for generating
 * wiki content from RAG context.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ClaudePageRequest, ClaudePageResponse } from './types'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Model configuration
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4000', 10)

/**
 * System prompt for Mother's Almanac wiki generation
 * Sets the tone, style, and expectations for generated content
 */
const WIKI_SYSTEM_PROMPT = `You are Mother's Almanac, a warm, trustworthy, and knowledgeable guide for parents and caregivers.

Your role is to create comprehensive, helpful wiki pages that combine evidence-based information with practical wisdom. Think of yourself as a wise grandmother who stays current with modern research.

TONE AND STYLE:
- Warm and conversational, yet authoritative
- Reassuring but honest about uncertainties
- Practical and actionable
- Respectful of diverse parenting approaches
- Empathetic to parental concerns and anxieties

CONTENT GUIDELINES:
- Start with a clear, accessible introduction
- Organize information with clear headings (use ## for sections)
- Include practical, actionable advice
- Cite sources inline using [1], [2], etc.
- Use bullet points for lists
- Add a "Key Takeaways" section at the end
- If information is limited or uncertain, acknowledge it honestly
- Avoid medical diagnoses - encourage consulting healthcare providers when appropriate

FORMAT:
- Return only markdown content (no JSON wrapper)
- Use ## for section headings (not #)
- Keep paragraphs concise and scannable
- Use emphasis (*italic*) for important terms on first mention
- Use strong (**bold**) sparingly for critical warnings or key points

CITATIONS:
- Cite sources inline like this: "Studies show that..." [1]
- Use the numbered citations provided in the context
- Don't fabricate citations

Remember: Parents are often tired, worried, and seeking quick answers. Make information accessible, actionable, and reassuring without being dismissive of concerns.`

/**
 * Generate user prompt for a specific topic
 *
 * @param topic - The wiki page topic
 * @param context - RAG context from knowledge base
 * @param sources - Source references for citations
 * @returns Formatted prompt string
 */
function generatePrompt(
  topic: string,
  context: string,
  sources: Array<{ index: number; title: string; author?: string; excerpt: string }>
): string {
  const sourcesText = sources
    .map(s => {
      const authorText = s.author ? ` by ${s.author}` : ''
      return `[${s.index}] ${s.title}${authorText}\n${s.excerpt}`
    })
    .join('\n\n')

  return `Create a comprehensive wiki page about "${topic}" for Mother's Almanac.

Context from our knowledge base:
<context>
${context}
</context>

Available sources for citation:
<sources>
${sourcesText}
</sources>

Requirements:
1. Write a complete wiki page with introduction and clear sections
2. Structure with ## headings for main sections
3. Include practical, actionable advice based on the context
4. Cite sources inline using [1], [2], etc. when referencing information
5. Use bullet points for lists and tips
6. Add a "Key Takeaways" section at the end with 3-5 bullet points
7. If the context lacks sufficient information on certain aspects, acknowledge this honestly
8. Keep the tone warm and supportive, like advice from a knowledgeable friend

Write the wiki page now as markdown:`
}

/**
 * Generate wiki page content using Claude
 *
 * @param request - Page generation request with topic, context, and sources
 * @returns Generated page response with title, content, and metadata
 */
export async function generatePageWithClaude(
  request: ClaudePageRequest
): Promise<ClaudePageResponse> {
  const { topic, context, sources } = request

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      temperature: 0.7,
      system: WIKI_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: generatePrompt(topic, context, sources),
        },
      ],
    })

    // Extract content from response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const markdown = content.text

    // Parse response to extract metadata
    const title = extractTitle(markdown) || topic
    const sections = extractSections(markdown)
    const citations = countCitations(markdown)

    return {
      title,
      content: markdown,
      sections,
      citations,
    }
  } catch (error) {
    console.error('Claude API error:', error)
    throw new Error(`Failed to generate page with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract page title from markdown
 * Looks for first # heading
 *
 * @param markdown - Markdown content
 * @returns Extracted title or null
 */
function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * Extract section headings from markdown
 *
 * @param markdown - Markdown content
 * @returns Array of section titles
 */
function extractSections(markdown: string): string[] {
  const headingMatches = markdown.matchAll(/^##\s+(.+)$/gm)
  return Array.from(headingMatches).map(match => match[1].trim())
}

/**
 * Count citations in markdown
 * Looks for [1], [2], etc.
 *
 * @param markdown - Markdown content
 * @returns Number of unique citations
 */
function countCitations(markdown: string): number {
  const citations = new Set<number>()
  const matches = markdown.matchAll(/\[(\d+)\]/g)

  for (const match of matches) {
    citations.add(parseInt(match[1], 10))
  }

  return citations.size
}

/**
 * Estimate token usage for a generation request
 * Used for cost tracking
 *
 * @param context - Context text
 * @param topic - Topic text
 * @returns Estimated input and output tokens
 */
export function estimateClaudeTokens(context: string, topic: string): {
  input: number
  output: number
} {
  // Rough estimation: 3.5 chars per token
  const systemTokens = Math.ceil(WIKI_SYSTEM_PROMPT.length / 3.5)
  const contextTokens = Math.ceil(context.length / 3.5)
  const topicTokens = Math.ceil(topic.length / 3.5)
  const promptOverhead = 200 // Fixed overhead for prompt structure

  const input = systemTokens + contextTokens + topicTokens + promptOverhead
  const output = CLAUDE_MAX_TOKENS

  return { input, output }
}

/**
 * Calculate cost for Claude API call
 * Based on current pricing for Claude 3.5 Sonnet
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateClaudeCost(inputTokens: number, outputTokens: number): number {
  // Claude 3.5 Sonnet pricing (as of Dec 2024)
  const INPUT_COST_PER_1K = 0.003   // $3 per million tokens
  const OUTPUT_COST_PER_1K = 0.015  // $15 per million tokens

  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K

  return inputCost + outputCost
}

/**
 * Test Claude connection
 * Useful for debugging and setup verification
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Reply with just "OK" if you can hear me.',
        },
      ],
    })

    return response.content[0].type === 'text'
  } catch (error) {
    console.error('Claude connection test failed:', error)
    return false
  }
}
