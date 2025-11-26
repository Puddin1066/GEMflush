# Crawl Schema and Contract Tests

## Overview

This document outlines the schema and contract tests required to ensure proper crawl and crawl data storage processes. These tests validate:

1. **Crawl Data Schema** - Structure and validation of `CrawledData`
2. **Storage Schema** - Database storage format and constraints
3. **API Contracts** - Request/response validation
4. **Data Flow Contracts** - Crawl → Storage → Entity Building pipeline

---

## Current State Analysis

### ✅ What Exists

1. **TypeScript Contracts**
   - `CrawledData` interface (`lib/types/gemflush.ts`)
   - `CrawlResult` interface (`lib/types/gemflush.ts`)
   - `IWebCrawler` service contract (`lib/types/service-contracts.ts`)

2. **Database Schema**
   - `businesses.crawlData` (jsonb field)
   - `crawlJobs` table with status tracking

3. **API Validation**
   - `crawlRequestSchema` (Zod) - validates API requests

4. **Basic Tests**
   - E2E crawl flow tests (`tests/e2e/crawler.test.ts`)
   - Unit tests for crawler (`lib/crawler/__tests__/index.test.ts`)

### ❌ What's Missing

1. **CrawledData Validation Schema** - No Zod schema for `CrawledData`
2. **Storage Validation** - No validation before storing to database
3. **Schema Contract Tests** - No tests verifying CrawledData structure
4. **Storage Contract Tests** - No tests verifying database storage format
5. **Data Integrity Tests** - No tests for data transformation (crawl → storage → entity)

---

## Required Schema and Contract Tests

### 1. CrawledData Schema Validation Tests

**Purpose**: Ensure `CrawledData` structure matches contract and can be validated

**Location**: `lib/validation/__tests__/crawl.test.ts`

**Tests Needed**:

```typescript
describe('CrawledData Schema Validation', () => {
  it('should validate minimal CrawledData (empty object)', () => {
    const data = {};
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate CrawledData with all optional fields', () => {
    const data: CrawledData = {
      name: 'Test Business',
      description: 'Test description',
      phone: '123-456-7890',
      email: 'test@example.com',
      address: '123 Main St',
      socialLinks: {
        facebook: 'https://facebook.com/test',
        instagram: 'https://instagram.com/test',
        twitter: 'https://twitter.com/test',
        linkedin: 'https://linkedin.com/company/test',
      },
      structuredData: { '@type': 'LocalBusiness' },
      metaTags: { 'og:title': 'Test' },
      founded: '2020',
      categories: ['technology'],
      services: ['Software Development'],
      imageUrl: 'https://example.com/image.jpg',
      businessDetails: {
        industry: 'Software',
        sector: 'Technology',
        employeeCount: 50,
      },
    };
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate socialLinks structure', () => {
    const data = {
      socialLinks: {
        facebook: 'https://facebook.com/test',
        instagram: 'https://instagram.com/test',
      },
    };
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate businessDetails structure', () => {
    const data = {
      businessDetails: {
        industry: 'Software',
        employeeCount: 50,
        products: ['Product A'],
        services: ['Service B'],
      },
    };
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate llmEnhanced structure', () => {
    const data = {
      llmEnhanced: {
        extractedEntities: ['Entity1'],
        businessCategory: 'Technology',
        serviceOfferings: ['Service1'],
        targetAudience: 'Enterprise',
        keyDifferentiators: ['Differentiator1'],
        confidence: 0.95,
        model: 'gpt-4',
        processedAt: new Date(),
      },
    };
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const data = { email: 'not-an-email' };
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid URL in socialLinks', () => {
    const data = {
      socialLinks: {
        facebook: 'not-a-url',
      },
    };
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid employeeCount type', () => {
    const data = {
      businessDetails: {
        employeeCount: 'not-a-number-or-string',
      },
    };
    const result = crawledDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
```

**Schema to Create**: `lib/validation/crawl.ts`

