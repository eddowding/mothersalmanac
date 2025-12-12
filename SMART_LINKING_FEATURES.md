# Smart Linking & Advanced UX Features

## Overview

This document describes the smart linking and advanced UX features implemented for Mother's Almanac wiki system. These features create an intelligent, interconnected knowledge base with superior user experience.

## Features Implemented

### 1. Link Intelligence System (`/lib/links/analyzer.ts`)

**Purpose**: Analyzes content to identify potential wiki links with confidence scoring.

**Key Functions**:
- `analyzeLinkCandidates(content)` - Extract and analyze potential link candidates from content
- `checkWikiPageExists(slug)` - Verify if a page exists for a given slug
- `getLinkStrength(slug)` - Calculate link strength based on multiple factors
- `getRelatedLinks(slug, limit)` - Find related pages based on entity co-occurrence
- `findBrokenLinks(slug)` - Identify links to non-existent pages
- `suggestPagesToCreate(limit)` - Recommend high-value pages to create

**Link Confidence Levels**:
- **Strong**: Page exists with good content (green)
- **Medium**: Page exists or frequently mentioned (blue)
- **Weak**: Limited knowledge available (dotted amber)
- **Ghost**: Mentioned but sparse data (gray)

### 2. SmartLink Component (`/components/wiki/SmartLink.tsx`)

**Purpose**: Intelligent wiki links with confidence-based styling and hover previews.

**Features**:
- Color-coded by confidence level
- Hover preview with page snippet
- Loading states
- Keyboard accessible (ESC to close)
- Position-aware (avoids viewport overflow)
- Confidence icons (optional)

**Usage**:
```tsx
import { SmartLink, SmartLinkCompact } from '@/components/wiki'

<SmartLink href="/wiki/sleep-training" confidence="strong" showIcon>
  Sleep Training
</SmartLink>

<SmartLinkCompact href="/wiki/teething" confidence="medium">
  Teething
</SmartLinkCompact>
```

### 3. Backlinks Component (`/components/wiki/Backlinks.tsx`)

**Purpose**: Shows pages that link to the current page (bidirectional discovery).

**Features**:
- Lists all referring pages
- Shows link context (anchor text)
- Displays link strength indicator
- Sorted by relevance
- Compact count variant

**Usage**:
```tsx
import { Backlinks, BacklinksCount } from '@/components/wiki'

// Full backlinks component
<Backlinks slug="sleep-training" />

// Compact count display
<BacklinksCount slug="sleep-training" />
```

### 4. Enhanced RelatedPages Component (`/components/wiki/RelatedPages.tsx`)

**Purpose**: Suggests similar topics based on entity overlap and link connections.

**Features**:
- Bidirectional link analysis
- Strength-based sorting
- Visual strength indicators
- "You might also like" section
- Compact sidebar variant

**Usage**:
```tsx
import { RelatedPages, RelatedPagesCompact } from '@/components/wiki'

// Full component
<RelatedPages slug="newborn-care" limit={8} />

// Compact sidebar version
<RelatedPagesCompact slug="newborn-care" limit={5} />
```

### 5. KnowledgeGraph Visualization (`/components/wiki/KnowledgeGraph.tsx`)

**Purpose**: Interactive D3.js force-directed graph visualization of wiki pages.

**Features**:
- Force-directed layout with physics simulation
- Node size based on view count
- Color coding by topic category
- Click to navigate to page
- Zoom and pan controls
- Hover highlighting of connections
- Current page highlighting
- Draggable nodes

**Categories & Colors**:
- Age-range: Green
- Symptom: Red
- Technique: Blue
- Product: Purple
- Concept: Gray

**Usage**:
```tsx
import { KnowledgeGraph } from '@/components/wiki'

<KnowledgeGraph currentSlug="sleep-training" maxNodes={50} />
```

**API Endpoint**: `/api/wiki/graph?maxNodes=50`

### 6. ReadingModeSelector (`/components/wiki/ReadingModeSelector.tsx`)

**Purpose**: Toggle between different reading modes with localStorage persistence.

