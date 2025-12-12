# Wiki UI Components Documentation

## Overview

Beautiful, accessible wiki page UI components for Mother's Almanac built with React, TypeScript, Tailwind CSS, and shadcn/ui.

## Components Created

### 1. WikiPage (`/components/wiki/WikiPage.tsx`)

Main wiki page component with responsive grid layout.

**Features:**
- Responsive design with sidebar TOC on desktop (hidden on mobile)
- Auto-generated table of contents from headings
- Source attribution section
- Page metadata and footer
- Semantic HTML with accessibility

**Props:**
```typescript
interface Props {
  page: WikiPageType
}
```

**Usage:**
```tsx
import { WikiPage } from '@/components/wiki/WikiPage'
<WikiPage page={pageData} />
```

---

### 2. PageHeader (`/components/wiki/PageHeader.tsx`)

Page header with title and metadata bar.

**Features:**
- Confidence badge with color coding (high/medium/low)
- View count, reading time, last updated
- Source count with tooltip
- Responsive metadata layout
- Dark mode support

**Props:**
```typescript
interface Props {
  title: string
  metadata: PageMetadata
  confidence: number
  viewCount: number
  generatedAt: string
}
```

**Confidence Levels:**
- High (>80%): Green badge - "Well-sourced"
- Medium (60-80%): Yellow badge - "Moderately sourced"
- Low (<60%): Gray badge - "Limited sources"

---

### 3. MarkdownRenderer (`/components/wiki/MarkdownRenderer.tsx`)

Enhanced markdown renderer with custom components.

**Features:**
- Auto-linking of entities (first occurrence only)
- Syntax highlighting for code blocks (Prism)
- Hover previews for internal wiki links
- Custom styling for all markdown elements
- Anchor links on headings (scroll-margin-top for fixed nav)
- External link indicators
- Responsive tables
- Accessible semantic HTML

**Props:**
```typescript
interface Props {
  content: string
  entities?: EntityLink[]
}
```

**Entity Auto-linking:**
The renderer automatically converts entity mentions to wiki links. Entities are sorted by length (longest first) to avoid partial matches, and only the first occurrence is linked.

---

### 4. LinkWithPreview (`/components/wiki/LinkWithPreview.tsx`)

Internal wiki link with hover preview card.

**Features:**
- Lazy loading of preview data (React Query)
- Smart positioning (top/bottom based on viewport)
- Loading states with skeleton
- Keyboard accessible (Escape to close, focus management)
- 5-minute cache for previews
- Responsive card sizing

**Props:**
```typescript
interface Props {
  href: string
  children: React.ReactNode
}
```

**Preview API:**
Fetches from `/api/wiki/preview?slug={slug}` which returns:
```typescript
{
  title: string
  excerpt: string
  confidence_score?: number
}
```

---

### 5. TableOfContents (`/components/wiki/TableOfContents.tsx`)

Auto-generated table of contents with active section tracking.

**Features:**
- Intersection Observer for active section highlighting
- Nested heading support (h2, h3)
- Smooth scroll with scroll-margin
- Sticky positioning on desktop
- Accessible navigation

**Props:**
```typescript
interface Props {
  sections: Section[]
}

interface Section {
  id: string
  title: string
  level: number
}
```

---

### 6. SourceAttribution (`/components/wiki/SourceAttribution.tsx`)

Expandable sources section.

**Features:**
- Collapsible source list
- Shows source count
- Fetches full document details on expand
- Loading states
- Hidden in print mode

**Props:**
```typescript
interface Props {
  sources: string[]  // Document IDs
  className?: string
}
```

---

### 7. PageFooter (`/components/wiki/PageFooter.tsx`)

Page footer with statistics and actions.

**Features:**
- View count and generation date
- Action buttons (share, suggest edit, discuss)
- Web Share API support (mobile)
- Clipboard fallback for sharing
- Print button
- Disclaimer text
- Hidden in print mode

