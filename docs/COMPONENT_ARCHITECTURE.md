# Wiki UI Component Architecture

## Component Hierarchy

```
WikiPage (Main Container)
│
├── PageHeader
│   ├── Title (h1)
│   └── Metadata Bar
│       ├── ConfidenceBadge (with Tooltip)
│       ├── Source Count (with Tooltip)
│       ├── Last Updated
│       ├── View Count
│       └── Reading Time
│
├── Container (Grid Layout)
│   │
│   ├── Article (Main Content)
│   │   │
│   │   ├── MarkdownRenderer
│   │   │   ├── Headings (h2, h3, h4) with anchor links
│   │   │   ├── Paragraphs
│   │   │   ├── Links
│   │   │   │   ├── Internal → LinkWithPreview
│   │   │   │   │   └── Preview Card (on hover/focus)
│   │   │   │   └── External → External link with icon
│   │   │   ├── Lists (ul, ol)
│   │   │   ├── Code Blocks
│   │   │   │   └── SyntaxHighlighter (Prism)
│   │   │   ├── Inline Code
│   │   │   ├── Blockquotes
│   │   │   ├── Tables
│   │   │   ├── Images
│   │   │   └── Horizontal Rules
│   │   │
│   │   └── SourceAttribution (Expandable)
│   │       ├── Header Button
│   │       └── Source List (when expanded)
│   │           └── Document Details
│   │
│   └── Aside (Sidebar - Desktop Only)
│       └── TableOfContents (Sticky)
│           └── Section Links
│               └── Active Section Indicator
│
└── PageFooter
    ├── Statistics Row
    │   ├── View Count
    │   ├── Last Generated
    │   └── Confidence Score
    ├── Separator
    ├── Actions Row
    │   ├── Share Button
    │   ├── Suggest Edit Button
    │   ├── Discuss Button
    │   └── Print Button
    └── Disclaimer Text
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Parent Page                          │
│                    (e.g., /wiki/[slug])                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ WikiPage props
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       <WikiPage>                             │
│  - Receives page data                                        │
│  - Extracts sections from content                           │
│  - Passes data to child components                          │
└─┬───────────────────────┬───────────────────────────────┬───┘
  │                       │                               │
  │ PageHeader props     │ MarkdownRenderer props        │ PageFooter props
  ▼                       ▼                               ▼
┌──────────────┐   ┌────────────────┐   ┌─────────────────────┐
│ PageHeader   │   │ MarkdownRenderer│   │ PageFooter          │
│              │   │                 │   │                     │
│ - title      │   │ - content       │   │ - viewCount         │
│ - metadata   │   │ - entities      │   │ - generatedAt       │
│ - confidence │   │                 │   │ - confidence        │
│ - viewCount  │   │   ┌─────────┐  │   │ - slug              │
│ - generatedAt│   │   │LinkWith │  │   │                     │
└──────────────┘   │   │Preview  │  │   └─────────────────────┘
                   │   │         │  │
                   │   │ ┌──────────┴───────┐
                   │   │ │ React Query      │
                   │   │ │ (Preview API)    │
                   │   │ └──────────────────┘
                   │   │         │
                   │   │         ▼
                   │   │ ┌──────────────────┐
                   │   │ │ /api/wiki/preview│
                   │   │ │ - Fetch page     │
                   │   │ │ - Generate excerpt│
                   │   └ └──────────────────┘
                   │
                   └────────────────────────┘
```

---

## State Management

### Component-Level State

#### WikiPage
```typescript
const [sections, setSections] = useState<Section[]>([])
// Derived from content via useMemo
```

#### LinkWithPreview
```typescript
const [showPreview, setShowPreview] = useState(false)
const [previewPosition, setPreviewPosition] = useState<'top' | 'bottom'>('bottom')
const { data, isLoading } = useQuery(...)  // React Query
```

#### TableOfContents
```typescript
const [activeSection, setActiveSection] = useState<string>('')
// Updated via Intersection Observer
```

#### SourceAttribution
```typescript
const [expanded, setExpanded] = useState(false)
const [sourceDetails, setSourceDetails] = useState<SourceDetail[]>([])
const [loading, setLoading] = useState(false)
```

#### PageFooter
```typescript
const [sharing, setSharing] = useState(false)
```

### Global State (React Query)

```typescript
// QueryProvider configuration
{
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,  // 1 minute
      refetchOnWindowFocus: false,
    }
  }
}

// Preview cache
queryKey: ['page-preview', slug]
staleTime: 5 * 60 * 1000  // 5 minutes
```

