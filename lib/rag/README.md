# Mother's Almanac RAG System

Complete vector search infrastructure for Retrieval-Augmented Generation (RAG).

## Overview

This RAG system enables semantic search across parenting knowledge documents (books, articles, manuals) to provide context for LLM-generated responses and wiki pages.

## Architecture

```
┌─────────────┐
│   Query     │
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       v                                      v
┌─────────────┐                      ┌──────────────┐
│  Embedding  │                      │    Cache     │
│  (OpenAI)   │                      │   (Memory)   │
└──────┬──────┘                      └──────┬───────┘
       │                                     │
       v                                     │
┌─────────────┐                             │
│   Vector    │                             │
│   Search    │<────────────────────────────┘
│ (Supabase)  │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Deduplicate│
│  & Rank     │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Assemble   │
│  Context    │
└──────┬──────┘
       │
       v
┌─────────────┐
│   LLM       │
│  (Claude)   │
└─────────────┘
```

## Components

### Core Libraries

#### `search.ts`
Vector and hybrid search functions.

```typescript
import { vectorSearch, hybridSearch, smartSearch } from '@/lib/rag/search'

// Simple vector search
const results = await vectorSearch('gentle parenting techniques', {
  threshold: 0.7,
  limit: 10
})

// Hybrid search (vector + keyword)
const results = await hybridSearch('Ferber method', {
  threshold: 0.7,
  limit: 10
})

// Smart search (auto-selects strategy)
const results = await smartSearch(userQuery)
```

#### `context.ts`
Context assembly and deduplication.

```typescript
import { assembleContext, formatContextForPrompt } from '@/lib/rag/context'

// Assemble context from search results
const { context, sources, tokensUsed } = assembleContext(
  searchResults,
  6000, // max tokens
  query
)

// Format for LLM prompt
const promptContext = formatContextForPrompt(context, sources)
```

#### `tokens.ts`
Token estimation and management.

```typescript
import { estimateTokens, truncateToTokens } from '@/lib/rag/tokens'

// Estimate tokens
const count = estimateTokens(text) // ~285 tokens

// Truncate to fit
const truncated = truncateToTokens(longText, 1000)
```

#### `cache.ts`
In-memory search result caching.

```typescript
import { cachedSearch } from '@/lib/rag/cache'

// Automatically caches for 5 minutes
const results = await cachedSearch(vectorSearch, query, options)

// Cache hit rate
import { getCacheHitRate, getCacheStats } from '@/lib/rag/cache'
console.log('Hit rate:', getCacheHitRate())
```

### Analytics

#### `lib/analytics/search.ts`
Search performance and quality tracking.

```typescript
import { logSearch, getSearchAnalytics } from '@/lib/analytics/search'

// Log a search
await logSearch(query, results, userId, executionTimeMs)

// Get analytics
const analytics = await getSearchAnalytics(30) // last 30 days
console.log('Top queries:', analytics.topQueries)
console.log('Avg similarity:', analytics.avgSimilarity)
console.log('No result queries:', analytics.noResultQueries)
```

### Database Schema

#### Tables

**`documents`**
- Stores source documents (books, articles, etc.)
- Tracks processing status and chunk count
- Supports multiple source types

**`chunks`**
- Text chunks with embeddings (vector(1536))
- Links to parent document
- Contains metadata (page numbers, sections, etc.)

**`search_analytics`**
- Logs all searches with performance metrics
- Tracks result quality and user queries

#### RPC Functions

**`match_chunks_with_metadata`**
```sql
SELECT * FROM match_chunks_with_metadata(
  query_embedding := embedding_vector,
  match_threshold := 0.7,
  match_count := 10,
  filter_document_ids := ARRAY['uuid1', 'uuid2'],
  filter_source_types := ARRAY['book', 'article']
)
```

**`hybrid_search`**
```sql
SELECT * FROM hybrid_search(
  query_text := 'Ferber method',
  query_embedding := embedding_vector,
  match_threshold := 0.7,
  match_count := 10
)
```

**`get_document_coverage`**
```sql
SELECT * FROM get_document_coverage(
  chunk_ids := ARRAY['uuid1', 'uuid2', ...]
)
```

## Usage Examples

### 1. Simple Search for Chat

```typescript
import { vectorSearch } from '@/lib/rag/search'
import { getRelevantContext } from '@/lib/rag/context'

// Get relevant chunks
const results = await vectorSearch(userQuestion, {
  threshold: 0.7,
  limit: 10
})

// Get formatted context for Claude
const context = getRelevantContext(userQuestion, results, 6000)

// Use in prompt
const response = await claude.messages.create({
  messages: [{
    role: 'user',
    content: `${context}\n\nQuestion: ${userQuestion}`
  }]
})
```

### 2. Wiki Page Generation

