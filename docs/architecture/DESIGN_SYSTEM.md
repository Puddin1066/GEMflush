# Gemflush Design System

## Strategic Design Choices for Market Traction

### Color Philosophy: Violet + Wikidata Authority

Our design system balances **innovation** (violet) with **perceived authority** (Wikidata-inspired accents) to maximize early market traction for our KGaaS platform.

---

## Base Color: Violet

**Primary Color**: `violet` (HSL: 262.1 83.3% 57.8%)

### Why Violet?

1. **Premium Positioning** - Conveys innovation and high-value technology
2. **Knowledge & Intelligence** - Strong association with wisdom and sophistication
3. **Differentiation** - Stands out from standard enterprise blues/grays
4. **Modern SaaS Appeal** - Aligns with developer-focused tools (Stripe, Linear, Notion)
5. **Data Visualization** - Excellent contrast for graphs and knowledge networks

---

## Wikidata-Inspired Accents

To leverage Wikidata's authority in the knowledge graph domain, we've incorporated strategic accent colors inspired by their brand:

### Custom Color Variables

```css
/* Light Mode */
--wikidata-red: 0 72% 40%;          /* Inspired by Wikidata's crimson #990000 */
--knowledge-graph: 262 83% 58%;     /* Our signature violet for KG elements */
--entity-highlight: 280 65% 60%;    /* Purple for entity emphasis */
--property-accent: 340 75% 55%;     /* Red-purple for properties */

/* Dark Mode */
--wikidata-red: 0 72% 50%;          /* Brighter for dark backgrounds */
--knowledge-graph: 262 83% 65%;     /* Adjusted violet */
--entity-highlight: 280 65% 65%;    /* Enhanced purple */
--property-accent: 340 75% 60%;     /* Vivid red-purple */
```

---

## Utility Classes

Use these classes to apply Wikidata-inspired styling throughout your components:

### Wikidata Red Accent
```tsx
// Text color - use for important knowledge graph elements
<span className="wikidata-accent">Entity: Q42</span>

// Background - use for badges, pills, status indicators
<div className="bg-wikidata-accent text-white">Published</div>

// Border - use for cards containing Wikidata entities
<Card className="border-wikidata-accent">...</Card>
```

### Knowledge Graph Styling
```tsx
// Primary violet for main KG elements
<div className="bg-knowledge-graph text-white">Knowledge Graph</div>

// Entity highlighting
<span className="entity-highlight">Business Entity</span>
<Badge className="bg-entity-highlight">Entity Type</Badge>

// Property accents
<span className="property-accent">hasProperty</span>
<div className="border-property-accent">Property Value</div>
```

---

## Strategic Usage Guidelines

### When to Use Wikidata Red (`wikidata-accent`)

✅ **DO** use for:
- Wikidata entity IDs (Q-numbers, P-numbers)
- "Published to Wikidata" badges
- Links to Wikidata entities
- Status indicators for Wikidata operations
- Important CTA buttons related to Wikidata publishing

❌ **DON'T** use for:
- General error states (use `destructive`)
- Unrelated features
- Primary branding (use violet `primary`)

### When to Use Violet (`primary`, `knowledge-graph`)

✅ **DO** use for:
- Primary actions (Create Business, Generate KG)
- Main navigation and branding
- Knowledge graph visualizations
- Data node connections
- Loading states for KG operations

### When to Use Entity/Property Accents

✅ **DO** use for:
- Differentiating entity types in lists
- Highlighting properties in data views
- Color-coding relationships in graphs
- Visual hierarchy in complex data structures

---

## Chart Colors

Our chart palette combines Wikidata red with violet spectrum for data visualization:

```css
--chart-1: 0 72% 40%;      /* Wikidata red - primary metrics */
--chart-2: 262 83% 58%;    /* Violet - secondary metrics */
--chart-3: 280 65% 60%;    /* Purple - tertiary data */
--chart-4: 340 75% 55%;    /* Red-purple - comparative data */
--chart-5: 20 90% 48%;     /* Orange - accent data */
```

### Usage in Charts

