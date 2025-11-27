# TDD-Based Database Integration Guide

**Core Principle**: Write tests FIRST as executable specifications that define desired database behavior. The integration code is developed to satisfy these specifications.

---

## 🎯 Overview

This guide provides a systematic TDD approach for integrating modules with the database layer. It follows the project's TDD philosophy where tests are specifications that drive implementation.

### Architecture Context

```
┌─────────────────────────────────────┐
│  Module (e.g., crawler, llm, etc.)  │
└──────────────────┬──────────────────┘
                   │ calls
┌──────────────────▼──────────────────┐
│  Database Integration Layer         │
│  (lib/db/* or module-specific)      │
└──────────────────┬──────────────────┘
                   │ uses
┌──────────────────▼──────────────────┐
│  Drizzle ORM + PostgreSQL           │
│  (lib/db/drizzle.ts)                │
└─────────────────────────────────────┘
```

**Key Points:**
- ✅ Tests define the integration specification FIRST
- ✅ Implementation satisfies the specification
- ✅ Integration layer bridges modules to database
- ✅ Uses Drizzle ORM for type-safe queries
- ✅ Follows RED → GREEN → REFACTOR cycle

---

## 📋 TDD Workflow for Database Integration

### The Cycle

```
1. RED: Write failing test (specification)
   ↓
2. GREEN: Implement minimal code to pass
   ↓
3. REFACTOR: Improve while keeping tests passing
```

---

## 🚀 Step-by-Step Integration Process

### Phase 1: Specification (RED Phase)

#### Step 1: Define the Integration Requirement

Before writing code, clearly define what the integration should do:

```markdown
## Feature: Store Crawler Results

**As a** crawler module  
**I want** to store crawl results in the database  
**So that** crawl history is preserved and queryable

**Acceptance Criteria:**
1. Crawl results are stored with business relationship
2. Crawl job status is set correctly (pending/completed/failed)
3. Error messages are stored when crawl fails
4. Metadata is preserved in structured format
5. Data integrity is maintained (foreign keys, constraints)
```

#### Step 2: Write Test as Specification

Write the test FIRST, defining the exact behavior expected:

```typescript
/**
 * SPECIFICATION: Crawler Module Database Integration
 * 
 * Feature: Store Crawler Results
 * 
 * As a crawler module
 * I want crawl results stored in the database
 * So that crawl history is preserved and queryable
 * 
 * Acceptance Criteria:
 * 1. Crawl results stored with business relationship
 * 2. Crawl job status set correctly
 * 3. Error messages stored on failure
 * 4. Metadata preserved
 * 5. Data integrity maintained
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createTestUserWithTeam, 
  createTestBusiness, 
  cleanupTestData 
} from '@/tests/utils/tdd-db-helpers';
import { storeCrawlerResult } from '@/lib/db/crawler-integration';
import { getLatestCrawlJob } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { crawlJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Crawler Module Database Integration - Specification', () => {
  let testUser: { user: any; team: any };
  let testBusiness: any;

  beforeEach(async () => {
    // Clean up previous test data
    await cleanupTestData();
    
    // Create test fixtures (GIVEN)
    testUser = await createTestUserWithTeam();
    testBusiness = await createTestBusiness(testUser.team.id, {
      name: 'Test Restaurant',
      url: 'https://example.com',
    });
  });

  it('stores successful crawl result with business relationship', async () => {
    // SPECIFICATION: Given a successful crawl result
    const crawlResult = {
      success: true,
      data: {
        url: 'https://example.com',
        content: '<html>...</html>',
        links: ['https://example.com/menu'],
      },
      metadata: {
        crawledAt: new Date(),
        pageCount: 3,
      },
    };

    // SPECIFICATION: When crawl result is stored
    const storedJob = await storeCrawlerResult(
      testBusiness.id,
      crawlResult
    );

    // SPECIFICATION: Then crawl job should be created with correct status
    expect(storedJob).toBeDefined();
    expect(storedJob.businessId).toBe(testBusiness.id);
    expect(storedJob.status).toBe('completed');
    expect(storedJob.progress).toBe(100);
    expect(storedJob.result).toEqual(crawlResult.data);
    expect(storedJob.firecrawlMetadata).toEqual(crawlResult.metadata);
    expect(storedJob.completedAt).toBeInstanceOf(Date);
    expect(storedJob.errorMessage).toBeNull();

    // SPECIFICATION: And crawl job should be retrievable from database
    const retrievedJob = await getLatestCrawlJob(testBusiness.id);
    expect(retrievedJob).toBeDefined();
    expect(retrievedJob?.id).toBe(storedJob.id);
    expect(retrievedJob?.status).toBe('completed');
  });

  it('stores failed crawl result with error message', async () => {
    // SPECIFICATION: Given a failed crawl result
    const crawlResult = {
      success: false,
      error: 'Network timeout after 30 seconds',
      metadata: {
        attemptedAt: new Date(),
      },
    };

    // SPECIFICATION: When failed crawl result is stored
    const storedJob = await storeCrawlerResult(
      testBusiness.id,
      crawlResult
    );

    // SPECIFICATION: Then crawl job should have error status
    expect(storedJob).toBeDefined();
    expect(storedJob.status).toBe('failed');
    expect(storedJob.progress).toBe(0);
    expect(storedJob.errorMessage).toBe('Network timeout after 30 seconds');
    expect(storedJob.completedAt).toBeNull();
  });

  it('maintains data integrity with foreign key constraint', async () => {
    // SPECIFICATION: Given a non-existent business ID
    const invalidBusinessId = 99999;

    // SPECIFICATION: When storing crawl result for invalid business
    // SPECIFICATION: Then it should throw database error
    await expect(
      storeCrawlerResult(invalidBusinessId, { success: true })
    ).rejects.toThrow(); // Foreign key constraint violation
  });

  it('stores crawl job with pending status when processing', async () => {
    // SPECIFICATION: Given a crawl job in progress
    const crawlResult = {
      success: true,
      data: { url: 'https://example.com' },
      status: 'processing', // Custom status
    };

    // SPECIFICATION: When storing processing crawl result
    const storedJob = await storeCrawlerResult(
      testBusiness.id,
      crawlResult
    );

    // SPECIFICATION: Then status should reflect processing state
    expect(storedJob.status).toBe('processing');
    expect(storedJob.completedAt).toBeNull();
  });
});
```

