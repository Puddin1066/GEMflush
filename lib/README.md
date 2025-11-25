# Library Layer (`lib/`) - TDD Development Guide

**Purpose**: Core business logic, services, utilities, and data access layer for the SaaS platform  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them  
**Status**: 🟢 Active Development

---

## 📚 Overview

The `lib/` directory contains all backend business logic, following **SOLID** and **DRY** principles. All code here should be developed using **Test-Driven Development (TDD)**, where tests serve as executable specifications that drive implementation.

### Architecture Principles

1. **Tests ARE Specifications**: Write tests first to define behavior
2. **Single Responsibility**: Each module has one clear purpose
3. **Dependency Injection**: Services accept dependencies as parameters
4. **Type Safety**: Full TypeScript coverage with contracts
5. **DRY**: Shared utilities and helpers to avoid duplication

---

## 🏗️ Directory Structure

```
lib/
├── auth/              # Authentication & session management
├── crawler/           # Web crawling (C in CFP workflow)
├── llm/              # LLM fingerprinting (F in CFP workflow)
├── wikidata/         # Wikidata publishing (P in CFP workflow)
├── services/         # Business logic orchestration
├── db/               # Database schema, queries, and migrations
├── data/             # Data Transfer Objects (DTOs) for API responses
├── types/            # TypeScript types, interfaces, and contracts
├── validation/       # Zod schemas for data validation
├── utils/            # Shared utilities and helpers
├── test-helpers/     # TDD test helpers and factories
├── payments/         # Stripe integration
├── email/            # Email service (Resend)
├── hooks/            # React hooks for frontend
├── subscription/     # Subscription management
└── gemflush/         # Platform-specific config (permissions, plans)
```

---

## 🎯 TDD Workflow for `lib/` Development

### Step 1: Write Specification (Test FIRST)

**Before writing any code**, write a test that defines the desired behavior:

```typescript
/**
 * SPECIFICATION: Business Execution Service
 * 
 * As a system administrator
 * I want crawl jobs to be created automatically before processing
 * So that errors can be tracked and debugged
 * 
 * Acceptance Criteria:
 * - When a business status is 'pending', a crawl job should be created
 * - The crawl job should have status 'pending'
 * - The crawl job should be linked to the business
 */
describe('BusinessExecutionService - Specification', () => {
  it('creates crawl job when business status is pending', async () => {
    // SPECIFICATION: Given a business with status 'pending'
    const business = BusinessTestFactory.create({ status: 'pending' });
    
    // SPECIFICATION: When business execution is triggered
    await executeBusinessFlow(business.id);
    
    // SPECIFICATION: Then a crawl job should exist with status 'pending'
    const crawlJob = await getCrawlJob(business.id);
    expect(crawlJob).toBeDefined();
    expect(crawlJob.status).toBe('pending');
    expect(crawlJob.businessId).toBe(business.id);
  });
});
```

### Step 2: Run Test (RED - Expected Failure)

```bash
# Start TDD watch mode
pnpm tdd

# Or run specific test file
pnpm test lib/services/__tests__/business-execution.test.ts
```

**Expected**: Test fails (RED) ✅  
**Why**: Implementation doesn't exist yet or doesn't satisfy the specification.

### Step 3: Implement to Satisfy Specification (GREEN)

Write minimal code to make the test pass:

```typescript
// lib/services/business-execution.ts
export async function executeBusinessFlow(businessId: number) {
  const business = await getBusinessById(businessId);
  
  if (business.status === 'pending') {
    // Satisfy specification: Create crawl job
    await createCrawlJob({
      businessId: business.id,
      status: 'pending',
    });
  }
}
```

**Expected**: Test passes (GREEN) ✅

### Step 4: Refactor (Keep Specification Valid)

Improve code while keeping tests passing:

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

**Expected**: Test still passes ✅

---

## 📦 Core Modules