**Props:**
```typescript
interface Props {
  viewCount: number
  generatedAt: string
  confidence: number
  slug: string
}
```

**Actions:**
- **Share**: Uses Web Share API on mobile, clipboard on desktop
- **Suggest Edit**: Placeholder for future feature
- **Discuss**: Placeholder for future feature
- **Print**: Native browser print dialog

---

## API Endpoints

### GET `/api/wiki/preview`

Returns preview data for hover cards.

**Query Parameters:**
- `slug` (required): Page slug

**Response:**
```typescript
{
  title: string
  excerpt: string
  confidence_score?: number
}
```

**Error Codes:**
- 400: Missing slug parameter
- 404: Page not found
- 500: Internal server error

---

## Styling

### Color Palette

**Almanac Colors (from globals.css):**
- `--color-almanac-sage-*`: Green tones for links, accents (50-900)
- `--color-almanac-cream-*`: Warm backgrounds (50-300)
- `--color-almanac-earth-*`: Text, headings (50-700)

**Wiki Link Colors:**
- `--color-link-strong`: High confidence links (green)
- `--color-link-medium`: Medium confidence links (blue)
- `--color-link-weak`: Low confidence links (gray)
- `--color-link-ghost`: Minimal emphasis (light gray)

### Typography

**Font Families:**
- Sans: Geist Sans (Inter fallback) - body text
- Serif: Lora - headings
- Mono: Geist Mono (JetBrains Mono fallback) - code

**Prose Styles (`.prose-almanac`):**
- Base font size: 1.0625rem (17px) - optimal for reading
- Line height: 1.75
- Headings: Serif with letter-spacing -0.02em
- Generous whitespace (my-5 for paragraphs, mt-12 for h2)
- Custom link styling
- Syntax highlighting for code
- Rounded corners on code blocks, blockquotes, images

### Dark Mode

All components support dark mode with automatic color adjustments:
- Headings: earth-700 → earth-200
- Code backgrounds: cream-100 → gray-800
- Blockquotes: cream-50 → gray-900/50
- Links: sage-700 → sage-400

### Print Styles

Optimized for printing:
- Hide navigation, TOC, footer, interactive elements
- Full-width content
- Black text on white background
- Show link URLs in parentheses
- Page break controls
- Simplified borders

---

## Accessibility

### Semantic HTML
- `<article>` for main content
- `<header>` for page header
- `<footer>` for page footer
- `<nav>` for TOC and breadcrumbs
- Proper heading hierarchy (h1 → h2 → h3)

### ARIA Attributes
- `aria-label` for icon buttons
- `aria-describedby` for preview tooltips
- `role="tooltip"` for preview cards
- `aria-expanded` for collapsible sections
- `aria-current="page"` for active breadcrumb

### Keyboard Navigation
- All interactive elements keyboard accessible
- Focus visible (ring-2 ring-almanac-sage-500)
- Escape key closes previews
- Tab order follows visual order
- Skip to content links (if navigation present)

### Screen Reader Support
- Descriptive link text
- Hidden decorative icons (`aria-hidden="true"`)
- Time elements with `datetime` attribute
- Alt text for images (when implemented)
- Descriptive button labels

### Color Contrast
- All text meets WCAG AA standards
- Links distinguishable without color alone (underlines)
- Focus indicators high contrast
- Badge text readable on colored backgrounds

---

## Performance

### Optimizations
- React Query caching (5min preview cache)
- Lazy loading of preview data
- Code splitting via Next.js dynamic imports
- Optimized fonts with `display: swap`
- Intersection Observer for TOC (passive listeners)
- Single regex pass for entity linking

### Metrics (Target)
- Lighthouse Performance: 90+
- Lighthouse Accessibility: 100
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1

---

## Testing

### Manual Testing Checklist

**Visual:**
- [ ] Page renders correctly on desktop (1920x1080)
- [ ] Page renders correctly on tablet (768x1024)
- [ ] Page renders correctly on mobile (375x667)
- [ ] TOC hidden on mobile, visible on desktop
- [ ] All typography scales appropriately
- [ ] Dark mode switches correctly
- [ ] Print preview looks clean