```typescript
import { z } from 'zod';
import type { CrawledData } from '@/lib/types/domain/gemflush';

export const socialLinksSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
  tiktok: z.string().url().optional(),
}).optional();

export const businessDetailsSchema = z.object({
  industry: z.string().optional(),
  sector: z.string().optional(),
  businessType: z.string().optional(),
  legalForm: z.string().optional(),
  founded: z.string().optional(),
  dissolved: z.string().optional(),
  employeeCount: z.union([z.number(), z.string()]).optional(),
  revenue: z.string().optional(),
  locations: z.number().optional(),
  products: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  parentCompany: z.string().optional(),
  subsidiaries: z.array(z.string()).optional(),
  partnerships: z.array(z.string()).optional(),
  awards: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  targetMarket: z.string().optional(),
  headquarters: z.string().optional(),
  ceo: z.string().optional(),
  stockSymbol: z.string().optional(),
}).optional();

export const llmEnhancedSchema = z.object({
  extractedEntities: z.array(z.string()),
  businessCategory: z.string(),
  serviceOfferings: z.array(z.string()),
  targetAudience: z.string(),
  keyDifferentiators: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  model: z.string(),
  processedAt: z.date(),
}).optional();

export const crawledDataSchema: z.ZodType<CrawledData> = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  socialLinks: socialLinksSchema,
  structuredData: z.record(z.unknown()).optional(),
  metaTags: z.record(z.string()).optional(),
  founded: z.string().optional(),
  categories: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  businessDetails: businessDetailsSchema,
  llmEnhanced: llmEnhancedSchema,
});
```

---

### 2. Storage Schema Contract Tests

**Purpose**: Ensure crawl data is stored correctly in database

**Location**: `lib/db/__tests__/crawl-storage.test.ts`

**Tests Needed**:

```typescript
describe('Crawl Data Storage Schema', () => {
  it('should store CrawledData as jsonb in businesses table', async () => {
    const crawledData: CrawledData = {
      name: 'Test Business',
      description: 'Test description',
      phone: '123-456-7890',
    };

    const business = await createBusiness({
      name: 'Test',
      url: 'https://example.com',
      teamId: 1,
    });

    await updateBusiness(business.id, {
      crawlData: crawledData,
      lastCrawledAt: new Date(),
    });

    const stored = await getBusinessById(business.id);
    expect(stored?.crawlData).toEqual(crawledData);
  });

  it('should preserve all CrawledData fields in storage', async () => {
    const fullCrawledData: CrawledData = {
      name: 'Test',
      description: 'Desc',
      phone: '123',
      email: 'test@example.com',
      address: '123 Main',
      socialLinks: {
        facebook: 'https://facebook.com/test',
      },
      businessDetails: {
        industry: 'Tech',
        employeeCount: 50,
      },
      llmEnhanced: {
        extractedEntities: ['Entity1'],
        businessCategory: 'Tech',
        serviceOfferings: ['Service1'],
        targetAudience: 'Enterprise',
        keyDifferentiators: ['Diff1'],
        confidence: 0.9,
        model: 'gpt-4',
        processedAt: new Date(),
      },
    };

    const business = await createBusiness({ /* ... */ });
    await updateBusiness(business.id, { crawlData: fullCrawledData });

    const stored = await getBusinessById(business.id);
    expect(stored?.crawlData).toEqual(fullCrawledData);
  });

  it('should handle null/undefined crawlData', async () => {
    const business = await createBusiness({ /* ... */ });
    await updateBusiness(business.id, { crawlData: null });

    const stored = await getBusinessById(business.id);
    expect(stored?.crawlData).toBeNull();
  });

  it('should validate crawlData before storage', async () => {
    const invalidData = {
      email: 'not-an-email', // Invalid email
    };

    await expect(
      updateBusiness(businessId, { crawlData: invalidData })
    ).rejects.toThrow();
  });
});
```

