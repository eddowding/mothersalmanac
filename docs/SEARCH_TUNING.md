# Search Tuning Guide

This guide explains how to optimize and tune the Mother's Almanac RAG search system for the best results.

## Table of Contents

1. [Understanding Search Strategies](#understanding-search-strategies)
2. [Similarity Thresholds](#similarity-thresholds)
3. [Optimizing for Precision vs Recall](#optimizing-for-precision-vs-recall)
4. [Performance Optimization](#performance-optimization)
5. [Troubleshooting Poor Results](#troubleshooting-poor-results)
6. [Testing and Validation](#testing-and-validation)

---

## Understanding Search Strategies

The system provides three search strategies:

### 1. Vector Search
- **Best for:** Semantic similarity, concept-based queries, natural language questions
- **How it works:** Converts query to embedding vector, finds chunks with similar embeddings
- **Pros:** Understands meaning, works across paraphrases, language-agnostic
- **Cons:** May miss exact keyword matches

**Example queries:**
- "What is gentle parenting?" ✅
- "How to handle toddler tantrums?" ✅
- "Sleep training approaches" ✅

### 2. Hybrid Search
- **Best for:** Keyword-heavy queries, exact phrases, specific terms
- **How it works:** Combines vector similarity (70%) with full-text search (30%)
- **Pros:** Catches both semantic similarity and exact matches
- **Cons:** Slightly slower, may over-weight common terms

**Example queries:**
- "Ferber method" ✅
- "Dr. Sears attachment parenting" ✅
- Queries with quotes: "cry it out" ✅

### 3. Smart Search
- **Best for:** General use when you don't know the query type
- **How it works:** Automatically chooses vector or hybrid based on query characteristics
- **Pros:** Adaptive, no configuration needed
- **Cons:** Less predictable for edge cases

**Decision heuristic:**
```typescript
// Uses hybrid if:
// - Query contains quotes
// - Query has more than 5 words
// Otherwise uses vector search
```

---

## Similarity Thresholds

The similarity threshold determines the minimum cosine similarity score (0-1) required for a result.

### Threshold Recommendations

| Threshold | Use Case | Example Queries |
|-----------|----------|-----------------|
| **0.9+** | Exact concept match | Near-duplicate detection, finding specific passages |
| **0.8** | High precision | Factual questions requiring accurate answers |
| **0.7** | **Default - balanced** | Most general queries |
| **0.6** | High recall | Exploratory queries, broad topics |
| **0.5** | Maximum recall | Finding any potentially relevant content |

### How to Choose

**Use higher thresholds (0.8+) when:**
- Generating wiki pages requiring factual accuracy
- Answering specific questions where wrong info is worse than no info
- Users expect authoritative answers

**Use lower thresholds (0.5-0.6) when:**
- Exploring a topic to find related content
- Building initial research for a new topic
- You have limited content and need more results

### Example Usage

```typescript
// High precision for wiki generation
const results = await vectorSearch(query, {
  threshold: 0.8,
  limit: 5
})

// High recall for research
const results = await vectorSearch(query, {
  threshold: 0.5,
  limit: 20
})
```

---

## Optimizing for Precision vs Recall

### Precision (Quality)
**Goal:** Return only highly relevant results

**Configuration:**
```typescript
{
  threshold: 0.8,      // Higher threshold
  limit: 5,            // Fewer results
  sourceTypes: ['book'] // Trusted sources only
}
```

**Metrics to monitor:**
- `avg_similarity` > 0.8
- `minSimilarity` > 0.75
- Low "no result" rate in analytics

### Recall (Coverage)
**Goal:** Return all potentially relevant results

**Configuration:**
```typescript
{
  threshold: 0.5,      // Lower threshold
  limit: 20,           // More results
  // No source filtering
}
```

**Metrics to monitor:**
- `uniqueDocuments` - higher is better
- Coverage percentage across source docs
- Zero "no result" queries

### Balanced Approach (Recommended)

```typescript
// Default settings
{
  threshold: 0.7,
  limit: 10
}

// Then filter results by:
// 1. Deduplication (removes near-duplicates)
// 2. Diversity ranking (favors multiple sources)
// 3. Token budget (fits within context window)
```

---

## Performance Optimization

### Target Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Search latency (p95) | < 200ms | < 500ms |
| Result avg similarity | > 0.75 | > 0.6 |
| Cache hit rate | > 40% | > 20% |
| Context assembly | < 50ms | < 100ms |

### Optimization Strategies

#### 1. Enable Caching

```typescript
import { cachedSearch } from '@/lib/rag/cache'

// Automatically caches for 5 minutes
const results = await cachedSearch(vectorSearch, query, options)
```

**Impact:** 80-95% latency reduction for repeated queries

#### 2. Index Optimization

The migration creates these indexes:

```sql
-- Vector similarity index (IVFFlat)
CREATE INDEX idx_chunks_embedding
ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full-text search index
CREATE INDEX idx_chunks_content_fts
ON chunks USING gin(to_tsvector('english', content));
```

**Tuning `lists` parameter:**
- **100 lists:** Good for 10k-100k chunks
- **500 lists:** Better for 100k-1M chunks
- **1000 lists:** For 1M+ chunks

Re-create index if your dataset size changes significantly:

```sql
DROP INDEX idx_chunks_embedding;
CREATE INDEX idx_chunks_embedding
ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 500);
```

#### 3. Limit Result Count

```typescript
// Don't fetch more than you need
const results = await vectorSearch(query, {
  limit: 10  // Not 100
})

// If you need diversity, use selectDiverseChunks
const diverse = selectDiverseChunks(results, 5)
```

#### 4. Filter at Database Level

```typescript
// Filter in the query (fast)
const results = await vectorSearch(query, {
  sourceTypes: ['book'],
  documentIds: relevantIds
})

// Don't filter after fetching (slow)
// ❌ const filtered = allResults.filter(r => r.source_type === 'book')
```

---

## Troubleshooting Poor Results

### Problem: No Results or Low Similarity Scores

**Possible causes:**
1. Threshold too high for your content
2. Query uses different terminology than documents
3. Not enough content in database

**Solutions:**
```typescript
// Try lower threshold
const results = await vectorSearch(query, { threshold: 0.5 })

// Try hybrid search (catches keyword matches)
const results = await hybridSearch(query)

// Check if documents exist
const { data } = await supabase
  .from('documents')
  .select('count')
  .eq('processed_status', 'completed')
```

### Problem: Irrelevant Results

**Possible causes:**
1. Threshold too low
2. Documents contain generic content
3. Query is too vague

**Solutions:**
```typescript
// Raise threshold
const results = await vectorSearch(query, { threshold: 0.8 })

// Be more specific in query
// ❌ "parenting"
// ✅ "positive discipline techniques for toddlers"

// Filter by source type
const results = await vectorSearch(query, {
  sourceTypes: ['book'],
  threshold: 0.75
})
```

### Problem: Slow Search Performance

**Possible causes:**
1. No vector index on embeddings
2. Cache not enabled
3. Too many results requested

**Solutions:**
```sql
-- Verify index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'chunks'
AND indexname = 'idx_chunks_embedding';

-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM chunks
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

```typescript
// Enable caching
import { cachedSearch } from '@/lib/rag/cache'
const results = await cachedSearch(vectorSearch, query)

// Reduce limit
const results = await vectorSearch(query, { limit: 10 })
```

### Problem: Duplicate or Overlapping Results

**Possible causes:**
1. Documents have similar content
2. Chunking creates overlapping chunks
3. Deduplication not applied

**Solutions:**
```typescript
// Use deduplication
import { deduplicateChunks } from '@/lib/rag/context'
const unique = deduplicateChunks(results, 0.95)

// Use diversity ranking
import { rankChunks } from '@/lib/rag/context'
const ranked = rankChunks(results, query)

// Or use selectDiverseChunks
import { selectDiverseChunks } from '@/lib/rag/context'
const diverse = selectDiverseChunks(results, 10)
```

---

## Testing and Validation

### Using the Test API

```bash
# Test different strategies
curl -X POST http://localhost:3000/api/admin/search/test \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gentle parenting techniques",
    "strategies": ["vector", "hybrid", "smart"],
    "options": { "threshold": 0.7, "limit": 10 },
    "includeContext": true
  }'
```

**Response includes:**
- Search results for each strategy
- Quality metrics (avg similarity, diversity, etc.)
- Execution time
- Assembled context (if requested)

### Quality Metrics to Monitor

#### From Test API:
```typescript
{
  quality: {
    avgSimilarity: 0.82,      // Target: > 0.75
    minSimilarity: 0.71,      // Target: > 0.6
    maxSimilarity: 0.94,
    uniqueDocuments: 4,       // Higher is better
    totalChunks: 10,
    estimatedTokens: 3200     // Should fit in context
  }
}
```

#### From Analytics:
```typescript
import { getSearchAnalytics, getSearchQuality } from '@/lib/analytics/search'

const analytics = await getSearchAnalytics(30)
console.log('Avg similarity:', analytics.avgSimilarity)
console.log('No result rate:', analytics.noResultQueries.length)

const quality = await getSearchQuality(7)
console.log('Low quality rate:', quality.lowQualityRate)
```

### Benchmark Test Suite

Create a test suite with known queries and expected results:

```typescript
// tests/search-quality.test.ts
const benchmarkQueries = [
  {
    query: "What is attachment parenting?",
    expectedMinSimilarity: 0.8,
    expectedDocuments: ["The Baby Book"],
  },
  {
    query: "Ferber sleep training method",
    expectedMinSimilarity: 0.85,
    expectedDocuments: ["Solve Your Child's Sleep Problems"],
  },
  // Add more...
]

for (const test of benchmarkQueries) {
  const results = await vectorSearch(test.query)

  expect(results[0].similarity).toBeGreaterThan(test.expectedMinSimilarity)

  const docs = new Set(results.map(r => r.document_title))
  expect(docs).toContain(test.expectedDocuments[0])
}
```

---

## Recommended Settings for Wiki Generation

Based on testing, these settings provide the best balance for generating high-quality wiki pages:

```typescript
const WIKI_SEARCH_CONFIG = {
  threshold: 0.75,        // Favor quality over quantity
  limit: 15,              // Get enough for diversity
  maxTokens: 8000,        // Leave room for generation
}

// Usage:
const results = await vectorSearch(topicQuery, WIKI_SEARCH_CONFIG)
const context = assembleContext(results, WIKI_SEARCH_CONFIG.maxTokens, topicQuery)

// Generate wiki with Claude
const wiki = await generateWiki(topicQuery, context)
```

### Why these settings?

- **0.75 threshold:** Filters out tangentially related content while keeping good coverage
- **15 results:** Provides enough diversity for comprehensive articles, dedup will reduce
- **8000 tokens:** Fits comfortably in Claude's context with room for instructions and output

---

## Monitoring Ongoing Performance

### Weekly Tasks

1. Check search analytics dashboard
2. Review no-result queries
3. Monitor average similarity trends
4. Check cache hit rate

### Monthly Tasks

1. Re-evaluate similarity thresholds based on analytics
2. Review and update benchmark test suite
3. Optimize indexes if dataset has grown significantly
4. Clean up old analytics data

### Alerts to Set Up

- Alert if p95 latency > 500ms
- Alert if avg similarity drops below 0.6
- Alert if no-result rate > 20%
- Alert if cache hit rate < 20%

---

## Summary Quick Reference

| Task | Settings |
|------|----------|
| **Wiki generation** | threshold: 0.75, limit: 15, strategy: vector |
| **Chat assistance** | threshold: 0.7, limit: 10, strategy: smart |
| **Research/exploration** | threshold: 0.5, limit: 20, strategy: hybrid |
| **Exact fact lookup** | threshold: 0.85, limit: 5, strategy: hybrid |

**Default recommendation:** Start with threshold 0.7, adjust based on analytics and user feedback.
