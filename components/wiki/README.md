# Wiki Page UI Components

Complete component system for rendering Mother's Almanac wiki pages with rich features, accessibility, and responsive design.

## Overview

The wiki UI components provide a comprehensive system for displaying generated wiki content with:

- **Responsive layout** (mobile-first design)
- **Table of contents** (desktop sidebar + mobile collapsible)
- **Source attribution** (expandable source citations)
- **Confidence indicators** (visual quality badges)
- **Related pages** (contextual navigation)
- **Print optimization** (clean print-friendly styling)
- **Accessibility** (WCAG AA compliant, semantic HTML, ARIA labels)

## Components

### Main Component

#### `WikiPageContent.tsx`
The primary component that renders a complete wiki page with all features.

```tsx
import { WikiPageContent } from '@/components/wiki'

<WikiPageContent
  page={wikiPage}
  relatedPages={relatedPages}
/>
```

**Props:**
- `page: WikiPage` - The wiki page data (required)
- `relatedPages?: Array<{slug, title, strength}>` - Optional related pages (falls back to page.metadata.related_pages)

**Features:**
- Three-column responsive layout (TOC, content, sidebar)
- Breadcrumb navigation
- Page metadata (views, reading time, last updated)
- Confidence badge
- Mobile-optimized collapsible sections

### Content Components

#### `MarkdownContent.tsx`
Renders markdown content with custom components and wiki link styling.

```tsx
<MarkdownContent content={markdownString} />
```

**Features:**
- GitHub Flavored Markdown (tables, task lists, strikethrough)
- Auto-linked headings with scroll anchors
- Custom callout blocks for blockquotes
- Syntax-highlighted code blocks with copy button
- Wiki link styling based on confidence
- External link indicators

#### `TableOfContents.tsx`
Auto-generated table of contents with active section tracking.

```tsx
<TableOfContents sections={sections} />
```

**Features:**
- Intersection Observer for active section highlighting
- Smooth scroll navigation
- Nested heading support (h2, h3)
- Sticky positioning on desktop

#### `PageMetadata.tsx`
Displays page statistics and metadata.

```tsx
<PageMetadata
  viewCount={1247}
  lastUpdated="2024-01-20T15:30:00Z"
  readingTime={8}
/>
```

**Features:**
- View count
- Reading time estimate
- Last updated timestamp (relative time)
- Icon indicators

### Sidebar Components

#### `SourceAttribution.tsx`
Expandable source citation list.

```tsx
<SourceAttribution sources={['doc-123', 'doc-456']} />
```

**Features:**
- Collapsible design (starts collapsed)
- Lazy-loads source details on expand
- Numbered citations
- Source metadata display (title, author, type)

#### `RelatedPages.tsx`
Shows contextually related wiki pages.

```tsx
<RelatedPages pages={relatedPages} />
```

**Features:**
- Up to 8 related pages
- Hover effects with arrow indicators
- Sorted by relevance (strength score)

#### `ChatTrigger.tsx`
Button to open chat interface with page context.

```tsx
<ChatTrigger pageContext={slug} />
```

**Features:**
- Context-aware chat initialization
- Integration point for AI chat system

### UI Components

#### `ConfidenceBadge.tsx`
Visual indicator of content confidence/quality.

```tsx
<ConfidenceBadge score={0.85} />
```

**Badge Levels:**
- **High (≥80%)**: Green - "High Confidence"
- **Medium (60-79%)**: Blue - "Medium Confidence"
- **Low (40-59%)**: Yellow - "Low Confidence"
- **Very Low (<40%)**: Red - "Very Low Confidence"

**Features:**
- Tooltip with detailed description
- Percentage score display
- Color-coded visual hierarchy

#### `Breadcrumbs.tsx`
Navigation breadcrumbs generated from page slug.

```tsx
<Breadcrumbs slug="pregnancy/nutrition/calcium" />
```

**Features:**
- Auto-generated from URL structure
- Semantic navigation markup
- ARIA labels for accessibility
- Hover states

#### `Callout.tsx`
Styled callout blocks for important information.

```tsx
<Callout type="warning">Important safety information</Callout>
```

**Types:**
- `note` (blue) - General information
- `warning` (yellow) - Warnings and cautions
- `tip` (green) - Helpful tips
- `caution` (red) - Critical warnings

#### `CodeBlock.tsx`
Syntax-highlighted code blocks with copy functionality.