---

### 3. CrawlResult Contract Tests

**Purpose**: Ensure `CrawlResult` matches service contract

**Location**: `lib/types/__tests__/crawl-contracts.test.ts`

**Tests Needed**:

```typescript
describe('CrawlResult Contract', () => {
  it('should match IWebCrawler contract signature', () => {
    const crawler: IWebCrawler = {
      crawl: async (url: string): Promise<CrawlResult> => {
        return {
          success: true,
          data: {},
          url,
          crawledAt: new Date(),
        };
      },
    };

    expect(typeof crawler.crawl).toBe('function');
  });

  it('should return CrawlResult with success=true on success', async () => {
    const result: CrawlResult = {
      success: true,
      data: { name: 'Test' },
      url: 'https://example.com',
      crawledAt: new Date(),
    };

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should return CrawlResult with success=false on failure', async () => {
    const result: CrawlResult = {
      success: false,
      error: 'Crawl failed',
      url: 'https://example.com',
      crawledAt: new Date(),
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('should always include url and crawledAt', () => {
    const successResult: CrawlResult = {
      success: true,
      data: {},
      url: 'https://example.com',
      crawledAt: new Date(),
    };

    const errorResult: CrawlResult = {
      success: false,
      error: 'Error',
      url: 'https://example.com',
      crawledAt: new Date(),
    };

    expect(successResult.url).toBeDefined();
    expect(successResult.crawledAt).toBeInstanceOf(Date);
    expect(errorResult.url).toBeDefined();
    expect(errorResult.crawledAt).toBeInstanceOf(Date);
  });
});
```

---

### 4. Data Flow Contract Tests

**Purpose**: Ensure data flows correctly through crawl → storage → entity building

**Location**: `tests/integration/crawl-data-flow.test.ts`

**Tests Needed**:

```typescript
describe('Crawl Data Flow Contracts', () => {
  it('should flow: crawl → validate → store → entity building', async () => {
    // 1. Crawl
    const crawlResult = await webCrawler.crawl('https://example.com');
    expect(crawlResult.success).toBe(true);
    expect(crawlResult.data).toBeDefined();

    // 2. Validate
    const validation = crawledDataSchema.safeParse(crawlResult.data);
    expect(validation.success).toBe(true);

    // 3. Store
    await updateBusiness(businessId, {
      crawlData: crawlResult.data,
      lastCrawledAt: new Date(),
    });

    // 4. Entity Building
    const business = await getBusinessById(businessId);
    const entity = await entityBuilder.buildEntity(
      business!,
      business!.crawlData as CrawledData
    );

    expect(entity).toBeDefined();
    expect(entity.labels).toBeDefined();
  });

  it('should preserve data integrity through transformations', async () => {
    const originalData: CrawledData = {
      name: 'Original Name',
      phone: '123-456-7890',
      email: 'test@example.com',
    };

    // Store
    await updateBusiness(businessId, { crawlData: originalData });

    // Retrieve
    const business = await getBusinessById(businessId);
    const storedData = business!.crawlData as CrawledData;

    // Verify integrity
    expect(storedData.name).toBe(originalData.name);
    expect(storedData.phone).toBe(originalData.phone);
    expect(storedData.email).toBe(originalData.email);
  });

  it('should handle missing crawlData gracefully in entity building', async () => {
    const business = await getBusinessById(businessId);
    const entity = await entityBuilder.buildEntity(business!, undefined);

    // Should still build entity with business data only
    expect(entity).toBeDefined();
    expect(entity.labels.en.value).toBe(business!.name);
  });
});
```

---

### 5. API Contract Tests

**Purpose**: Ensure API endpoints validate and handle crawl data correctly

**Location**: `app/api/crawl/__tests__/route.test.ts`

**Tests Needed**:

