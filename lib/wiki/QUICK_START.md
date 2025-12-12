# Quick Start Guide - Wiki Entity Extraction & Smart Linking

## 5-Minute Setup

### 1. Run the Migration

Using Supabase MCP (as per your project setup):

```bash
# Apply the migration
# Use your Supabase MCP tools to run:
# /supabase/migrations/003_wiki_links_schema.sql
```

This creates:
- `wiki_pages` table
- `link_candidates` table
- `page_connections` table
- Helper functions and indexes

### 2. Verify Environment Variables

Ensure you have:
```bash
ANTHROPIC_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Test Entity Extraction

Create a simple test file:

```typescript
// test-wiki-links.ts
import { extractEntities } from '@/lib/wiki'

const testContent = `
# Sleep Training

Many parents struggle with sleep training their babies.
Common methods include the Ferber method and gentle approaches.
Teething can disrupt sleep patterns, making it more challenging.
Around 4-6 months, babies develop better sleep cycles.
`

async function test() {
  const entities = await extractEntities(testContent, 'Sleep Training')
  console.log('Extracted entities:', entities)
}

test()
```

Run:
```bash
npx tsx test-wiki-links.ts
```

Expected output:
```
Extracted entities: [
  {
    text: 'Ferber method',
    normalizedSlug: 'ferber-method',
    type: 'technique',
    confidence: 'strong',
    ...
  },
  {
    text: 'teething',
    normalizedSlug: 'teething',
    type: 'symptom',
    confidence: 'strong',
    ...
  }
]
```

### 4. Integrate with Your Generation

Update your wiki page generation:

```typescript
// Before:
import { generateWikiPage } from '@/lib/wiki/generation'

const page = await generateWikiPage(slug)
await storePage(page)

// After:
import { generatePageWithLinks } from '@/lib/wiki'
import { generateWikiPage } from '@/lib/wiki/generation'

const page = await generatePageWithLinks(slug, generateWikiPage)

// Store the linked content
await supabase.from('wiki_pages').upsert({
  slug: page.slug,
  title: page.title,
  content: page.content,           // Original
  linked_content: page.linkedContent, // With smart links
  summary: page.summary,
  status: 'published'
})
```

### 5. Update Page Rendering

In your wiki page component:

```tsx
// app/wiki/[slug]/page.tsx
export default async function WikiPage({ params }: { params: { slug: string } }) {
  const { data: page } = await supabase
    .from('wiki_pages')
    .select('*')
    .eq('slug', params.slug)
    .single()

  return (
    <div className="prose-almanac">
      {/* Use linked_content instead of content */}
      <div dangerouslySetInnerHTML={{ __html:
        marked(page.linked_content || page.content)
      }} />
    </div>
  )
}
```

### 6. Access Admin UI

Navigate to:
```
http://localhost:3000/admin/links
```

You'll see:
- Link candidate statistics
- Suggested pages to create
- Most connected pages
- Graph health metrics

### 7. Batch Process Existing Pages (Optional)

If you have existing wiki pages:

```bash
# Test on first 5 pages (dry run)
npx tsx scripts/extract-all-entities.ts --limit 5 --dry-run

# Process all pages
npx tsx scripts/extract-all-entities.ts
```

## Common Use Cases

### Use Case 1: Generate a Single Page

```typescript
import { generatePageWithLinks } from '@/lib/wiki'
import { generateWikiPage } from '@/lib/wiki/generation'

const page = await generatePageWithLinks('sleep-training', generateWikiPage)
console.log(`Generated with ${page.linkCount} smart links`)
```

### Use Case 2: Get Suggested Pages

```typescript
import { getSuggestedPages } from '@/lib/wiki'

const suggestions = await getSuggestedPages(20)
suggestions.forEach(s => {
  console.log(`${s.entity}: ${s.mentionedCount} mentions, ${s.confidence} confidence`)
})
```

### Use Case 3: Show Related Pages

```typescript
import { getRelatedPages } from '@/lib/wiki'

const related = await getRelatedPages('sleep-training')
// Display in sidebar as "Related Topics"
```

### Use Case 4: Graph Statistics

```typescript
import { getGraphStats } from '@/lib/wiki'

const stats = await getGraphStats()
console.log(`${stats.totalPages} pages, ${stats.totalConnections} connections`)
console.log(`Avg ${stats.avgConnectionsPerPage} connections per page`)
```

## Visual Guide

### Link Appearance

When you view a wiki page, you'll see:

- **Green solid underline**: Page exists (click to navigate)
- **Blue underline**: No page yet, but will generate well
- **Dotted underline**: Partial information available
- **Gray dashed**: Minimal information

Example:
```
Many parents use [sleep training](/wiki/sleep-training){: .wiki-link-strong}
to help their babies learn to self-soothe. Common issues include
[teething](/wiki/teething){: .wiki-link-medium} and
[separation anxiety](/wiki/separation-anxiety){: .wiki-link-weak}.
```

### Admin Dashboard

The `/admin/links` page shows:

1. **Statistics Cards**
   - Total candidates
   - Strong confidence count
   - Total pages in graph
   - Average connections

2. **Most Connected Pages**
   - Hub pages with many incoming links
   - Connection count
   - Quick view links

3. **Suggested Pages to Create**
   - Sorted by mention frequency
   - Confidence indicators
   - Generate buttons

## Troubleshooting

### Problem: No entities extracted

**Solution**: Check Claude API key
```bash
echo $ANTHROPIC_API_KEY
```

### Problem: Links not appearing

**Solution**: Verify CSS classes loaded
- Check `app/globals.css` has wiki-link classes
- Clear browser cache
- Check browser console for errors

### Problem: Database errors

**Solution**: Verify migration ran successfully
```sql
-- Check tables exist
SELECT * FROM wiki_pages LIMIT 1;
SELECT * FROM link_candidates LIMIT 1;
SELECT * FROM page_connections LIMIT 1;
```

### Problem: Admin page not accessible

**Solution**: Check admin authentication
- Ensure user has `role = 'admin'` in `user_profiles`
- Check middleware protecting `/admin/*` routes

## Next Steps

1. ✅ Run migration
2. ✅ Test entity extraction
3. ✅ Integrate with generation
4. ✅ Update page rendering
5. ✅ Access admin UI
6. Generate first page and verify links appear
7. Create suggested pages
8. Monitor graph growth

## Success Metrics

After setup, you should see:
- ✅ Entities extracted from pages
- ✅ Smart links with colored styling
- ✅ Link candidates accumulating
- ✅ Page graph growing
- ✅ Related pages showing
- ✅ Admin dashboard populating

## Get Help

See full documentation:
- `lib/wiki/README.md` - Complete API reference
- `lib/wiki/IMPLEMENTATION.md` - Implementation details
- `lib/wiki/example-integration.ts` - Code examples

---

**Ready to go! Start by running the migration and testing entity extraction.**
