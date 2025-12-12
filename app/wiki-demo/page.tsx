import { WikiPageContent } from '@/components/wiki/WikiPageContent'
import { CachedPage } from '@/lib/wiki/cache'

// Example wiki page data for demonstration
const examplePage: CachedPage = {
  id: 'example-123',
  slug: 'pregnancy/nutrition/calcium',
  title: 'Calcium During Pregnancy',
  excerpt: 'Learn about calcium requirements during pregnancy, best food sources, and absorption tips.',
  ttl_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  published: true,
  content: `
## Why Calcium Matters

Calcium is essential for building your baby's bones and teeth. During pregnancy, your body's calcium absorption increases to meet both your needs and your baby's needs.

### Daily Requirements

Pregnant women need **1,000 mg** of calcium per day. This doesn't change from pre-pregnancy requirements, but it becomes more critical to meet this target consistently.

> Important: Your body will draw calcium from your bones if dietary intake is insufficient, potentially affecting your long-term bone health.

## Best Food Sources

Here are the top calcium-rich foods to include in your pregnancy diet:

| Food | Serving Size | Calcium (mg) |
|------|-------------|--------------|
| Plain yogurt | 1 cup | 450 |
| Milk | 1 cup | 300 |
| Cheddar cheese | 1.5 oz | 300 |
| Kale (cooked) | 1 cup | 180 |
| Fortified orange juice | 1 cup | 300 |

### Dairy Sources

- **Yogurt**: One of the best sources, also provides probiotics
- **Milk**: Choose vitamin D-fortified for better absorption
- **Cheese**: Hard cheeses like cheddar are calcium-rich

### Non-Dairy Sources

For those who are lactose intolerant or prefer plant-based options:

- **Leafy greens**: Kale, collard greens, bok choy
- **Fortified plant milks**: Almond, soy, oat milk
- **Tofu**: Made with calcium sulfate
- **Sardines**: Also high in omega-3s

## Absorption Tips

\`\`\`markdown
✓ Take with vitamin D for better absorption
✓ Spread intake throughout the day
✗ Avoid taking with iron supplements (compete for absorption)
✗ Limit caffeine intake (can reduce absorption)
\`\`\`

### Timing Matters

Your body can only absorb about 500 mg of calcium at once, so it's better to spread your intake across meals rather than taking it all at once.

## Supplements

If you're struggling to meet your calcium needs through diet alone:

- Calcium carbonate: Take with food for best absorption
- Calcium citrate: Can be taken anytime
- Prenatal vitamins: Usually contain 150-200 mg

### Warning Signs of Deficiency

Contact your healthcare provider if you experience:

- Muscle cramps
- Numbness or tingling in extremities
- Dental problems
- Brittle nails

## Special Considerations

### Vegetarian & Vegan Diets

Plant-based eaters need to be especially mindful of calcium intake. Focus on:

1. Fortified plant milks (check labels for 300 mg per cup)
2. Calcium-set tofu
3. Dark leafy greens (cooked to reduce oxalates)
4. Fortified cereals and bread

### Lactose Intolerance

You have several options:
- Lactose-free dairy products
- Lactase enzyme supplements
- Hard cheeses (naturally lower in lactose)
- Plant-based alternatives

## Related Topics

Learn more about [Vitamin D and Pregnancy](/wiki/pregnancy/nutrition/vitamin-d) and [Iron Absorption](/wiki/pregnancy/nutrition/iron).
  `.trim(),
  metadata: {
    description: 'Learn about calcium requirements during pregnancy, best food sources, and absorption tips.',
    tags: ['pregnancy', 'nutrition', 'calcium', 'bone health'],
    category: 'Nutrition',
    sources_used: ['doc-123', 'doc-456', 'doc-789'],
    related_pages: [
      { slug: 'pregnancy/nutrition/vitamin-d', title: 'Vitamin D During Pregnancy', strength: 0.9 },
      { slug: 'pregnancy/nutrition/iron', title: 'Iron During Pregnancy', strength: 0.8 },
      { slug: 'pregnancy/nutrition/overview', title: 'Pregnancy Nutrition Overview', strength: 0.7 },
      { slug: 'pregnancy/first-trimester/diet', title: 'First Trimester Diet', strength: 0.6 }
    ]
  },
  generated_at: '2024-01-20T15:30:00Z',
  view_count: 1247,
  confidence_score: 0.85
}

export default function WikiDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <WikiPageContent
        page={examplePage}
      />
    </div>
  )
}