```typescript
describe('Crawl API Contracts', () => {
  it('should validate crawlRequestSchema', () => {
    const validRequest = { businessId: 1 };
    const result = crawlRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject invalid businessId', () => {
    const invalidRequest = { businessId: -1 };
    const result = crawlRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should accept optional forceRecrawl flag', () => {
    const request = { businessId: 1, forceRecrawl: true };
    const result = crawlRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should validate stored crawlData in API response', async () => {
    const response = await POST(new NextRequest('...', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    }));

    const data = await response.json();
    
    if (data.crawlData) {
      const validation = crawledDataSchema.safeParse(data.crawlData);
      expect(validation.success).toBe(true);
    }
  });
});
```

---

### 6. Database Schema Contract Tests

**Purpose**: Ensure database schema matches TypeScript types

**Location**: `lib/db/__tests__/crawl-schema-contracts.test.ts`

**Tests Needed**:

```typescript
describe('Crawl Database Schema Contracts', () => {
  it('should match Business.crawlData type to CrawledData', () => {
    const business: Business = {
      id: 1,
      teamId: 1,
      name: 'Test',
      url: 'https://example.com',
      crawlData: {
        name: 'Crawled Name',
        description: 'Description',
      },
      status: 'crawled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TypeScript should enforce CrawledData type
    const crawlData: CrawledData | null = business.crawlData;
    expect(crawlData).toBeDefined();
  });

  it('should enforce jsonb constraint on crawlData', async () => {
    // Should accept valid JSON
    await updateBusiness(businessId, {
      crawlData: { name: 'Test' },
    });

    // Should reject invalid JSON (handled by Drizzle)
    // This is more of a type-level test
  });

  it('should track lastCrawledAt timestamp', async () => {
    const before = new Date();
    await updateBusiness(businessId, {
      crawlData: { name: 'Test' },
      lastCrawledAt: new Date(),
    });

    const business = await getBusinessById(businessId);
    expect(business?.lastCrawledAt).toBeDefined();
    expect(business?.lastCrawledAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
```

---

## Implementation Priority

### High Priority (Critical for Data Integrity)

1. ✅ **CrawledData Validation Schema** (`lib/validation/crawl.ts`)
   - Prevents invalid data from being stored
   - Ensures data structure matches contract

2. ✅ **Storage Validation Tests** (`lib/db/__tests__/crawl-storage.test.ts`)
   - Ensures data is stored correctly
   - Verifies data retrieval matches storage

3. ✅ **Data Flow Contract Tests** (`tests/integration/crawl-data-flow.test.ts`)
   - Validates end-to-end data flow
   - Catches transformation errors

### Medium Priority (Important for Reliability)

4. ✅ **CrawlResult Contract Tests** (`lib/types/__tests__/crawl-contracts.test.ts`)
   - Ensures service contract compliance
   - Validates error handling

5. ✅ **API Contract Tests** (`app/api/crawl/__tests__/route.test.ts`)
   - Validates API request/response formats
   - Ensures proper error handling

### Low Priority (Nice to Have)

6. ✅ **Database Schema Contract Tests** (`lib/db/__tests__/crawl-schema-contracts.test.ts`)
   - Type-level validation
   - Schema migration verification

---

## Test Execution Strategy

### Unit Tests
- Run on every commit
- Fast execution (< 1 second)
- No database required (use mocks)

### Integration Tests
- Run on PR
- Requires test database
- Validates data flow

### E2E Tests
- Run on main branch
- Requires full stack
- Validates complete flow

---

## Success Criteria

✅ **All tests pass**
- Schema validation works
- Storage preserves data integrity
- Data flow is correct

✅ **Type safety maintained**
- TypeScript compiles without errors
- Types match runtime data

✅ **Contract compliance**
- Services match interface contracts
- API responses match schemas

---

## References

- `CrawledData` interface: `lib/types/gemflush.ts`
- Database schema: `lib/db/schema.ts` (businesses.crawlData)
- Crawl API: `app/api/crawl/route.ts`
- Crawler service: `lib/crawler/index.ts`

