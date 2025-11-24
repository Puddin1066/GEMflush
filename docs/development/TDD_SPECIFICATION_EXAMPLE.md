# TDD Specification Example: Writing Tests First

**This document demonstrates how to write tests as specifications FIRST, then develop code to satisfy them.**

---

## 🎯 Scenario: Fixing Crawl Job Creation Bug

### Problem Statement

**Current Issue**: When a business status goes to "error", no crawl job is created, making debugging impossible.

**Desired Behavior**: A crawl job should always be created before any processing begins, so errors can be tracked.

---

## 📋 Step 1: Write Specification (Test FIRST)

**Before writing any code**, write the test that defines the desired behavior:

```typescript
/**
 * SPECIFICATION: Crawl Job Creation
 * 
 * Feature: Automatic Crawl Job Creation
 * 
 * As a system administrator
 * I want crawl jobs to be created automatically before processing
 * So that errors can be tracked and debugged
 * 
 * Acceptance Criteria:
 * 1. When executeCrawlJob is called, a crawl job is created FIRST
 * 2. The crawl job is created even if jobId is null
 * 3. The crawl job has status 'pending' initially
 * 4. The crawl job is linked to the business
 * 5. If an error occurs, the error is stored in the crawl job
 */
describe('Crawl Job Creation - Specification', () => {
  it('creates crawl job before processing when jobId is null', async () => {
    // SPECIFICATION: Given a business that needs crawling
    const business = BusinessTestFactory.create({ 
      id: 123,
      status: 'pending',
    });
    
    // SPECIFICATION: And no existing crawl job (jobId is null)
    const jobId = null;
    
    // SPECIFICATION: When crawl execution is triggered
    await executeCrawlJob(jobId, business.id, business);
    
    // SPECIFICATION: Then a crawl job should be created FIRST
    expect(mockQueries.createCrawlJob).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: business.id,
        status: 'pending',
      })
    );
    
    // SPECIFICATION: And the crawl job should exist before any processing
    const callOrder = mockQueries.createCrawlJob.mock.invocationCallOrder[0];
    const crawlCallOrder = mockCrawler.crawl.mock.invocationCallOrder[0] || Infinity;
    expect(callOrder).toBeLessThan(crawlCallOrder);
  });
  
  it('creates crawl job even when crawl will fail', async () => {
    // SPECIFICATION: Given a business
    const business = BusinessTestFactory.create({ id: 123 });
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });
    
    // SPECIFICATION: And the crawl will fail
    mockCrawler.crawl.mockRejectedValue(new Error('Network timeout'));
    mockQueries.createCrawlJob.mockResolvedValue(crawlJob);
    
    // SPECIFICATION: When crawl execution is attempted
    await executeCrawlJob(null, business.id, business);
    
    // SPECIFICATION: Then crawl job should be created BEFORE error
    expect(mockQueries.createCrawlJob).toHaveBeenCalled();
    
    // SPECIFICATION: And error should be stored in crawl job
    expect(mockQueries.updateCrawlJob).toHaveBeenCalledWith(
      crawlJob.id,
      expect.objectContaining({
        status: 'error',
        errorMessage: expect.stringContaining('Network timeout'),
      })
    );
  });
});
```

**This test IS the specification.** It defines exactly what should happen.

---

## 🔴 Step 2: Run Test (RED - Expected Failure)

```bash
pnpm test lib/services/__tests__/business-execution.test.ts
```

**Expected Result**: Test fails (RED) ✅

**Why it fails**: The implementation doesn't satisfy the specification yet.

---

## 🟢 Step 3: Implement to Satisfy Specification

Now write minimal code to satisfy the specification:

