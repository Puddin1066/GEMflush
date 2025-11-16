# 💎 GEMflush Styling Quick Reference

A quick-start guide for using gem-inspired design elements in your Gemflush application.

---

## 🎨 Color Scheme

- **Primary**: Violet (`hsl(262, 83%, 58%)`) - Innovation & premium positioning
- **Wikidata Red**: Crimson (`hsl(0, 72%, 40%)`) - Authority & credibility
- **Knowledge Graph**: Purple spectrum - Data visualization

---

## ⚡ Quick Start: Most Common Use Cases

### 1. Logo in Navigation

```tsx
import { GemflushLogo } from '@/components/ui/gem-icon';

<GemflushLogo size={32} showText={true} />
```

### 2. Published to Wikidata Badge

```tsx
import { GemBadge, WikidataRubyIcon } from '@/components/ui/gem-icon';

<div className="flex items-center gap-2">
  <WikidataRubyIcon size={16} />
  <GemBadge variant="ruby">Published</GemBadge>
</div>
```

### 3. Premium Feature Card

```tsx
import { GemCard } from '@/components/ui/gem-icon';

<GemCard sparkle={true}>
  <h3 className="font-bold">Premium Feature</h3>
  <p>Unlock advanced capabilities</p>
</GemCard>
```

### 4. Upgrade CTA Button

```tsx
<button className="gem-gradient-shine p-6 rounded-lg text-white">
  Upgrade to Pro
</button>
```

### 5. Hero Section Heading

```tsx
<h1 className="text-6xl font-bold gem-text-shimmer">
  GEMflush
</h1>
```

---

## 📦 Import Components

```tsx
// All gem components available from one place
import {
  GemIcon,              // Primary diamond/gem icon
  GemClusterIcon,       // Multiple gems (knowledge graph collections)
  GemShardIcon,         // Crystal fragment (loading/processing)
  HexGemIcon,           // Hexagonal gem (data nodes)
  WikidataRubyIcon,     // Red gem (Wikidata features)
  GemflushLogo,         // Full brand logo
  GemBadge,             // Status badges
  GemCard,              // Premium cards
} from '@/components/ui/gem-icon';
```

---

## 🎯 CSS Classes Cheatsheet

### Gradients
- `gem-gradient` - Basic violet gradient
- `gem-gradient-shine` - Gradient with light reflection
- `gem-faceted` - Multi-faceted diamond effect
- `gem-ruby` - Red Wikidata gradient

### Text Effects
- `gem-text` - Static prismatic text
- `gem-text-shimmer` - Animated shimmer (for heroes)

### Visual Effects
- `gem-sparkle` - Animated light sweep
- `gem-glow` - Subtle glow
- `gem-glow-strong` - Intense glow
- `gem-border` - Gradient border
- `gem-card` - Premium card background

### Icon Styling
- `icon-gem` - Basic gem icon styling
- `wikidata-accent` - Red accent color
- `knowledge-graph-accent` - Violet accent

---

## 🏷️ Component Props

### GemIcon
```tsx
<GemIcon 
  size={24}                                    // Number
  variant="default" | "faceted" | "ruby" | 
          "sparkle" | "outline"                // Variant
  className="custom-class"                     // Additional classes
/>
```

### GemBadge
```tsx
<GemBadge 
  variant="default" | "ruby" | "outline"       // Style variant
  className="custom-class"                     // Additional classes
>
  Text content
</GemBadge>
```

### GemCard
```tsx
<GemCard 
  sparkle={false}                              // Enable animated sparkle
  className="custom-class"                     // Additional classes
>
  Card content
</GemCard>
```

### GemflushLogo
```tsx
<GemflushLogo 
  size={32}                                    // Icon size
  showText={true}                              // Show "GEMflush" text
  className="custom-class"                     // Additional classes
/>
```

---

## 🎬 Real-World Examples

### Business Entity Card (Published)

```tsx
<Card className="gem-card border-l-4 border-l-wikidata-accent">
  <CardHeader>
    <div className="flex justify-between items-start">
      <HexGemIcon size={32} />
      <GemBadge variant="ruby">Published</GemBadge>
    </div>
    <CardTitle>Acme Corp</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      Verified knowledge graph entity
    </p>
    <div className="flex items-center gap-2 mt-3">
      <WikidataRubyIcon size={16} />
      <span className="text-xs wikidata-accent">Q12345</span>
    </div>
  </CardContent>
</Card>
```

### Loading State

```tsx
<div className="flex items-center gap-3">
  <GemShardIcon size={24} className="animate-pulse" />
  <span>Processing knowledge graph...</span>
</div>
```

### Premium Upgrade Section

```tsx
<div className="gem-sparkle gem-gradient p-12 rounded-lg text-white text-center">
  <GemClusterIcon size={64} className="mx-auto mb-6 text-white" />
  <h2 className="text-3xl font-bold mb-4">Upgrade to Premium</h2>
  <p className="mb-6">Unlock unlimited knowledge graphs</p>
  <button className="bg-white text-primary px-8 py-3 rounded-lg font-bold">
    Get Started
  </button>
</div>
```

### Status Indicators

```tsx
// Published
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-wikidata-accent" />
  <span>Published to Wikidata</span>
</div>

// Processing
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-knowledge-graph animate-pulse" />
  <span>Generating knowledge graph</span>
</div>
```

---

## 📋 Usage Guidelines

### ✅ DO Use Gems For:

- Brand logos and primary navigation
- Premium/pro feature highlights
- Published entity indicators
- Knowledge graph visualizations
- Upgrade CTAs
- Featured content cards
- Loading states for KG operations

### ❌ DON'T Use Gems For:

- Basic text or paragraphs (use standard colors)
- Standard buttons (reserve for premium actions)
- Every card (gems should indicate special status)
- Error messages (use `destructive` variants)

---

## 🎨 Design Philosophy

1. **Violet = Innovation** - Your platform's cutting-edge technology
2. **Ruby = Authority** - Wikidata's established credibility
3. **Gems = Premium** - High-value, polished experiences
4. **Crystals = Data** - Structured, faceted information

---

## 🚀 Performance Tips

- Animated effects (`gem-sparkle`, `gem-text-shimmer`) use CSS animations (performant)
- `gem-glow` effects use `drop-shadow` filters (use sparingly on large elements)
- `gem-gradient` uses CSS gradients (very performant)
- SVG icons are optimized and lightweight

---

## 🔍 Preview Components

To see all styling in action, temporarily import the showcase:

```tsx
import { GemShowcase } from '@/components/gem-showcase';

// In your development page
<GemShowcase />
```

---

## 📚 Additional Resources

- Full design system documentation: `DESIGN_SYSTEM.md`
- Component source: `components/ui/gem-icon.tsx`
- Showcase component: `components/gem-showcase.tsx`
- CSS utilities: `app/globals.css` (search for "GEMflush Brand")

---

**Remember**: Gem styling should enhance, not overwhelm. Use strategically to highlight premium features, published entities, and brand moments. ✨