```tsx
<CodeBlock
  code="const example = 'code'"
  language="typescript"
/>
```

**Features:**
- Copy to clipboard button
- Language-specific highlighting (ready for syntax highlighter integration)
- Responsive overflow handling

## Utilities

### `lib/wiki/confidence.ts`
Confidence scoring and badge utilities.

```ts
import { getConfidenceBadge, calculateConfidence } from '@/lib/wiki/confidence'

const badge = getConfidenceBadge(0.85)
const score = calculateConfidence(factors)
```

**Functions:**
- `getConfidenceBadge(score)` - Get badge config from score
- `calculateConfidence(factors)` - Calculate weighted confidence score
- `calculateTopicCoverage(query, content)` - Measure on-topic content
- `analyzeConfidenceBreakdown(factors)` - Detailed scoring breakdown
- `getImprovementRecommendations(factors)` - Suggestions for improvement

### `lib/wiki/slugs.ts`
Slug and breadcrumb utilities.

```ts
import { slugify, generateBreadcrumbs, queryToSlug } from '@/lib/wiki/slugs'

const slug = queryToSlug("Pregnancy Nutrition?") // "pregnancy-nutrition"
const breadcrumbs = generateBreadcrumbs("pregnancy/nutrition/calcium")
const id = slugify("Section Heading") // "section-heading"
```

**Functions:**
- `slugify(text)` - Convert text to URL-friendly slug
- `queryToSlug(query)` - Normalize user query to slug
- `generateBreadcrumbs(slug)` - Create breadcrumb trail
- `slugToTitle(slug)` - Convert slug to human-readable title
- `isValidSlug(slug)` - Validate slug format
- `sanitizeSlug(slug)` - Security sanitization

### `lib/wiki/sections.ts`
Extract sections and calculate reading metrics.

```ts
import { extractSections, estimateReadingTime } from '@/lib/wiki/sections'

const sections = extractSections(markdown) // [{id, title, level}]
const minutes = estimateReadingTime(markdown) // 8
```

**Functions:**
- `extractSections(content)` - Parse h2/h3 headings
- `estimateReadingTime(content)` - Calculate reading time (200 wpm)

## Types

### `WikiPage`
```ts
interface WikiPage {
  id: string
  slug: string
  title: string
  content: string
  metadata: PageMetadata
  created_at: string
  updated_at: string
  generated_at: string
  view_count: number
  confidence_score: number
}
```

### `PageMetadata`
```ts
interface PageMetadata {
  description?: string
  tags?: string[]
  category?: string
  featured_image?: string
  author?: string
  status?: 'draft' | 'published' | 'archived'
  sources_used?: string[] // Document IDs
  related_pages?: Array<{
    slug: string
    title: string
    strength?: number
  }>
}
```

### `Section`
```ts
interface Section {
  id: string
  title: string
  level: number // 2 or 3 (h2/h3)
}
```

## Styling

### Custom CSS Variables

The components use Mother's Almanac design tokens:

```css
--color-almanac-sage-* /* Sage green palette */
--color-almanac-cream-* /* Cream/beige palette */
--color-almanac-earth-* /* Earth tone palette */
--color-link-strong     /* High confidence links */
--color-link-medium     /* Medium confidence links */
--color-link-weak       /* Low confidence links */
--color-link-ghost      /* Ghost/placeholder links */
```

### Prose Styling

Custom prose classes for wiki content:

```css
.prose-almanac {
  /* Serif headings in earth tones */
  /* Relaxed line height */
  /* Custom link styling */
  /* Styled code blocks */
  /* Formatted tables */
}
```

### Print Styles

Optimized print layout in `globals.css`:

- Hides navigation, sidebars, and interactive elements
- Full-width content
- Shows URL for external links
- Proper page breaks
- Simplified colors and borders

## Responsive Design

### Breakpoints

- **Mobile (<768px)**
  - Single column layout
  - Collapsible TOC at bottom
  - Stacked metadata
  - Full-width tables (horizontal scroll)

- **Tablet (768px-1024px)**
  - Two-column layout (content + sidebar OR TOC + content)
  - Improved typography spacing

- **Desktop (>1024px)**
  - Three-column layout (TOC + content + sidebar)
  - Sticky sidebars
  - Optimized reading width

## Accessibility

### WCAG AA Compliance

