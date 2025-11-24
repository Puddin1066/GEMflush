# TDD Quick Start Guide

**Quick reference for Test-Driven Development with Vitest**

---

## 🎯 Core Principle: Tests ARE Specifications

**Critical**: Tests are written FIRST as executable specifications. The codebase is developed to satisfy these specifications.

```
┌─────────────────────────────────────────────┐
│ Tests (Specifications) → Drive Development  │
│ Code → Satisfies Specifications             │
└─────────────────────────────────────────────┘
```

## 🚀 TDD Cycle (Red-Green-Refactor)

```
1. 🔴 RED:   Write failing test FIRST (this is the specification)
2. 🟢 GREEN: Write minimal code to satisfy specification
3. 🔵 REFACTOR: Improve code (specification still valid)
```

---

## 📝 Basic TDD Workflow

### Step 1: Write Failing Test (RED)

```typescript
// lib/services/__tests__/my-service.test.ts
import { describe, it, expect } from 'vitest';

describe('MyService', () => {
  it('does something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

**Run test**: `pnpm test lib/services/__tests__/my-service.test.ts`

**Expected**: Test fails (RED) ✅

### Step 2: Write Minimal Code (GREEN)

```typescript
// lib/services/my-service.ts
export function myFunction(input: string): string {
  return 'expected'; // Minimal implementation
}
```

**Run test**: `pnpm test lib/services/__tests__/my-service.test.ts`

**Expected**: Test passes (GREEN) ✅

### Step 3: Refactor (REFACTOR)

```typescript
// lib/services/my-service.ts
export function myFunction(input: string): string {
  // Now improve the implementation
  // while keeping tests green
  return processInput(input);
}
```

**Run test**: `pnpm test lib/services/__tests__/my-service.test.ts`

**Expected**: Test still passes ✅

---

## 🛠️ Using TDD Helpers

### Test Factories

```typescript
import {
  BusinessTestFactory,
  TeamTestFactory,
  CrawlJobTestFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Create test data
const business = BusinessTestFactory.create({ status: 'pending' });
const team = TeamTestFactory.createPro();
const job = CrawlJobTestFactory.create({ businessId: business.id });
```

### Mock Factories

```typescript
import {
  MockCrawlerFactory,
  MockDatabaseFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Create mocks
const mockCrawler = MockCrawlerFactory.createSuccess();
const mockDb = MockDatabaseFactory.createSuccess();
```

### Test Assertions

```typescript
import { TDDAssertions } from '@/lib/test-helpers/tdd-helpers';

// Assert error propagation
TDDAssertions.expectErrorPropagated(job, 'Expected error message');

// Assert status transition
TDDAssertions.expectStatusTransition(business, 'crawled');
```

---

## 📋 Common TDD Patterns

### Pattern 1: Testing Error Handling

```typescript
it('handles errors gracefully', async () => {
  // Arrange
  const mockService = MockServiceFactory.createFailure('Error message');
  
  // Act
  const result = await myFunction();
  
  // Assert
  expect(result.error).toBeDefined();
  expect(result.error).toContain('Error message');
});
```

### Pattern 2: Testing Status Transitions

```typescript
it('transitions status correctly', async () => {
  // Arrange
  const business = BusinessTestFactory.create({ status: 'pending' });
  
  // Act
  await processBusiness(business.id);
  
  // Assert
  const updated = await getBusiness(business.id);
  expect(updated.status).toBe('crawled');
});
```

### Pattern 3: Testing with Mocks

```typescript
// Mock at module level
vi.mock('@/lib/external-service', () => ({
  externalCall: vi.fn(),
}));

it('calls external service correctly', async () => {
  // Arrange
  const { externalCall } = await import('@/lib/external-service');
  vi.mocked(externalCall).mockResolvedValue({ success: true });
  
  // Act
  await myFunction();
  
  // Assert
  expect(externalCall).toHaveBeenCalledWith(expectedArgs);
});
```

---

## 🎯 TDD Best Practices

### ✅ DO

- Write tests first (before implementation)
- Test behavior, not implementation
- Keep tests simple and focused
- Use descriptive test names
- Mock external dependencies
- Follow AAA pattern (Arrange, Act, Assert)

### ❌ DON'T

- Write tests after code
- Test implementation details
- Write complex, hard-to-read tests
- Mock internal functions
- Skip the refactor step
- Write tests that are too broad

---

## 🔧 Running Tests

### Watch Mode (Development)

```bash
pnpm test:watch
```

### Single Run (CI)

```bash
pnpm test:run
```

### Specific File

```bash
pnpm test lib/services/__tests__/my-service.test.ts
```

### With Coverage

```bash
pnpm test:coverage
```

### Using TDD Workflow Script

```bash
./scripts/tdd-workflow.sh lib/services/__tests__/my-service.test.ts
```

---

## 📚 Example: Fixing a Bug with TDD

### Problem: Error not propagated to crawl job

### Step 1: Write Failing Test (RED)

```typescript
it('propagates error to crawl job', async () => {
  const business = BusinessTestFactory.create();
  const job = CrawlJobTestFactory.create();
  
  mockCrawler.crawl.mockRejectedValue(new Error('Crawl failed'));
  
  await executeCrawlJob(job.id, business.id);
  
  const updated = await getCrawlJob(job.id);
  expect(updated.errorMessage).toContain('Crawl failed');
});
```

**Run**: Test fails ✅

### Step 2: Fix Implementation (GREEN)

```typescript
// Fix the bug
try {
  await crawler.crawl(business.url);
} catch (error) {
  await updateCrawlJob(jobId, {
    status: 'error',
    errorMessage: error.message, // Fix: Add error message
  });
}
```

**Run**: Test passes ✅

### Step 3: Refactor (REFACTOR)

```typescript
// Improve error handling
try {
  await crawler.crawl(business.url);
} catch (error) {
  const errorMessage = sanitizeError(error);
  await updateCrawlJob(jobId, {
    status: 'error',
    errorMessage,
  });
  throw new ProcessingError(errorMessage, 'CRAWL_FAILED');
}
```

**Run**: Test still passes ✅

---

## 🎓 Learning Resources

- [TDD Strategy Guide](./TDD_STRATEGY.md) - Comprehensive TDD guide
- [Vitest Documentation](https://vitest.dev/)
- [Test-Driven Development (Wikipedia)](https://en.wikipedia.org/wiki/Test-driven_development)

---

## 🚨 Common Issues

### Issue: Tests are flaky

**Solution**: Ensure tests are isolated, don't share state

### Issue: Tests are slow

**Solution**: Use mocks for external dependencies, avoid real database in unit tests

### Issue: Too many mocks

**Solution**: Use integration tests for complex interactions

### Issue: Tests break after refactoring

**Solution**: Test behavior, not implementation details

---

**Remember**: TDD is a cycle. Keep iterating: RED → GREEN → REFACTOR → Repeat

