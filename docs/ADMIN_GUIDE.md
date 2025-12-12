# Mother's Almanac Admin Panel - User Guide

## Overview

The Mother's Almanac admin panel provides comprehensive tools for managing the knowledge base, monitoring system performance, and configuring search behavior.

## Access

- **URL**: `https://your-domain.com/admin`
- **Requirements**: Admin role required (set in `user_profiles` table)
- **Authentication**: Protected by middleware and server-side checks

## Navigation

The admin panel uses a sidebar navigation with the following sections:

### Dashboard
- **Overview**: Key metrics and recent activity
- **Quick Actions**: Access to failed uploads and processing jobs

### Knowledge Base
- **Documents**: Manage uploaded documents
- **Chunks Browser**: View and edit individual chunks
- **Search Testing**: Test and debug vector search

### Management
- **Analytics**: Usage statistics and trends
- **Settings**: Configure system parameters

## Features

### 1. Dashboard (Overview)

**Key Metrics:**
- Total Documents: Count of all uploaded documents
- Total Chunks: Number of text segments with embeddings
- Processing Queue: Documents currently being processed
- Failed Uploads: Documents that need attention
- Storage Used: Total file storage in MB
- Embeddings Cost: Estimated cost for embedding generation

**Recent Documents:**
- Lists last 10 uploaded documents
- Shows status, chunk count, and uploader
- Quick link to document details

**Action Required:**
- Alerts for failed uploads
- Monitoring for processing documents
- Quick links to review and retry

### 2. Documents Management

**Features:**
- Upload new documents (PDF, DOCX, TXT)
- Search and filter by status
- View document details
- Reprocess failed documents
- Delete documents (cascades to chunks)

**Document Statuses:**
- `pending`: Uploaded, awaiting processing
- `processing`: Currently being chunked and embedded
- `completed`: Successfully processed
- `failed`: Processing error occurred

**Actions:**
- **Upload**: Click "Upload Document" button
- **View Details**: Click document title
- **Reprocess**: Available for failed/pending documents
- **Delete**: Removes document and all chunks

### 3. Chunk Browser

**Features:**
- Browse all document chunks
- Search chunk content (full-text)
- View embeddings (first 10 dimensions)
- Test similarity with custom queries
- Edit chunk content
- Delete individual chunks

**Similarity Test:**
1. Enter test query in "Similarity Test" input
2. Click "Test" or press Enter
3. View top 5 similar chunks with similarity scores
4. Color-coded: Green (>80%), Yellow (60-80%), Red (<60%)

**Chunk Display:**
- Chunk index and section title
- Source document name
- Character and token counts
- Expandable embedding preview
- Edit and delete actions

### 4. Search Testing Tool

**Purpose:** Test and debug vector search functionality

**Configuration:**
- **Query**: Enter search text
- **Search Mode**:
  - Vector Only: Pure semantic search
  - Hybrid: Vector + keyword matching
  - Keyword Only: Traditional text search
- **Similarity Threshold**: Minimum score (0.5-1.0)
- **Max Results**: Result limit (1-50)

**Debug Information:**
- Query Embedding: Dimensions and preview
- Search Latency: Execution time in milliseconds
- Results Count: Number of chunks returned
- Context Size: Estimated tokens for context

**Results Display:**
- Similarity score with color-coded bar
- Source document and section
- Chunk content
- Actions: "Use in Wiki", "View Full Document"

### 5. Analytics Dashboard

**Search Analytics:**
- Top 20 search queries with counts
- Average similarity scores per query
- Search volume trends (30 days)
- Queries with no results (for improvement)

**Document Analytics:**
- Most referenced documents in searches
- Document coverage percentage
- Upload trends over time
- Average processing times

**Usage Analytics:**
- Wiki pages generated
- Chat conversation counts
- Active users (30 days)
- User engagement metrics

### 6. Settings

**Processing Settings:**
- **Chunk Size** (500-3000 chars): Size of text segments
- **Chunk Overlap** (50-500 chars): Overlap between chunks
- **Auto-process**: Automatically process on upload