```tsx
// Use for business metrics dashboards
<BarChart colors={['hsl(var(--chart-1))', 'hsl(var(--chart-2))']} />

// Use for knowledge graph analytics
<LineChart color="hsl(var(--knowledge-graph))" />
```

---

## Typography

**Primary Font**: `Manrope` (sans-serif)

- Clean, modern, professional
- Excellent readability for data-heavy interfaces
- Works well with structured content (like Wikidata)

---

## Component Styling Best Practices

### Business Cards
```tsx
<Card className="border-l-4 border-l-knowledge-graph">
  <CardHeader>
    <Badge className="bg-wikidata-accent text-white">Published</Badge>
  </CardHeader>
</Card>
```

### Entity Badges
```tsx
<Badge variant="outline" className="border-entity-highlight entity-highlight">
  Q12345
</Badge>
```

### Status Indicators
```tsx
// Wikidata published
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-wikidata-accent" />
  <span>Published to Wikidata</span>
</div>

// Knowledge graph processing
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-knowledge-graph animate-pulse" />
  <span>Generating Knowledge Graph</span>
</div>
```

---

## Design Principles Inspired by Wikidata

1. **Clarity Over Complexity** - Simple, structured layouts
2. **Data First** - Information hierarchy is paramount
3. **Consistent Patterns** - Reusable components and patterns
4. **Accessible** - High contrast, clear typography
5. **Trustworthy** - Professional, no unnecessary flourishes

---

## Dark Mode Strategy

Both light and dark modes maintain the same strategic positioning:
- Violet primary for innovation
- Wikidata-red accents for authority
- High contrast for readability
- Adjusted saturation/lightness for comfortable viewing

---

---

## ✨ GEMflush Brand: Gem-Inspired Styling

The "GEM" in Gemflush isn't just a name—it's a visual identity. We've created gem-inspired effects, gradients, and icon components that evoke precious stones, crystals, and faceted diamonds.

### Gem Effect Classes

#### Gem Gradients

```tsx
// Primary violet gem gradient
<div className="gem-gradient p-8 rounded-lg">
  Premium Content
</div>

// Gem with shine overlay (animated light reflection)
<button className="gem-gradient-shine p-4 rounded-lg text-white">
  Unlock Premium
</button>

// Multi-faceted gem (like a cut diamond)
<div className="gem-faceted p-6 rounded-lg">
  Featured Business
</div>

// Ruby gem (Wikidata accent)
<div className="gem-ruby p-4 rounded-full">
  Published
</div>
```

#### Gem Text Effects

```tsx
// Prismatic gradient text (static)
<h1 className="text-4xl font-bold gem-text">
  GEMflush
</h1>

// Animated shimmer effect
<h2 className="text-2xl gem-text-shimmer">
  Knowledge Graph as a Service
</h2>
```

#### Gem Glow Effects

```tsx
// Subtle glow for icons and logos
<GemIcon className="gem-glow" size={32} />

// Strong glow for emphasis
<GemIcon className="gem-glow-strong" size={48} />
```

#### Gem Animation Effects

```tsx
// Sparkle effect (animated light sweep)
<button className="gem-sparkle gem-gradient p-6 rounded-lg">
  Generate Knowledge Graph
</button>
```

#### Gem Borders & Cards

```tsx
// Faceted border (gradient outline)
<div className="gem-border p-6 rounded-lg">
  Premium Feature
</div>

// Gem-styled card with subtle gradient background
<div className="gem-card p-6 rounded-lg">
  <h3>Business Entity</h3>
  <p>Enhanced with AI-powered fingerprinting</p>
</div>
```

### Gem Icon Components

We've created a library of gem-shaped SVG icons at `components/ui/gem-icon.tsx`:

#### Primary Gem Icon

```tsx
import { GemIcon } from '@/components/ui/gem-icon';

// Default diamond gem
<GemIcon size={24} />

// Faceted gem (shows internal cuts)
<GemIcon size={32} variant="faceted" />

// Outline style
<GemIcon size={28} variant="outline" />

// With sparkle
<GemIcon size={36} variant="sparkle" />

// Ruby variant (for Wikidata)
<GemIcon size={24} variant="ruby" />
```

