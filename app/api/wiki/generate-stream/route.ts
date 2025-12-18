import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { vectorSearch, type SearchResult } from '@/lib/rag/search'
import { assembleContext } from '@/lib/rag/context'
import { buildWikiPrompt } from '@/lib/wiki/prompts'
import { validateQuery, queryToSlug } from '@/lib/wiki/utils'
import { cachePage } from '@/lib/wiki/cache'
import { extractEntities } from '@/lib/wiki/entities'
import { injectLinks } from '@/lib/wiki/link-injection'
import { extractTitle } from '@/lib/wiki/utils'
import { saveEntityLinksAsStubs, markStubAsGenerated } from '@/lib/wiki/stubs'

/**
 * POST /api/wiki/generate-stream
 * Streams wiki page generation in real-time
 *
 * Body: { slug: string }
 *
 * Streams Server-Sent Events:
 * - { type: 'status', message: string } - Progress updates
 * - { type: 'content', text: string } - Content chunks
 * - { type: 'done', page: object } - Final page data
 * - { type: 'error', message: string } - Errors
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const body = await request.json()
        const { slug } = body

        if (!slug) {
          send({ type: 'error', message: 'Slug is required' })
          controller.close()
          return
        }

        // Validate query
        const validation = validateQuery(slug)
        if (!validation.valid) {
          send({ type: 'error', message: validation.error || 'Invalid query' })
          controller.close()
          return
        }

        const normalizedQuery = validation.normalized!
        send({ type: 'status', message: 'Searching the almanac...' })

        // Step 1: Vector search
        const thresholdsToTry = [0.7, 0.6, 0.5]
        let searchResults: SearchResult[] = []

        for (const threshold of thresholdsToTry) {
          searchResults = await vectorSearch(normalizedQuery, {
            threshold,
            limit: 15,
          })
          if (searchResults.length > 0) break
          // If we're going to retry, let the client know we're widening the net
          if (threshold !== thresholdsToTry[thresholdsToTry.length - 1]) {
            send({ type: 'status', message: 'No strong matches yet — broadening search...' })
          }
        }

        let systemPrompt = ''
        let usedAIFallback = false
        let sources: string[] = []

        if (searchResults.length === 0) {
          send({ type: 'status', message: 'Using AI knowledge...' })
          usedAIFallback = true
          systemPrompt = `You are writing for Mother's Almanac, a quick-reference guide for parents.

Write an almanac entry about: "${normalizedQuery}"

# Guidelines
- Use your general knowledge about parenting and child development
- Be concise and factual—this is a reference, not a blog
- Use British English spelling (colour, behaviour, organise)

# Required Structure
1. **Title + Definition** — # heading, then one-sentence definition
2. **Quick Facts table** — Age, Duration, Prevalence (adapt fields to topic)
3. **Key Information** — 2-3 short sections with ## headings, bullet points preferred
4. **How-To** (if applicable) — Numbered steps
5. **See also** — 3-5 related topics as [[wiki links]]

# Rules
- Target 250-400 words maximum
- No emotional padding ("you're not alone", "this too shall pass")
- Tables for comparisons, bullet points over prose
- End with: *Note: General guidance only. Consult a healthcare provider for specific concerns.*

Write the almanac entry now.`
        } else {
          send({ type: 'status', message: `Found ${searchResults.length} relevant sources...` })

          // Assemble context
          const assembled = assembleContext(searchResults, 8000, normalizedQuery)
          sources = assembled.sources

          send({ type: 'status', message: 'Crafting your article...' })
          systemPrompt = buildWikiPrompt(normalizedQuery, assembled.context)
        }

        // Step 2: Stream from Claude
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        let fullContent = ''
        let inputTokens = 0
        let outputTokens = 0

        const anthropicStream = await client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            { role: 'user', content: `Write an almanac entry about: ${normalizedQuery}` }
          ],
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text
            fullContent += text
            send({ type: 'content', text })
          }
          if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens
          }
          if (event.type === 'message_start' && event.message.usage) {
            inputTokens = event.message.usage.input_tokens
          }
        }

        send({ type: 'status', message: 'Adding finishing touches...' })

        // Step 3: Extract entities and inject links
        let finalContent = fullContent
        let entityLinks: Array<{entity: string, slug: string, confidence: string}> = []

        try {
          const entities = await extractEntities(fullContent)
          if (entities.length > 0) {
            const existingPages = new Set(entities.map(e => e.slug))
            finalContent = await injectLinks(fullContent, entities, existingPages)
            entityLinks = entities.map(e => ({
              entity: e.text,
              slug: e.slug,
              confidence: e.confidence,
            }))
          }
        } catch (err) {
          console.warn('[Stream] Entity extraction failed:', err)
        }

        // Step 4: Build page object
        const title = extractTitle(finalContent, normalizedQuery)
        const excerpt = generateExcerpt(finalContent)
        const confidence = usedAIFallback ? 0.7 : calculateConfidence(searchResults.length, sources.length, finalContent.length)
        const pageSlug = queryToSlug(normalizedQuery)

        const page = {
          slug: pageSlug,
          title,
          content: finalContent,
          excerpt,
          confidence_score: confidence,
          generated_at: new Date().toISOString(),
          ttl_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          published: confidence >= 0.6,
          metadata: {
            sources_used: sources,
            entity_links: entityLinks,
            reading_mode: 'standard',
            query: normalizedQuery,
            chunk_count: searchResults.length,
            generation_time_ms: 0,
            token_usage: {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_cost: estimateCost(inputTokens, outputTokens),
            },
            model: 'claude-sonnet-4-5-20250929',
            search_stats: {
              total_results: searchResults.length,
              avg_similarity: searchResults.length > 0
                ? searchResults.reduce((s, r) => s + r.similarity, 0) / searchResults.length
                : 0,
              min_similarity: searchResults.length > 0 ? Math.min(...searchResults.map(r => r.similarity)) : 0,
              max_similarity: searchResults.length > 0 ? Math.max(...searchResults.map(r => r.similarity)) : 0,
            },
            ai_fallback: usedAIFallback,
            generation_source: usedAIFallback ? 'ai_knowledge' : 'rag_documents',
          },
        }

        // Step 5: Cache the page
        send({ type: 'status', message: 'Saving to almanac...' })
        await cachePage(page)

        // Step 6: Save entity links as stubs for future suggestions
        if (entityLinks.length > 0) {
          try {
            await saveEntityLinksAsStubs(entityLinks, pageSlug)
          } catch (stubErr) {
            console.warn('[Stream] Failed to save stubs:', stubErr)
          }
        }

        // Step 7: Mark this page's stub as generated (if it was a stub)
        try {
          await markStubAsGenerated(pageSlug)
        } catch (stubErr) {
          // Ignore - might not have been a stub
        }

        // Send final page data
        send({ type: 'done', page })
        controller.close()

      } catch (error) {
        console.error('[Stream] Generation error:', error)
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Generation failed'
        })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

function generateExcerpt(content: string): string {
  const plainText = content
    // Remove headings
    .replace(/^#+\s+.+$/gm, '')
    // Remove table rows (lines with |)
    .replace(/^\|.*\|$/gm, '')
    // Remove table separators
    .replace(/^\s*[-|:]+\s*$/gm, '')
    // Remove wiki links [[text]]
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    // Remove bold
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Remove italic
    .replace(/\*(.+?)\*/g, '$1')
    // Remove links but keep text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Collapse multiple newlines
    .replace(/\n{2,}/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Get first 200 chars ending at word boundary
  const excerpt = plainText.substring(0, 200)
  const lastSpace = excerpt.lastIndexOf(' ')
  return lastSpace > 0 ? excerpt.substring(0, lastSpace) + '...' : excerpt + '...'
}

function calculateConfidence(resultCount: number, sourceCount: number, contentLength: number): number {
  const sourceScore = Math.min(sourceCount / 10, 1)
  const lengthScore = Math.min(contentLength / 3000, 1)
  return sourceScore * 0.5 + lengthScore * 0.5
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0
}
