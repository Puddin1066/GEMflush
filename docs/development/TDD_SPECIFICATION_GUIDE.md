# TDD: Tests as Specifications Guide

**Core Principle**: Tests are written FIRST as executable specifications that define desired behavior. The codebase is developed to satisfy these specifications.

---

## 🎯 The Specification-First Approach

### Traditional Development (Wrong for TDD)
```
1. Write code
2. Write tests to verify code
3. Hope tests catch bugs
```

### TDD Approach (Correct)
```
1. Write test (specification) → Defines WHAT should happen
2. Test fails (RED) → Expected, no implementation exists
3. Write minimal code → Satisfy the specification
4. Test passes (GREEN) → Specification is met
5. Refactor → Improve while keeping spec valid
```

---

## 📝 Writing Tests as Specifications

### Example 1: Business Execution Service

#### Step 1: Write Specification (Test First)

```typescript
/**
 * SPECIFICATION: Business Execution Service - Crawl Job Creation
 * 
 * Feature: Automatic Crawl Job Creation
 * 
 * As a system administrator
 * I want crawl jobs to be created automatically when a business is processed
 * So that businesses can be crawled without manual job creation
 * 
 * Acceptance Criteria:
 * 1. When a business with status 'pending' is processed, a crawl job is created
 * 2. The crawl job has status 'pending'
 * 3. The crawl job is linked to the business via businessId
 * 4. The crawl job is created before any crawl execution begins
 */
describe('BusinessExecutionService - Crawl Job Creation Specification', () => {
  it('creates crawl job when processing pending business', async () => {
    // SPECIFICATION: Given a business with status 'pending'
    const business = BusinessTestFactory.create({ 
      status: 'pending',
      id: 123,
    });
    
    // SPECIFICATION: When business execution is triggered
    await executeBusinessFlow(business.id);
    
    // SPECIFICATION: Then a crawl job should be created
    const crawlJob = await getCrawlJob(business.id);
    
    // SPECIFICATION: And the crawl job should have correct properties
    expect(crawlJob).toBeDefined();
    expect(crawlJob.status).toBe('pending');
    expect(crawlJob.businessId).toBe(business.id);
  });
});
```

**This test IS the specification.** The implementation must satisfy it.

#### Step 2: Implement to Satisfy Specification

```typescript
// lib/services/business-execution.ts

/**
 * Implementation to satisfy specification:
 * "creates crawl job when processing pending business"
 */
export async function executeBusinessFlow(businessId: number) {
  const business = await getBusinessById(businessId);
  
  if (business.status === 'pending') {
    // Satisfy specification: Create crawl job
    await createCrawlJob({
      businessId: business.id,
      status: 'pending',
    });
  }
  
  // ... rest of implementation
}
```

#### Step 3: Refactor (Specification Still Valid)

```typescript
// Refactored implementation - specification still satisfied
export async function executeBusinessFlow(businessId: number) {
  const business = await getBusinessById(businessId);
  
  if (shouldCreateCrawlJob(business)) {
    await createCrawlJobForBusiness(business);
  }
  
  // ... rest of implementation
}

// Extracted helper - still satisfies specification
function shouldCreateCrawlJob(business: Business): boolean {
  return business.status === 'pending';
}
```

---

## 📋 Specification Format

### Using Given-When-Then (BDD Style)

```typescript
describe('Feature: Error Message Propagation', () => {
  it('propagates error messages to crawl job when crawl fails', async () => {
    // GIVEN: A business with a crawl job
    const business = BusinessTestFactory.create();
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });
    
    // AND: The crawler will fail
    mockCrawler.crawl.mockRejectedValue(new Error('Network timeout'));
    
    // WHEN: Crawl execution is attempted
    await executeCrawlJob(crawlJob.id, business.id);
    
    // THEN: The error message should be propagated to the crawl job
    const updatedJob = await getCrawlJob(crawlJob.id);
    expect(updatedJob.status).toBe('error');
    expect(updatedJob.errorMessage).toContain('Network timeout');
  });
});
```

### Using Specification Comments