**Reading Modes**:
- **Quick**: Key facts, bullet points, summaries
- **Deep**: Full comprehensive content (default)
- **Source**: Heavy citations, footnotes, references

**Features**:
- Persists preference in localStorage
- Body class injection for CSS targeting
- Dropdown menu with descriptions
- Badge component for compact displays
- React hook for mode detection

**Usage**:
```tsx
import { ReadingModeSelector, ReadingModeBadge, useReadingMode } from '@/components/wiki'

// Full selector
<ReadingModeSelector onModeChange={(mode) => console.log(mode)} />

// Badge display
<ReadingModeBadge />

// Hook in components
function MyComponent() {
  const mode = useReadingMode()
  return <div>Current mode: {mode}</div>
}
```

**CSS Targeting**:
```css
body.reading-mode-quick .deep-only { display: none; }
body.reading-mode-source .quick-only { display: none; }
```

### 7. PageRegenerationUI (`/components/wiki/PageRegenerationUI.tsx`)

**Purpose**: Allows admins to regenerate pages and users to request updates.

**Features**:
- Admin: Full regenerate with confirmation dialog
- User: Request update (queued for review)
- Show current version metadata
- Generation history viewer
- Version comparison (future)
- Loading states

**Usage**:
```tsx
import { PageRegenerationUI } from '@/components/wiki'

<PageRegenerationUI
  slug="sleep-training"
  isAdmin={true}
  currentVersion={{
    generatedAt: '2024-01-15T10:00:00Z',
    model: 'claude-sonnet-4-5',
    confidenceScore: 0.85
  }}
/>
```

**API Endpoints**:
- `POST /api/wiki/regenerate` - Trigger regeneration (admin)
- `POST /api/wiki/request-update` - Request update (user)
- `GET /api/wiki/history?slug=X` - Get generation history

### 8. InstantSearch (`/components/wiki/InstantSearch.tsx`)

**Purpose**: Real-time search with instant results as you type.

**Features**:
- Debounced search (300ms)
- Show link confidence in results
- Recent searches (localStorage)
- Popular topics
- Keyboard navigation (ESC, Enter)
- Empty state with "Generate page" option
- Loading states

**Usage**:
```tsx
import { InstantSearch } from '@/components/wiki'

<InstantSearch
  placeholder="Search wiki..."
  autoFocus={true}
  onResultClick={() => console.log('Result clicked')}
/>
```

**API Endpoints**:
- `GET /api/wiki/search?q=query&instant=true` - Instant search results
- `GET /api/wiki/popular?limit=10` - Popular topics

### 9. RabbitHole Mode (`/components/wiki/RabbitHole.tsx`)

**Purpose**: Auto-suggest next pages to read and build a reading path.

**Features**:
- AI-suggested next topics
- Build and track reading path
- Mark pages as read
- Reading progress indicator
- "Continue exploring" recommendations
- Reset/start new path
- localStorage persistence
- Compact variant

**Usage**:
```tsx
import { RabbitHole, RabbitHoleCompact } from '@/components/wiki'

// Full component
<RabbitHole currentSlug="newborn-care" />

// Compact sidebar version
<RabbitHoleCompact currentSlug="newborn-care" />
```

**API Endpoint**: `/api/wiki/suggest-next?slug=X&limit=5`

**Storage Keys**:
- `wiki-rabbit-hole-path` - Reading path
- `wiki-rabbit-hole-read` - Read pages set

### 10. Print Stylesheet & QR Codes

**Files**:
- `/app/globals-print.css` - Print-optimized styles
- `/components/wiki/PrintWrapper.tsx` - Print wrapper component

**Features**:
- Clean print layout
- Hide navigation and non-essential elements
- Include sources section
- QR code to page URL
- Print header/footer
- Optimized typography
- Page break control
- Reading mode support
- Black & white optimization

**Print Classes**:
- `.no-print` - Hidden in print
- `.print-only` - Shown only in print
- `.avoid-break` - Prevent page break inside
- `.page-break-before` - Force break before
- `.page-break-after` - Force break after