**Interaction:**
- [ ] Hover previews appear on link hover
- [ ] Preview positions above/below based on viewport
- [ ] Share button copies to clipboard
- [ ] Print button opens print dialog
- [ ] TOC highlights active section on scroll
- [ ] Clicking TOC item scrolls smoothly
- [ ] Source attribution expands/collapses
- [ ] All buttons provide visual feedback

**Accessibility:**
- [ ] Tab through all interactive elements
- [ ] Focus visible on all elements
- [ ] Screen reader announces all content correctly
- [ ] Headings create logical outline
- [ ] Links have descriptive text
- [ ] Images have alt text
- [ ] Color contrast passes WCAG AA
- [ ] Keyboard-only navigation works

**Performance:**
- [ ] Page loads in <3s on 4G
- [ ] No layout shift on load
- [ ] Smooth scrolling (60fps)
- [ ] Preview data cached correctly
- [ ] No memory leaks with hover previews

---

## Dependencies

```json
{
  "react": "^19",
  "next": "^15",
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "react-syntax-highlighter": "^15.6.1",
  "@tanstack/react-query": "^5.62.11",
  "date-fns": "^4.1.0",
  "lucide-react": "latest",
  "sonner": "latest"
}
```

---

## Future Enhancements

### Planned Features
1. **Edit Suggestions**: GitHub-style inline editing with diff view
2. **Comments/Discussion**: Thread-based discussions per section
3. **Version History**: View page changes over time
4. **Export Options**: PDF, Markdown, HTML downloads
5. **Reading Progress**: Progress bar for long articles
6. **Related Pages**: ML-based recommendations
7. **Bookmarks**: Save favorite pages
8. **Search Highlights**: Highlight search terms in content
9. **Annotations**: User notes and highlights

### Potential Improvements
- Image zoom/lightbox
- Syntax highlighting themes (user preference)
- Font size controls
- Reading mode (distraction-free)
- Audio narration (text-to-speech)
- Multi-language support
- Mobile app (React Native)

---

## Troubleshooting

### Common Issues

**Preview not showing:**
- Check network tab for API errors
- Verify slug exists in database
- Check React Query DevTools

**TOC not highlighting:**
- Ensure heading IDs match section IDs
- Check Intersection Observer browser support
- Verify scroll-margin-top value

**Links not auto-linking:**
- Check entity list passed to MarkdownRenderer
- Verify entity text matches exactly (case-insensitive)
- Check regex escaping for special characters

**Print styles not applying:**
- Ensure `.no-print` class on correct elements
- Check print media query
- Test in actual print preview, not dev tools

---

## File Structure

```
/components/wiki/
├── WikiPage.tsx              # Main page component
├── PageHeader.tsx            # Header with metadata
├── PageFooter.tsx            # Footer with actions
├── MarkdownRenderer.tsx      # Enhanced markdown rendering
├── LinkWithPreview.tsx       # Hover preview links
├── TableOfContents.tsx       # Auto-generated TOC
├── SourceAttribution.tsx     # Expandable sources
├── Breadcrumbs.tsx           # Navigation breadcrumbs
├── ConfidenceBadge.tsx       # Confidence score badge
├── Callout.tsx               # Styled blockquotes
├── CodeBlock.tsx             # Code with copy button
└── ...

/components/providers/
└── QueryProvider.tsx         # React Query setup

/app/api/wiki/
└── preview/route.ts          # Preview API endpoint

/app/globals.css              # Enhanced prose styles
```

---

## Contributing

When adding new wiki UI components:

1. Follow existing patterns and naming conventions
2. Ensure accessibility (WCAG AA minimum)
3. Add TypeScript types for all props
4. Include JSDoc comments
5. Support dark mode
6. Test on mobile and desktop
7. Update this documentation

---

## License

Proprietary - Mother's Almanac © 2024
