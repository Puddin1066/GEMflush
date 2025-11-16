# Validation Layer Trace: `@business.ts`

## Purpose

`lib/validation/business.ts` serves as the **input validation layer** using Zod schemas. It validates user input at API endpoints before processing, ensuring:

1. **Type Safety** - Runtime validation of request bodies
2. **Data Integrity** - Enforces constraints (min/max, required fields)
3. **Security** - Prevents malformed/malicious data
4. **Error Messages** - Provides clear validation error feedback

## Architecture Position

```
User Input (JSON)
    ↓
API Route Handler
    ↓
Zod Schema Validation ← lib/validation/business.ts
    ↓ (if valid)
Database Queries
    ↓
Domain Objects
    ↓
Business Logic
```

## Schemas Defined

### 1. `businessLocationSchema`
```typescript
z.object({
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})
```

**Purpose:** Validates business location data
**Constraints:**
- City, state, country are required
- Lat/lng are optional but validated if provided
- Coordinates must be valid ranges

### 2. `businessCategorySchema`
```typescript
z.enum([
  'restaurant', 'retail', 'healthcare', 'professional_services',
  'home_services', 'automotive', 'beauty', 'fitness',
  'entertainment', 'education', 'real_estate', 'technology', 'other'
])
```

**Purpose:** Restricts category to predefined list
**Constraints:** Must be one of 13 valid categories

### 3. `createBusinessSchema`
```typescript
z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name too long'),
  url: z.string().url('Must be a valid URL'),
  category: businessCategorySchema.optional(),
  location: businessLocationSchema,
})
```

**Purpose:** Validates new business creation
**Constraints:**
- Name: 2-200 characters
- URL: Must be valid format
- Category: Optional, from enum
- Location: Required, nested validation

### 4. `updateBusinessSchema`
```typescript
createBusinessSchema.partial()
```

**Purpose:** Validates business updates (all fields optional)

### 5. `crawlRequestSchema`
```typescript
z.object({
  businessId: z.number().int().positive(),
  forceRecrawl: z.boolean().optional().default(false),
})
```

**Purpose:** Validates crawl job requests
**Constraints:**
- businessId: Must be positive integer
- forceRecrawl: Optional boolean

### 6. `fingerprintRequestSchema`
```typescript
z.object({
  businessId: z.number().int().positive(),
  includeCompetitors: z.boolean().optional().default(true),
})
```

**Purpose:** Validates fingerprint job requests
**Constraints:**
- businessId: Must be positive integer
- includeCompetitors: Optional boolean (default true)

### 7. `wikidataPublishRequestSchema`
```typescript
z.object({
  businessId: z.number().int().positive(),
  publishToProduction: z.boolean().optional().default(false),
})
```

**Purpose:** Validates Wikidata publish requests
**Constraints:**
- businessId: Must be positive integer
- publishToProduction: Optional boolean (default false for test.wikidata.org)

## Usage Trace

### 1. Business Creation API

**File:** `app/api/business/route.ts`
**Endpoint:** `POST /api/business`

```typescript
import { createBusinessSchema } from '@/lib/validation/business';

export async function POST(request: NextRequest) {
  // 1. Get request body
  const body = await request.json();
  
  // 2. Validate using schema
  const validatedData = createBusinessSchema.parse(body);
  // ^ Throws ZodError if validation fails
  
  // 3. Use validated data safely
  const business = await createBusiness({
    teamId: team.id,
    name: validatedData.name,      // Type-safe
    url: validatedData.url,        // Guaranteed valid URL
    category: validatedData.category,
    location: validatedData.location,  // Nested validation passed
    status: 'pending',
  });
}
```

**Validation Flow:**
1. User submits JSON: `{ name: "Acme Inc", url: "https://acme.com", ... }`
2. `createBusinessSchema.parse()` validates:
   - ✅ name is 2-200 chars
   - ✅ url is valid format
   - ✅ location has city, state, country
   - ❌ Throws ZodError if any fail
3. API returns 400 with error details if validation fails
4. Proceeds to database if validation passes

### 2. Crawl Job API

**File:** `app/api/crawl/route.ts`
**Endpoint:** `POST /api/crawl`

```typescript
// Note: Defines schema inline (should import from validation file)
const crawlRequestSchema = z.object({
  businessId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { businessId } = crawlRequestSchema.parse(body);
  // ^ Ensures businessId is a positive integer
  
  const business = await getBusinessById(businessId);
  // Safe to use - guaranteed valid ID
}
```

**Issue:** ⚠️ Schema is defined inline instead of importing from `lib/validation/business.ts`

### 3. Fingerprint Job API

**File:** `app/api/fingerprint/route.ts`
**Endpoint:** `POST /api/fingerprint`

```typescript
// Note: Defines schema inline (should import from validation file)
const fingerprintRequestSchema = z.object({
  businessId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { businessId } = fingerprintRequestSchema.parse(body);
  // ^ Validates businessId before processing
  
  const analysis = await llmFingerprinter.fingerprint(business);
}
```