**Status**: Tests will FAIL (RED) - no implementation exists yet ✅

---

### Phase 2: Implementation (GREEN Phase)

#### Step 3: Create Integration Module

Create the integration file following the project structure:

```typescript
/**
 * Crawler Module Database Integration Layer
 * 
 * Connects @crawler module to @db module
 * Stores and retrieves crawler-related data
 * 
 * TDD: This file was created to satisfy tests in crawler-integration.tdd.test.ts
 * Following RED → GREEN → REFACTOR cycle
 * 
 * SOLID: Single Responsibility - crawler database integration only
 * DRY: Reusable query patterns
 */

import 'server-only';
import { db } from '@/lib/db/drizzle';
import { 
  crawlJobs,
  type NewCrawlJob,
} from '@/lib/db/schema';

/**
 * Store crawler result with business relationship
 * 
 * SPECIFICATION: Stores crawl results in database with correct status
 * 
 * @param businessId - Business ID (foreign key)
 * @param crawlResult - Crawler result data
 * @returns Created crawl job
 */
export async function storeCrawlerResult(
  businessId: number,
  crawlResult: {
    success: boolean;
    data?: any;
    metadata?: any;
    error?: string;
    status?: string;
  }
) {
  // Determine status based on crawl result
  let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
  
  if (crawlResult.status === 'processing') {
    status = 'processing';
  } else if (crawlResult.success) {
    status = 'completed';
  } else {
    status = 'failed';
  }

  // Build crawl job data
  const jobData: NewCrawlJob = {
    businessId,
    jobType: 'enhanced_multipage_crawl',
    status,
    progress: crawlResult.success ? 100 : 0,
    result: crawlResult.data || null,
    errorMessage: crawlResult.error || null,
    firecrawlMetadata: crawlResult.metadata || null,
    completedAt: crawlResult.success && status === 'completed' ? new Date() : null,
    startedAt: new Date(),
  };

  // Insert into database (will throw if foreign key constraint violated)
  const result = await db.insert(crawlJobs).values(jobData).returning();
  return result[0];
}
```

#### Step 4: Run Tests

```bash
pnpm test crawler-integration.tdd.test.ts
```

**Expected**: Tests should PASS (GREEN) ✅

---

### Phase 3: Refactoring (REFACTOR Phase)

#### Step 5: Improve Code While Tests Pass

Once tests pass, refactor for better code quality:

