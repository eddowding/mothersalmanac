# RAG Pipeline Files Reference

Complete list of all files created for the RAG pipeline with absolute paths.

## Core Library Files

### Text Processing
1. **Chunking Library**
   - Path: `/Users/eddowding/Sites/mothersalmanac/lib/rag/chunking.ts`
   - Purpose: Semantic text chunking with overlap
   - Lines: ~350
   - Key exports: `chunkDocument`, `recursiveCharacterSplit`, `extractSections`, `normalizeText`

2. **Embeddings Library**
   - Path: `/Users/eddowding/Sites/mothersalmanac/lib/rag/embeddings.ts`
   - Purpose: Vector embedding generation via Voyage AI
   - Lines: ~350
   - Key exports: `generateEmbedding`, `generateEmbeddings`, `estimateEmbeddingCost`

3. **Text Extractors**
   - Path: `/Users/eddowding/Sites/mothersalmanac/lib/rag/extractors.ts`
   - Purpose: Extract text from PDF, DOCX, TXT files
   - Lines: ~350
   - Key exports: `extractText`, `extractTextFromPDF`, `extractTextFromDOCX`, `validateFile`

4. **Processing Pipeline**
   - Path: `/Users/eddowding/Sites/mothersalmanac/lib/rag/processor.ts`
   - Purpose: Main orchestrator for document processing
   - Lines: ~400
   - Key exports: `processDocument`, `processDocumentsBatch`, `reprocessDocument`

### Database Operations
5. **Chunk Database Helpers**
   - Path: `/Users/eddowding/Sites/mothersalmanac/lib/supabase/chunks.ts`
   - Purpose: Database operations for documents and chunks
   - Lines: ~400
   - Key exports: `insertChunks`, `deleteChunksByDocument`, `searchSimilarChunks`, `updateDocumentStatus`

## API Routes

### Processing Endpoints
6. **Main Process Route**
   - Path: `/Users/eddowding/Sites/mothersalmanac/app/api/admin/process/route.ts`
   - Endpoints: `POST /api/admin/process`, `GET /api/admin/process`
   - Purpose: Trigger and check document processing
   - Lines: ~130

7. **Batch Process Route**
   - Path: `/Users/eddowding/Sites/mothersalmanac/app/api/admin/process/batch/route.ts`
   - Endpoint: `POST /api/admin/process/batch`
   - Purpose: Process multiple documents at once
   - Lines: ~60

8. **Pending Process Route**
   - Path: `/Users/eddowding/Sites/mothersalmanac/app/api/admin/process/pending/route.ts`
   - Endpoint: `POST /api/admin/process/pending`
   - Purpose: Process all pending documents
   - Lines: ~60

## Database Schema

9. **Knowledge Base Migration**
   - Path: `/Users/eddowding/Sites/mothersalmanac/supabase/migrations/002_knowledge_base_schema.sql`
   - Purpose: Create documents and chunks tables with pgvector
   - Lines: ~230
   - Tables: `documents`, `document_chunks`
   - Functions: `search_chunks()`

## Testing

10. **Test Suite**
    - Path: `/Users/eddowding/Sites/mothersalmanac/lib/rag/test.ts`
    - Purpose: Comprehensive pipeline testing
    - Lines: ~250
    - Tests: Extraction, Chunking, Embeddings, Performance, Quality

11. **Sample Document**
    - Path: `/Users/eddowding/Sites/mothersalmanac/test-data/sample.txt`
    - Purpose: Test document (pregnancy care content)
    - Size: ~5KB
    - Content: 6 chapters with markdown structure

12. **Test Documentation**
    - Path: `/Users/eddowding/Sites/mothersalmanac/test-data/README.md`
    - Purpose: Testing instructions and benchmarks
    - Lines: ~150

## Documentation

13. **Full Pipeline Documentation**
    - Path: `/Users/eddowding/Sites/mothersalmanac/docs/RAG_PIPELINE.md`
    - Purpose: Complete technical documentation
    - Lines: ~600
    - Sections: Architecture, Components, API, Security, Performance, Troubleshooting

14. **Setup Guide**
    - Path: `/Users/eddowding/Sites/mothersalmanac/docs/RAG_SETUP.md`
    - Purpose: Quick setup and installation guide
    - Lines: ~250
    - Sections: Prerequisites, Setup steps, Verification, Troubleshooting

15. **Implementation Summary**
    - Path: `/Users/eddowding/Sites/mothersalmanac/docs/RAG_IMPLEMENTATION_SUMMARY.md`
    - Purpose: High-level implementation overview
    - Lines: ~500
    - Sections: Components, Performance, Costs, Next steps

