# Strategic Property Selection

## Overview

The **Strategic Property Selector** uses Wikidata's database reports to strategically select properties based on:
- **Usage frequency** (from Wikidata database reports)
- **Relevance** to business entities
- **Data availability** from crawlData
- **Tier-based value** proposition

**Reference**: [Wikidata Database Reports - List of Properties](https://www.wikidata.org/wiki/Wikidata:Database_reports/List_of_properties/all)

---

## Strategy

### 1. Property Categories

Properties are organized by semantic meaning:

- **Core**: Essential for any entity (P31, P856, P1448)
- **Identification**: Name, labels, identifiers
- **Location**: Geographic information (P625, P6375, P131, P159, P17)
- **Contact**: Communication channels (P1329, P968)
- **Temporal**: Dates and time (P571, P576)
- **Classification**: Industry, type, category (P452, P1454)
- **Social**: Social media presence (P2002, P2013, P2003, P4264)
- **Scale**: Size, employees, revenue (P1128, P2139)
- **Relationships**: Parent, subsidiary, partnerships (P749, P355, P112, P169)
- **Media**: Images, logos, videos (P18, P4896)
- **Financial**: Revenue, stock, funding (P249, P414)
- **Operational**: Products, services, awards

### 2. Property Priority

Properties are prioritized by value:

- **Required**: Always include (core properties)
- **High**: Include if data available (high value)
- **Medium**: Include if data available and tier allows
- **Low**: Include only for complete entities
- **Optional**: Include only if explicitly requested

### 3. Tier-Based Selection

#### Free Tier
- **Core properties only**: P31, P856, P1448, P625, P1329
- **Total**: ~5 properties

#### Pro Tier
- **Core + Enhanced**: All free properties plus:
  - Contact: P968 (email)
  - Social: P2002, P2013, P2003, P4264 (Twitter, Facebook, Instagram, LinkedIn)
  - Temporal: P571 (inception)
  - Location: P6375 (street address)
  - Scale: P1128 (employees)
- **Total**: ~13 properties

#### Agency Tier
- **Progressive enrichment** based on enrichment level:

**Level 1-2**: Enhanced properties (same as Pro)

**Level 3**: Complete properties
- Classification: P452 (industry), P1454 (legal form)
- Location QIDs: P131 (located in), P159 (headquarters), P17 (country)
- Media: P18 (image), P4896 (logo)
- Financial: P249 (ticker symbol)
- **Total**: ~20 properties

**Level 4**: Full enrichment
- Temporal: P576 (dissolved)
- Relationships: P749 (parent), P355 (subsidiary), P112 (founded by), P169 (CEO)
- Financial: P414 (stock exchange), P2139 (revenue)
- Operational: P1056 (products)
- **Total**: ~30+ properties

---

## Usage

### Basic Usage

```typescript
import { strategicPropertySelector } from '@/lib/wikidata/strategic-property-selector';

// Get properties for tier
const properties = strategicPropertySelector.getPropertiesForTier(
  'pro',
  undefined, // enrichmentLevel (optional)
  crawlData // crawlData (optional, for data availability check)
);

// Result: ['P31', 'P856', 'P1448', 'P625', 'P1329', 'P6375', 'P968', ...]
```

### With Data Availability Check

```typescript
// Only include properties if data is available
const properties = strategicPropertySelector.getPropertiesForTier(
  'agency',
  3, // enrichmentLevel
  crawlData // Checks if crawlData has data for each property
);

// Properties are filtered by:
// 1. Tier eligibility
// 2. Enrichment level
// 3. Data availability
```

### Get Recommended Properties

```typescript
// Get properties that could be added if more data is available
const recommended = strategicPropertySelector.getRecommendedProperties(
  currentProperties, // Properties already included
  crawlData, // Available crawlData
  'pro' // Tier
);

// Returns properties that:
// - Are eligible for tier
// - Have data available in crawlData
// - Are not already included
```

### Get Properties by Category

```typescript
// Get all location properties
const locationProps = strategicPropertySelector.getPropertiesByCategory('location');
// Returns: ['P625', 'P6375', 'P131', 'P159', 'P17']

// Get all social media properties
const socialProps = strategicPropertySelector.getPropertiesByCategory('social');
// Returns: ['P2002', 'P2013', 'P2003', 'P4264', 'P2004', 'P2012']
```

### Get Property Statistics

```typescript
// Get property metadata
const stats = strategicPropertySelector.getPropertyStats('P452');
// Returns: {
//   pid: 'P452',
//   label: 'industry',
//   category: 'classification',
//   priority: 'medium',
//   dataSource: 'llm',
//   tier: 'agency',
//   enrichmentLevel: 3
// }
```

---

## Property Database

### Core Properties (Required)

| PID | Label | Category | Tier |
|-----|-------|----------|------|
| P31 | instance of | core | free |
| P856 | official website | identification | free |
| P1448 | official name | identification | free |

### Location Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P625 | coordinate location | high | free | - |
| P6375 | street address | high | pro | - |
| P131 | located in | medium | agency | 3 |
| P159 | headquarters location | medium | agency | 3 |
| P17 | country | medium | agency | 3 |

### Contact Properties

| PID | Label | Priority | Tier |
|-----|-------|----------|------|
| P1329 | phone number | high | free |
| P968 | email address | high | pro |

### Social Media Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P2002 | Twitter username | high | pro | - |
| P2013 | Facebook ID | high | pro | - |
| P2003 | Instagram username | high | pro | - |
| P4264 | LinkedIn company ID | high | pro | - |
| P2004 | YouTube channel ID | medium | agency | 2 |
| P2012 | Facebook page ID | medium | agency | 2 |

### Classification Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P452 | industry | medium | agency | 3 |
| P1454 | legal form | medium | agency | 3 |
| P279 | subclass of | low | agency | 4 |

### Temporal Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P571 | inception | medium | pro | - |
| P576 | dissolved | low | agency | 4 |
| P580 | start time | low | agency | 4 |
| P582 | end time | low | agency | 4 |

### Scale Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P1128 | employees | medium | pro | - |
| P2139 | total revenue | low | agency | 4 |
| P2138 | employees (at dissolution) | low | agency | 4 |

### Relationship Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P749 | parent organization | low | agency | 4 |
| P355 | subsidiary | low | agency | 4 |
| P112 | founded by | low | agency | 4 |
| P169 | chief executive officer | low | agency | 4 |

### Media Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P18 | image | medium | agency | 3 |
| P4896 | logo | medium | agency | 3 |
| P154 | logo image | low | agency | 4 |

### Financial Properties

| PID | Label | Priority | Tier | Enrichment |
|-----|-------|----------|------|------------|
| P249 | ticker symbol | medium | agency | 2 |
| P414 | stock exchange | low | agency | 4 |
| P2139 | total revenue | low | agency | 4 |

---

## Integration with Entity Builder

### Update TieredEntityBuilder

```typescript
import { strategicPropertySelector } from '@/lib/wikidata/strategic-property-selector';

// In TieredEntityBuilder.getPropertiesForTier()
getPropertiesForTier(
  tier: string,
  enrichmentLevel?: number,
  crawlData?: CrawledData
): string[] {
  return strategicPropertySelector.getPropertiesForTier(
    tier as 'free' | 'pro' | 'agency',
    enrichmentLevel,
    crawlData
  );
}
```

### Benefits

1. **Data-Driven**: Properties selected based on Wikidata usage patterns
2. **Strategic**: Prioritizes high-value properties
3. **Flexible**: Adapts to data availability
4. **Scalable**: Easy to add new properties
5. **Maintainable**: Centralized property selection logic

---

## Future Enhancements

### 1. Usage Frequency Integration

Fetch actual usage counts from Wikidata API:

```typescript
// Fetch usage counts from Wikidata
const usageCounts = await fetchPropertyUsageCounts();
// Update STRATEGIC_PROPERTIES with actual usage data
```

### 2. Industry-Specific Properties

Select properties based on business industry:

```typescript
// Get properties relevant to software industry
const softwareProps = getPropertiesForIndustry('Q11650'); // Software
// Returns: P452 (industry), P1128 (employees), P2002 (Twitter), ...
```

### 3. Property Value Scoring

Score properties by:
- Usage frequency
- Data availability
- Tier value
- Industry relevance

```typescript
const score = calculatePropertyValue('P452', crawlData, 'pro', 'Q11650');
// Returns: 0.85 (high value for software companies)
```

### 4. Dynamic Property Selection

Select properties dynamically based on:
- Available crawlData
- Business type
- Industry
- Tier and enrichment level

---

## Summary

The **Strategic Property Selector** provides:

- ✅ **Data-driven** property selection from Wikidata database reports
- ✅ **Tier-based** property sets (Free, Pro, Agency)
- ✅ **Progressive enrichment** for Agency tier
- ✅ **Data availability** checks
- ✅ **Priority-based** sorting
- ✅ **Category-based** organization
- ✅ **Recommendation** system for missing properties

This ensures entities are built with the most valuable and commonly used properties from Wikidata, maximizing entity completeness and value.


