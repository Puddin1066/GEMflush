# Types Module (`lib/types/`)

**Purpose**: TypeScript types, interfaces, and service contracts  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `types/` module provides TypeScript type definitions, interfaces, and service contracts for the entire application. It ensures type safety across modules and defines clear contracts for service implementations.

### Architecture Principles

1. **Type Safety**: Full TypeScript coverage
2. **Service Contracts**: Clear interfaces for service implementations
3. **API Contracts**: Type definitions for external APIs
4. **DRY**: Shared types across modules
5. **SOLID**: Interface segregation, dependency inversion

---

## 🏗️ Module Structure

```
lib/types/
├── service-contracts.ts      # Service interface definitions
├── firecrawl-contract.ts     # Firecrawl API contract
├── wikidata-contract.ts     # Wikidata API contract
├── action-api-contract.ts   # Action API contract
├── gemflush.ts              # Platform-specific types
└── __tests__/               # TDD test specifications
```

---

## 🔑 Core Components

### 1. Service Contracts (`service-contracts.ts`)

**Purpose**: Interface definitions for service implementations

**Key Interfaces:**

```typescript
// Web Crawler Contract
export interface IWebCrawler {
  crawl(url: string): Promise<CrawlResult>;
}

// LLM Fingerprinter Contract
export interface ILLMFingerprinter {
  fingerprint(business: Business): Promise<FingerprintAnalysis>;
}

// Wikidata Publisher Contract
export interface IWikidataPublisher {
  publish(
    entity: WikidataEntityDataContract,
    target: 'test' | 'production'
  ): Promise<WikidataPublishResult>;
}

// Payment Service Contract
export interface IPaymentService {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string }>;
  updateTeamSubscription(input: UpdateTeamSubscriptionInput): Promise<Team>;
}
```

**Usage:**

```typescript
import { IWebCrawler } from '@/lib/types/service-contracts';

// Implement contract
class EnhancedWebCrawler implements IWebCrawler {
  async crawl(url: string): Promise<CrawlResult> {
    // Implementation
  }
}

// Use contract type
function processCrawl(crawler: IWebCrawler) {
  return crawler.crawl('https://example.com');
}
```

---

### 2. Firecrawl Contract (`firecrawl-contract.ts`)

**Purpose**: Type definitions for Firecrawl API

**Key Types:**

```typescript
export interface FirecrawlCrawlResponse {
  success: boolean;
  id?: string;  // Job ID if async
  data?: FirecrawlCrawlPageData[];
  error?: string;
}

export interface FirecrawlCrawlPageData {
  url: string;
  content: string;
  metadata: Record<string, any>;
  extract?: BusinessExtractData;
}

export interface BusinessExtractData {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  // ... business fields
}
```

**Usage:**

```typescript
import type { FirecrawlCrawlResponse } from '@/lib/types/firecrawl-contract';

async function handleCrawlResponse(response: FirecrawlCrawlResponse) {
  if (response.success && response.data) {
    // Process crawl data
  }
}
```

---

### 3. Wikidata Contract (`wikidata-contract.ts`)

**Purpose**: Type definitions for Wikidata API

**Key Types:**

```typescript
export interface WikidataEntityDataContract {
  labels: Record<string, string>;
  descriptions: Record<string, string>;
  claims: WikidataClaim[];
  aliases?: Record<string, string[]>;
}

export interface WikidataClaim {
  mainsnak: {
    snaktype: 'value';
    property: string;
    datavalue: {
      type: string;
      value: any;
    };
  };
  qualifiers?: Record<string, any[]>;
  references?: any[];
}

export interface WikidataPublishResult {
  success: boolean;
  qid?: string;
  error?: string;
}
```

**Usage:**

```typescript
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';

async function buildEntity(business: Business): Promise<WikidataEntityDataContract> {
  return {
    labels: { en: { value: business.name } },
    descriptions: { en: { value: business.description } },
    claims: [/* ... */],
  };
}
```

---

### 4. Gemflush Types (`gemflush.ts`)

**Purpose**: Platform-specific types

**Key Types:**

