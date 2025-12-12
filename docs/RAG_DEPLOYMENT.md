# RAG System Deployment Guide

Complete guide for deploying the Mother's Almanac RAG vector search infrastructure.

## Prerequisites

- [x] Supabase project created
- [ ] OpenAI API key configured
- [ ] Database migration applied
- [ ] Vector extension enabled
- [ ] Test data loaded

## Step 1: Configure Environment Variables

Add to `.env.local`:

```bash
# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (required for embeddings)
OPENAI_API_KEY=sk-...
```

## Step 2: Apply Database Migration

### Option A: Using Supabase MCP (Recommended)

The migration file is at `/supabase/migrations/002_vector_search.sql`.

Apply it using the Supabase MCP tool with your project ID.

### Option B: Manual via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy contents of `/supabase/migrations/002_vector_search.sql`
6. Paste and click **Run**

### Option C: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Step 3: Verify Migration

Run this SQL query in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('documents', 'chunks', 'search_analytics');

-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('documents', 'chunks')
ORDER BY tablename, indexname;

-- Check RPC functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'match_chunks_with_metadata',
  'hybrid_search',
  'get_document_coverage',
  'find_similar_chunks'
);
```

Expected results:
- ✅ 3 tables: `documents`, `chunks`, `search_analytics`
- ✅ Extension: `vector` (version 0.5.0+)
- ✅ 7+ indexes
- ✅ 4 RPC functions

## Step 4: Test the Infrastructure

### A. Test Database Connectivity

```typescript
// test-db-connection.ts
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()

// Test documents table
const { data, error } = await supabase
  .from('documents')
  .select('count')

console.log('Documents table accessible:', !error)

// Test chunks table
const { data: chunks, error: chunksError } = await supabase
  .from('chunks')
  .select('count')

console.log('Chunks table accessible:', !chunksError)
```

### B. Test Embedding Generation

```typescript
// test-embeddings.ts
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input: 'test query',
    model: 'text-embedding-ada-002',
  }),
})

const data = await response.json()
console.log('Embedding generated:', data.data[0].embedding.length === 1536)
```

### C. Create Test Document and Chunk

```sql
-- Insert test document
INSERT INTO public.documents (title, author, source_type, processed_status)
VALUES ('Test Document', 'Test Author', 'other', 'completed')
RETURNING id;

-- Insert test chunk (replace <document-id> with ID from above)
-- Generate a real embedding using OpenAI API, then:
INSERT INTO public.chunks (
  document_id,
  content,
  embedding,
  chunk_index,
  token_count
) VALUES (
  '<document-id>',
  'This is a test chunk about gentle parenting techniques.',
  '[0.1, 0.2, 0.3, ...]'::vector(1536), -- Replace with real embedding
  0,
  10
);
```

### D. Test Vector Search RPC

```sql
-- Test vector search (replace with real embedding)
SELECT * FROM match_chunks_with_metadata(
  '[0.1, 0.2, 0.3, ...]'::vector(1536),
  0.0,  -- Low threshold for testing
  10
);
```

### E. Test TypeScript Search Functions

```typescript
// test-search.ts
import { vectorSearch } from '@/lib/rag/search'

const results = await vectorSearch('gentle parenting', {
  threshold: 0.0, // Low for testing
  limit: 10
})

console.log('Search results:', results.length)
console.log('First result:', results[0])
```

## Step 5: Load Production Data

### Option A: Upload Documents via Admin API

Create document upload endpoint:

```typescript
// /app/api/admin/documents/upload/route.ts
// See document processing system for implementation
```

### Option B: Bulk Import via SQL

```sql
-- Bulk insert documents
INSERT INTO public.documents (title, author, source_type, processed_status)
VALUES
  ('The Baby Book', 'William Sears', 'book', 'pending'),
  ('The Whole-Brain Child', 'Daniel Siegel', 'book', 'pending'),
  ('How to Talk So Kids Will Listen', 'Adele Faber', 'book', 'pending');

-- Process documents and generate embeddings
-- (This requires document processing pipeline - see separate docs)
```

## Step 6: Configure Caching

The cache is automatically configured with sensible defaults:
- **Max size:** 100 entries
- **TTL:** 5 minutes
- **Strategy:** LRU (Least Recently Used)

To customize:

```typescript
// lib/rag/cache.ts
const globalCache = new SearchCache(
  200,  // max size
  10    // TTL in minutes
)
```

## Step 7: Set Up Monitoring

### Enable Analytics

Analytics are automatically logged when you use the search functions with `logSearch`:

```typescript
import { logSearch } from '@/lib/analytics/search'
import { vectorSearch } from '@/lib/rag/search'

const results = await vectorSearch(query, options)
await logSearch(query, results, userId, executionTimeMs)
```

### Create Analytics Dashboard

```typescript
// /app/admin/analytics/page.tsx
import { getSearchAnalytics, getSearchQuality } from '@/lib/analytics/search'