```typescript
// lib/services/business-execution.ts

export async function executeCrawlJob(
  jobId: number | null,
  businessId: number,
  business?: Business
): Promise<ExecutionResult> {
  // SPECIFICATION: Create crawl job FIRST (before any processing)
  let actualJobId = jobId;
  
  if (!actualJobId) {
    // Satisfy specification: Create crawl job when jobId is null
    const job = await createCrawlJob({
      businessId,
      status: 'pending',
    });
    actualJobId = job.id;
  }
  
  try {
    // Now proceed with crawl (job already exists)
    const result = await webCrawler.crawl(business.url);
    
    // Update job with success
    await updateCrawlJob(actualJobId, {
      status: 'completed',
    });
    
    return { success: true, businessId };
  } catch (error) {
    // SPECIFICATION: Store error in crawl job
    await updateCrawlJob(actualJobId, {
      status: 'error',
      errorMessage: error.message,
    });
    
    throw error;
  }
}
```

---

## ✅ Step 4: Verify Specification is Met (GREEN)

```bash
pnpm test lib/services/__tests__/business-execution.test.ts
```

**Expected Result**: Test passes (GREEN) ✅

**Why it passes**: The implementation now satisfies the specification defined in the test.

---

## 🔵 Step 5: Refactor (Keep Specification Valid)

Improve the code while keeping the specification satisfied:

```typescript
// lib/services/business-execution.ts (Refactored)

export async function executeCrawlJob(
  jobId: number | null,
  businessId: number,
  business?: Business
): Promise<ExecutionResult> {
  // SPECIFICATION: Create crawl job FIRST
  const actualJobId = await ensureCrawlJobExists(jobId, businessId);
  
  try {
    const result = await executeCrawl(actualJobId, business);
    await markJobCompleted(actualJobId);
    return { success: true, businessId };
  } catch (error) {
    await markJobFailed(actualJobId, error);
    throw error;
  }
}

// Extracted helper - still satisfies specification
async function ensureCrawlJobExists(
  jobId: number | null,
  businessId: number
): Promise<number> {
  if (jobId) return jobId;
  
  const job = await createCrawlJob({
    businessId,
    status: 'pending',
  });
  
  return job.id;
}
```

**Run test again**: Should still pass ✅

**Why**: The refactored code still satisfies the specification.

---

## 📊 Specification-Driven Development Summary

### What We Did

1. ✅ **Wrote specification FIRST** (test before code)
2. ✅ **Test defined behavior** (what should happen)
3. ✅ **Implemented to satisfy specification** (code follows test)
4. ✅ **Verified specification met** (test passes)
5. ✅ **Refactored while keeping spec valid** (test still passes)

### Key Principles Applied

- **Tests ARE specifications** - They define desired behavior
- **Write tests FIRST** - Before any implementation
- **Code satisfies specifications** - Implementation follows tests
- **Specifications are executable** - Run tests to verify behavior

---

## 🎓 Comparison: Traditional vs TDD

### Traditional Development (Wrong)

```typescript
// 1. Write code first
export async function executeCrawlJob(jobId, businessId) {
  // Implementation...
}

// 2. Write test to verify code
it('creates crawl job', () => {
  // Test written after code
});
```

**Problem**: Code might not do what we actually need. Test just verifies what code does.

### TDD Approach (Correct)

```typescript
// 1. Write specification FIRST (test)
it('creates crawl job before processing', () => {
  // Specification defines what should happen
});

// 2. Write code to satisfy specification
export async function executeCrawlJob(jobId, businessId) {
  // Implementation satisfies the specification
}
```

**Benefit**: Code does exactly what the specification requires.

---

## ✅ Checklist: Writing Specifications First

When implementing a feature:

- [ ] **Write test FIRST** (before any implementation code)
- [ ] **Test defines behavior** (what should happen, not how)
- [ ] **Test is readable** (acts as documentation)
- [ ] **Test is specific** (one behavior per test)
- [ ] **Implementation satisfies test** (code follows specification)
- [ ] **Refactor keeps test passing** (specification still valid)

---

**Remember**: In TDD, tests are not verification—they are the specification that drives development.

