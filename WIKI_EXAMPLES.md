# Mother's Almanac - Wiki System Usage Examples

## Table of Contents
1. [Basic Usage](#basic-usage)
2. [URL Patterns](#url-patterns)
3. [Programmatic Access](#programmatic-access)
4. [Cache Management](#cache-management)
5. [Search Integration](#search-integration)
6. [Admin Operations](#admin-operations)

---

## Basic Usage

### Accessing Wiki Pages

Simply visit any topic URL. The system will:
1. Check if page exists in cache
2. Generate page if needed using RAG
3. Display the page with sources

```
http://localhost:3000/wiki/swaddling-techniques
http://localhost:3000/wiki/pregnancy-nutrition
http://localhost:3000/wiki/teething-symptoms
```

### Multi-Level Topics

The system supports hierarchical topics:

```
http://localhost:3000/wiki/newborn/care
http://localhost:3000/wiki/pregnancy/trimester-1/nutrition
http://localhost:3000/wiki/toddler/development/speech
```

---

## URL Patterns

### Slug Conversion Rules

| User Input | Generated Slug | Page Title |
|------------|---------------|------------|
| "Pregnancy Nutrition" | `pregnancy-nutrition` | "Pregnancy Nutrition" |
| "How to Swaddle?" | `how-to-swaddle` | "How To Swaddle" |
| "Teething & Symptoms" | `teething-symptoms` | "Teething Symptoms" |
| "Multiple   Spaces" | `multiple-spaces` | "Multiple Spaces" |

### Valid Slug Examples

```
✓ pregnancy-nutrition
✓ newborn/sleep/basics
✓ teething-remedies-for-babies
✓ first-trimester-diet

✗ ../etc/passwd (path traversal rejected)
✗ <script>alert(1)</script> (XSS rejected)
✗ pregnancy/../admin (normalized safely)
```

---

## Programmatic Access

### Generate a Single Page

```typescript
import { generateWikiPage } from '@/lib/wiki/generator'
import { cachePage } from '@/lib/wiki/cache'

async function createPage(topic: string) {
  // Generate page using RAG
  const page = await generateWikiPage(topic, {
    maxContextTokens: 6000,
    similarityThreshold: 0.6,
    maxSources: 10,
    temperature: 0.7,
    ttlHours: 48,
  })

  // Cache the generated page
  await cachePage(page)

  console.log('Page created:', page.title)
  console.log('Confidence:', page.confidence_score)
  console.log('Slug:', page.slug)

  return page
}

// Example usage
await createPage('swaddling techniques')
```

### Retrieve from Cache

```typescript
import { getCachedPage, isStale } from '@/lib/wiki/cache'

async function getPage(slug: string) {
  const page = await getCachedPage(slug)

  if (!page) {
    console.log('Page not in cache')
    return null
  }

  if (isStale(page)) {
    console.log('Page is stale, should regenerate')
  }

  console.log('Page title:', page.title)
  console.log('Views:', page.view_count)
  console.log('Generated:', page.generated_at)

  return page
}

// Example usage
const page = await getPage('swaddling-techniques')
```

### Batch Generation

```typescript
import { batchGeneratePages } from '@/lib/wiki/generator'

async function warmCache() {
  const popularTopics = [
    'pregnancy nutrition',
    'teething symptoms',
    'sleep training',
    'newborn care',
    'breastfeeding tips',
    'baby-led weaning',
    'postpartum recovery',
    'colic remedies',
  ]

  const pages = await batchGeneratePages(popularTopics, {
    ttlHours: 72, // Longer TTL for popular pages
  })

  console.log(`Generated ${pages.length} pages`)

  return pages
}

// Example usage
await warmCache()
```

---

## Cache Management

### Check Cache Statistics

```typescript
import { getCacheStats } from '@/lib/wiki/cache'

async function showCacheStats() {
  const stats = await getCacheStats()

  console.log('Cache Statistics:')
  console.log('- Total pages:', stats.total_pages)
  console.log('- Stale pages:', stats.stale_pages)
  console.log('- Total views:', stats.total_views)
  console.log('- Avg confidence:', (stats.avg_confidence * 100).toFixed(1) + '%')

  return stats
}
```

### Get Stale Pages for Regeneration

```typescript
import { getStalePages } from '@/lib/wiki/cache'
import { regenerateWikiPage } from '@/lib/wiki/generator'

async function regenerateStalePages() {
  // Get top 20 stale pages by popularity
  const stalePages = await getStalePages(20)

  console.log(`Found ${stalePages.length} stale pages`)

  for (const page of stalePages) {
    console.log(`Regenerating: ${page.title}`)

    try {
      const newPage = await regenerateWikiPage(page.slug)
      await cachePage(newPage)
      console.log(`✓ Regenerated: ${page.title}`)
    } catch (error) {
      console.error(`✗ Failed: ${page.title}`, error)
    }

    // Delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000))
  }
}
```

### Invalidate Specific Page

```typescript
import { invalidateCache } from '@/lib/wiki/cache'

async function invalidatePage(slug: string) {
  await invalidateCache(slug)
  console.log(`Invalidated cache for: ${slug}`)

  // Next visit will regenerate the page
}

// Example: Invalidate after updating source documents
await invalidatePage('teething-symptoms')
```

### Get Popular Pages

```typescript
import { getPopularPages } from '@/lib/wiki/cache'

async function showPopularPages() {
  const pages = await getPopularPages(10)

  console.log('Top 10 Pages:')
  pages.forEach((page, index) => {
    console.log(`${index + 1}. ${page.title} (${page.view_count} views)`)
  })

  return pages
}
```

---

## Search Integration

### Vector Search

```typescript
import { vectorSearch } from '@/lib/rag/search'

async function search(query: string) {
  const results = await vectorSearch(query, {
    threshold: 0.7,    // Minimum similarity
    limit: 10,         // Max results
  })

  console.log(`Found ${results.length} results for: ${query}`)

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.document_title}`)
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`)
    console.log(`   Preview: ${result.content.substring(0, 100)}...`)
  })

  return results
}

// Example usage
await search('teething symptoms in babies')
```

### Validate Query Before Generation

```typescript
import { validateQuery } from '@/lib/wiki/generator'

async function checkTopic(query: string) {
  const isValid = await validateQuery(query)

  if (isValid) {
    console.log(`✓ "${query}" has relevant content`)
    // Proceed with generation
  } else {
    console.log(`✗ "${query}" has insufficient content`)
    // Show "no information" message
  }

  return isValid
}

// Example usage
await checkTopic('quantum physics') // false
await checkTopic('swaddling') // true
```

### Search Cached Pages

```typescript
import { searchCachedPages } from '@/lib/wiki/cache'

async function searchPages(query: string) {
  const pages = await searchCachedPages(query, 10)

  console.log(`Found ${pages.length} cached pages matching: ${query}`)

  pages.forEach(page => {
    console.log(`- ${page.title} (${page.view_count} views)`)
  })

  return pages
}

// Example usage
await searchPages('nutrition')
```

---

## Admin Operations

### API Route: Search

```typescript
// POST /api/wiki/search
const response = await fetch('/api/wiki/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'teething symptoms',
    limit: 10,
  }),
})

const data = await response.json()
// Returns: { results: SearchResult[], count: number }
```

### API Route: Regenerate

```typescript
// POST /api/wiki/regenerate
const response = await fetch('/api/wiki/regenerate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slug: 'teething-symptoms',
    force: true,
  }),
})

const data = await response.json()
// Returns: { success: boolean, page: WikiPage }
```

### API Route: Cache Stats

```typescript
// GET /api/wiki/stats
const response = await fetch('/api/wiki/stats')
const stats = await response.json()

console.log('Total pages:', stats.total_pages)
console.log('Stale pages:', stats.stale_pages)
console.log('Total views:', stats.total_views)
```

---

## Advanced Examples

### Custom Topic-Specific Generation

```typescript
import { generateWikiPage } from '@/lib/wiki/generator'
import { classifyTopic } from '@/lib/wiki/prompts'

async function generateMedicalTopic(topic: string) {
  const topicType = classifyTopic(topic)

  if (topicType === 'medical') {
    // Use stricter settings for medical topics
    const page = await generateWikiPage(topic, {
      similarityThreshold: 0.75,  // Higher threshold
      maxSources: 15,              // More sources
      temperature: 0.5,            // More conservative
    })

    // Ensure it has required sections
    if (!page.content.includes('When to Call the Doctor')) {
      throw new Error('Medical topic missing critical section')
    }

    return page
  }

  // Normal generation for other topics
  return await generateWikiPage(topic)
}

// Example usage
await generateMedicalTopic('fever in infants')
```

### Monitor Generation Metrics

```typescript
import { generateWikiPage } from '@/lib/wiki/generator'

async function generateWithMetrics(topic: string) {
  const startTime = Date.now()

  const page = await generateWikiPage(topic)

  const metrics = {
    duration: Date.now() - startTime,
    confidence: page.confidence_score,
    sources: page.metadata.sources_used?.length || 0,
    tokens: page.metadata.token_usage?.input + page.metadata.token_usage?.output,
    cost: page.metadata.token_usage?.cost || 0,
    sections: page.metadata.sections?.length || 0,
    citations: page.metadata.citations_count || 0,
  }

  console.log('Generation Metrics:', metrics)

  // Log to analytics
  await logMetrics(topic, metrics)

  return { page, metrics }
}
```

### Pre-Generate Related Pages

```typescript
import { generateWikiPage } from '@/lib/wiki/generator'
import { cachePage } from '@/lib/wiki/cache'

async function generateRelatedPages(mainTopic: string, relatedTopics: string[]) {
  // Generate main page first
  const mainPage = await generateWikiPage(mainTopic)
  await cachePage(mainPage)

  console.log(`Main page: ${mainPage.title}`)

  // Generate related pages in parallel
  const relatedPages = await Promise.all(
    relatedTopics.map(async (topic) => {
      try {
        const page = await generateWikiPage(topic)
        await cachePage(page)
        return page
      } catch (error) {
        console.error(`Failed to generate: ${topic}`, error)
        return null
      }
    })
  )

  const successful = relatedPages.filter(p => p !== null)
  console.log(`Generated ${successful.length}/${relatedTopics.length} related pages`)

  return { mainPage, relatedPages: successful }
}

// Example usage
await generateRelatedPages('pregnancy', [
  'first trimester',
  'second trimester',
  'third trimester',
  'pregnancy nutrition',
  'pregnancy exercise',
])
```

---

## Best Practices

### 1. Cache Warming Strategy

```typescript
// Warm cache for popular topics during low-traffic periods
async function warmCacheDaily() {
  const popularTopics = await getPopularTopics()
  const staleTopics = popularTopics.filter(t => isStale(t))

  for (const topic of staleTopics) {
    await regenerateWikiPage(topic.slug)
    await delay(2000) // Rate limiting
  }
}
```

### 2. Error Handling

```typescript
async function safeGeneration(topic: string) {
  try {
    // Validate first
    const isValid = await validateQuery(topic)
    if (!isValid) {
      return { error: 'Insufficient knowledge', topic }
    }

    // Generate page
    const page = await generateWikiPage(topic)

    // Check confidence
    if (page.confidence_score < 0.4) {
      console.warn(`Low confidence for: ${topic}`)
    }

    return { page }
  } catch (error) {
    console.error(`Generation failed for ${topic}:`, error)
    return { error: error.message, topic }
  }
}
```

### 3. Progressive Enhancement

```typescript
// Serve stale pages while regenerating in background
async function getPageOrRegenerate(slug: string) {
  const cached = await getCachedPage(slug)

  if (cached && !isStale(cached)) {
    // Fresh cache hit - serve immediately
    return cached
  }

  if (cached && isStale(cached)) {
    // Serve stale page
    console.log('Serving stale page, regenerating in background')

    // Regenerate in background (don't await)
    regenerateWikiPage(slug)
      .then(newPage => cachePage(newPage))
      .catch(err => console.error('Background regen failed:', err))

    return cached
  }

  // No cache - generate now
  const newPage = await generateWikiPage(slug)
  await cachePage(newPage)
  return newPage
}
```

---

## Testing Checklist

- [ ] Visit `/wiki/swaddling-techniques` - should generate new page
- [ ] Refresh same URL - should serve from cache (instant)
- [ ] Check console for cache HIT/MISS logs
- [ ] Try multi-level slug: `/wiki/newborn/sleep`
- [ ] Test invalid topic: `/wiki/quantum-physics` - should show 404
- [ ] Check source attribution at bottom of page
- [ ] Verify reading time calculation
- [ ] Test breadcrumb navigation
- [ ] Check confidence badge display
- [ ] Verify view count increments

## Performance Targets

- Cache hit: < 100ms
- Cache miss: 4-6 seconds
- Cache hit rate: > 80%
- Confidence score: > 0.6
- Cost per page: < $0.05
- Sources per page: 5-15

---

For more details, see [WIKI_SYSTEM_COMPLETE.md](./WIKI_SYSTEM_COMPLETE.md)
