# Quick Reference: Wikipedia-Style TOC

## Files Modified/Created

### New Component
**`/components/wiki/WikiTableOfContents.tsx`**
- Wikipedia-style collapsible TOC
- Parses markdown headings (##, ###, ####)
- Smooth scroll navigation
- Responsive design (floats right on desktop)

### Updated Component  
**`/components/wiki/WikiPageContent.tsx`**
- Imports and renders `WikiTableOfContents`
- Adds ID attributes to H2, H3, H4 elements
- Implements `generateHeadingId()` helper

## Key Features

```tsx
// Automatically parses markdown content
<WikiTableOfContents content={page.content} />

// Generates these heading IDs:
"## Why Calcium Matters"  → id="why-calcium-matters"
"### Daily Requirements"  → id="daily-requirements"
"#### Special Note"       → id="special-note"
```

## Styling

```css
Colors:
- Border: almanac-sage-200
- Background: almanac-cream-50
- Header BG: almanac-sage-50
- Text: almanac-earth-700, almanac-sage-700

Layout:
- Desktop: float-right, max-w-[300px], ml-6
- Mobile: full width (w-full)
- Indentation: H2=0px, H3=16px, H4=32px
```

## Test Page

Visit: **`/wiki-demo`**

The demo page has:
- 5 H2 sections
- 8 H3 subsections  
- Multiple levels to demonstrate nesting

## How It Works

1. Component parses markdown with regex: `/^(#{2,4})\s+(.+)$/gm`
2. Builds section array: `{ id, title, level }[]`
3. Renders collapsible nav with nested list
4. ReactMarkdown adds matching IDs to actual headings
5. Click handlers provide smooth scroll with offset

## Browser Compatibility

- Modern browsers (ES6+)
- Smooth scrolling with fallback
- CSS Grid/Flexbox for layout
- No IE11 support needed