**Issue:** ⚠️ Schema is defined inline instead of importing from `lib/validation/business.ts`

### 4. Tests

**File:** `lib/validation/__tests__/business.test.ts`

Tests validate that schemas correctly accept/reject various inputs:
- Valid business data passes
- Invalid URLs fail
- Missing required fields fail
- Out-of-range coordinates fail

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Client Request                                              │
│ POST /api/business                                          │
│ {                                                           │
│   name: "Acme Inc",                                        │
│   url: "https://acme.com",                                 │
│   location: { city: "SF", state: "CA", country: "US" }    │
│ }                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ API Route Handler                                           │
│ app/api/business/route.ts                                   │
│                                                             │
│ const body = await request.json();                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Zod Schema Validation                                       │
│ lib/validation/business.ts                                  │
│                                                             │
│ createBusinessSchema.parse(body)                           │
│ ✓ name: 2-200 chars                                        │
│ ✓ url: valid URL format                                    │
│ ✓ location.city: required                                  │
│ ✓ location.state: required                                 │
│ ✓ location.country: required                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────┴──────────┐
          │                     │
      Valid?                 Invalid?
          │                     │
          ▼                     ▼
┌─────────────────┐   ┌────────────────────────┐
│ Proceed         │   │ Return 400 Error       │
│ to Database     │   │ { error: "Validation   │
│                 │   │   error", details: []} │
└────────┬────────┘   └────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Database Queries                            │
│ lib/db/queries.ts                           │
│                                             │
│ createBusiness({ ...validatedData })       │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Domain Object                               │
│ lib/db/schema.ts                            │
│                                             │
│ Business { id, teamId, name, url, ... }    │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Response to Client                          │
│ { business: {...}, message: "..." }        │
└─────────────────────────────────────────────┘
```

## Type Exports

```typescript
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type BusinessCategory = z.infer<typeof businessCategorySchema>;
```

**Purpose:** TypeScript types derived from Zod schemas
**Benefit:** Single source of truth for validation and types

## Current Issues

### 1. Duplicate Schema Definitions
**Problem:** `crawlRequestSchema` and `fingerprintRequestSchema` are defined inline in API routes instead of imported from `lib/validation/business.ts`

**Location:**
- `app/api/crawl/route.ts` (line 14-16)
- `app/api/fingerprint/route.ts` (line 15-17)

**Impact:** 
- Code duplication
- Inconsistency risk
- Missing `forceRecrawl` and `includeCompetitors` options

**Fix:**
```typescript
// app/api/crawl/route.ts
import { crawlRequestSchema } from '@/lib/validation/business';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { businessId, forceRecrawl } = crawlRequestSchema.parse(body);
  // Now includes forceRecrawl option
}
```

### 2. Unused Schemas
**Problem:** `wikidataPublishRequestSchema` is defined but not used yet

**Status:** Prepared for future Wikidata publish API route

## Best Practices

### ✅ Do:
1. **Import schemas** from `lib/validation/business.ts`
2. **Use `.parse()`** for validation that throws on error
3. **Catch ZodError** and return 400 with details
4. **Derive types** from schemas using `z.infer<>`
5. **Test schemas** with valid and invalid inputs

### ❌ Don't:
1. **Define schemas inline** in API routes
2. **Skip validation** on user input
3. **Ignore validation errors** 
4. **Duplicate schema definitions**
5. **Use domain types** for API validation

## Example Error Response

When validation fails:

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "minimum": 2,
      "type": "string",
      "inclusive": true,
      "message": "Name must be at least 2 characters",
      "path": ["name"]
    },
    {
      "code": "invalid_string",
      "validation": "url",
      "message": "Must be a valid URL",
      "path": ["url"]
    }
  ]
}
```

## Integration with Other Layers

### 1. API Routes (Entry Point)
```
lib/validation/business.ts → app/api/*/route.ts
```
Validates incoming requests

### 2. Database Layer
```
Validated Data → lib/db/queries.ts
```
Safe to use - already validated

### 3. Domain Objects
```
Database Result → lib/db/schema.ts (Business)
```
Schema ensures data integrity

### 4. Business Logic
```
Domain Objects → lib/wikidata/, lib/llm/, lib/crawler/
```
Processes validated business data

### 5. Data Access Layer
```
Domain Objects → lib/data/*-dto.ts → UI
```
Transforms for display

## Summary

**`lib/validation/business.ts` is the input validation layer that:**

✅ Validates user input at API boundaries
✅ Provides type-safe request parsing
✅ Enforces business rules and constraints
✅ Returns clear error messages
✅ Prevents invalid data from entering the system

**Current Usage:**
- ✅ Used in: `app/api/business/route.ts` (POST)
- ⚠️ Should be used in: `app/api/crawl/route.ts`
- ⚠️ Should be used in: `app/api/fingerprint/route.ts`
- 📝 Prepared for: `app/api/wikidata/publish/route.ts` (future)

**Position in Architecture:**
```
User Input → Validation Layer → Database → Domain → Business Logic → DTO → UI
            ↑ YOU ARE HERE
```