- ✓ Semantic HTML5 structure
- ✓ ARIA labels on navigation elements
- ✓ Focus indicators on interactive elements
- ✓ Sufficient color contrast (4.5:1)
- ✓ Keyboard navigation support
- ✓ Screen reader compatibility
- ✓ Touch-friendly target sizes (44x44px)
- ✓ Readable font sizes (16px+ body text)

### Features

- Skip links for keyboard navigation
- Proper heading hierarchy
- Alt text for icons with context
- Descriptive link text
- Form labels and error messages
- Focus management

## Performance

### Optimization Techniques

1. **Code Splitting**: Components lazy-loaded where appropriate
2. **Intersection Observer**: Efficient scroll tracking for TOC
3. **Memo/Callback**: Optimized re-renders in interactive components
4. **Static Content**: Markdown rendered client-side (cached on server)
5. **Lazy Loading**: Sources loaded on-demand when expanded

### Target Metrics

- **Lighthouse Score**: 90+ (Performance, Accessibility, Best Practices, SEO)
- **Time to Interactive**: <3s
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s

## Example Usage

### Basic Page Rendering

```tsx
import { WikiPageContent } from '@/components/wiki'
import { getWikiPage } from '@/lib/wiki/api'

export default async function WikiPage({ params }) {
  const page = await getWikiPage(params.slug)

  return <WikiPageContent page={page} />
}
```

### With Related Pages

```tsx
import { WikiPageContent } from '@/components/wiki'
import { getWikiPage, getRelatedPages } from '@/lib/wiki/api'

export default async function WikiPage({ params }) {
  const [page, related] = await Promise.all([
    getWikiPage(params.slug),
    getRelatedPages(params.slug)
  ])

  return <WikiPageContent page={page} relatedPages={related} />
}
```

### Demo Page

See `/app/wiki-demo/page.tsx` for a complete example with sample content.

## Dependencies

- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `@radix-ui/*` - UI primitives (badges, tooltips, cards)
- `tailwindcss` - Styling
- `@tailwindcss/typography` - Prose styling

## Integration

### With Existing Wiki System

The components integrate with the existing RAG wiki generation system:

1. **Generation**: `lib/wiki/generator.ts` creates pages
2. **Storage**: `lib/wiki/cache-db.ts` caches pages in Supabase
3. **Rendering**: `components/wiki/WikiPageContent.tsx` displays pages
4. **Navigation**: `components/WikiNav.tsx` provides site navigation

### API Routes

- `GET /api/wiki/[slug]` - Fetch page data
- `POST /api/wiki/generate` - Generate new page
- `GET /api/wiki/search` - Search pages

## Future Enhancements

Possible improvements:

1. **Syntax Highlighting**: Add Prism.js or highlight.js
2. **LaTeX Support**: Math equation rendering
3. **Image Optimization**: Next.js Image component integration
4. **Dark Mode**: Complete dark mode support
5. **i18n**: Internationalization support
6. **Comments**: User discussions
7. **Version History**: Page revision tracking
8. **Export**: PDF/Markdown export functionality
9. **Annotations**: Highlight and annotate content
10. **Collaborative Editing**: Multi-user editing features

## Testing

### Manual Testing Checklist

- [ ] Page renders on desktop
- [ ] Page renders on mobile
- [ ] TOC highlights active section
- [ ] Breadcrumbs navigate correctly
- [ ] Source attribution expands/collapses
- [ ] Related pages link correctly
- [ ] Confidence badge displays tooltip
- [ ] Code blocks copy functionality
- [ ] Print layout is clean
- [ ] Keyboard navigation works
- [ ] Screen reader announces content properly

### Automated Testing

```bash
# TypeScript type checking
npm run build

# Lint checks
npm run lint

# Unit tests (when implemented)
npm test

# E2E tests (when implemented)
npm run test:e2e
```

## Troubleshooting

### Common Issues

**Issue**: TypeScript errors about missing properties
- **Solution**: Ensure database types are up-to-date (`npm run generate:types`)

**Issue**: Markdown not rendering
- **Solution**: Check `react-markdown` and `remark-gfm` are installed

**Issue**: TOC not highlighting
- **Solution**: Verify heading IDs match section slugs

**Issue**: Print styles not working
- **Solution**: Check `@media print` rules in globals.css

**Issue**: Related pages not showing
- **Solution**: Verify `page.metadata.related_pages` is populated

## License

Part of Mother's Almanac project - see main LICENSE file.