```typescript
/**
 * Crawler Module Database Integration Layer (Refactored)
 * 
 * IMPROVEMENTS:
 * - Extracted status determination logic
 * - Added input validation
 * - Improved error handling
 * - Better type safety
 */

import 'server-only';
import { db } from '@/lib/db/drizzle';
import { 
  crawlJobs,
  type NewCrawlJob,
} from '@/lib/db/schema';

type CrawlJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface CrawlResult {
  success: boolean;
  data?: any;
  metadata?: any;
  error?: string;
  status?: string;
}

/**
 * Determine crawl job status from result
 */
function determineCrawlJobStatus(crawlResult: CrawlResult): CrawlJobStatus {
  if (crawlResult.status === 'processing') {
    return 'processing';
  }
  if (crawlResult.success) {
    return 'completed';
  }
  return 'failed';
}

/**
 * Build crawl job data from result
 */
function buildCrawlJobData(
  businessId: number,
  crawlResult: CrawlResult
): NewCrawlJob {
  const status = determineCrawlJobStatus(crawlResult);
  const isCompleted = status === 'completed';

  return {
    businessId,
    jobType: 'enhanced_multipage_crawl',
    status,
    progress: isCompleted ? 100 : 0,
    result: crawlResult.data || null,
    errorMessage: crawlResult.error || null,
    firecrawlMetadata: crawlResult.metadata || null,
    completedAt: isCompleted ? new Date() : null,
    startedAt: new Date(),
  };
}

/**
 * Store crawler result with business relationship
 * 
 * SPECIFICATION: Stores crawl results in database with correct status
 */
export async function storeCrawlerResult(
  businessId: number,
  crawlResult: CrawlResult
) {
  // Validate business ID (will be caught by foreign key constraint if invalid)
  if (!businessId || businessId <= 0) {
    throw new Error('Invalid business ID');
  }

  const jobData = buildCrawlJobData(businessId, crawlResult);
  const result = await db.insert(crawlJobs).values(jobData).returning();
  
  return result[0];
}
```

**Expected**: Tests still PASS after refactoring ✅

---

## 📚 Integration Patterns

### Pattern 1: Simple CRUD Integration

For modules that need basic create/read/update/delete operations:

```typescript
/**
 * SPECIFICATION: Business Module CRUD Operations
 */
describe('Business Module Database Integration', () => {
  it('creates business with required fields', async () => {
    // Test specification
    const business = await createBusiness({
      name: 'Test Business',
      url: 'https://example.com',
      teamId: testTeam.id,
    });
    
    expect(business.id).toBeDefined();
    expect(business.name).toBe('Test Business');
  });

  it('retrieves business by ID', async () => {
    // Test specification
    const business = await getBusinessById(testBusiness.id);
    expect(business).toBeDefined();
    expect(business?.id).toBe(testBusiness.id);
  });

  it('updates business fields', async () => {
    // Test specification
    const updated = await updateBusiness(testBusiness.id, {
      name: 'Updated Name',
    });
    expect(updated?.name).toBe('Updated Name');
  });

  it('deletes business', async () => {
    // Test specification
    await deleteBusiness(testBusiness.id);
    const retrieved = await getBusinessById(testBusiness.id);
    expect(retrieved).toBeNull();
  });
});
```

### Pattern 2: Relationship-Based Integration

For modules that need to store relationships:

```typescript
/**
 * SPECIFICATION: LLM Fingerprint Module Integration
 * 
 * Stores fingerprints with business relationship
 */
describe('LLM Fingerprint Module Integration', () => {
  it('stores fingerprint linked to business', async () => {
    // SPECIFICATION: Given a fingerprint result
    const fingerprint = await storeLLMFingerprint(testBusiness.id, {
      visibilityScore: 75,
      mentionRate: 0.85,
      llmResults: { /* ... */ },
    });

    // SPECIFICATION: Then fingerprint should be linked to business
    expect(fingerprint.businessId).toBe(testBusiness.id);
    
    // SPECIFICATION: And retrievable via business query
    const business = await getBusinessWithFingerprints(testBusiness.id);
    expect(business.fingerprints).toHaveLength(1);
    expect(business.fingerprints[0].id).toBe(fingerprint.id);
  });
});
```

### Pattern 3: Status Transition Integration

For modules that manage state transitions:

```typescript
/**
 * SPECIFICATION: Business Status Transitions
 */
describe('Business Status Transition Integration', () => {
  it('transitions from pending to crawled on successful crawl', async () => {
    // SPECIFICATION: Given a pending business
    const business = await createTestBusiness(teamId, { status: 'pending' });
    
    // SPECIFICATION: When crawl completes successfully
    await storeCrawlerResult(business.id, { success: true });
    await updateBusinessStatus(business.id, 'crawled');
    
    // SPECIFICATION: Then business status should be 'crawled'
    const updated = await getBusinessById(business.id);
    expect(updated?.status).toBe('crawled');
  });
});
```

### Pattern 4: Transaction-Based Integration

