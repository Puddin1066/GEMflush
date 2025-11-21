# Typed & Validated Entity Builder

## Overview

The **Typed Entity Builder** provides type-safe and validated entity building with comprehensive validation at each step. It ensures that `crawlData` is properly typed and validated before being transformed into a rich Wikidata JSON entity.

---

## Architecture

### Components

1. **Validation Schemas** (`lib/validation/crawl-data.ts`)
   - Zod schemas for `crawlData` validation
   - Field-level validation (phone, email, dates, etc.)
   - Type inference for TypeScript

2. **Entity Builder Validation** (`lib/validation/entity-builder.ts`)
   - Validates entity building input/output
   - Property value validation
   - Claim building context validation

3. **Typed Entity Builder** (`lib/wikidata/typed-entity-builder.ts`)
   - Wraps existing `WikidataEntityBuilder` with validation
   - Provides type-safe entity building
   - Tracks metadata (quality, source, build time)

---

## Usage

### Basic Usage

```typescript
import { typedEntityBuilder } from '@/lib/wikidata/typed-entity-builder';

// Build entity with validation
const result = await typedEntityBuilder.buildEntity(
  business,
  crawlData,
  'pro', // tier
  1, // enrichmentLevel (optional)
  notabilityReferences // optional
);

// Result includes entity and metadata
const { entity, metadata } = result;

// Entity is fully validated and typed
console.log(entity.claims.P31); // Type-safe access
console.log(metadata.sourceDataQuality); // 0-1 quality score
console.log(metadata.propertiesExtracted); // Number of properties
```

### Validation Flow

```
1. Validate Business Input
   ↓
2. Validate CrawlData (if provided)
   ↓
3. Validate Entity Building Input
   ↓
4. Build Entity (using existing builder)
   ↓
5. Count Properties by Source
   ↓
6. Filter by Tier
   ↓
7. Validate Final Entity Structure
   ↓
8. Validate Result Structure
   ↓
9. Return Typed Result
```

---

## Validation Schemas

### CrawlData Schema

```typescript
// Validates crawlData structure
const crawlDataSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  phone: z.string().regex(/^[+\d\s().-]+$/).max(50).optional(),
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
  location: locationSchema, // Validates lat/lng, city, state, etc.
  socialLinks: socialLinksSchema, // Validates social media URLs
  founded: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).optional(),
  businessDetails: businessDetailsSchema, // Rich business info
  llmEnhanced: llmEnhancedSchema, // LLM-extracted data
}).refine(
  (data) => data.name || data.description,
  { message: 'CrawlData must have at least name or description' }
);
```

### Entity Building Input Schema

```typescript
// Validates input for entity building
const entityBuildingInputSchema = z.object({
  business: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    url: z.string().url(),
    location: z.object({...}).optional().nullable(),
  }),
  crawlData: crawlDataSchema.optional(),
  tier: z.enum(['free', 'pro', 'agency']),
  enrichmentLevel: z.number().int().min(1).max(5).optional(),
  notabilityReferences: z.array(z.object({...})).optional(),
});
```

### Entity Building Result Schema

```typescript
// Validates result of entity building
const entityBuildingResultSchema = z.object({
  entity: wikidataEntityDataSchema, // Full Wikidata entity
  metadata: z.object({
    sourceDataQuality: z.number().min(0).max(1),
    propertiesExtracted: z.number().int().nonnegative(),
    propertiesFromCrawlData: z.number().int().nonnegative(),
    propertiesFromBusiness: z.number().int().nonnegative(),
    propertiesFromLLM: z.number().int().nonnegative(),
    validationErrors: z.array(z.string()).optional(),
    buildTime: z.number().nonnegative(),
  }),
});
```

---

## Validation Features

### 1. CrawlData Validation

**Validates**:
- Phone number format: `^[+\d\s().-]+$`
- Email format: Standard email regex
- Date format: `YYYY` or `YYYY-MM-DD`
- URL format: Valid URLs for social links
- Coordinate bounds: Lat (-90 to 90), Lng (-180 to 180)
- Stock symbol: `^[A-Z]{1,5}$` (1-5 uppercase letters)

**Example**:
```typescript
const validation = validateCrawlData(crawlData);
if (!validation.success) {
  console.error('Validation errors:', validation.errors);
} else {
  const validatedData = validation.data; // Type-safe CrawlDataOutput
}
```

### 2. Property Value Validation

**Validates**:
- Property ID format: `^P\d+$`
- Value type matches `dataType` (item, string, time, quantity, etc.)
- QID format for item-type properties: Must start with "Q"
- Time format for time-type properties: `YYYY` or `YYYY-MM-DD`

**Example**:
```typescript
const propertyValue = {
  pid: 'P1329',
  value: '+1-555-123-4567',
  dataType: 'string',
  source: 'crawlData',
};

const validation = validatePropertyValue(propertyValue);
if (!validation.success) {
  console.error('Invalid property value:', validation.errors);
}
```

### 3. Entity Structure Validation

**Validates**:
- Labels structure (language + value)
- Descriptions structure (language + value, max 250 chars)
- Claims structure (mainsnak + type + references)
- Property IDs format: `^P\d+$`
- Datavalue types match property data types

**Example**:
```typescript
const entityValidation = validateWikidataEntity(entity);
if (!entityValidation.success) {
  console.error('Entity validation failed:', entityValidation.errors);
} else {
  // Entity is valid and ready for publication
}
```

