# RAG Pipeline Setup Guide

Quick setup guide for the Mother's Almanac knowledge base RAG pipeline.

## Prerequisites

- Node.js 18+ installed
- Supabase project created
- Anthropic API key

## Setup Steps

### 1. Install Dependencies

Already installed via previous npm install:

```bash
# Verify dependencies are installed
npm list pdf-parse mammoth @anthropic-ai/sdk
```

If missing, install:

```bash
npm install pdf-parse mammoth @anthropic-ai/sdk @types/pdf-parse
```

### 2. Apply Database Migration

Run the knowledge base schema migration:

```bash
# Using Supabase MCP (recommended)
# The migration file is at: supabase/migrations/002_knowledge_base_schema.sql
```

Via Supabase MCP:
1. Use the MCP tool to run the migration
2. Verify the `documents` and `document_chunks` tables are created
3. Check that pgvector extension is enabled

Manual alternative:
```bash
supabase db push
```

### 3. Create Storage Bucket

Create a `documents` bucket in Supabase Storage:

Via Supabase Dashboard:
1. Go to Storage section
2. Create new bucket named `documents`
3. Set to private (not public)
4. Apply storage policies from migration comments

Via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);
```

### 4. Configure Environment Variables

Update `.env.local` with required values:

```bash
# Required for RAG pipeline
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional RAG configuration
CHUNK_SIZE=1500
CHUNK_OVERLAP=200
MAX_FILE_SIZE_MB=50
```

### 5. Verify Admin Access

Ensure you have admin access:

```sql
-- Update your user to admin role
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 6. Test the Pipeline

Run the test script:

```bash
npx tsx lib/rag/test.ts
```

Expected output:
```
================================================================================
RAG Pipeline Test Suite
================================================================================

TEST 1: Text Extraction
--------------------------------------------------------------------------------
✓ Extracted 5234 characters
✓ Word count: 847
✓ Extraction time: 12ms

TEST 2: Text Cleaning
...

Overall Quality Score: 100/100
```

## Verification Checklist

- [ ] Dependencies installed (`pdf-parse`, `mammoth`, `@anthropic-ai/sdk`)
- [ ] Database migration applied successfully
- [ ] `documents` and `document_chunks` tables exist
- [ ] pgvector extension enabled
- [ ] Storage bucket `documents` created
- [ ] Environment variables configured
- [ ] Admin role assigned to your user
- [ ] Test script passes all tests

## Quick Test

Test document processing via API:

```bash
# 1. Upload a document (via admin UI or API)

# 2. Trigger processing
curl -X POST http://localhost:3000/api/admin/process \
  -H "Content-Type: application/json" \
  -d '{"documentId": "YOUR_DOCUMENT_ID"}'

# 3. Check status
curl http://localhost:3000/api/admin/process?documentId=YOUR_DOCUMENT_ID

# 4. Verify in database
# Check document_chunks table for new entries
```

## Troubleshooting

### Migration Fails

**Error:** "pgvector extension not found"

**Solution:** Enable pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Authentication Errors

**Error:** "Unauthorized" when calling API

**Solution:**
1. Check you're logged in
2. Verify your user has admin role
3. Check session token is valid

### Storage Errors

**Error:** "Bucket not found"

**Solution:**
1. Create `documents` bucket in Supabase Storage
2. Verify bucket name is exactly `documents`
3. Check storage policies allow access

### Embedding Errors

**Error:** "ANTHROPIC_API_KEY not set"

**Solution:**
1. Add `ANTHROPIC_API_KEY` to `.env.local`
2. Get key from https://console.anthropic.com/
3. Restart Next.js dev server

### Test Script Fails

**Error:** "Cannot find module"

**Solution:**
Install tsx globally or use npx:
```bash
npm install -g tsx
# or
npx tsx lib/rag/test.ts
```

## Next Steps

After setup is complete:

1. **Upload Documents**: Use admin UI to upload documents
2. **Process Documents**: Trigger processing via API or admin UI
3. **Test Search**: Query the knowledge base using vector search
4. **Integrate with Chat**: Connect RAG to chat interface
5. **Monitor Performance**: Track processing times and costs

## Production Considerations

Before deploying to production:

1. **Environment Variables**: Set all required env vars in Vercel/hosting platform
2. **API Keys**: Use production Anthropic API key
3. **Rate Limits**: Monitor API usage and implement rate limiting
4. **Background Jobs**: Consider using Inngest or similar for async processing
5. **Monitoring**: Set up error tracking and performance monitoring
6. **Backups**: Enable point-in-time recovery for Supabase
7. **Cost Alerts**: Set budget alerts for API usage

## Resources

- [Full Pipeline Documentation](/docs/RAG_PIPELINE.md)
- [Test Data](/test-data/)
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs in browser console and server logs
3. Verify all environment variables are set correctly
4. Test with the sample documents in `/test-data/`
5. Check Supabase dashboard for database errors