const analytics = await getSearchAnalytics(30)
const quality = await getSearchQuality(7)

// Display metrics
```

### Set Up Alerts (Optional)

```typescript
// Monitor performance
const perf = await getSearchPerformance(7)
if (perf.p95 > 500) {
  // Alert: Search latency is high
}

const quality = await getSearchQuality(7)
if (quality.noResultRate > 20) {
  // Alert: Too many no-result queries
}
```

## Step 8: Performance Tuning

### Initial Benchmarks

Run test queries to establish baseline:

```bash
curl -X POST http://localhost:3000/api/admin/search/test \
  -H "Content-Type: application/json" \
  -d '{
    "query": "sleep training methods",
    "strategies": ["vector", "hybrid", "smart"]
  }'
```

### Optimize Indexes

If you have > 100k chunks, adjust the IVFFlat lists parameter:

```sql
-- Drop existing index
DROP INDEX idx_chunks_embedding;

-- Recreate with more lists for larger dataset
CREATE INDEX idx_chunks_embedding
ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 500);  -- Adjust based on dataset size
```

**Rule of thumb:** `lists = sqrt(total_rows)`

### Vacuum and Analyze

After bulk loading data:

```sql
VACUUM ANALYZE public.documents;
VACUUM ANALYZE public.chunks;
```

## Step 9: Security Checklist

- [x] RLS policies enabled on all tables
- [x] Admin functions use `is_admin()` check
- [x] Service role key stored securely (not in client code)
- [x] OpenAI API key in environment variables only
- [ ] Rate limiting configured (optional, via middleware)
- [ ] CORS configured for API endpoints

## Step 10: Testing in Production

### Smoke Tests

```typescript
// Run after deployment
const tests = [
  'What is gentle parenting?',
  'How to handle tantrums?',
  'Sleep training methods',
]

for (const query of tests) {
  const results = await vectorSearch(query)
  console.assert(results.length > 0, `No results for: ${query}`)
  console.assert(results[0].similarity > 0.5, `Low similarity for: ${query}`)
}
```

### Load Testing

```bash
# Using Apache Bench or similar
ab -n 100 -c 10 \
  -H "Content-Type: application/json" \
  -p test-query.json \
  http://localhost:3000/api/admin/search/test
```

## Troubleshooting

### Error: "extension vector does not exist"

**Solution:** Enable pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

If not available, contact Supabase support or verify your plan supports extensions.

### Error: "function match_chunks_with_metadata does not exist"

**Solution:** Migration not fully applied. Re-run migration SQL.

### Error: "OpenAI API error: 401"

**Solution:** Check `OPENAI_API_KEY` is correctly set in `.env.local`

### Slow Search Performance (> 500ms)

**Causes:**
1. No vector index on embeddings
2. Too many results requested
3. Database not optimized

**Solutions:**
```sql
-- Verify index exists
\d chunks

-- Should show: idx_chunks_embedding (ivfflat)

-- If missing, create it
CREATE INDEX idx_chunks_embedding
ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### No Search Results

**Causes:**
1. No documents with `processed_status = 'completed'`
2. Threshold too high
3. No embeddings generated

**Solutions:**
```sql
-- Check document status
SELECT processed_status, COUNT(*)
FROM documents
GROUP BY processed_status;

-- Check if chunks have embeddings
SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL;
```

## Rollback Plan

If you need to rollback the migration:

```sql
-- Drop in reverse order
DROP TRIGGER IF EXISTS update_chunk_count_on_delete ON public.chunks;
DROP TRIGGER IF EXISTS update_chunk_count_on_insert ON public.chunks;
DROP FUNCTION IF EXISTS public.update_document_chunk_count();
DROP FUNCTION IF EXISTS public.find_similar_chunks(uuid, float, int);
DROP FUNCTION IF EXISTS public.get_document_coverage(uuid[]);
DROP FUNCTION IF EXISTS public.hybrid_search(text, vector, float, int);
DROP FUNCTION IF EXISTS public.match_chunks_with_metadata(vector, float, int, uuid[], text[]);
DROP TABLE IF EXISTS public.search_analytics;
DROP TABLE IF EXISTS public.chunks;
DROP TABLE IF EXISTS public.documents;
DROP EXTENSION IF EXISTS vector;
```

**Warning:** This will delete all RAG data. Backup first!

## Next Steps

After successful deployment:

1. [ ] Set up document processing pipeline
2. [ ] Import knowledge base documents
3. [ ] Configure wiki generation workflow
4. [ ] Train team on search tuning
5. [ ] Monitor analytics weekly
6. [ ] Set up automated backups

## Support

- **Documentation:** [/docs/SEARCH_TUNING.md](./SEARCH_TUNING.md)
- **RAG System README:** [/lib/rag/README.md](../lib/rag/README.md)
- **Test API:** `POST /api/admin/search/test`

## Changelog

- **2024-12-11:** Initial RAG infrastructure deployment
- Version: 1.0.0