**Search Settings:**
- **Similarity Threshold** (0.5-1.0): Minimum search result score
- **Max Context Tokens** (2000-10000): Context window size
- **Embedding Model**: Choose embedding provider

**Danger Zone:**
⚠️ These actions are irreversible:
- **Reprocess All Documents**: Re-chunk and re-embed everything
- **Regenerate Embeddings**: Re-embed existing chunks (preserves chunks)
- **Clear All Chunks**: Delete all chunks (preserves documents)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search input (when available) |
| `Cmd+K` | Open command palette (future feature) |
| `Cmd+U` | Navigate to upload (future feature) |
| `Esc` | Close dialogs and modals |

## Best Practices

### Document Management
1. **Upload Quality**: Ensure documents are clear and well-formatted
2. **Regular Review**: Check failed uploads weekly
3. **Chunk Size**: Adjust based on content type (longer for technical docs)
4. **Naming**: Use descriptive titles for easy searching

### Search Optimization
1. **Threshold Tuning**: Start at 0.7, adjust based on result quality
2. **Test Queries**: Use Search Testing tool before production
3. **Monitor Analytics**: Track queries with no results
4. **Coverage**: Ensure all important documents are processed

### Performance
1. **Batch Processing**: Upload multiple documents at once
2. **Off-Peak Processing**: Schedule reprocessing during low traffic
3. **Storage Management**: Delete old/obsolete documents
4. **Cost Monitoring**: Track embedding costs in dashboard

### Security
1. **Role Management**: Only grant admin to trusted users
2. **Audit Logs**: Review recent document uploads
3. **Data Privacy**: Ensure uploaded documents comply with privacy policies
4. **Backup**: Regular database backups recommended

## Troubleshooting

### Failed Document Processing

**Symptoms:** Document stuck in "failed" status

**Solutions:**
1. Check document format (PDF, DOCX, TXT supported)
2. Verify file size (<10MB recommended)
3. Check processing error message in document details
4. Try reprocessing with "Reprocess" button
5. If persists, delete and re-upload

### Low Search Quality

**Symptoms:** Search results not relevant

**Solutions:**
1. Use Search Testing tool to debug queries
2. Check similarity threshold (may be too low)
3. Verify documents are fully processed
4. Review chunk sizes (may need adjustment)
5. Consider reprocessing with different settings

### Slow Performance

**Symptoms:** Dashboard or searches loading slowly

**Solutions:**
1. Check Processing Queue (may be overloaded)
2. Limit search results (reduce max results)
3. Clear browser cache
4. Check network connection
5. Contact support if persists

### Real-time Updates Not Working

**Symptoms:** Processing status not updating

**Solutions:**
1. Refresh page
2. Check internet connection
3. Verify Supabase Realtime is enabled
4. Check browser console for errors
5. Try different browser

## API Endpoints

For programmatic access:

```
GET  /api/admin/stats          - Dashboard statistics
GET  /api/admin/chunks         - List chunks
POST /api/admin/search/test    - Test search
GET  /api/admin/analytics      - Analytics data
GET  /api/admin/settings       - Get settings
POST /api/admin/settings       - Update settings
```

All endpoints require admin authentication.

## Support

For issues or questions:
- **Documentation**: `/docs/ADMIN_GUIDE.md`
- **Technical Issues**: Check browser console for errors
- **Feature Requests**: Contact development team
- **Emergency**: Use danger zone actions with caution

## Version History

- **v1.0** (2024-12): Initial release
  - Dashboard with key metrics
  - Document management
  - Chunk browser
  - Search testing
  - Analytics
  - Settings configuration
  - Real-time processing status

## Future Enhancements

Planned features:
- [ ] Command palette (Cmd+K)
- [ ] Bulk document operations
- [ ] Advanced search filters
- [ ] Custom embedding models
- [ ] Scheduled reprocessing
- [ ] Export analytics to CSV
- [ ] User activity logs
- [ ] API rate limiting dashboard
- [ ] Document version history
- [ ] Collaborative annotations
