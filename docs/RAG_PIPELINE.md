# RAG Pipeline Documentation

Complete documentation for the Mother's Almanac knowledge base RAG (Retrieval-Augmented Generation) pipeline.

## Overview

The RAG pipeline processes documents through the following stages:

1. **Text Extraction** - Extract text from PDF, DOCX, or TXT files
2. **Text Cleaning** - Normalize and clean extracted text
3. **Chunking** - Split text into semantic chunks with overlap
4. **Embedding Generation** - Generate vector embeddings using Voyage AI
5. **Database Storage** - Store chunks with embeddings in PostgreSQL with pgvector

## Architecture

```
Document Upload → Supabase Storage
                      ↓
              Text Extraction
                      ↓
              Text Cleaning
                      ↓
              Chunking (1500 chars, 200 overlap)
                      ↓
              Embedding Generation (Voyage AI)
                      ↓
              Database Insert (with vectors)
                      ↓
              Status Update
```

## Components

### 1. Text Extractors (`/lib/rag/extractors.ts`)

Handles extraction from multiple file formats:

- **PDF**: Uses `pdf-parse` library
- **DOCX**: Uses `mammoth` library
- **TXT/MD**: Direct buffer reading with encoding detection

**Key Functions:**
- `extractText(buffer, mimeType)` - Auto-detect and extract
- `extractTextFromPDF(buffer)` - PDF-specific extraction
- `extractTextFromDOCX(buffer)` - DOCX-specific extraction
- `validateFile(buffer, fileName, maxSizeMB)` - Pre-extraction validation

**Supported Formats:**
- PDF (`.pdf`)
- Microsoft Word (`.docx`, `.doc`)
- Plain Text (`.txt`)
- Markdown (`.md`)

**File Size Limits:**
- Default max: 50 MB
- Configurable via `validateFile()` function

### 2. Chunking Library (`/lib/rag/chunking.ts`)

Implements semantic chunking with section awareness.

**Chunking Strategy:**
- Default chunk size: 1500 characters
- Default overlap: 200 characters
- Hierarchy of split points:
  1. Paragraph breaks (`\n\n`)
  2. Line breaks (`\n`)
  3. Sentence endings (`. `, `! `, `? `)
  4. Punctuation (`;`, `,`)
  5. Words (` `)
  6. Characters (fallback)

**Key Functions:**
- `chunkDocument(documentId, text, options)` - Main chunking function
- `recursiveCharacterSplit(text, size, overlap)` - Recursive splitting
- `extractSections(text)` - Extract markdown sections
- `normalizeText(text)` - Clean and normalize text

**Chunk Metadata:**
```typescript
{
  section_title?: string,  // Extracted from markdown headers
  page_number?: number,     // From PDF page info
  chunk_index: number,      // Sequential index
  char_count: number        // Character count
}
```

### 3. Embeddings Library (`/lib/rag/embeddings.ts`)

Generates vector embeddings using Voyage AI (via Anthropic).

**Configuration:**
- Model: `voyage-3`
- Dimension: 1536
- Batch size: 10 texts at once
- Rate limit: 60 requests/minute

**Key Functions:**
- `generateEmbedding(text)` - Single embedding
- `generateEmbeddings(texts[])` - Batch generation
- `estimateEmbeddingCost(textLength)` - Cost calculation
- `generateEmbeddingsBatch(texts[])` - With metrics

**Cost:**
- Approximately $0.10 per 1M tokens
- ~4 characters = 1 token
- Example: 10KB document ≈ $0.00025

**Features:**
- Automatic batching for efficiency
- Rate limiting to avoid API throttling
- Exponential backoff retry logic
- Deterministic mock embeddings for testing

### 4. Database Helpers (`/lib/supabase/chunks.ts`)

Manages database operations for documents and chunks.

**Key Functions:**
- `insertChunks(documentId, chunks[])` - Batch insert chunks
- `deleteChunksByDocument(documentId)` - Remove all chunks
- `getChunksByDocument(documentId)` - Retrieve chunks
- `updateDocumentStatus(documentId, status, metadata)` - Update processing status
- `searchSimilarChunks(embedding, options)` - Vector similarity search

**Database Schema:**

**documents table:**
```sql
id UUID PRIMARY KEY
user_id UUID (FK to user_profiles)
title TEXT
file_name TEXT
file_path TEXT (Supabase Storage path)
status TEXT (pending, processing, completed, failed)
chunk_count INTEGER
total_tokens INTEGER
processing_error TEXT
created_at TIMESTAMPTZ
```

**document_chunks table:**
```sql
id UUID PRIMARY KEY
document_id UUID (FK to documents)
content TEXT
embedding vector(1536)  -- pgvector type
chunk_index INTEGER
section_title TEXT
page_number INTEGER
char_count INTEGER
token_count INTEGER
created_at TIMESTAMPTZ
```

**Indexes:**
- HNSW index on embeddings for fast similarity search
- B-tree indexes on document_id, chunk_index
- Status and created_at indexes for filtering

### 5. Processing Pipeline (`/lib/rag/processor.ts`)

Orchestrates the complete pipeline.

**Main Function:**
```typescript
processDocument(documentId: string, options?: ProcessingOptions): Promise<ProcessingResult>
```

**Processing Steps:**
1. Update status to 'processing'
2. Fetch document metadata from database
3. Download file from Supabase Storage
4. Extract text from file
5. Clean extracted text
6. Chunk the text
7. Generate embeddings for all chunks
8. Delete old chunks (if reprocessing)
9. Insert new chunks with embeddings
10. Update document status to 'completed'

