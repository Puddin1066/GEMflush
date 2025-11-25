# Test Helpers Module (`lib/test-helpers/`)

**Purpose**: TDD test utilities, factories, and mocks for writing tests  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `test-helpers/` module provides centralized test utilities following TDD principles. It includes test data factories, mock factories, and helper functions to reduce duplication and improve test maintainability.

### Architecture Principles

1. **DRY**: Reusable test data factories
2. **SOLID**: Single responsibility per helper
3. **Test Isolation**: Each helper is independent
4. **Type Safety**: Full TypeScript coverage
5. **TDD Workflow**: Designed for RED → GREEN → REFACTOR cycle

---

## 🏗️ Module Structure

```
lib/test-helpers/
├── tdd-helpers.ts        # Test factories and utilities
└── __tests__/           # Tests for test helpers (meta-testing)
```

---

## 🔑 Core Components

### 1. Business Test Factory

**Purpose**: Creates test business objects with sensible defaults

**Usage:**

```typescript
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Create default business (pending status)
const business = BusinessTestFactory.create();

// Create with overrides
const business = BusinessTestFactory.create({
  name: 'Custom Business',
  status: 'crawled',
  teamId: 2,
});

// Create crawled business
const crawledBusiness = BusinessTestFactory.createCrawled();

// Create business with error
const errorBusiness = BusinessTestFactory.createWithError('Crawl failed');
```

**Methods:**

```typescript
// Default business (pending)
static create(overrides?: Partial<Business>): Business

// Crawled business
static createCrawled(overrides?: Partial<Business>): Business

// Business with error
static createWithError(
  errorMessage: string,
  overrides?: Partial<Business>
): Business

// Published business
static createPublished(overrides?: Partial<Business>): Business
```

---

### 2. Team Test Factory

**Purpose**: Creates test team objects with subscription tiers

**Usage:**

```typescript
import { TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Create free tier team
const freeTeam = TeamTestFactory.createFree();

// Create pro tier team
const proTeam = TeamTestFactory.createPro();

// Create agency tier team
const agencyTeam = TeamTestFactory.createAgency();

// Create with custom overrides
const customTeam = TeamTestFactory.create({
  name: 'Custom Team',
  planName: 'pro',
});
```

**Methods:**

```typescript
// Free tier
static createFree(overrides?: Partial<Team>): Team

// Pro tier
static createPro(overrides?: Partial<Team>): Team

// Agency tier
static createAgency(overrides?: Partial<Team>): Team

// Custom team
static create(overrides?: Partial<Team>): Team
```

---

### 3. Crawl Job Test Factory

**Purpose**: Creates test crawl job objects

**Usage:**

```typescript
import { CrawlJobTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Create pending crawl job
const job = CrawlJobTestFactory.create();

// Create completed crawl job
const completedJob = CrawlJobTestFactory.createCompleted();

// Create failed crawl job
const failedJob = CrawlJobTestFactory.createFailed('Network error');
```

---

### 4. Mock Factories

**Purpose**: Creates mock implementations for dependencies

**Usage:**

```typescript
import { 
  MockCrawlerFactory,
  MockDatabaseFactory,
  MockFingerprinterFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Mock crawler
const mockCrawler = MockCrawlerFactory.create();
mockCrawler.crawl.mockResolvedValue({
  success: true,
  data: { /* mock data */ },
});

// Mock database
const mockDb = MockDatabaseFactory.create();
mockDb.getBusinessById.mockResolvedValue(business);

// Mock fingerprinter
const mockFingerprinter = MockFingerprinterFactory.create();
mockFingerprinter.fingerprint.mockResolvedValue({
  visibilityScore: 75,
  mentionRate: 0.85,
});
```

---

## 🧪 TDD Workflow with Test Helpers

### RED Phase: Write Failing Test

```typescript
/**
 * SPECIFICATION: Business Execution
 * 
 * As a system
 * I want to create crawl jobs automatically
 * So that businesses can be processed
 */
describe('Business Execution - Specification', () => {
  it('creates crawl job when business status is pending', async () => {
    // Use factory to create test data
    const business = BusinessTestFactory.create({ status: 'pending' });
    
    // Mock dependencies
    const mockDb = MockDatabaseFactory.create();
    mockDb.getBusinessById.mockResolvedValue(business);
    
    // Test specification
    await executeBusinessFlow(business.id);
    
    // Assertion (will fail - RED)
    expect(mockDb.createCrawlJob).toHaveBeenCalledWith({
      businessId: business.id,
      status: 'pending',
    });
  });
});
```