---

## Event Handlers

### User Interactions

```
LinkWithPreview:
  onMouseEnter → setShowPreview(true)
  onMouseLeave → setShowPreview(false)
  onFocus → setShowPreview(true)
  onBlur → setShowPreview(false)
  onKeyDown → if (Escape) setShowPreview(false)

TableOfContents:
  onClick (link) → smooth scroll to section
  IntersectionObserver → setActiveSection(id)

SourceAttribution:
  onClick (button) → toggle expanded state
  useEffect → fetch source details on expand

PageFooter:
  onClick (share) → Web Share API or clipboard
  onClick (suggest edit) → placeholder
  onClick (discuss) → placeholder
  onClick (print) → window.print()
```

---

## API Integration

### Endpoints Used

#### GET /api/wiki/preview

**Request:**
```
GET /api/wiki/preview?slug=example-page
```

**Response:**
```json
{
  "title": "Example Page",
  "excerpt": "First 150 characters of content...",
  "confidence_score": 0.85
}
```

**Error Responses:**
```json
// 400 Bad Request
{ "error": "Slug parameter is required" }

// 404 Not Found
{ "error": "Page not found" }

// 500 Internal Server Error
{ "error": "Internal server error" }
```

---

## Styling Architecture

### Tailwind Layers

```css
@layer base {
  /* Global resets, body styles, scrollbar */
  body { ... }
  ::-webkit-scrollbar { ... }
}

@layer components {
  /* Reusable component classes */
  .wiki-link-strong { ... }
  .wiki-link-medium { ... }
  .prose-almanac { ... }
}

@layer utilities {
  /* Utility classes */
  .transition-base { ... }
}
```

### Custom CSS Variables

```css
:root {
  /* Almanac colors */
  --color-almanac-sage-50 to --color-almanac-sage-900
  --color-almanac-cream-50 to --color-almanac-cream-300
  --color-almanac-earth-50 to --color-almanac-earth-700

  /* Wiki link colors */
  --color-link-strong
  --color-link-medium
  --color-link-weak
  --color-link-ghost
}

.dark {
  /* Dark mode overrides */
  --background, --foreground, etc.
}
```

### Responsive Design

```
Mobile First Approach:
  Base styles → Mobile (< 768px)
  md: → Tablet (768px+)
  lg: → Desktop (1024px+)
  xl: → Large Desktop (1280px+)

Grid Breakpoint:
  grid-cols-1             // Mobile: single column
  lg:grid-cols-[1fr_280px] // Desktop: content + sidebar
```

---

## Performance Optimizations

### Code Splitting

```typescript
// Automatic by Next.js
import { WikiPage } from '@/components/wiki/WikiPage'

// Dynamic import for heavy components (if needed)
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

### Lazy Loading

```typescript
// React Query lazy loading
enabled: showPreview  // Only fetch when preview shown

// Native lazy loading (images)
<img loading="lazy" />
```

### Memoization

```typescript
// useMemo for expensive calculations
const sections = useMemo(() => {
  // Extract headings from content
  return extractSections(content)
}, [content])
```

### Intersection Observer

```typescript
// Passive listeners for scroll performance
const observer = new IntersectionObserver(
  (entries) => { ... },
  {
    rootMargin: '-100px 0px -80% 0px',
    // Uses passive listeners by default
  }
)
```

---

## Accessibility Features

### Semantic Structure

```html
<article>
  <header>
    <h1>Page Title</h1>
  </header>

  <main>
    <section>
      <h2 id="section-1">Section Title</h2>
    </section>
  </main>

  <footer>
    ...
  </footer>
</article>

<aside>
  <nav aria-label="Table of contents">
    ...
  </nav>
</aside>
```

### ARIA Implementation

```html
<!-- Tooltips -->
<div role="tooltip" id="preview-slug">
  ...
</div>
<a aria-describedby="preview-slug">Link</a>

<!-- Expandable sections -->
<button
  aria-expanded={expanded}
  aria-controls="source-details"
>
  ...
</button>
<div id="source-details">
  ...
</div>

<!-- Navigation -->
<nav aria-label="Table of contents">
  ...
</nav>

<!-- Current page indicator -->
<a aria-current="page">Current Page</a>
```

### Focus Management

```typescript
// Visible focus indicators
className="focus:outline-none focus:ring-2 focus:ring-almanac-sage-500 focus:ring-offset-2"