```typescript
/**
 * SPECIFICATION: Business Status Transitions
 * 
 * When a business crawl succeeds:
 * - Business status should transition from 'pending' to 'crawled'
 * - crawlData should be populated
 * - lastCrawledAt should be set to current timestamp
 */
describe('Business Status Transitions', () => {
  it('transitions status from pending to crawled on successful crawl', async () => {
    // SPECIFICATION: Given a pending business
    const business = BusinessTestFactory.create({ status: 'pending' });
    
    // SPECIFICATION: And a successful crawl result
    const crawlData = { url: business.url, content: '<html>...</html>' };
    mockCrawler.crawl.mockResolvedValue({ success: true, data: crawlData });
    
    // SPECIFICATION: When crawl is executed
    await executeCrawlJob(null, business.id, business);
    
    // SPECIFICATION: Then business status should be 'crawled'
    const updated = await getBusinessById(business.id);
    expect(updated.status).toBe('crawled');
    expect(updated.crawlData).toEqual(crawlData);
    expect(updated.lastCrawledAt).toBeInstanceOf(Date);
  });
});
```

---

## 🎯 Specification-Driven Development Workflow

### 1. Define Feature Specification

Before writing any code, define what the feature should do:

```markdown
## Feature: Automatic Crawl Job Creation

**As a** system administrator  
**I want** crawl jobs to be created automatically  
**So that** businesses can be processed without manual intervention

**Acceptance Criteria:**
1. When business status is 'pending', crawl job is created
2. Crawl job has status 'pending'
3. Crawl job is linked to business
4. Crawl job is created before crawl execution
```

### 2. Write Test as Specification

```typescript
// This test IS the specification
it('creates crawl job when business status is pending', async () => {
  // Test implementation that defines the specification
});
```

### 3. Implement to Satisfy Specification

```typescript
// Write minimal code to make test pass
// Code should satisfy the specification defined in the test
```

### 4. Verify Specification is Met

```bash
# Run test - it should pass (GREEN)
pnpm test business-execution.test.ts
```

### 5. Refactor While Keeping Specification Valid

```typescript
// Improve code quality
// Tests should still pass (specification still satisfied)
```

---

## 📚 Specification Examples by Feature

### Example: Error Handling Specification

```typescript
/**
 * SPECIFICATION: Error Handling and Propagation
 * 
 * When an error occurs during crawl execution:
 * 1. Error message should be captured
 * 2. Error message should be stored in crawl job
 * 3. Crawl job status should be set to 'error'
 * 4. Business status should be set to 'error'
 * 5. Error should be logged for debugging
 */
describe('Error Handling Specification', () => {
  it('propagates error message to crawl job', async () => {
    // Specification test implementation
  });
  
  it('updates business status to error on failure', async () => {
    // Specification test implementation
  });
  
  it('logs error for debugging', async () => {
    // Specification test implementation
  });
});
```

### Example: Status Transition Specification

```typescript
/**
 * SPECIFICATION: Business Status Transitions
 * 
 * Valid state transitions:
 * - pending → crawled (on successful crawl)
 * - pending → error (on crawl failure)
 * - crawled → published (on successful publish)
 * - crawled → error (on publish failure)
 * 
 * Invalid transitions should be prevented
 */
describe('Status Transition Specification', () => {
  it('transitions from pending to crawled on successful crawl', async () => {
    // Specification test
  });
  
  it('prevents invalid transitions', async () => {
    // Specification test
  });
});
```

---

## ✅ Specification Checklist

When writing tests as specifications, ensure:

- [ ] **Test is written FIRST** (before implementation)
- [ ] **Test defines behavior** (what should happen, not how)
- [ ] **Test is readable** (acts as documentation)
- [ ] **Test is specific** (one behavior per test)
- [ ] **Test is isolated** (doesn't depend on other tests)
- [ ] **Test is deterministic** (same result every time)

---

## 🎓 Key Takeaways

1. **Tests ARE specifications** - They define what the system should do
2. **Write tests FIRST** - Before any implementation code
3. **Tests drive development** - Code is written to satisfy tests
4. **Tests are documentation** - They describe system behavior
5. **Specifications are executable** - Run tests to verify behavior

---

## 📖 Further Reading

- [TDD Strategy Guide](./TDD_STRATEGY.md) - Comprehensive TDD guide
- [TDD Quick Start](./TDD_QUICK_START.md) - Quick reference
- [Test-Driven Development (Wikipedia)](https://en.wikipedia.org/wiki/Test-driven_development)

---

**Remember**: In TDD, tests are not just verification—they are the specification that drives development.

