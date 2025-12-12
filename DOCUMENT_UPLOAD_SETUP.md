# Document Upload System - Setup & Testing Guide

## Overview

Complete document upload system for Mother's Almanac admin dashboard with drag-and-drop file uploads, metadata management, processing status tracking, and storage integration.

## Features Implemented

### 1. Admin Dashboard Page (`/app/admin/documents/page.tsx`)
- ✅ Protected admin-only route
- ✅ Document list with grid layout using DocumentCard components
- ✅ Statistics cards showing:
  - Total Documents
  - Total Chunks
  - Processed Today
  - Failed Documents
- ✅ Filter by status (all, pending, processing, completed, failed)
- ✅ Search by title or author
- ✅ Pagination (10 per page)
- ✅ Upload button opening modal
- ✅ Empty state with call-to-action
- ✅ Responsive design

### 2. Upload Modal (`/components/admin/DocumentUploadModal.tsx`)
- ✅ Drag-and-drop file upload
- ✅ Multi-file support
- ✅ File preview list with remove option
- ✅ Metadata form for each file:
  - Title (auto-filled from filename, editable)
  - Author (text input)
  - Source Type (dropdown: book, article, pdf, website, other)
- ✅ Progress bar during upload
- ✅ File validation (type and size)
- ✅ Success/error toasts using Sonner
- ✅ Accepts PDF, TXT, DOCX files (max 50MB)

### 3. Document Card Component (`/components/admin/DocumentCard.tsx`)
- ✅ Display document metadata
- ✅ Color-coded status badges
- ✅ Action menu with:
  - View chunks (placeholder)
  - Re-process document
  - Download original file
  - Delete with confirmation dialog
- ✅ File size and chunk count display
- ✅ Relative timestamps

### 4. API Routes

#### `/app/api/admin/documents/upload/route.ts`
- ✅ POST handler for file uploads
- ✅ Multipart form data handling
- ✅ Admin authentication required
- ✅ File validation (type and size)
- ✅ Upload to Supabase Storage
- ✅ Insert document record in database
- ✅ Error handling and validation

#### `/app/api/admin/documents/route.ts`
- ✅ GET: List documents with pagination, filtering, and search
- ✅ DELETE: Remove document and associated chunks
- ✅ Statistics calculation
- ✅ Admin authentication required

#### `/app/api/admin/documents/[id]/reprocess/route.ts`
- ✅ POST: Trigger document reprocessing
- ✅ Reset status to pending
- ✅ Clear existing chunks
- ✅ Admin authentication required

#### `/app/api/admin/documents/[id]/download/route.ts`
- ✅ GET: Generate signed download URL
- ✅ 1-hour expiration
- ✅ Admin authentication required

### 5. Storage Helper (`/lib/supabase/storage.ts`)
- ✅ `uploadDocument()` - Upload files to Supabase Storage
- ✅ `downloadDocument()` - Get signed URLs
- ✅ `deleteDocument()` - Remove files
- ✅ `validateFile()` - File type and size validation
- ✅ Path structure: `{userId}/{timestamp}-{filename}`

### 6. Types (`/types/wiki.ts`)
- ✅ `DocumentStatus` type
- ✅ `SourceType` type
- ✅ `Document` interface
- ✅ `DocumentCreateInput` interface
- ✅ `DocumentUpdateInput` interface
- ✅ `DocumentChunk` interface

### 7. Database Migration (`/supabase/migrations/002_documents_schema.sql`)
- ✅ `documents` table with metadata
- ✅ `document_chunks` table with embeddings
- ✅ RLS policies (admin full access, users read completed)
- ✅ Indexes for performance
- ✅ Vector similarity search index (ivfflat)
- ✅ Storage bucket creation
- ✅ Storage RLS policies
- ✅ Cascade deletion for chunks

### 8. UI/UX Enhancements
- ✅ Sonner toast notifications
- ✅ Loading skeletons
- ✅ Empty states
- ✅ Responsive design
- ✅ Helper components (StatCard, StatusBadge)
- ✅ Toaster added to root layout

## Setup Instructions

### 1. Install Dependencies (Already Done)
```bash
npm install react-dropzone sonner
# shadcn components already added: table, select, sonner
```

### 2. Run Database Migration

Using Supabase MCP:
```bash
# Apply the migration to your remote Supabase instance
supabase db push
```

Or manually via Supabase Dashboard SQL Editor:
```sql
-- Copy and paste the contents of:
-- /supabase/migrations/002_documents_schema.sql
```

### 3. Create Supabase Storage Bucket

The migration includes bucket creation, but verify in Supabase Dashboard:

1. Go to **Storage** in Supabase Dashboard
2. Verify bucket **"documents"** exists with:
   - **Name**: documents
   - **Public**: false (private)
   - **File size limit**: 50MB (52428800 bytes)
   - **Allowed MIME types**:
     - `application/pdf`
     - `text/plain`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

3. If bucket doesn't exist, create it manually with above settings

### 4. Verify Permissions