**Usage**:
```tsx
import { PrintWrapper, PrintButton } from '@/components/wiki'

<PrintWrapper
  slug="sleep-training"
  title="Sleep Training"
  generatedAt="2024-01-15T10:00:00Z"
  confidenceScore={0.85}
>
  {/* Page content */}
</PrintWrapper>

// Standalone button
<PrintButton />
```

## API Endpoints Summary

### Graph & Navigation
- `GET /api/wiki/graph?maxNodes=50` - Knowledge graph data
- `GET /api/wiki/suggest-next?slug=X&limit=5` - Next page suggestions
- `GET /api/wiki/popular?limit=10` - Popular topics

### Search
- `GET /api/wiki/search?q=query&instant=true` - Instant search results
- `GET /api/wiki/search?q=query` - Redirect search (legacy)

### Page Management
- `GET /api/wiki/preview?slug=X` - Page preview data
- `POST /api/wiki/regenerate` - Regenerate page (admin)
- `POST /api/wiki/request-update` - Request update (user)
- `GET /api/wiki/history?slug=X` - Generation history

## Integration Examples

### Full Wiki Page with All Features

```tsx
import {
  WikiPageContent,
  Backlinks,
  RelatedPages,
  RabbitHole,
  ReadingModeSelector,
  PageRegenerationUI,
  KnowledgeGraph,
  PrintWrapper
} from '@/components/wiki'

export default async function WikiPage({ params }) {
  const { slug } = await params
  const page = await getCachedPage(slug)
  const isAdmin = await checkIsAdmin()

  return (
    <PrintWrapper
      slug={slug}
      title={page.title}
      generatedAt={page.generated_at}
      confidenceScore={page.confidence_score}
    >
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <ReadingModeSelector />
              <PageRegenerationUI
                slug={slug}
                isAdmin={isAdmin}
                currentVersion={{
                  generatedAt: page.generated_at,
                  model: page.model,
                  confidenceScore: page.confidence_score
                }}
              />
            </div>

            <WikiPageContent page={page} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Backlinks slug={slug} />
            <RelatedPages slug={slug} />
            <RabbitHole currentSlug={slug} />
          </div>
        </div>

        {/* Knowledge Graph */}
        <div className="mt-12">
          <KnowledgeGraph currentSlug={slug} maxNodes={50} />
        </div>
      </div>
    </PrintWrapper>
  )
}
```

### Header with Instant Search

```tsx
import { InstantSearch } from '@/components/wiki'

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto py-4 flex items-center gap-4">
        <Logo />
        <InstantSearch
          placeholder="Search Mother's Almanac..."
          className="flex-1 max-w-2xl"
        />
        <UserMenu />
      </div>
    </header>
  )
}
```

## Dependencies

```json
{
  "dependencies": {
    "d3": "^7.9.0",
    "qrcode": "^1.5.3",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/d3": "^7.4.3",
    "@types/qrcode": "^1.5.5"
  }
}
```

## Database Tables Used

- `wiki_pages` - Main page content
- `page_connections` - Page-to-page links
- `link_candidates` - Potential links to create
- `page_update_requests` - User update requests (optional)
- `wiki_page_history` - Generation history (optional)

## Browser Compatibility

All features support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

D3.js visualizations require modern browser with:
- SVG support
- ES6 modules
- CSS Grid

## Performance Considerations

1. **Debouncing**: Instant search uses 300ms debounce
2. **Caching**: React Query with 5-minute stale time
3. **Lazy Loading**: Graph only renders when visible
4. **localStorage**: Minimal data stored (reading mode, paths)
5. **API Limits**: Reasonable defaults (5-50 items)

## Future Enhancements

- [ ] Version comparison for regenerations
- [ ] Advanced graph filtering by category
- [ ] Collaborative reading paths (share with others)
- [ ] Export reading path to PDF
- [ ] A/B testing for reading modes
- [ ] Analytics dashboard for link intelligence
- [ ] Smart link suggestions while editing
- [ ] Automated link quality scoring
- [ ] Reading progress gamification
- [ ] Related pages ML recommendations

## Credits

Built for Mother's Almanac using:
- Next.js 15
- React 19
- D3.js 7
- TanStack Query 5
- Supabase
- shadcn/ui
- Tailwind CSS 4