### 1. Services (`lib/services/`)

**Purpose**: Business logic orchestration for CFP workflow (Crawl → Fingerprint → Publish)

**Key Files:**
- `business-execution.ts` - Main business processing orchestration
- `cfp-orchestrator.ts` - CFP workflow coordination
- `automation-service.ts` - Automation configuration based on subscription tier
- `scheduler-service-*.ts` - Scheduled task execution

**TDD Example:**
```typescript
// Write test first (specification)
describe('BusinessExecutionService', () => {
  it('creates crawl job before processing', async () => {
    // Test defines behavior
  });
});

// Then implement to satisfy test
```

**Testing**: See `lib/services/__tests__/` for examples

---

### 2. Database (`lib/db/`)

**Purpose**: Database schema, queries, and migrations using Drizzle ORM

**Key Files:**
- `schema.ts` - Database schema definitions
- `queries.ts` - Database query functions
- `drizzle.ts` - Drizzle client setup
- `migrations/` - Database migration files

**TDD Example:**
```typescript
// Write test first
describe('Database Queries', () => {
  it('creates business with required fields', async () => {
    const business = await createBusiness({
      name: 'Test Business',
      url: 'https://example.com',
      teamId: 1,
    });
    
    expect(business.id).toBeDefined();
    expect(business.name).toBe('Test Business');
  });
});
```

**Testing**: See `lib/db/__tests__/` for examples

---

### 3. Crawler (`lib/crawler/`)

**Purpose**: Web crawling service (C in CFP workflow)

**Key Files:**
- `index.ts` - Main crawler implementation
- `firecrawl-client.ts` - Firecrawl API client

**TDD Example:**
```typescript
// Write test first
describe('Web Crawler', () => {
  it('crawls website and returns structured data', async () => {
    const result = await webCrawler.crawl('https://example.com');
    
    expect(result.success).toBe(true);
    expect(result.data.url).toBe('https://example.com');
    expect(result.data.content).toBeDefined();
  });
});
```

**Testing**: See `lib/crawler/__tests__/` for examples

---

### 4. LLM (`lib/llm/`)

**Purpose**: LLM fingerprinting service (F in CFP workflow)

**Key Files:**
- `business-fingerprinter.ts` - Main fingerprinting logic
- `openrouter-client.ts` - OpenRouter API client
- `parallel-processor.ts` - Parallel LLM query processing

**TDD Example:**
```typescript
// Write test first
describe('Business Fingerprinter', () => {
  it('generates fingerprint analysis from business data', async () => {
    const analysis = await fingerprinter.fingerprint(business, crawlData);
    
    expect(analysis.visibilityScore).toBeGreaterThan(0);
    expect(analysis.competitiveAnalysis).toBeDefined();
  });
});
```

**Testing**: See `lib/llm/__tests__/` for examples

---

### 5. Wikidata (`lib/wikidata/`)

**Purpose**: Wikidata publishing service (P in CFP workflow)

**Key Files:**
- `service.ts` - Main Wikidata service orchestrator
- `entity-builder.ts` - Entity JSON template generation
- `client.ts` - Wikidata Action API client
- `processor.ts` - Crawl data processing for entities

**TDD Example:**
```typescript
// Write test first
describe('Wikidata Service', () => {
  it('publishes entity to Wikidata and returns QID', async () => {
    const result = await wikidataService.createAndPublishEntity(
      business,
      crawlData
    );
    
    expect(result.success).toBe(true);
    expect(result.qid).toMatch(/^Q\d+$/);
  });
});
```

**Testing**: See `lib/wikidata/__tests__/` for examples  
**Documentation**: See `lib/wikidata/README.md` for detailed guide

---

### 6. Data Transfer Objects (`lib/data/`)

**Purpose**: Stable interfaces for API responses (DTOs)

