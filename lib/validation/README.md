# Validation Module (`lib/validation/`)

**Purpose**: Zod schemas for data validation  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `validation/` module provides Zod schemas for validating data across the application. It ensures type safety, input validation, and consistent error messages for all user inputs and API requests.

### Architecture Principles

1. **Zod Schemas**: All validation uses Zod
2. **Type Safety**: Schemas generate TypeScript types
3. **Reusability**: Shared schemas across modules
4. **Error Messages**: Clear, user-friendly error messages
5. **DRY**: Centralized validation logic

---

## 🏗️ Module Structure

```
lib/validation/
├── business.ts           # Business validation schemas
├── crawl.ts             # Crawl data validation schemas
├── crawl-data.ts        # Crawled data validation
├── wikidata.ts          # Wikidata validation schemas
├── entity-builder.ts    # Entity builder validation
├── common.ts            # Common validation utilities
└── __tests__/          # TDD test specifications
```

---

## 🔑 Core Schemas

### 1. Business Validation (`business.ts`)

**Purpose**: Validate business creation and updates

**Key Schemas:**

```typescript
// Business location
export const businessLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// Business category
export const businessCategorySchema = z.enum([
  'restaurant',
  'retail',
  'healthcare',
  'professional_services',
  // ... more categories
]);

// Create business
export const createBusinessSchema = z.object({
  name: z.string().min(2).max(200),
  url: z.string().url('Must be a valid URL'),
  category: businessCategorySchema.optional(),
  location: businessLocationSchema,
});

// URL-only creation (frictionless onboarding)
export const createBusinessFromUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});
```

**Usage:**

```typescript
import { createBusinessSchema } from '@/lib/validation/business';

// Validate input
const result = createBusinessSchema.safeParse({
  name: 'Test Business',
  url: 'https://example.com',
  location: {
    city: 'Seattle',
    state: 'WA',
    country: 'US',
  },
});

if (result.success) {
  // Use validated data
  const business = result.data;
} else {
  // Handle validation errors
  const errors = result.error.errors;
}
```

---

### 2. Crawl Validation (`crawl.ts`)

**Purpose**: Validate crawl requests and data

**Key Schemas:**

```typescript
// Crawl request
export const crawlRequestSchema = z.object({
  url: z.string().url(),
  businessId: z.number().optional(),
  forceRefresh: z.boolean().optional(),
});

// Crawl result
export const crawlResultSchema = z.object({
  success: z.boolean(),
  data: z.object({
    url: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});
```

---

### 3. Wikidata Validation (`wikidata.ts`)

**Purpose**: Validate Wikidata entity data

**Key Schemas:**

```typescript
// Wikidata entity
export const wikidataEntitySchema = z.object({
  labels: z.record(z.string(), z.string()),
  descriptions: z.record(z.string(), z.string()),
  claims: z.array(z.any()),
  aliases: z.record(z.string(), z.array(z.string())).optional(),
});

// Publish request
export const publishRequestSchema = z.object({
  businessId: z.number(),
  target: z.enum(['test', 'production']),
});
```

---

### 4. Common Validation (`common.ts`)

**Purpose**: Shared validation utilities

**Key Schemas:**

```typescript
// URL validation
export const urlSchema = z.string().url('Must be a valid URL');

// Email validation
export const emailSchema = z.string().email('Must be a valid email');

// Phone validation
export const phoneSchema = z.string().regex(
  /^\+?[\d\s-()]+$/,
  'Must be a valid phone number'
);
```

---

## 🔄 Integration with Forms

### Server Actions

```typescript
// app/actions/business.ts
import { validatedAction } from '@/lib/auth/middleware';
import { createBusinessSchema } from '@/lib/validation/business';

export const createBusiness = validatedAction(
  createBusinessSchema,
  async (data) => {
    // Data is already validated
    const business = await createBusiness(data);
    return { success: true, business };
  }
);
```

### API Routes

```typescript
// app/api/business/route.ts
import { createBusinessSchema } from '@/lib/validation/business';

export async function POST(request: Request) {
  const body = await request.json();
  const result = createBusinessSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json(
      { error: result.error.errors },
      { status: 400 }
    );
  }
  
  const business = await createBusiness(result.data);
  return Response.json({ business });
}
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Business Validation
 * 
 * As a system
 * I want to validate business creation data
 * So that invalid data is rejected
 * 
 * Acceptance Criteria:
 * - Valid business data passes validation
 * - Invalid URLs are rejected
 * - Missing required fields are rejected
 */
describe('Business Validation - Specification', () => {
  it('validates business creation data', () => {
    // SPECIFICATION: Given valid business data
    const validData = {
      name: 'Test Business',
      url: 'https://example.com',
      location: {
        city: 'Seattle',
        state: 'WA',
        country: 'US',
      },
    };
    
    // SPECIFICATION: When validating
    const result = createBusinessSchema.safeParse(validData);
    
    // SPECIFICATION: Then should pass
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test Business');
    }
  });
  
  it('rejects invalid URLs', () => {
    // SPECIFICATION: Given invalid URL
    const invalidData = {
      name: 'Test Business',
      url: 'not-a-url',
      location: { /* ... */ },
    };
    
    // SPECIFICATION: When validating
    const result = createBusinessSchema.safeParse(invalidData);
    
    // SPECIFICATION: Then should fail
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('URL');
    }
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/validation/__tests__/business.test.ts

# With coverage
pnpm test:coverage lib/validation/
```

---

## 📋 Validation Patterns

### 1. Safe Parse

**Purpose**: Validate without throwing

```typescript
const result = schema.safeParse(data);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

### 2. Parse with Error

**Purpose**: Validate and throw on error

```typescript
try {
  const data = schema.parse(input);
  // Use data
} catch (error) {
  // Handle ZodError
}
```

### 3. Refine

**Purpose**: Custom validation logic

```typescript
const schema = z.object({
  url: z.string().url(),
}).refine(
  (data) => data.url.startsWith('https://'),
  { message: 'URL must use HTTPS' }
);
```

### 4. Transform

**Purpose**: Transform data during validation

```typescript
const schema = z.string().transform((val) => val.trim().toLowerCase());
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Zod Documentation**: https://zod.dev
- **Form Validation**: `docs/development/FORM_VALIDATION.md`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Zod Schemas**: All validation uses Zod
2. **Type Safety**: Schemas generate TypeScript types
3. **Reusability**: Shared schemas across modules
4. **Error Messages**: Clear, user-friendly messages
5. **DRY**: Centralized validation logic
6. **TDD Development**: Write tests first as specifications

---

## ⚠️ Important Notes

### Error Messages

- Provide clear, user-friendly error messages
- Use `.min()`, `.max()`, `.email()`, etc. with messages
- Customize messages for better UX

### Type Inference

- Use `z.infer<typeof schema>` for TypeScript types
- Export inferred types for reuse
- Keep schemas and types in sync

### Validation Timing

- Validate at API boundaries
- Validate in server actions
- Don't trust client-side validation alone

---

**Remember**: Validation is the first line of defense. Always validate user input, provide clear error messages, and keep schemas focused and reusable.