For modules that need atomic multi-step operations:

```typescript
/**
 * SPECIFICATION: Atomic Business Creation with Team
 */
describe('Transaction-Based Integration', () => {
  it('creates business and activity log atomically', async () => {
    // SPECIFICATION: Given transaction context
    await db.transaction(async (tx) => {
      // SPECIFICATION: When both operations succeed
      const business = await tx.insert(businesses).values({...}).returning();
      await tx.insert(activityLogs).values({
        action: 'business_created',
        businessId: business[0].id,
      });
    });

    // SPECIFICATION: Then both should be persisted
    const business = await getBusinessById(businessId);
    const logs = await getActivityLogs(businessId);
    expect(business).toBeDefined();
    expect(logs).toHaveLength(1);
  });

  it('rolls back on error', async () => {
    // SPECIFICATION: Given transaction with error
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(businesses).values({...});
        throw new Error('Transaction failed');
      })
    ).rejects.toThrow();

    // SPECIFICATION: Then nothing should be persisted
    const business = await getBusinessById(businessId);
    expect(business).toBeNull();
  });
});
```

---

## 🧪 Test Strategies

### Strategy 1: Unit Tests (Mocks)

For testing integration logic without database:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { storeCrawlerResult } from '@/lib/db/crawler-integration';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 1,
          businessId: 123,
          status: 'completed',
        }]),
      }),
    }),
  },
}));

describe('Crawler Integration (Unit)', () => {
  it('builds correct crawl job data structure', async () => {
    // Test logic without database
    const result = await storeCrawlerResult(123, { success: true });
    expect(result.status).toBe('completed');
  });
});
```

### Strategy 2: Integration Tests (Real Database)

For testing actual database operations:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createTestUserWithTeam, 
  createTestBusiness, 
  cleanupTestData 
} from '@/tests/utils/tdd-db-helpers';
import { storeCrawlerResult } from '@/lib/db/crawler-integration';
import { db } from '@/lib/db/drizzle';

describe('Crawler Integration (Integration)', () => {
  beforeEach(async () => {
    await cleanupTestData(); // Clean real database
  });

  it('stores crawl result in real database', async () => {
    // Test with real database connection
    const { team } = await createTestUserWithTeam();
    const business = await createTestBusiness(team.id);
    
    const result = await storeCrawlerResult(business.id, { success: true });
    
    // Verify in database
    const stored = await db.query.crawlJobs.findFirst({
      where: eq(crawlJobs.id, result.id),
    });
    expect(stored).toBeDefined();
  });
});
```

---

## 📝 Implementation Checklist

When integrating a module with the database:

### ✅ Phase 1: Specification (RED)

- [ ] Write feature specification (Given-When-Then)
- [ ] Create test file: `{module}-integration.tdd.test.ts`
- [ ] Write failing tests that define behavior
- [ ] Tests should fail for expected reasons (not implementation)

### ✅ Phase 2: Implementation (GREEN)

- [ ] Create integration file: `lib/db/{module}-integration.ts`
- [ ] Implement minimal code to pass tests
- [ ] Use Drizzle ORM for type-safe queries
- [ ] Follow existing patterns (see `kgaas-integration.ts`)
- [ ] Run tests - should pass (GREEN)

### ✅ Phase 3: Refactoring (REFACTOR)

- [ ] Extract helper functions
- [ ] Add input validation
- [ ] Improve error handling
- [ ] Add JSDoc comments
- [ ] Ensure SOLID principles
- [ ] Run tests - should still pass

---

## 🏗️ Integration File Structure

Follow this structure for consistency:

```typescript
/**
 * {Module} Database Integration Layer
 * 
 * Connects @{module} module to @db module
 * Stores and retrieves {module}-related data
 * 
 * TDD: Created to satisfy tests in {module}-integration.tdd.test.ts
 * Following RED → GREEN → REFACTOR cycle
 * 
 * SOLID: Single Responsibility - {module} database integration only
 * DRY: Reusable query patterns
 */

import 'server-only';
import { db } from '@/lib/db/drizzle';
import { 
  // Import relevant schema tables and types
  tableName,
  type NewTableName,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Primary integration function
 * SPECIFICATION: [Describe what it does]
 */
export async function store{Module}Data(
  businessId: number,
  data: { /* ... */ }
) {
  // Implementation
}

/**
 * Query function
 * SPECIFICATION: [Describe what it retrieves]
 */
export async function get{Module}Data(businessId: number) {
  // Implementation
}

// Additional helper functions as needed
```

---

## 🔍 Example: Complete Integration Flow

