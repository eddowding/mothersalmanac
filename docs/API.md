# Mother's Almanac - API Documentation

Complete API reference for Mother's Almanac.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

## Authentication

Most endpoints require authentication via Supabase Auth:

```typescript
// Client-side
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()

// Include session in requests
fetch('/api/endpoint', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})
```

Admin endpoints require `role: 'admin'` in `user_profiles` table.

## Public Endpoints

### Generate Wiki Page

Generate or retrieve a cached wiki page.

**Endpoint:** `GET /api/wiki/generate`

**Query Parameters:**
- `topic` (required): The topic to generate
- `force` (optional): Force regeneration even if cached

**Response:**
```typescript
{
  slug: string
  title: string
  content: string
  confidence: number
  sources: Array<{
    title: string
    url: string
    relevance: number
  }>
  relatedPages: string[]
  generatedAt: string
  cached: boolean
}
```

**Example:**
```bash
curl "https://yourdomain.com/api/wiki/generate?topic=artificial%20intelligence"
```

**Error Responses:**
- `400`: Missing or invalid topic
- `429`: Rate limit exceeded
- `500`: Generation failed

---

### Search Wiki Pages

Search cached wiki pages by title or content.

**Endpoint:** `GET /api/wiki/search`

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Max results (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```typescript
{
  results: Array<{
    slug: string
    title: string
    excerpt: string
    confidence: number
    viewCount: number
    relevance: number
  }>
  total: number
  hasMore: boolean
}
```

**Example:**
```bash
curl "https://yourdomain.com/api/wiki/search?q=quantum&limit=5"
```

---

### Get Wiki Page

Retrieve a specific wiki page by slug.

**Endpoint:** `GET /api/wiki/[slug]`

**Response:**
```typescript
{
  slug: string
  title: string
  content: string
  confidence: number
  viewCount: number
  generatedAt: string
  updatedAt: string
  sources: Source[]
  relatedPages: string[]
}
```

**Example:**
```bash
curl "https://yourdomain.com/api/wiki/artificial-intelligence"
```

**Error Responses:**
- `404`: Page not found
- `500`: Database error

---

### System Health

Check system health and status.

**Endpoint:** `GET /api/health`

**Response:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  responseTime: number
  checks: {
    database: {
      status: string
      latency?: number
      error?: string
    }
    anthropic: {
      status: 'configured' | 'not_configured'
    }
    supabase: {
      status: 'configured' | 'misconfigured'
    }
  }
  metrics: {
    totalPages: number
    pagesGeneratedToday: number
    lowConfidencePages: number
    failedGenerationsToday: number
  }
  version: string
  environment: string
}
```

**Example:**
```bash
curl "https://yourdomain.com/api/health"
```

---

## Admin Endpoints

Require admin authentication.

### Upload Document

Upload a document for RAG processing.

**Endpoint:** `POST /api/admin/documents/upload`

**Headers:**
- `Authorization: Bearer {access_token}`

**Body:** `multipart/form-data`
- `file`: PDF, DOCX, or TXT file (max 50MB)
- `title` (optional): Custom title
- `description` (optional): Document description

**Response:**
```typescript
{
  id: string
  title: string
  filename: string
  mimeType: string
  size: number
  chunkCount: number
  status: 'processing' | 'completed' | 'failed'
  uploadedAt: string
}
```

**Example:**
```bash
curl -X POST "https://yourdomain.com/api/admin/documents/upload" \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf" \
  -F "title=Research Paper"
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `413`: File too large
- `415`: Unsupported file type

---

### Get Analytics

Retrieve analytics summary.

**Endpoint:** `GET /api/admin/analytics`

**Headers:**
- `Authorization: Bearer {access_token}`

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `userId` (optional): Filter by user

**Response:**
```typescript
{
  pageViews: number
  searches: number
  generations: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
  performance: {
    totalTokens: number
    avgDuration: number
    totalCost: string
  }
}
```

**Example:**
```bash
curl "https://yourdomain.com/api/admin/analytics?startDate=2025-12-01&endDate=2025-12-11" \
  -H "Authorization: Bearer {token}"
```

---

### Invalidate Cache

Invalidate and optionally regenerate a wiki page.

**Endpoint:** `POST /api/admin/wiki/invalidate`

**Headers:**
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Body:**
```typescript
{
  slug: string
  regenerate?: boolean
}
```

**Response:**
```typescript
{
  success: boolean
  slug: string
  regenerated: boolean
  newConfidence?: number
}
```

**Example:**
```bash
curl -X POST "https://yourdomain.com/api/admin/wiki/invalidate" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"slug":"artificial-intelligence","regenerate":true}'
```

---

### Bulk Regenerate

Regenerate multiple wiki pages.

**Endpoint:** `POST /api/admin/wiki/bulk-regenerate`

**Headers:**
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Body:**
```typescript
{
  slugs?: string[]  // Specific slugs, or omit for stale pages
  limit?: number    // Max pages to regenerate
  minConfidence?: number  // Only regenerate below this confidence
}
```

**Response:**
```typescript
{
  queued: number
  completed: number
  failed: number
  results: Array<{
    slug: string
    success: boolean
    confidence?: number
    error?: string
  }>
}
```

---

### Get System Stats

Get detailed system statistics.

**Endpoint:** `GET /api/admin/stats`

**Headers:**
- `Authorization: Bearer {access_token}`