Ensure your admin user has the admin role:
```sql
-- Check your current role
SELECT id, email, role FROM user_profiles WHERE email = 'your-email@example.com';

-- If not admin, update:
UPDATE user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 5. Enable pgvector Extension (if not already enabled)

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

## Test Checklist

### Basic Upload Flow
- [ ] Navigate to `/admin/documents`
- [ ] Click "Upload Documents" button
- [ ] Drag and drop a PDF file
- [ ] Verify file appears in preview list
- [ ] Edit title and author fields
- [ ] Select source type
- [ ] Click "Upload"
- [ ] Verify success toast appears
- [ ] Verify document appears in list with "Pending" status

### Multiple File Upload
- [ ] Open upload modal
- [ ] Add multiple files (PDF, TXT, DOCX)
- [ ] Edit metadata for each file
- [ ] Upload all files
- [ ] Verify all documents appear in list

### File Validation
- [ ] Try uploading a file larger than 50MB (should show error)
- [ ] Try uploading an unsupported file type (e.g., .jpg) (should show error)
- [ ] Try uploading without a title (should show error)

### Search and Filter
- [ ] Use search box to find documents by title
- [ ] Use search box to find documents by author
- [ ] Filter by status: pending, processing, completed, failed
- [ ] Verify pagination works correctly

### Document Actions
- [ ] Click dropdown menu on a document
- [ ] Click "Download Original" (should open download)
- [ ] Click "Re-process" (should change status to pending)
- [ ] Click "Delete" (should show confirmation dialog)
- [ ] Confirm deletion (document should be removed)

### Statistics Cards
- [ ] Verify "Total Documents" count is accurate
- [ ] Verify "Total Chunks" count updates (after processing)
- [ ] Verify "Processed Today" shows recent documents
- [ ] Verify "Failed" count shows failed documents

### Responsive Design
- [ ] Test on mobile viewport (320px+)
- [ ] Test on tablet viewport (768px+)
- [ ] Test on desktop viewport (1024px+)
- [ ] Verify cards stack properly
- [ ] Verify upload modal is scrollable

### Error Handling
- [ ] Test with network disconnected (should show error toast)
- [ ] Test deleting non-existent document (should show error)
- [ ] Test downloading document with missing file (should show error)

## File Structure

```
/Users/eddowding/Sites/mothersalmanac/
├── app/
│   ├── admin/
│   │   └── documents/
│   │       └── page.tsx                    # Main documents admin page
│   ├── api/
│   │   └── admin/
│   │       └── documents/
│   │           ├── route.ts                # GET list, DELETE document
│   │           ├── upload/
│   │           │   └── route.ts           # POST upload
│   │           └── [id]/
│   │               ├── download/
│   │               │   └── route.ts       # GET download URL
│   │               └── reprocess/
│   │                   └── route.ts       # POST reprocess
│   └── layout.tsx                          # Added Toaster
├── components/
│   ├── admin/
│   │   ├── DocumentCard.tsx               # Document card component
│   │   ├── DocumentUploadModal.tsx        # Upload modal
│   │   ├── StatCard.tsx                   # Statistics card
│   │   └── StatusBadge.tsx                # Status badge
│   └── ui/
│       ├── dialog.tsx
│       ├── select.tsx
│       ├── sonner.tsx
│       └── table.tsx
├── lib/
│   └── supabase/
│       └── storage.ts                      # Storage helper functions
├── types/
│   └── wiki.ts                             # Document types
└── supabase/
    └── migrations/
        └── 002_documents_schema.sql        # Database schema
```

## Next Steps

### 1. Implement Document Processing
The upload system creates documents with "pending" status. You'll need to implement:

- Background job processor to:
  - Read uploaded files from storage
  - Extract text content (PDF parsing, DOCX parsing)
  - Split into chunks
  - Generate embeddings using OpenAI
  - Store chunks in `document_chunks` table
  - Update document status to "completed" or "failed"

### 2. Add Document Viewer
- Create `/admin/documents/[id]/page.tsx` to view document details
- Display chunks with embeddings
- Show processing logs/errors

### 3. Implement RAG Query System
- Use document chunks for answering questions
- Semantic search using vector embeddings
- Context retrieval for chat responses

### 4. Add Bulk Actions
- Select multiple documents
- Bulk delete
- Bulk reprocess
- Bulk status updates

### 5. Enhanced Monitoring
- Real-time processing status updates
- Processing queue visualization
- Error logs and debugging tools
- Storage usage tracking

## Troubleshooting

### Upload fails with "Unauthorized"
- Verify you're logged in as an admin user
- Check `user_profiles` table for correct role
- Verify `is_admin()` function exists in database

### Storage bucket not found
- Create bucket manually in Supabase Dashboard
- Verify bucket name is exactly "documents"
- Check storage policies are applied

### Files not uploading
- Check browser console for errors
- Verify file size is under 50MB
- Verify file type is PDF, TXT, or DOCX
- Check Supabase Storage quota

### Migration fails
- Ensure pgvector extension is installed
- Run migrations in order (001 before 002)
- Check for conflicting table/policy names
- Verify database permissions

### RLS blocking access
- Verify admin user has role = 'admin' in user_profiles
- Check `is_admin()` function returns true
- Test policies using Supabase SQL Editor

## Security Notes

- All routes require admin authentication
- File uploads are validated on both client and server
- Storage bucket is private (no public access)
- RLS policies prevent unauthorized access
- Signed URLs expire after 1 hour
- File paths include user ID for isolation

## Performance Considerations

- Pagination limits results to 10 per page
- Vector index (ivfflat) optimizes embedding search
- Indexes on common query fields (status, upload_date)
- Full-text search on title and content
- Lazy loading for document list
- Optimistic updates for better UX

## Cost Considerations

- Storage: ~$0.021/GB/month (Supabase)
- Bandwidth: First 250GB free, then $0.09/GB
- Embeddings: ~$0.10/1M tokens (OpenAI ada-002)
- Processing: Consider implementing rate limits

---

**Implementation Complete**: All core features are implemented and ready for testing. Follow the setup instructions above to configure your Supabase instance and start testing the document upload system.