**Error Handling:**
- Automatic rollback on failure
- Error messages stored in database
- Status updated to 'failed'
- Detailed logging at each step

**Performance:**
- Small doc (< 5KB): 2-3 seconds
- Medium doc (5-50KB): 5-10 seconds
- Large doc (50-500KB): 10-30 seconds

## API Endpoints

### POST `/api/admin/process`
Trigger processing for a single document.

**Request:**
```json
{
  "documentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processing started",
  "documentId": "uuid"
}
```

### GET `/api/admin/process?documentId=uuid`
Get processing status for a document.

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "status": "completed",
  "progress": {
    "startedAt": "2025-01-01T00:00:00Z",
    "completedAt": "2025-01-01T00:00:05Z",
    "chunkCount": 5,
    "totalTokens": 1250
  }
}
```

### POST `/api/admin/process/batch`
Process multiple documents at once.

**Request:**
```json
{
  "documentIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Limits:** Maximum 50 documents per batch

### POST `/api/admin/process/pending`
Process all pending documents (background job).

**Request:**
```json
{
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pending documents processed",
  "results": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "details": [...]
  }
}
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**Documents:**
- Users can CRUD their own documents
- Admins can read/update all documents

**Document Chunks:**
- Users can read chunks from their own documents
- Admins can insert/delete chunks (for processing)
- Admins can read all chunks

### Authentication

All API endpoints require:
1. Valid Supabase authentication
2. Admin role in user_profiles table

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Optional
EMBEDDING_MODEL=voyage-3
CHUNK_SIZE=1500
CHUNK_OVERLAP=200
MAX_FILE_SIZE_MB=50
```

### Default Processing Options

```typescript
{
  chunkSize: 1500,          // Target chunk size in characters
  chunkOverlap: 200,        // Overlap between chunks
  preserveSections: true,   // Maintain section context
  retryOnFailure: true      // Retry on transient errors
}
```

## Testing

### Unit Tests

Run the test suite:

```bash
npx tsx lib/rag/test.ts
```

Tests cover:
- Text extraction from all formats
- Text cleaning and normalization
- Chunking with various configurations
- Embedding generation
- Cost estimation
- Performance benchmarks
- Quality metrics

### Integration Testing

1. Upload a test document via admin UI
2. Trigger processing via API
3. Check status and verify results
4. Query chunks using vector search

### Sample Documents

Located in `/test-data/`:
- `sample.txt` - Comprehensive text document (5KB)
- `sample.pdf` - Multi-page PDF (coming soon)
- `sample.docx` - Word document (coming soon)

## Performance Optimization

### Current Optimizations

1. **Batch Processing**: Embeddings generated in batches of 10
2. **Rate Limiting**: Automatic delays between batches
3. **Parallel Operations**: Independent steps run concurrently
4. **Efficient Queries**: Proper indexes on all lookup columns
5. **HNSW Index**: Fast approximate nearest neighbor search

### Future Optimizations

1. **Job Queue**: Use Inngest or BullMQ for background processing
2. **Caching**: Cache frequently accessed chunks
3. **Streaming**: Stream large documents instead of loading entirely
4. **Compression**: Compress embeddings before storage
5. **Sharding**: Distribute chunks across multiple tables

## Troubleshooting

### Common Issues

**1. Empty chunks created**
- Check text extraction - file may be corrupted
- Verify file format matches MIME type
- Check for password-protected PDFs

**2. Embedding errors**
- Verify ANTHROPIC_API_KEY is set correctly
- Check API rate limits
- Ensure text isn't too long (max context length)

**3. Database errors**
- Verify migration has been applied
- Check RLS policies allow admin access
- Ensure pgvector extension is enabled

**4. Storage errors**
- Verify 'documents' bucket exists
- Check storage policies allow access
- Ensure file path is correct

### Debug Logging

Enable detailed logging:

```typescript
// In processor.ts
console.log('[Processor] Step X:', data);
```

### Monitoring

Track these metrics:
- Processing success rate
- Average processing time
- Token usage and costs
- Error frequency by type
- Queue length (pending documents)

## Cost Management

### Estimation

Use the estimation functions before processing:

```typescript
import { estimateProcessingCost } from '@/lib/rag/processor';

const estimate = estimateProcessingCost(fileSizeBytes);
console.log(`Estimated cost: $${estimate.estimatedCostUSD}`);
```

### Budget Controls

1. Set file size limits
2. Limit batch processing
3. Monitor monthly API usage
4. Set alerts for cost thresholds

## Maintenance

### Regular Tasks

1. **Monitor Processing Queue**: Check for stuck documents
2. **Review Failed Documents**: Investigate error patterns
3. **Update Cost Estimates**: Verify against actual API costs
4. **Optimize Chunks**: Adjust size/overlap based on search quality
5. **Clean Old Documents**: Archive or delete unused documents

### Migration Updates

When updating the schema:

1. Create new migration file
2. Test with sample data
3. Apply to staging environment
4. Verify RLS policies
5. Deploy to production

## Future Enhancements

### Planned Features

1. **Multi-Modal Support**: Images, audio transcripts
2. **Advanced Chunking**: ML-based semantic segmentation
3. **Hybrid Search**: Combine vector and keyword search
4. **Reranking**: Improve search result quality
5. **Streaming Responses**: Real-time processing updates
6. **Batch Upload**: Process multiple files at once
7. **OCR Support**: Extract text from scanned documents
8. **Language Detection**: Multi-language support

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Voyage AI Embeddings](https://www.voyageai.com)
- [RAG Best Practices](https://www.anthropic.com/research/rag)