**Response:**
```typescript
{
  wiki: {
    totalPages: number
    lowConfidencePages: number
    popularPages: number
    avgConfidence: number
  }
  analytics: {
    todayPageViews: number
    todaySearches: number
    todayGenerations: number
    weeklyTrend: number
  }
  performance: {
    avgGenerationTime: number
    avgTokensPerGeneration: number
    cacheHitRate: number
  }
  costs: {
    today: number
    week: number
    month: number
    costPerGeneration: number
  }
}
```

---

## Cron Endpoints

Protected with `CRON_SECRET` header.

### Regenerate Stale Pages

Regenerate pages that are old or have low confidence.

**Endpoint:** `GET /api/cron/regenerate-stale`

**Headers:**
- `Authorization: Bearer {CRON_SECRET}`

**Response:**
```typescript
{
  success: boolean
  regenerated: number
  failed: number
  timestamp: string
}
```

**Schedule:** Every 6 hours (`0 */6 * * *`)

---

### Cleanup Old Data

Clean up old analytics and orphaned cache entries.

**Endpoint:** `GET /api/cron/cleanup`

**Headers:**
- `Authorization: Bearer {CRON_SECRET}`

**Response:**
```typescript
{
  success: boolean
  results: {
    pageViewsDeleted: number
    searchesDeleted: number
    generationsDeleted: number
    costsDeleted: number
    orphanedCacheDeleted: number
  }
  timestamp: string
}
```

**Schedule:** Daily at 2 AM (`0 2 * * *`)

---

### Generate Daily Stats

Generate and store daily statistics.

**Endpoint:** `GET /api/cron/stats`

**Headers:**
- `Authorization: Bearer {CRON_SECRET}`

**Response:**
```typescript
{
  success: boolean
  stats: {
    date: string
    pageViews: number
    uniqueUsers: number
    generations: number
    totalCost: number
    // ... more stats
  }
  trends: {
    pageViewsTrend: number
    generationsTrend: number
    costTrend: number
  }
  timestamp: string
}
```

**Schedule:** Daily at midnight (`0 0 * * *`)

---

## Rate Limiting

Public endpoints are rate-limited:

- **Anonymous**: 10 requests per minute
- **Authenticated**: 60 requests per minute
- **Admin**: 300 requests per minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702345678
```

**429 Response:**
```typescript
{
  error: {
    message: "Rate limit exceeded",
    type: "RATE_LIMIT_ERROR",
    statusCode: 429,
    retryAfter: 30
  }
}
```

---

## Error Handling

All errors follow a consistent format:

```typescript
{
  error: {
    message: string
    type: ErrorType
    statusCode: number
    details?: unknown
    retryable?: boolean
    timestamp: string
    requestId?: string
  }
}
```

**Error Types:**
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `RATE_LIMIT_ERROR` (429)
- `DATABASE_ERROR` (500)
- `EXTERNAL_API_ERROR` (502)
- `GENERATION_ERROR` (500)
- `INTERNAL_ERROR` (500)

---

## Webhooks

### Document Processing Complete

Triggered when document processing finishes.

**URL:** Your webhook endpoint (configure in admin)

**Method:** `POST`

**Body:**
```typescript
{
  event: 'document.processed'
  data: {
    documentId: string
    title: string
    chunkCount: number
    status: 'completed' | 'failed'
    error?: string
  }
  timestamp: string
}
```

**Headers:**
```
X-Webhook-Signature: {HMAC signature}
Content-Type: application/json
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Generate wiki page
async function generateWikiPage(topic: string) {
  const response = await fetch(
    `/api/wiki/generate?topic=${encodeURIComponent(topic)}`
  )
  return response.json()
}

// Search with auth
async function searchWiki(query: string) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    `/api/wiki/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      }
    }
  )
  return response.json()
}
```

### Python

```python
import requests
import os

BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')

def generate_wiki_page(topic: str):
    response = requests.get(
        f'{BASE_URL}/api/wiki/generate',
        params={'topic': topic}
    )
    return response.json()

def get_analytics(token: str, start_date: str, end_date: str):
    response = requests.get(
        f'{BASE_URL}/api/admin/analytics',
        params={
            'startDate': start_date,
            'endDate': end_date
        },
        headers={
            'Authorization': f'Bearer {token}'
        }
    )
    return response.json()
```

### cURL

```bash
# Generate wiki page
curl "https://yourdomain.com/api/wiki/generate?topic=quantum%20computing"

# Search wiki
curl "https://yourdomain.com/api/wiki/search?q=physics"

# Get health (with pretty print)
curl "https://yourdomain.com/api/health" | jq

# Upload document (admin)
curl -X POST "https://yourdomain.com/api/admin/documents/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@document.pdf" \
  -F "title=My Document"
```

---

## Testing

### Test Endpoints Locally

```bash
# Start dev server
npm run dev

# Test wiki generation
curl "http://localhost:3000/api/wiki/generate?topic=test"

# Test health check
curl "http://localhost:3000/api/health"

# Test search
curl "http://localhost:3000/api/wiki/search?q=test"
```

### Integration Tests

```typescript
import { describe, it, expect } from '@jest/globals'

describe('Wiki API', () => {
  it('should generate wiki page', async () => {
    const response = await fetch(
      'http://localhost:3000/api/wiki/generate?topic=test'
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.slug).toBeDefined()
    expect(data.content).toBeDefined()
  })

  it('should search wiki pages', async () => {
    const response = await fetch(
      'http://localhost:3000/api/wiki/search?q=test'
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toBeInstanceOf(Array)
  })
})
```

---

## Changelog

### Version 1.0.0 (2025-12-11)

- Initial API release
- Wiki generation endpoints
- Admin management endpoints
- Cron job endpoints
- Health check endpoint
- Analytics tracking

---

**Last Updated**: 2025-12-11
**API Version**: 1.0.0