#### Specialized Gem Icons

```tsx
import { 
  GemClusterIcon,      // Multiple gems together
  GemShardIcon,        // Crystal fragment
  HexGemIcon,          // Hexagonal crystal
  WikidataRubyIcon,    // Red gem for Wikidata
  GemflushLogo         // Full logo with text
} from '@/components/ui/gem-icon';

// Knowledge graph collection
<GemClusterIcon size={32} />

// Loading/in-progress state
<GemShardIcon size={24} className="animate-pulse" />

// Data node representation
<HexGemIcon size={28} />

// Wikidata published indicator
<WikidataRubyIcon size={20} />

// Main logo in navigation
<GemflushLogo size={32} showText={true} />
```

#### Pre-built Gem Components

```tsx
import { GemBadge, GemCard } from '@/components/ui/gem-icon';

// Premium status badge
<GemBadge>Premium</GemBadge>
<GemBadge variant="ruby">Published</GemBadge>
<GemBadge variant="outline">Pro</GemBadge>

// Featured card with gem styling
<GemCard sparkle={true}>
  <h3>Featured Business</h3>
  <p>Verified and published to Wikidata</p>
</GemCard>
```

### Gem Styling Use Cases

| Use Case | Recommended Style | Example |
|----------|------------------|---------|
| **Logo** | `<GemflushLogo />` or `<GemIcon variant="faceted" />` | Navigation bar |
| **Premium Feature** | `gem-gradient` + `gem-sparkle` | Upgrade CTAs |
| **Published Status** | `<WikidataRubyIcon />` or `gem-ruby` | Entity cards |
| **Loading State** | `<GemShardIcon className="animate-pulse" />` | Processing |
| **Entity Cards** | `gem-card` | Business listings |
| **Knowledge Graph** | `<GemClusterIcon />` | Dashboard headers |
| **Brand Headers** | `gem-text-shimmer` | Hero sections |
| **Icons** | `icon-gem` class or `<GemIcon />` | Throughout UI |

### Color Harmony: Gems + Wikidata

Our gem styling works in perfect harmony with Wikidata accents:

```tsx
// Violet gem for your platform + ruby for Wikidata authority
<div className="flex gap-4">
  <GemIcon variant="faceted" className="text-primary" />
  <WikidataRubyIcon />
</div>

// Card with gem background + Wikidata accent border
<div className="gem-card border-l-4 border-l-wikidata-accent">
  <GemBadge variant="ruby">Published to Wikidata</GemBadge>
  <h3 className="gem-text">Premium Business Entity</h3>
</div>
```

---

## Implementation Checklist

- [x] Base color set to `violet` in `components.json`
- [x] Custom Wikidata-inspired CSS variables added
- [x] Utility classes created for easy application
- [x] Chart colors optimized for data visualization
- [x] Gem-inspired CSS effects and animations created
- [x] Gem icon component library built (`components/ui/gem-icon.tsx`)
- [ ] Update existing components to use gem styling
- [ ] Replace placeholder logos with GemflushLogo component
- [ ] Apply gem-card to featured business listings
- [ ] Use WikidataRubyIcon for published entities
- [ ] Update hero sections with gem-text-shimmer
- [ ] Design marketing materials with gem theme
- [ ] Create brand guidelines document

---

## Next Steps

1. **Audit Existing Components** - Review dashboard, business pages, etc.
2. **Apply Strategic Accents** - Add Wikidata red where it enhances authority
3. **Create Graph Visualizations** - Use violet/purple spectrum for nodes/edges
4. **Marketing Alignment** - Ensure landing pages reflect new brand identity
5. **User Testing** - Validate that design conveys innovation + trust

---

## Resources

- [Wikidata Design Style](https://www.wikidata.org)
- [Wikidata Colors](https://www.schemecolor.com/wikidata-logo-colors.php)
- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind v4 Theme Customization](https://tailwindcss.com/docs/theme)

