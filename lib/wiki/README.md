# Mother's Almanac Wiki System

A comprehensive wiki system with intelligent entity extraction, smart linking, and page graph visualization.

## Overview

The wiki system automatically:
1. **Extracts entities** from generated content using Claude AI
2. **Tracks link candidates** to suggest new pages to create
3. **Injects smart links** with visual confidence indicators
4. **Builds a page graph** to show relationships and enable discovery
5. **Provides admin tools** to manage the growing knowledge base

## Architecture

```
lib/wiki/
├── types.ts                    # Core type definitions
├── entities.ts                 # Entity extraction with Claude
├── link-candidates.ts          # Link candidate management
├── link-injection.ts           # Markdown link injection
├── graph.ts                    # Page connection graph
├── generation-with-links.ts    # Complete generation pipeline
└── index.ts                    # Public API
```

## Link Confidence Levels

### Strong (Green)
- **Visual**: Solid green underline
- **Meaning**: Page exists with high-quality content
- **Action**: Click to navigate

### Medium (Blue)
- **Visual**: Blue underline
- **Meaning**: No page yet, but will generate well (strong entity confidence)
- **Action**: Click to generate high-quality page

### Weak (Dotted)
- **Visual**: Dotted underline
- **Meaning**: Partial information available
- **Action**: Click to generate page with caveats

### Ghost (Gray)
- **Visual**: Gray dashed underline
- **Meaning**: Minimal information available
- **Action**: May generate stub page

## Usage

### Basic Page Generation with Links

```typescript
import { generatePageWithLinks } from '@/lib/wiki'
import { generateWikiPage } from '@/lib/wiki/generation' // Your existing function

const page = await generatePageWithLinks(
  'sleep-training',
  generateWikiPage
)

// Returns:
// {
//   title: "Sleep Training",
//   content: "Original content...",
//   linkedContent: "Content with [links](/wiki/teething){: .wiki-link-strong}",
//   entities: [...],
//   linkCount: 15,
//   existingLinkCount: 8,
//   candidateLinkCount: 7
// }
```

### Get Suggested Pages to Create

```typescript
import { getSuggestedPages } from '@/lib/wiki'

const suggestions = await getSuggestedPages(20)

// Returns pages sorted by mention frequency:
// [
//   {
//     entity: "colic",
//     normalizedSlug: "colic",
//     confidence: "strong",
//     mentionedCount: 12,
//     pageExists: false
//   },
//   ...
// ]
```

### Get Related Pages

```typescript
import { getRelatedPages } from '@/lib/wiki'

const related = await getRelatedPages('sleep-training', 10)

// Returns:
// [
//   {
//     slug: "teething",
//     title: "Teething",
//     strength: 0.9  // High connection strength
//   },
//   ...
// ]
```

### Extract Entities from Content

```typescript
import { extractEntities } from '@/lib/wiki'

const entities = await extractEntities(
  content,
  "Sleep Training"
)

// Returns:
// [
//   {
//     text: "teething",
//     normalizedSlug: "teething",
//     type: "symptom",
//     confidence: "strong",
//     context: "Many babies experience teething discomfort...",
//     startIndex: 123,
//     endIndex: 131
//   },
//   ...
// ]
```

## Database Schema

### wiki_pages
Stores generated wiki pages with metadata.