```typescript
import { vectorSearch } from '@/lib/rag/search'
import { assembleContext, selectDiverseChunks } from '@/lib/rag/context'

// Get comprehensive coverage
const results = await vectorSearch(topic, {
  threshold: 0.75,
  limit: 15
})

// Select diverse chunks across documents
const diverse = selectDiverseChunks(results, 10)

// Assemble context
const { context, sources } = assembleContext(diverse, 8000, topic)

// Generate wiki
const wiki = await generateWikiPage(topic, context, sources)
```

### 3. Research Mode (High Recall)

```typescript
import { hybridSearch } from '@/lib/rag/search'
import { groupChunksByDocument } from '@/lib/rag/context'

// Cast wide net
const results = await hybridSearch(researchQuery, {
  threshold: 0.5,
  limit: 30
})

// Group by source document
const byDocument = groupChunksByDocument(results)

// Present organized results
for (const [docId, chunks] of byDocument) {
  console.log(`${chunks[0].document_title}:`)
  console.log(`  - ${chunks.length} relevant passages found`)
}
```

### 4. Testing Search Quality

```typescript
// Use the admin API
const response = await fetch('/api/admin/search/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'sleep training methods',
    strategies: ['vector', 'hybrid', 'smart'],
    includeContext: true
  })
})

const { results } = await response.json()

console.log('Vector:', results.vector.quality)
console.log('Hybrid:', results.hybrid.quality)
console.log('Smart:', results.smart.quality)
```

## Performance

### Targets

- **Search latency (p95):** < 200ms
- **Result relevance:** > 0.75 avg similarity
- **Context assembly:** < 50ms
- **Cache hit rate:** > 40% for repeat queries

### Optimization Tips

1. **Use caching:** 80-95% latency reduction for repeated queries
2. **Limit results:** Don't fetch more than you need (10-15 is usually enough)
3. **Filter at DB level:** Use `documentIds` and `sourceTypes` filters
4. **Tune index:** Adjust IVFFlat lists parameter based on dataset size
5. **Monitor analytics:** Track quality trends and adjust thresholds

See [SEARCH_TUNING.md](../../docs/SEARCH_TUNING.md) for detailed optimization guide.

## Testing

### Test API Endpoint

```
POST /api/admin/search/test
GET  /api/admin/search/test
```

Admin-only endpoint for testing search strategies and quality.

### Example Test Queries

```typescript
// Good for vector search
"What is attachment parenting?"
"How to handle toddler tantrums?"

// Good for hybrid search
"Ferber method"
"Dr. Sears co-sleeping advice"

// Edge cases
"" // Empty query
"a" // Single character
"supercalifragilisticexpialidocious" // No results
```

## Monitoring

### Key Metrics

```typescript
import {
  getSearchAnalytics,
  getSearchPerformance,
  getSearchQuality
} from '@/lib/analytics/search'

// Usage patterns
const analytics = await getSearchAnalytics(30)
console.log('Top queries:', analytics.topQueries)
console.log('No results:', analytics.noResultQueries)

// Performance
const perf = await getSearchPerformance(7)
console.log('p95 latency:', perf.p95, 'ms')

// Quality
const quality = await getSearchQuality(7)
console.log('Avg similarity:', quality.avgSimilarity)
console.log('Low quality rate:', quality.lowQualityRate, '%')
```

### Cache Statistics

```typescript
import { getCacheStats, getCacheHitRate } from '@/lib/rag/cache'

const stats = getCacheStats()
console.log('Cache size:', stats.size)
console.log('Hit rate:', getCacheHitRate())
console.log('Top cached queries:', stats.entries.slice(0, 5))
```

## Troubleshooting

### No Results or Low Similarity

**Try:**
1. Lower threshold: `{ threshold: 0.5 }`
2. Use hybrid search: `await hybridSearch(query)`
3. Check if documents exist and are processed

### Slow Performance

**Try:**
1. Enable caching: `cachedSearch(vectorSearch, query)`
2. Reduce limit: `{ limit: 10 }`
3. Verify indexes exist (see migration SQL)

### Irrelevant Results

**Try:**
1. Raise threshold: `{ threshold: 0.8 }`
2. Filter by source: `{ sourceTypes: ['book'] }`
3. Make query more specific

See full troubleshooting guide in [SEARCH_TUNING.md](../../docs/SEARCH_TUNING.md).

## Migration

Apply the database migration:

```bash
# Using Supabase MCP (recommended)
# The migration will be applied via the tool

# Or manually via Supabase dashboard
# Copy contents of supabase/migrations/002_vector_search.sql
# Run in SQL editor
```

Verify indexes:

```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('documents', 'chunks');
```

## Future Enhancements

- [ ] Semantic caching (cache by embedding similarity)
- [ ] Query rewriting for better results
- [ ] Multi-modal search (images, diagrams)
- [ ] Relevance feedback learning
- [ ] A/B testing framework for threshold tuning
- [ ] Distributed caching (Redis)
- [ ] Real-time index updates
- [ ] Query expansion using synonyms/related terms

## References

- [Search Tuning Guide](../../docs/SEARCH_TUNING.md)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