### Module: Email Service Integration

#### Step 1: Specification (RED)

```typescript
// lib/db/__tests__/email-integration.tdd.test.ts

/**
 * SPECIFICATION: Email Module Database Integration
 */
describe('Email Module Database Integration', () => {
  it('stores email log with team relationship', async () => {
    const { team } = await createTestUserWithTeam();
    
    const emailLog = await storeEmailLog({
      to: 'user@example.com',
      type: 'welcome',
      subject: 'Welcome!',
      teamId: team.id,
      status: 'sent',
    });

    expect(emailLog.teamId).toBe(team.id);
    expect(emailLog.status).toBe('sent');
  });
});
```

**Status**: RED (test fails, no implementation)

#### Step 2: Implementation (GREEN)

```typescript
// lib/db/email-integration.ts

export async function storeEmailLog(emailData: {
  to: string;
  type: string;
  subject?: string;
  teamId?: number;
  status?: 'pending' | 'sent' | 'failed';
}) {
  const logData: NewEmailLog = {
    to: emailData.to,
    type: emailData.type,
    subject: emailData.subject || null,
    teamId: emailData.teamId || null,
    status: emailData.status || 'pending',
    sentAt: emailData.status === 'sent' ? new Date() : null,
  };

  const result = await db.insert(emailLogs).values(logData).returning();
  return result[0];
}
```

**Status**: GREEN (tests pass)

#### Step 3: Refactor (REFACTOR)

```typescript
// lib/db/email-integration.ts (refactored)

function buildEmailLogData(emailData: EmailLogInput): NewEmailLog {
  return {
    to: emailData.to,
    type: emailData.type,
    subject: emailData.subject || null,
    teamId: emailData.teamId || null,
    status: emailData.status || 'pending',
    sentAt: emailData.status === 'sent' ? new Date() : null,
  };
}

export async function storeEmailLog(emailData: EmailLogInput) {
  const logData = buildEmailLogData(emailData);
  const result = await db.insert(emailLogs).values(logData).returning();
  return result[0];
}
```

**Status**: GREEN (tests still pass)

---

## 🎯 Best Practices

### 1. Always Write Tests First

**✅ GOOD:**
```typescript
// Test defines specification FIRST
it('stores data correctly', async () => {
  // Test implementation
});
```

**❌ BAD:**
```typescript
// Implementation exists before test
export async function storeData() { /* ... */ }
// Test written after
it('stores data correctly', async () => { /* ... */ });
```

### 2. Use Test Factories

**✅ GOOD:**
```typescript
const business = await createTestBusiness(teamId, {
  name: 'Test Business',
});
```

**❌ BAD:**
```typescript
const business = {
  id: 1,
  name: 'Test Business',
  // ... many fields manually
};
```

### 3. Clean Up Test Data

**✅ GOOD:**
```typescript
beforeEach(async () => {
  await cleanupTestData();
});
```

**❌ BAD:**
```typescript
// No cleanup - tests interfere with each other
```

### 4. Test Behavior, Not Implementation

**✅ GOOD:**
```typescript
it('stores crawl result with correct status', async () => {
  const result = await storeCrawlerResult(businessId, { success: true });
  expect(result.status).toBe('completed'); // Behavior
});
```

**❌ BAD:**
```typescript
it('calls db.insert with correct arguments', async () => {
  expect(db.insert).toHaveBeenCalledWith(/* ... */); // Implementation detail
});
```

---

## 🔗 Related Documentation

- **TDD Specification Guide**: `docs/development/TDD_SPECIFICATION_GUIDE.md`
- **TDD Decision Framework**: `docs/development/TDD_DECISION_FRAMEWORK.md`
- **Database Architecture**: `docs/architecture/DATABASE_ARCHITECTURE.md`
- **Test Database Strategy**: `docs/development/TEST_DATABASE_STRATEGY.md`
- **Test Helpers**: `lib/test-helpers/README.md`

---

## 📊 Summary

**TDD Database Integration Workflow:**

1. **RED**: Write failing tests that specify desired behavior
2. **GREEN**: Implement minimal code to pass tests
3. **REFACTOR**: Improve code while keeping tests passing

**Key Principles:**

- ✅ Tests ARE specifications - write them first
- ✅ Use test factories for data creation
- ✅ Clean up test data between tests
- ✅ Test behavior, not implementation
- ✅ Use real database for integration tests
- ✅ Use mocks for unit tests
- ✅ Follow existing patterns (see `kgaas-integration.ts`)

**Remember**: The goal is correct, maintainable code that satisfies the specifications defined in tests. Tests drive development, not the other way around.