16. **Files Reference**
    - Path: `/Users/eddowding/Sites/mothersalmanac/docs/RAG_FILES_REFERENCE.md`
    - Purpose: This file - complete file listing
    - Lines: ~200

## Configuration

17. **Environment Variables Example**
    - Path: `/Users/eddowding/Sites/mothersalmanac/.env.local.example`
    - Purpose: Example environment configuration
    - Updated: Added RAG pipeline configuration section

## Quick Access Commands

### View Core Files
```bash
# Chunking
cat /Users/eddowding/Sites/mothersalmanac/lib/rag/chunking.ts

# Embeddings
cat /Users/eddowding/Sites/mothersalmanac/lib/rag/embeddings.ts

# Extractors
cat /Users/eddowding/Sites/mothersalmanac/lib/rag/extractors.ts

# Processor
cat /Users/eddowding/Sites/mothersalmanac/lib/rag/processor.ts

# Database helpers
cat /Users/eddowding/Sites/mothersalmanac/lib/supabase/chunks.ts
```

### View API Routes
```bash
# Main process route
cat /Users/eddowding/Sites/mothersalmanac/app/api/admin/process/route.ts

# Batch route
cat /Users/eddowding/Sites/mothersalmanac/app/api/admin/process/batch/route.ts

# Pending route
cat /Users/eddowding/Sites/mothersalmanac/app/api/admin/process/pending/route.ts
```

### View Documentation
```bash
# Full documentation
cat /Users/eddowding/Sites/mothersalmanac/docs/RAG_PIPELINE.md

# Setup guide
cat /Users/eddowding/Sites/mothersalmanac/docs/RAG_SETUP.md

# Implementation summary
cat /Users/eddowding/Sites/mothersalmanac/docs/RAG_IMPLEMENTATION_SUMMARY.md
```

### Run Tests
```bash
cd /Users/eddowding/Sites/mothersalmanac
npx tsx lib/rag/test.ts
```

## File Statistics

### Total Files Created: 17

### By Category:
- Core Libraries: 5 files
- API Routes: 3 files
- Database: 1 file
- Testing: 3 files
- Documentation: 4 files
- Configuration: 1 file

### Total Lines of Code: ~3,000+
- TypeScript: ~2,100 lines
- SQL: ~230 lines
- Markdown: ~670 lines

### File Sizes:
- Largest: `RAG_PIPELINE.md` (~40KB)
- Smallest: `batch/route.ts` (~2KB)
- Average: ~10KB per file

## Import Paths

For use in other files:

```typescript
// Chunking
import { chunkDocument } from '@/lib/rag/chunking';

// Embeddings
import { generateEmbeddings } from '@/lib/rag/embeddings';

// Extractors
import { extractText } from '@/lib/rag/extractors';

// Processor
import { processDocument } from '@/lib/rag/processor';

// Database
import {
  insertChunks,
  searchSimilarChunks
} from '@/lib/supabase/chunks';
```

## Dependencies Added

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "mammoth": "^1.11.0",
    "pdf-parse": "^2.4.5"
  },
  "devDependencies": {
    "@types/pdf-parse": "^1.1.5"
  }
}
```

## Git Status

All files are new and ready to commit:

```bash
new file:   app/api/admin/process/batch/route.ts
new file:   app/api/admin/process/pending/route.ts
new file:   app/api/admin/process/route.ts
new file:   docs/RAG_FILES_REFERENCE.md
new file:   docs/RAG_IMPLEMENTATION_SUMMARY.md
new file:   docs/RAG_PIPELINE.md
new file:   docs/RAG_SETUP.md
new file:   lib/rag/chunking.ts
new file:   lib/rag/embeddings.ts
new file:   lib/rag/extractors.ts
new file:   lib/rag/processor.ts
new file:   lib/rag/test.ts
new file:   lib/supabase/chunks.ts
new file:   supabase/migrations/002_knowledge_base_schema.sql
new file:   test-data/README.md
new file:   test-data/sample.txt
modified:   .env.local.example
modified:   package.json
```

## Next Actions

1. **Review all files** - Check implementation details
2. **Apply migration** - Run 002_knowledge_base_schema.sql
3. **Test locally** - Run test suite with real API key
4. **Commit changes** - Git commit all new files
5. **Deploy** - Push to production environment

## Support

For questions or issues with any of these files:
1. Check the relevant documentation file
2. Review code comments in implementation files
3. Run the test suite for validation
4. Consult RAG_PIPELINE.md for detailed explanations
