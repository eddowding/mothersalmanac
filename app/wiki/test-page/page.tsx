import { WikiPage } from '@/components/wiki/WikiPage'
import { WikiPage as WikiPageType } from '@/types/wiki'

/**
 * Test page to showcase all wiki UI components
 * This demonstrates:
 * - Beautiful typography
 * - Code highlighting
 * - Entity linking
 * - Source attribution
 * - Responsive design
 * - Accessibility features
 */
export default function WikiTestPage() {
  // Sample wiki page data
  const testPage: WikiPageType = {
    id: 'test-page-1',
    slug: 'test-page',
    title: 'The Art of Herb Gardening',
    content: `
## Introduction to Herb Gardening

Herb gardening is one of the most rewarding forms of cultivation. Whether you have a sprawling backyard or a modest balcony, herbs offer endless possibilities for culinary, medicinal, and ornamental purposes.

### Benefits of Growing Herbs

Growing your own herbs provides several key advantages:

1. **Freshness**: Harvest herbs at peak flavor
2. **Cost savings**: Reduce grocery expenses
3. **Sustainability**: Minimize packaging waste
4. **Connection to nature**: Hands-on gardening experience

## Essential Herbs for Beginners

### Basil

Basil is a tender annual that thrives in warm weather. It's essential for Italian cuisine and pairs beautifully with tomatoes. To grow basil successfully:

- Plant in full sun (6-8 hours daily)
- Keep soil consistently moist
- Pinch back flowers to encourage leafy growth
- Harvest regularly for bushier plants

### Rosemary

A woody perennial herb with needle-like leaves, rosemary is drought-tolerant once established. It's perfect for Mediterranean dishes and roasted meats.

> "Rosemary for remembrance" - This ancient saying refers to rosemary's long association with memory and cognitive function.

### Thyme

Thyme is a low-growing perennial that forms fragrant mats of tiny leaves. There are dozens of varieties, from lemon thyme to caraway thyme.

## Planting Techniques

Here's a simple guide to planting herbs in containers:

\`\`\`bash
# Prepare your container
# Ensure drainage holes
# Fill with quality potting mix
# Plant herb at same depth as nursery pot
# Water thoroughly
# Place in appropriate light conditions
\`\`\`

## Common Challenges

| Problem | Cause | Solution |
|---------|-------|----------|
| Yellow leaves | Overwatering | Reduce watering frequency |
| Leggy growth | Insufficient light | Move to sunnier location |
| Pest damage | Aphids or spider mites | Spray with neem oil solution |

## Harvesting and Storage

The best time to harvest most herbs is in the morning after dew has dried but before the sun gets too hot. For storage:

- **Fresh use**: Trim as needed
- **Drying**: Hang in bundles in a dark, dry place
- **Freezing**: Chop and freeze in olive oil ice cube trays
- **Infusions**: Create herb-infused oils and vinegars

## Conclusion

Herb gardening connects us to traditions spanning millennia while providing practical benefits for modern life. Start small, experiment often, and enjoy the journey from seed to harvest.

---

*This article is part of our sustainable living series. Related topics include companion planting, organic pest control, and kitchen garden design.*
    `,
    metadata: {
      description: 'A comprehensive guide to growing herbs at home, from basil to thyme, with practical tips for beginners and experienced gardeners alike.',
      tags: ['herbs', 'gardening', 'sustainable living', 'organic'],
      category: 'Gardening',
      sources_used: [
        'The Herb Gardener\'s Bible by Susan McClure',
        'Rodale\'s Basic Organic Gardening',
        'The Complete Book of Herbs by Lesley Bremness'
      ],
      chunk_count: 12,
      entity_links: [
        { entity: 'Basil', slug: 'basil' },
        { entity: 'Rosemary', slug: 'rosemary' },
        { entity: 'Companion Planting', slug: 'companion-planting' },
        { entity: 'Organic Pest Control', slug: 'organic-pest-control' }
      ]
    },
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
    generated_at: new Date('2024-01-20').toISOString(),
    view_count: 1247,
    confidence_score: 0.85
  }

  return <WikiPage page={testPage} />
}