```typescript
export interface CrawlResult {
  success: boolean;
  data?: CrawledData;
  error?: string;
  cached?: boolean;
}

export interface CrawledData {
  url: string;
  title?: string;
  description?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface FingerprintAnalysis {
  visibilityScore: number;
  mentionRate: number;
  sentimentScore: number;
  competitiveAnalysis: CompetitiveAnalysis;
}

export interface BusinessStatus {
  'pending' | 'crawling' | 'crawled' | 'generating' | 'published' | 'error';
}
```

**Usage:**

```typescript
import type { CrawlResult, FingerprintAnalysis } from '@/lib/types/gemflush';

function processBusiness(result: CrawlResult, analysis: FingerprintAnalysis) {
  // Type-safe processing
}
```

---

## 🔄 Contract Implementation

### Implementing Service Contracts

```typescript
// lib/crawler/index.ts
import { IWebCrawler } from '@/lib/types/service-contracts';
import { CrawlResult } from '@/lib/types/gemflush';

export class EnhancedWebCrawler implements IWebCrawler {
  async crawl(url: string): Promise<CrawlResult> {
    // Implementation must satisfy contract
    return {
      success: true,
      data: { /* ... */ },
    };
  }
}
```

### Using Contracts for Dependency Injection

```typescript
// lib/services/business-execution.ts
import { IWebCrawler } from '@/lib/types/service-contracts';

export class BusinessExecutionService {
  constructor(private crawler: IWebCrawler) {}
  
  async executeCrawl(url: string) {
    // Use contract, not concrete implementation
    return await this.crawler.crawl(url);
  }
}
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Service Contract
 * 
 * As a developer
 * I want service contracts to be type-safe
 * So that implementations are correct
 * 
 * Acceptance Criteria:
 * - Contracts define required methods
 * - Contracts specify return types
 * - Implementations satisfy contracts
 */
describe('Service Contracts - Specification', () => {
  it('ensures IWebCrawler contract is satisfied', () => {
    // SPECIFICATION: Given a crawler implementation
    const crawler: IWebCrawler = {
      crawl: vi.fn().mockResolvedValue({
        success: true,
        data: { url: 'https://example.com' },
      }),
    };
    
    // SPECIFICATION: When using contract
    const result = await crawler.crawl('https://example.com');
    
    // SPECIFICATION: Then result should match contract
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/types/__tests__/service-contracts.test.ts

# With coverage
pnpm test:coverage lib/types/
```

---

## 📋 Type Patterns

### 1. Interface Segregation

**Purpose**: Small, focused interfaces

```typescript
// ✅ GOOD: Focused interface
export interface IWebCrawler {
  crawl(url: string): Promise<CrawlResult>;
}

// ❌ BAD: Too many responsibilities
export interface IBusinessService {
  crawl(url: string): Promise<CrawlResult>;
  fingerprint(business: Business): Promise<FingerprintAnalysis>;
  publish(entity: Entity): Promise<PublishResult>;
}
```

### 2. Generic Types

**Purpose**: Reusable type definitions

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Usage
type BusinessResponse = ApiResponse<Business>;
type CrawlResponse = ApiResponse<CrawlResult>;
```

### 3. Union Types

**Purpose**: Type-safe status/enum values

```typescript
export type BusinessStatus = 
  | 'pending'
  | 'crawling'
  | 'crawled'
  | 'generating'
  | 'published'
  | 'error';
```

### 4. Discriminated Unions

**Purpose**: Type-safe result types

```typescript
export type CrawlResult = 
  | { success: true; data: CrawledData }
  | { success: false; error: string };
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Service Implementations**: `lib/services/`, `lib/crawler/`, `lib/llm/`, `lib/wikidata/`
- **TypeScript Documentation**: https://www.typescriptlang.org/docs/
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Type Safety**: Full TypeScript coverage
2. **Service Contracts**: Clear interfaces for implementations
3. **API Contracts**: Type definitions for external APIs
4. **DRY**: Shared types across modules
5. **SOLID**: Interface segregation, dependency inversion
6. **TDD Development**: Write tests first as specifications

---

## ⚠️ Important Notes

### Contract Compliance

- All service implementations must satisfy their contracts
- Use TypeScript's `implements` keyword
- Test contract compliance in tests

### Type Exports

- Export types that are used across modules
- Keep types focused and specific
- Avoid overly generic types

### API Contracts

- Keep API contracts in sync with actual APIs
- Version contracts when APIs change
- Document breaking changes

---

**Remember**: Types are the foundation of type safety. Keep contracts clear, focused, and well-tested.