// Focus trap in modals (if implemented)
useFocusTrap(modalRef)

// Restore focus after close
previousFocusRef.current?.focus()
```

---

## Testing Strategy

### Unit Tests (Recommended)

```typescript
// Component rendering
test('WikiPage renders with valid data', () => {
  render(<WikiPage page={mockPage} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(mockPage.title)
})

// User interactions
test('LinkWithPreview shows preview on hover', async () => {
  const { user } = render(<LinkWithPreview href="/wiki/test">Test</LinkWithPreview>)
  await user.hover(screen.getByRole('link'))
  expect(await screen.findByRole('tooltip')).toBeInTheDocument()
})

// Accessibility
test('TableOfContents is keyboard navigable', () => {
  render(<TableOfContents sections={mockSections} />)
  const links = screen.getAllByRole('link')
  links.forEach(link => {
    expect(link).toHaveAttribute('href')
  })
})
```

### Integration Tests

```typescript
// Full page rendering
test('Wiki page renders all sections correctly', () => {
  render(<WikiPage page={fullMockPage} />)
  expect(screen.getByRole('article')).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: /table of contents/i })).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toBeInTheDocument()
})

// API integration
test('Preview API returns correct data', async () => {
  const response = await fetch('/api/wiki/preview?slug=test')
  const data = await response.json()
  expect(data).toHaveProperty('title')
  expect(data).toHaveProperty('excerpt')
})
```

### E2E Tests (Recommended with Playwright)

```typescript
test('User can navigate wiki page', async ({ page }) => {
  await page.goto('/wiki/test-page')

  // Click TOC link
  await page.click('nav[aria-label="Table of contents"] a:first-child')

  // Verify scroll
  const section = await page.locator('h2:first-of-type')
  await expect(section).toBeInViewport()

  // Hover over link
  await page.hover('article a[href^="/wiki/"]')

  // Verify preview appears
  await expect(page.locator('[role="tooltip"]')).toBeVisible()
})
```

---

## Error Handling

### API Errors

```typescript
// React Query error handling
const { data, error, isError } = useQuery({
  queryKey: ['page-preview', slug],
  queryFn: fetchPreview,
  retry: 2,
  onError: (error) => {
    console.error('Failed to fetch preview:', error)
    toast.error('Failed to load preview')
  }
})

if (isError) {
  return <div>Preview not available</div>
}
```

### Component Errors

```typescript
// Error boundaries (recommended)
<ErrorBoundary fallback={<ErrorFallback />}>
  <WikiPage page={page} />
</ErrorBoundary>

// Graceful degradation
{preview ? (
  <PreviewCard preview={preview} />
) : (
  <span>Preview not available</span>
)}
```

### Loading States

```typescript
// Skeleton loading
{isLoading ? (
  <div className="flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Loading preview...</span>
  </div>
) : (
  <PreviewContent data={data} />
)}
```

---

## Browser Compatibility

### Feature Detection

```typescript
// Web Share API
if (navigator.share) {
  await navigator.share(shareData)
} else {
  // Clipboard fallback
  await navigator.clipboard.writeText(url)
}

// Intersection Observer
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(...)
} else {
  // Fallback: static TOC without highlighting
}
```

### CSS Feature Queries

```css
/* Grid layout */
@supports (display: grid) {
  .container {
    display: grid;
    grid-template-columns: 1fr 280px;
  }
}

/* Flexbox fallback */
@supports not (display: grid) {
  .container {
    display: flex;
  }
}
```

---

## Deployment Checklist

### Pre-deployment

- [ ] All TypeScript types correct
- [ ] No console errors
- [ ] Lighthouse score 90+
- [ ] Accessibility audit passed
- [ ] Mobile responsive verified
- [ ] Dark mode tested
- [ ] Print preview tested
- [ ] Cross-browser tested

### Post-deployment

- [ ] Monitor Core Web Vitals
- [ ] Check error rates
- [ ] Verify API response times
- [ ] User feedback collected
- [ ] Analytics tracking confirmed

---

## Future Enhancements

### Phase 2
1. Image zoom/lightbox
2. Reading progress indicator
3. Bookmark functionality
4. Search highlighting

### Phase 3
1. Real-time collaboration
2. Version history with diff
3. User annotations
4. Multi-language support

### Phase 4
1. Offline support (Service Worker)
2. Progressive Web App
3. Mobile native apps
4. Voice narration

---

**Document Version:** 1.0
**Last Updated:** December 11, 2025
**Maintained By:** Development Team
