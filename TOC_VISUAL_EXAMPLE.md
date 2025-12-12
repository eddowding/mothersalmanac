# Visual Example: Wikipedia-Style TOC

## How It Looks

```
┌─────────────────────────────────────┐
│ Contents                         ▲  │  ← Collapsible header
├─────────────────────────────────────┤
│ Why Calcium Matters                 │  ← H2 (bold)
│   Daily Requirements                │  ← H3 (indented 16px)
│                                     │
│ Best Food Sources                   │  ← H2 (bold)
│   Dairy Sources                     │  ← H3
│   Non-Dairy Sources                 │  ← H3
│                                     │
│ Absorption Tips                     │  ← H2 (bold)
│   Timing Matters                    │  ← H3
│                                     │
│ Supplements                         │  ← H2 (bold)
│   Warning Signs of Deficiency       │  ← H3
│                                     │
│ Special Considerations              │  ← H2 (bold)
│   Vegetarian & Vegan Diets         │  ← H3
│   Lactose Intolerance               │  ← H3
└─────────────────────────────────────┘
```

## Collapsed State

```
┌─────────────────────────────────────┐
│ Contents                         ▼  │  ← Click to expand
└─────────────────────────────────────┘
```

## Desktop Layout

```
┌────────────────────────────────────────────────────────────┐
│                                    ┌──────────────────────┐│
│ # Calcium During Pregnancy         │ Contents          ▲ ││
│                                    ├──────────────────────┤│
│ Lorem ipsum dolor sit amet...      │ Why Calcium Matters  ││
│                                    │   Daily Requirements ││
│                                    │ Best Food Sources    ││
│ ## Why Calcium Matters             └──────────────────────┘│
│ Calcium is essential for...                                │
│                                                             │
└────────────────────────────────────────────────────────────┘
        ^                                      ^
     Content                                 TOC floats right
```

## Mobile Layout

```
┌──────────────────────┐
│ Contents          ▼  │  ← Full width, collapsed
└──────────────────────┘

# Calcium During Pregnancy

Lorem ipsum dolor sit amet,
consectetur adipiscing elit...

## Why Calcium Matters
Calcium is essential for
building your baby's bones...
```

## Interactive Behavior

1. **Click heading in TOC** → Smooth scroll to section
2. **Click chevron button** → Toggle TOC visibility
3. **Hover link** → Underline appears
4. **Scroll to section** → URL updates (browser native)

## Color Palette

```css
Background:        #FAF8F5  (almanac-cream-50)
Header Background: #F5F7F6  (almanac-sage-50)
Border:            #D5E0D8  (almanac-sage-200)
Text:              #4D3829  (almanac-earth-700)
Links:             #5A7C68  (almanac-sage-700)
Link Hover:        #3D5649  (almanac-sage-900)
```

## Responsive Breakpoints

- **Mobile** (< 1024px): Full width, stacks above content
- **Desktop** (≥ 1024px): Floats right, max 300px width

## Accessibility

- Semantic `<nav>` element
- `aria-label="Table of contents"`
- Keyboard accessible (tab navigation)
- Screen reader friendly
- Proper heading hierarchy maintained