---

## Metadata Tracking

The typed entity builder tracks comprehensive metadata:

```typescript
interface EntityBuildingMetadata {
  sourceDataQuality: number; // 0-1 quality score
  propertiesExtracted: number; // Total properties
  propertiesFromCrawlData: number; // From crawlData
  propertiesFromBusiness: number; // From business
  propertiesFromLLM: number; // From LLM suggestions
  validationErrors: string[]; // Validation warnings
  buildTime: number; // Build time in milliseconds
}
```

### Source Data Quality Calculation

Quality score (0-1) based on:
- **Basic fields (40%)**: name, description, phone, email
- **Location data (20%)**: address, city, coordinates
- **Social links (15%)**: Number of social media links
- **Business details (15%)**: Rich business information
- **Temporal data (10%)**: Founded date

### Property Source Tracking

Properties are categorized by source:
- **Business**: P31 (instance of), P856 (official website)
- **CrawlData**: P1448 (name), P625 (coordinates), P1329 (phone), etc.
- **LLM**: P452 (industry), P1454 (legal form), P159 (headquarters)

---

## Error Handling

### Graceful Degradation

If `crawlData` validation fails, the builder:
1. Logs validation errors to metadata
2. Continues with partial `crawlData` (if possible)
3. Builds entity with available data
4. Includes errors in metadata for debugging

### Fail-Fast Validation

Critical validations throw errors:
- Invalid business input (missing id, name, url)
- Invalid entity structure (doesn't match Wikibase spec)
- Invalid result structure

---

## Type Safety

### Type Inference

All schemas provide TypeScript type inference:

```typescript
// Input type (before validation)
type CrawlDataInput = z.input<typeof crawlDataSchema>;

// Output type (after validation)
type CrawlDataOutput = z.output<typeof crawlDataSchema>;

// Use in function signatures
function processCrawlData(data: CrawlDataOutput) {
  // data is fully typed and validated
}
```

### Type Guards

Runtime type checking:

```typescript
if (isValidBusinessForEntityBuilding(business)) {
  // business is typed as Pick<Business, 'id' | 'name' | 'url' | 'location'>
}

if (isValidCrawlDataForEntityBuilding(crawlData)) {
  // crawlData is typed as CrawlDataOutput
}
```

---

## Example: Complete Flow

```typescript
import { typedEntityBuilder } from '@/lib/wikidata/typed-entity-builder';
import { validateCrawlData } from '@/lib/validation/crawl-data';

// Step 1: Validate crawlData
const crawlValidation = validateCrawlData(rawCrawlData);
if (!crawlValidation.success) {
  console.error('CrawlData validation failed:', crawlValidation.errors);
  return;
}

// Step 2: Build entity with validation
const result = await typedEntityBuilder.buildEntity(
  business,
  crawlValidation.data, // Validated crawlData
  'pro',
  1,
  notabilityReferences
);

// Step 3: Check metadata
console.log('Source data quality:', result.metadata.sourceDataQuality);
console.log('Properties extracted:', result.metadata.propertiesExtracted);
console.log('From crawlData:', result.metadata.propertiesFromCrawlData);
console.log('From business:', result.metadata.propertiesFromBusiness);
console.log('From LLM:', result.metadata.propertiesFromLLM);
console.log('Build time:', result.metadata.buildTime, 'ms');

// Step 4: Check for validation errors
if (result.metadata.validationErrors.length > 0) {
  console.warn('Validation warnings:', result.metadata.validationErrors);
}

// Step 5: Use validated entity
const entity = result.entity; // Fully typed and validated
console.log('Entity has', Object.keys(entity.claims).length, 'properties');
```

---

## Benefits

### 1. Type Safety
- Compile-time type checking
- IntelliSense support
- Prevents type errors

### 2. Runtime Validation
- Catches invalid data early
- Provides detailed error messages
- Graceful error handling

### 3. Quality Tracking
- Source data quality scores
- Property source attribution
- Build performance metrics

### 4. Debugging
- Validation error details
- Source tracking
- Build time metrics

### 5. Maintainability
- Centralized validation logic
- Reusable validation functions
- Clear error messages

---

## Integration

### Replace Existing Builder

```typescript
// Before
import { WikidataEntityBuilder } from '@/lib/wikidata/entity-builder';
const builder = new WikidataEntityBuilder();
const entity = await builder.buildEntity(business, crawlData);

// After
import { typedEntityBuilder } from '@/lib/wikidata/typed-entity-builder';
const result = await typedEntityBuilder.buildEntity(business, crawlData, 'pro');
const entity = result.entity; // Fully validated
```

### Gradual Migration

You can use both builders:
- **TypedEntityBuilder**: For new code, critical paths
- **WikidataEntityBuilder**: For existing code, gradual migration

---

## Summary

The **Typed Entity Builder** provides:
- ✅ **Type-safe** entity building with TypeScript
- ✅ **Validated** crawlData and entity structures
- ✅ **Quality tracking** with metadata
- ✅ **Error handling** with graceful degradation
- ✅ **Debugging** with detailed error messages
- ✅ **Maintainability** with centralized validation

This ensures that `crawlData` is properly typed and validated before being transformed into a rich, validated Wikidata JSON entity ready for publication via the Action API.


