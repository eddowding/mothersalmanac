# Wikipedia-Style Table of Contents Implementation

## Overview
Added a Wikipedia-style collapsible Table of Contents (TOC) component to wiki pages that extracts headings from markdown content and provides smooth scrolling navigation.

## Components Created

### `/components/wiki/WikiTableOfContents.tsx`
New component that:
- Parses markdown content to extract H2, H3, and H4 headings
- Generates slug-style IDs from heading text
- Creates a nested, indented structure based on heading levels
- Includes a collapsible "Contents" section with hide/show toggle button
- Uses almanac theme colors (almanac-sage, almanac-earth, almanac-cream)
- Implements smooth scrolling with offset for fixed headers
- Responsive design:
  - Desktop: Floats right with max-width of 300px
  - Mobile: Full width, works well collapsed or expanded

## Updates to Existing Components

### `/components/wiki/WikiPageContent.tsx`
Updated to:
1. Import and render `WikiTableOfContents` component
2. Add custom heading renderers to ReactMarkdown:
   - H2, H3, H4 elements now have `id` attributes matching TOC anchors
   - Added `scroll-mt-24` class for proper scroll offset
3. Added `generateHeadingId()` helper function to create consistent IDs

## Features

### Parsing Logic
- Uses regex to extract headings: `/^(#{2,4})\s+(.+)$/gm`
- Supports H2 (##), H3 (###), and H4 (####) levels
- Generates URL-friendly IDs by:
  - Converting to lowercase
  - Removing special characters
  - Replacing spaces with hyphens
  - Trimming excess hyphens

### UI/UX
- **Header**: "Contents" title with collapse/expand chevron button
- **Styling**: 
  - Bordered box with almanac-sage-200 border
  - Cream background (almanac-cream-50)
  - Sage header background (almanac-sage-50)
  - H2 items are bold, H3/H4 are regular weight
- **Indentation**: 
  - H2: 0px indent
  - H3: 16px indent
  - H4: 32px indent
- **Hover Effects**: Underline on hover, smooth color transitions
- **Smooth Scrolling**: Custom click handler with -80px offset

### Responsive Behavior
- Desktop (lg+): Floats right, max 300px width, has margin-left
- Mobile: Full width, stacks above content
- Component gracefully hides if no headings found

## Usage

The TOC automatically appears on all wiki pages that use `WikiPageContent`:

```tsx
<WikiPageContent page={cachedPage} />
```

No additional configuration needed - it parses the page content automatically.

## Testing

Test at: `/wiki-demo` - This page has multiple heading levels demonstrating:
- H2: "Why Calcium Matters", "Best Food Sources", "Absorption Tips", "Supplements", "Special Considerations"
- H3: "Daily Requirements", "Dairy Sources", "Non-Dairy Sources", "Timing Matters", etc.
- H4: None in current demo, but supported

## Benefits

1. **Improved Navigation**: Users can quickly jump to relevant sections
2. **Wikipedia-Like UX**: Familiar pattern for users
3. **Accessibility**: Proper semantic HTML with aria-label
4. **Mobile-Friendly**: Collapsible to save space on small screens
5. **Performance**: Uses useMemo to cache parsed headings
6. **Theme Consistent**: Matches almanac design system
7. **SEO-Friendly**: Heading IDs enable deep linking

## Technical Details

- **Framework**: React 18+ with hooks
- **Styling**: Tailwind CSS with custom almanac colors
- **Icons**: Lucide React (ChevronDown, ChevronUp)
- **Dependencies**: None beyond existing project dependencies
- **Type Safety**: Full TypeScript support with interfaces

## Future Enhancements

Potential improvements:
- Add active section highlighting based on scroll position (like the existing `TableOfContents.tsx`)
- Add "Back to top" button
- Support for H5/H6 headings if needed
- Sticky TOC on desktop for long articles
- Print-friendly styling (already handled by globals.css `.wiki-toc` class)