```sql
CREATE TABLE wiki_pages (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  linked_content TEXT,  -- Content with links injected
  summary TEXT,
  confidence_score FLOAT,
  status TEXT DEFAULT 'published',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### link_candidates
Tracks entities that could become pages.

```sql
CREATE TABLE link_candidates (
  id UUID PRIMARY KEY,
  entity TEXT NOT NULL,
  normalized_slug TEXT UNIQUE NOT NULL,
  confidence TEXT DEFAULT 'weak',  -- strong | weak | ghost
  mentioned_count INTEGER DEFAULT 1,
  page_exists BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
```

### page_connections
Stores the page graph (directed edges).

```sql
CREATE TABLE page_connections (
  id UUID PRIMARY KEY,
  from_slug TEXT NOT NULL,
  to_slug TEXT NOT NULL,
  link_text TEXT NOT NULL,
  strength FLOAT DEFAULT 0.5,  -- 0-1 based on confidence
  UNIQUE(from_slug, to_slug)
);
```

## Admin Interface

Access at `/admin/links` to:
- View link candidate statistics
- See suggested pages to create (sorted by mentions)
- Explore most connected pages
- Track graph growth

## Batch Processing

Re-extract entities from all existing pages:

```bash
# Dry run (preview)
npx tsx scripts/extract-all-entities.ts --dry-run

# Process first 5 pages (testing)
npx tsx scripts/extract-all-entities.ts --limit 5

# Process all pages
npx tsx scripts/extract-all-entities.ts
```

## Migration

Run the database migration:

```bash
# Using Supabase MCP
supabase db push supabase/migrations/003_wiki_links_schema.sql
```

This creates:
- `wiki_pages` table
- `link_candidates` table
- `page_connections` table
- Helper functions (`get_related_pages`, `increment_page_views`, etc.)
- RLS policies for secure access

## Performance Considerations

### Entity Extraction
- Uses Claude 3.5 Sonnet for quality
- Caches results in database
- Rate limited to ~1 page/second

### Link Injection
- Processes entities backwards to maintain positions
- Only links first occurrence of each entity
- Checks for existing markdown links to avoid double-linking

### Graph Queries
- Indexed on `from_slug` and `to_slug`
- Includes strength-based sorting
- Bidirectional relationships are detected

### Scaling
- Batch operations use chunking (50 items/batch)
- Connection updates use upserts
- Read-heavy operations are cached

## CSS Classes

```css
.wiki-link-strong {
  /* Green - page exists */
  color: hsl(138 50% 40%);
  text-decoration: underline;
}

.wiki-link-medium {
  /* Blue - will generate well */
  color: hsl(220 80% 50%);
  text-decoration: underline;
}

.wiki-link-weak {
  /* Dotted - partial info */
  color: hsl(220 10% 60%);
  border-bottom: 1px dotted;
}

.wiki-link-ghost {
  /* Gray - minimal info */
  color: hsl(220 10% 85%);
  opacity: 0.6;
}
```

## Example Workflow

1. **Generate page**: User requests `/wiki/sleep-training`
2. **Extract entities**: Claude identifies 15 linkable concepts
3. **Store candidates**: All entities saved as link candidates
4. **Check existence**: 8 entities have existing pages
5. **Inject links**: Links added with appropriate styling
6. **Record graph**: 15 connections added to page graph
7. **Display**: Page shows with smart links

## Future Enhancements

- [ ] Visual graph explorer (D3.js/Cytoscape)
- [ ] Link validation (detect broken links)
- [ ] Automatic page regeneration when confidence improves
- [ ] Cluster detection (find topic groups)
- [ ] Orphan page detection and suggestions
- [ ] Link strength decay over time
- [ ] User feedback on link quality

## API Reference

See `lib/wiki/index.ts` for the complete public API.

### Key Functions

- `generatePageWithLinks()` - Main generation pipeline
- `extractEntities()` - Extract entities from content
- `getSuggestedPages()` - Get pages to create
- `getRelatedPages()` - Get connected pages
- `getBacklinks()` - Get incoming links
- `getGraphStats()` - Get graph statistics

## Troubleshooting

### No entities extracted
- Check ANTHROPIC_API_KEY is set
- Verify content has meaningful text
- Check Claude API quota

### Links not appearing
- Verify entities have valid positions
- Check for existing markdown links
- Confirm CSS classes are loaded

### Graph not updating
- Check page_connections table
- Verify recordPageConnections() is called
- Check RLS policies

## Support

For issues or questions, see the main project README or contact the development team.