### GREEN Phase: Implement to Pass

```typescript
// lib/services/business-execution.ts
export async function executeBusinessFlow(businessId: number) {
  const business = await getBusinessById(businessId);
  
  if (business.status === 'pending') {
    await createCrawlJob({
      businessId: business.id,
      status: 'pending',
    });
  }
}
```

### REFACTOR Phase: Improve While Tests Pass

```typescript
// Refactored implementation
export async function executeBusinessFlow(businessId: number) {
  const business = await getBusinessById(businessId);
  await ensureCrawlJobExists(business);
}

async function ensureCrawlJobExists(business: Business) {
  if (business.status === 'pending') {
    return await createCrawlJob({
      businessId: business.id,
      status: 'pending',
    });
  }
}
```

---

## 📋 Helper Patterns

### 1. Factory Pattern

**Purpose**: Create test objects with sensible defaults

```typescript
export class BusinessTestFactory {
  static create(overrides?: Partial<Business>): Business {
    return {
      id: 1,
      name: 'Test Business',
      status: 'pending',
      // ... defaults
      ...overrides, // Allow customization
    } as Business;
  }
}
```

### 2. Builder Pattern

**Purpose**: Fluent API for building complex test objects

```typescript
const business = BusinessTestFactory
  .create()
  .withStatus('crawled')
  .withTeam(teamId)
  .withCrawlData(crawlData);
```

### 3. Mock Factory Pattern

**Purpose**: Create mock implementations with default behavior

```typescript
export class MockCrawlerFactory {
  static create() {
    return {
      crawl: vi.fn().mockResolvedValue({
        success: true,
        data: createMockCrawlData(),
      }),
    };
  }
}
```

---

## 🔄 Integration with Tests

### Unit Tests

```typescript
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

describe('Business Service', () => {
  it('processes business', async () => {
    const business = BusinessTestFactory.create();
    // ... test
  });
});
```

### Integration Tests

```typescript
import { 
  BusinessTestFactory,
  TeamTestFactory,
} from '@/lib/test-helpers/tdd-helpers';

describe('Business Flow Integration', () => {
  it('creates and processes business', async () => {
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({ teamId: team.id });
    // ... integration test
  });
});
```

---

## 🎯 Best Practices

### 1. Use Factories, Not Manual Objects

**✅ GOOD:**
```typescript
const business = BusinessTestFactory.create({ name: 'Test' });
```

**❌ BAD:**
```typescript
const business = {
  id: 1,
  name: 'Test',
  status: 'pending',
  // ... many fields
};
```

### 2. Use Overrides for Specific Cases

**✅ GOOD:**
```typescript
const business = BusinessTestFactory.create({
  status: 'crawled',
  lastCrawledAt: new Date(),
});
```

**❌ BAD:**
```typescript
const business = BusinessTestFactory.create();
business.status = 'crawled'; // Mutating object
```

### 3. Use Mock Factories for Dependencies

**✅ GOOD:**
```typescript
const mockCrawler = MockCrawlerFactory.create();
```

**❌ BAD:**
```typescript
const mockCrawler = {
  crawl: vi.fn(),
  // ... manual setup
};
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`
- **Vitest Documentation**: https://vitest.dev
- **Testing Best Practices**: `docs/development/TESTING.md`

---

## 🎓 Key Principles

1. **DRY**: Reusable test data factories
2. **SOLID**: Single responsibility per helper
3. **Test Isolation**: Each helper is independent
4. **Type Safety**: Full TypeScript coverage
5. **TDD Workflow**: Designed for RED → GREEN → REFACTOR
6. **Maintainability**: Centralized test utilities

---

## ⚠️ Important Notes

### Factory Defaults

- Factories provide sensible defaults
- Always use overrides for test-specific data
- Don't mutate factory-created objects

### Mock Factories

- Mock factories return Vitest mocks
- Configure mock behavior in tests
- Reset mocks between tests

### Test Isolation

- Each test should be independent
- Use factories to create fresh test data
- Don't share state between tests

---

**Remember**: Test helpers make tests more maintainable and readable. Use factories consistently, and keep helpers focused and reusable.