**Key Files:**
- `business-dto.ts` - Business DTO definitions
- `dashboard-dto.ts` - Dashboard DTO definitions
- `fingerprint-dto.ts` - Fingerprint DTO definitions
- `wikidata-dto.ts` - Wikidata DTO definitions

**TDD Example:**
```typescript
// Write test first
describe('Business DTO', () => {
  it('transforms database business to API response format', () => {
    const dbBusiness = createTestBusiness();
    const dto = BusinessDTO.fromDatabase(dbBusiness);
    
    expect(dto.id).toBe(dbBusiness.id);
    expect(dto.status).toBe(dbBusiness.status);
    expect(dto.createdAt).toBeInstanceOf(Date);
  });
});
```

**Testing**: See `lib/data/__tests__/` for examples

---

### 7. Types & Contracts (`lib/types/`)

**Purpose**: TypeScript types, interfaces, and service contracts

**Key Files:**
- `service-contracts.ts` - Service interface definitions
- `gemflush.ts` - Platform-specific types
- `firecrawl-contract.ts` - Firecrawl API contract
- `wikidata-contract.ts` - Wikidata API contract

**TDD Example:**
```typescript
// Write test first
describe('Service Contracts', () => {
  it('validates IWebCrawler contract implementation', () => {
    const crawler: IWebCrawler = {
      crawl: vi.fn(),
    };
    
    expect(crawler.crawl).toBeDefined();
  });
});
```

**Testing**: See `lib/types/__tests__/` for examples

---

### 8. Validation (`lib/validation/`)

**Purpose**: Zod schemas for data validation

**Key Files:**
- `business.ts` - Business validation schemas
- `crawl.ts` - Crawl data validation schemas
- `wikidata.ts` - Wikidata validation schemas

**TDD Example:**
```typescript
// Write test first
describe('Business Validation', () => {
  it('validates business creation request', () => {
    const valid = businessCreateSchema.parse({
      name: 'Test Business',
      url: 'https://example.com',
    });
    
    expect(valid.name).toBe('Test Business');
  });
  
  it('rejects invalid URL', () => {
    expect(() => {
      businessCreateSchema.parse({ url: 'not-a-url' });
    }).toThrow();
  });
});
```

**Testing**: See `lib/validation/__tests__/` for examples

---

### 9. Utilities (`lib/utils/`)

**Purpose**: Shared utilities and helpers

**Key Files:**
- `error-handling.ts` - Error handling utilities
- `logger.ts` - Logging utilities
- `firecrawl-mock.ts` - Mock data for testing
- `idempotency.ts` - Idempotency helpers

**TDD Example:**
```typescript
// Write test first
describe('Error Handling', () => {
  it('wraps errors with context', () => {
    const error = new Error('Original error');
    const wrapped = wrapError(error, 'Additional context');
    
    expect(wrapped.message).toContain('Additional context');
    expect(wrapped.message).toContain('Original error');
  });
});
```

**Testing**: See `lib/utils/__tests__/` for examples

---

### 10. Test Helpers (`lib/test-helpers/`)

**Purpose**: TDD test helpers, factories, and mocks

**Key Files:**
- `tdd-helpers.ts` - Test factories and helpers

**Usage:**
```typescript
import {
  BusinessTestFactory,
  CrawlJobTestFactory,
  MockCrawlerFactory,
  MockDatabaseFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Use factories in tests
const business = BusinessTestFactory.create({ status: 'pending' });
const mockCrawler = MockCrawlerFactory.create();
```

---

## 🔄 Data Flow

```
External APIs (Firecrawl, OpenRouter, Wikidata)
    ↓
lib/crawler/       →  Crawl Data
lib/llm/          →  Fingerprint Analysis
lib/wikidata/     →  Wikidata Entity
    ↓
lib/services/     →  Business Logic Orchestration
    ↓
lib/db/           →  Database Storage
    ↓
lib/data/         →  DTO Transformation
    ↓
app/api/          →  API Routes (Backend)
    ↓
Frontend          →  User Interface
```

