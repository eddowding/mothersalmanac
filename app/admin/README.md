# Mother's Almanac - Admin Panel

## Quick Start

### Access
```
URL: /admin
Role: Admin required
```

### First Time Setup

1. **Grant Admin Access**
   ```sql
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

2. **Navigate to Admin Panel**
   - Visit `/admin` in your browser
   - You should see the dashboard with metrics

### Dashboard Overview

The admin dashboard provides at-a-glance metrics:
- Total documents and chunks
- Processing queue status
- Failed uploads requiring attention
- Storage usage and costs

## Page Guide

### 📊 Dashboard (`/admin`)
**Purpose**: System overview and quick actions

**Key Metrics**:
- Documents, Chunks, Processing Queue
- Failed Uploads, Storage, Embeddings Cost

**Quick Actions**:
- Review failed uploads
- Monitor processing jobs
- Navigate to management pages

---

### 📄 Documents (`/admin/documents`)
**Purpose**: Manage knowledge base documents

**Features**:
- Upload new documents (PDF, DOCX, TXT)
- Search and filter documents
- View processing status
- Reprocess failed documents
- Delete documents

**Workflow**:
1. Click "Upload Document"
2. Select file(s) to upload
3. Monitor processing in dashboard
4. Review completed documents

---

### 🔷 Chunks Browser (`/admin/chunks`)
**Purpose**: Browse and manage text chunks

**Features**:
- View all chunks with metadata
- Search chunk content
- Test similarity matching
- Edit chunk content
- Delete individual chunks

**Use Cases**:
- Debug search results
- Find similar content
- Verify chunk quality
- Edit problematic chunks

---

### 🔍 Search Testing (`/admin/search`)
**Purpose**: Test and debug vector search

**Configuration**:
- **Query**: Search text
- **Mode**: Vector / Hybrid / Keyword
- **Threshold**: Similarity cutoff (0.5-1.0)
- **Limit**: Max results (1-50)

**Debug Info**:
- Query embedding dimensions
- Search latency (ms)
- Results count
- Context size estimate

**Workflow**:
1. Enter search query
2. Adjust parameters
3. Click "Search"
4. Review results and debug info
5. Iterate until optimal

---

### 📈 Analytics (`/admin/analytics`)
**Purpose**: Usage insights and trends

**Tabs**:
1. **Search Analytics**
   - Top queries
   - Search volume trends
   - Average similarity scores

2. **Document Analytics**
   - Most referenced documents
   - Coverage statistics
   - Upload trends

3. **Usage Trends**
   - Document uploads over time
   - User activity metrics

---

### ⚙️ Settings (`/admin/settings`)
**Purpose**: Configure system behavior

**Processing Settings**:
- Chunk Size: 500-3000 characters
- Chunk Overlap: 50-500 characters
- Auto-process: Enable/disable

**Search Settings**:
- Similarity Threshold: 0.5-1.0
- Max Context Tokens: 2000-10000
- Embedding Model: Select provider

**⚠️ Danger Zone**:
- Reprocess all documents
- Regenerate all embeddings
- Clear all chunks

---

## Common Tasks

### Upload and Process Documents

1. Navigate to `/admin/documents`
2. Click "Upload Document"
3. Select file(s)
4. Wait for processing (watch dashboard)
5. Verify status shows "completed"

### Fix Failed Upload

1. Go to dashboard
2. Click "Review" in Failed Uploads
3. View error message
4. Click "Reprocess" button
5. Monitor status

### Test Search Quality

1. Go to `/admin/search`
2. Enter typical user query
3. Adjust threshold (start at 0.7)
4. Review similarity scores
5. Check if results are relevant
6. Adjust settings if needed

### Find Similar Content

1. Go to `/admin/chunks`
2. Enter text in "Similarity Test"
3. Click "Test"
4. View top matching chunks
5. Use for content discovery

### Optimize Settings

1. Go to `/admin/settings`
2. Adjust chunk size based on content:
   - Technical docs: 1500-2000
   - General content: 800-1200
   - Short articles: 500-800
3. Set overlap at 15-20% of chunk size
4. Set threshold based on precision needs:
   - High precision: 0.8-0.9
   - Balanced: 0.7-0.8
   - High recall: 0.6-0.7
5. Click "Save Settings"

### Monitor Performance

1. Check dashboard daily
2. Review analytics weekly
3. Test search quality monthly
4. Adjust settings as needed

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search |
| `Esc` | Close dialogs |
| `Enter` | Submit forms |

See [ADMIN_SHORTCUTS.md](/docs/ADMIN_SHORTCUTS.md) for full list.

## Troubleshooting

### Problem: Documents stuck in "processing"

**Solutions**:
1. Refresh page
2. Check if really processing (can take 1-5 min)
3. If stuck >10 min, check logs
4. Reprocess if needed

### Problem: Search returns no results

**Solutions**:
1. Lower similarity threshold
2. Check if documents are processed
3. Test with simpler queries
4. Review chunk quality in browser

### Problem: Failed uploads

**Solutions**:
1. Check file format (PDF, DOCX, TXT)
2. Verify file size (<10MB)
3. Read error message
4. Try reprocessing
5. Delete and re-upload if needed

## Best Practices

### Document Management
- ✅ Use descriptive titles
- ✅ Upload clean, formatted files
- ✅ Review failed uploads promptly
- ✅ Delete obsolete documents

### Search Optimization
- ✅ Test queries regularly
- ✅ Monitor similarity scores
- ✅ Adjust threshold based on use case
- ✅ Review "no results" queries

### System Maintenance
- ✅ Check dashboard daily
- ✅ Review analytics weekly
- ✅ Update settings as needed
- ✅ Clean up old documents monthly

### Security
- ✅ Limit admin access
- ✅ Review recent uploads
- ✅ Use confirmations for destructive actions
- ✅ Regular backups

## Support

- **User Guide**: [/docs/ADMIN_GUIDE.md](/docs/ADMIN_GUIDE.md)
- **Shortcuts**: [/docs/ADMIN_SHORTCUTS.md](/docs/ADMIN_SHORTCUTS.md)
- **Summary**: [/docs/ADMIN_SUMMARY.md](/docs/ADMIN_SUMMARY.md)

## API Access

All admin endpoints require authentication:

```typescript
// Example: Fetch statistics
const response = await fetch('/api/admin/stats')
const data = await response.json()
```

See API documentation for full endpoint list.

## Development

### Adding New Features

1. Create component in `/components/admin/`
2. Add page in `/app/admin/`
3. Create API route in `/app/api/admin/`
4. Update sidebar navigation
5. Add to documentation

### Testing

```bash
# Run dev server
npm run dev

# Navigate to admin panel
# http://localhost:3000/admin
```

## Version

Current version: 1.0.0

---

**Built with**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Supabase
