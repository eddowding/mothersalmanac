# Test Data for RAG Pipeline

This directory contains sample files for testing the document processing pipeline.

## Available Test Files

### sample.txt
A comprehensive text document about natural pregnancy care. Contains:
- Multiple chapters with markdown-style headings
- Approximately 5,000 characters
- Well-structured sections for testing section extraction
- Lists and formatted content

## Testing the Pipeline

### 1. Upload a Document

Use the admin interface to upload one of these test files to Supabase Storage.

### 2. Trigger Processing

Call the processing API:

```bash
curl -X POST http://localhost:3000/api/admin/process \
  -H "Content-Type: application/json" \
  -d '{"documentId": "YOUR_DOCUMENT_ID"}'
```

### 3. Check Processing Status

```bash
curl http://localhost:3000/api/admin/process?documentId=YOUR_DOCUMENT_ID
```

### 4. Verify Results

Check the database for:
- Document status updated to 'completed'
- Chunks created in document_chunks table
- Embeddings stored as vectors
- Chunk metadata (section titles, chunk indices)

## Expected Results for sample.txt

Based on default settings (1500 char chunks, 200 char overlap):

- **Estimated chunks**: ~4-5 chunks
- **Estimated tokens**: ~1,250 tokens
- **Estimated cost**: ~$0.000125 USD
- **Processing time**: ~2-5 seconds

## Creating Additional Test Files

### PDF Test File (Coming Soon)
- Multi-page PDF document
- Tests PDF extraction capabilities
- Approximately 10 pages

### DOCX Test File (Coming Soon)
- Microsoft Word document
- Tests DOCX extraction
- Contains formatted text and sections

## Performance Benchmarks

Track these metrics when testing:

1. **Text Extraction Time**
   - TXT: < 100ms
   - PDF: 1-2 seconds
   - DOCX: 500ms - 1 second

2. **Chunking Time**
   - ~50-100ms for typical document

3. **Embedding Generation**
   - ~100-200ms per chunk (with batching)

4. **Database Insertion**
   - ~50-100ms for batch insert

5. **Total Pipeline Time**
   - Small doc (< 5KB): 2-3 seconds
   - Medium doc (5-50KB): 5-10 seconds
   - Large doc (50-500KB): 10-30 seconds

## Troubleshooting

### Common Issues

1. **Empty chunks**: Check text extraction - file may be corrupted
2. **Missing embeddings**: Verify ANTHROPIC_API_KEY is set
3. **Database errors**: Check migration has been applied
4. **Storage errors**: Verify 'documents' bucket exists in Supabase

### Debug Mode

Set environment variable for detailed logging:

```bash
DEBUG=rag:* npm run dev
```

## Notes

- Always test with small files first
- Monitor API rate limits
- Check cost estimates before processing large batches
- Verify RLS policies allow admin access