---

## 📝 TDD Best Practices

### 1. Write Tests First (Specifications)

**✅ GOOD:**
```typescript
// Test defines specification FIRST
it('creates crawl job when business status is pending', async () => {
  // Specification: Given a pending business
  const business = BusinessTestFactory.create({ status: 'pending' });
  
  // Specification: When execution is triggered
  await executeBusinessFlow(business.id);
  
  // Specification: Then crawl job should exist
  const crawlJob = await getCrawlJob(business.id);
  expect(crawlJob).toBeDefined();
});
```

**❌ BAD:**
```typescript
// Implementation written first
export async function executeBusinessFlow(businessId: number) {
  // ... implementation
}

// Test written after (just verifying code)
it('creates crawl job', () => {
  // Test just verifies what code does
});
```

### 2. Use Test Factories

**✅ GOOD:**
```typescript
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

const business = BusinessTestFactory.create({ status: 'pending' });
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

### 3. Mock External Dependencies

**✅ GOOD:**
```typescript
vi.mock('@/lib/crawler', () => ({
  webCrawler: {
    crawl: vi.fn(),
  },
}));
```

**❌ BAD:**
```typescript
// Making real API calls in tests
const result = await webCrawler.crawl('https://example.com');
```

### 4. Test Behavior, Not Implementation

**✅ GOOD:**
```typescript
it('creates crawl job when business status is pending', () => {
  // Tests WHAT should happen
});
```

**❌ BAD:**
```typescript
it('calls createCrawlJob function', () => {
  // Tests HOW it's implemented
});
```

---

## 🚀 Running Tests

### Watch Mode (Recommended for TDD)

```bash
# Start Vitest watch mode
pnpm tdd

# Or explicit watch command
pnpm test:watch
```

**Watch mode automatically re-runs tests when files change** - perfect for RED → GREEN → REFACTOR cycle.

### Single Run

```bash
# Run all tests once
pnpm test:run

# Run specific file
pnpm test lib/services/__tests__/business-execution.test.ts

# Run with pattern
pnpm test --grep "crawl job"
```

### Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Coverage for specific file
pnpm test:coverage lib/services/__tests__/business-execution.test.ts
```

### UI Mode

```bash
# Visual test runner
pnpm test:ui
```

---

## 📋 TDD Checklist

When developing a new feature in `lib/`:

- [ ] **Write test FIRST** (specification before code)
- [ ] **Test defines behavior** (what should happen, not how)
- [ ] **Test is readable** (acts as documentation)
- [ ] **Test is specific** (one behavior per test)
- [ ] **Run test** (verify it fails - RED)
- [ ] **Write minimal implementation** (satisfy specification)
- [ ] **Run test** (verify it passes - GREEN)
- [ ] **Refactor** (improve code while keeping test passing)
- [ ] **Test still passes** (specification still valid)

---

## 🔗 Related Documentation

- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`
- **TDD Getting Started**: `docs/development/TDD_GETTING_STARTED.md`
- **TDD Specification Example**: `docs/development/TDD_SPECIFICATION_EXAMPLE.md`
- **Service Layer**: `lib/services/README.md`
- **Wikidata Module**: `lib/wikidata/README.md`

---

## 🎓 Key Principles

1. **Tests ARE Specifications**: Tests define desired behavior, code satisfies them
2. **Write Tests First**: Before any implementation code
3. **Red-Green-Refactor**: Fail → Pass → Improve
4. **Test Behavior**: Test WHAT should happen, not HOW
5. **Mock External Dependencies**: Don't make real API calls in tests
6. **Use Factories**: DRY test data creation
7. **SOLID Principles**: Single responsibility, dependency injection
8. **Type Safety**: Full TypeScript coverage

---

**Remember**: In TDD, tests are not verification—they are the specification that drives development. Write tests first, then implement to satisfy them.



