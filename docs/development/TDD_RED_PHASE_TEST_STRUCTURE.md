# TDD RED Phase: Correct Test Structure Guide

**Purpose**: Guide for AI agents and developers to write correctly structured RED phase tests that drive proper TDD development  
**Date**: January 2025  
**Status**: 🟢 Active Reference

---

## 🎯 Core Principle: Tests ARE Specifications

**Critical**: A correctly structured RED phase test is an **executable specification** that:
1. Defines **WHAT** should happen (behavior), not **HOW** (implementation)
2. Is written **BEFORE** any implementation code
3. Will **fail** when first written (expected - RED phase)
4. Drives the implementation to satisfy the specification

---

## ✅ Correct RED Phase Test Structure

### 1. **File Header: Specification Documentation**

Every RED phase test file should start with a specification comment:

```typescript
/**
 * TDD Test: [Feature Name] - Tests Drive Implementation
 * 
 * SPECIFICATION: [Feature Description]
 * 
 * As a [user role]
 * I want [feature capability]
 * So that [business value]
 * 
 * Acceptance Criteria:
 * 1. [Criterion 1]
 * 2. [Criterion 2]
 * 3. [Criterion 3]
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * SOLID: [Principle applied]
 * DRY: [Reusability note]
 */
```

**Example from codebase**:
```1:18:lib/services/__tests__/automation-service.tdd.test.ts
/**
 * TDD Test: Automation Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Automation Configuration Service
 * 
 * As a KGaaS platform
 * I want automation configuration to work correctly
 * So that tier-based automation is properly enforced
 * 
 * Acceptance Criteria:
 * 1. Returns correct automation config per tier
 * 2. Determines crawl frequency correctly
 * 3. Determines publish eligibility correctly
 * 4. Calculates next crawl date correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */
```

### 2. **Test Describe Block: Specification Context**

```typescript
describe('🔴 RED: [Feature] Specification', () => {
  // Tests go here
});
```

**Why**: The 🔴 emoji and "RED" label make it clear this is a specification phase test.

### 3. **Individual Test: Behavior Specification**

Each test should follow this structure:

```typescript
/**
 * SPECIFICATION [N]: [Specific Behavior]
 * 
 * Given: [Initial state]
 * When: [Action taken]
 * Then: [Expected outcome]
 */
it('describes behavior in plain language', async () => {
  // Arrange: Set up test data and mocks
  const input = createTestData();
  vi.spyOn(dependency, 'method').mockResolvedValue(mockResult);
  
  // Act: Execute the code under test (TEST DRIVES IMPLEMENTATION)
  const { functionUnderTest } = await import('../module');
  const result = await functionUnderTest(input);
  
  // Assert: Verify the outcome (behavior: what should happen)
  expect(result).toMatchObject({
    // Expected structure
  });
});
```

**Key Elements**:
- **Test name**: Describes **behavior**, not implementation
- **Specification comment**: Given-When-Then format
- **AAA Pattern**: Arrange → Act → Assert
- **Comment**: "TEST DRIVES IMPLEMENTATION" in Act section
- **Assertions**: Test **behavior** (what), not **implementation** (how)

### 4. **Example: Complete RED Phase Test**

```typescript
/**
 * TDD Test: Business Execution Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Crawl Job Creation
 * 
 * As a system administrator
 * I want crawl jobs to be created automatically
 * So that businesses can be processed without manual intervention
 * 
 * Acceptance Criteria:
 * 1. When business status is 'pending', crawl job is created
 * 2. Crawl job has status 'pending'
 * 3. Crawl job is linked to business via businessId
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies (external services, not internal functions)
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  createCrawlJob: vi.fn(),
  getCrawlJob: vi.fn(),
}));

describe('🔴 RED: Business Execution Service Specification', () => {
  /**
   * SPECIFICATION 1: Crawl Job Creation
   * 
   * Given: Business with status 'pending'
   * When: Business execution is triggered
   * Then: Crawl job is created with correct properties
   */
  it('creates crawl job when business status is pending', async () => {
    // Arrange: Business ready for processing
    const business = BusinessTestFactory.create({ 
      id: 123,
      status: 'pending',
    });
    
    // Mock database queries
    const { getBusinessById, createCrawlJob, getCrawlJob } = await import('@/lib/db/queries');
    vi.mocked(getBusinessById).mockResolvedValue(business);
    vi.mocked(getCrawlJob).mockResolvedValue({
      id: 1,
      businessId: 123,
      status: 'pending',
    });
    
    // Act: Execute business flow (TEST DRIVES IMPLEMENTATION)
    const { executeBusinessFlow } = await import('../business-execution');
    await executeBusinessFlow(business.id);
    
    // Assert: Verify behavior (crawl job created with correct properties)
    expect(createCrawlJob).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 123,
        status: 'pending',
      })
    );
    
    const crawlJob = await getCrawlJob(business.id);
    expect(crawlJob).toBeDefined();
    expect(crawlJob.businessId).toBe(123);
    expect(crawlJob.status).toBe('pending');
  });
});
```

---

## ✅ Correct RED Phase Test Characteristics

### 1. **Tests Behavior, Not Implementation**

```typescript
// ✅ GOOD: Tests behavior
it('creates crawl job when business status is pending', async () => {
  await executeBusinessFlow(business.id);
  const crawlJob = await getCrawlJob(business.id);
  expect(crawlJob).toBeDefined();
  expect(crawlJob.status).toBe('pending');
});

// ❌ BAD: Tests implementation
it('calls createCrawlJob function', async () => {
  await executeBusinessFlow(business.id);
  expect(createCrawlJob).toHaveBeenCalled(); // Testing HOW, not WHAT
});
```

### 2. **Uses AAA Pattern (Arrange-Act-Assert)**

```typescript
it('describes behavior', async () => {
  // Arrange: Set up test data and mocks
  const business = BusinessTestFactory.create({ status: 'pending' });
  vi.spyOn(crawler, 'crawl').mockResolvedValue(mockData);
  
  // Act: Execute the code under test
  const { functionUnderTest } = await import('../module');
  const result = await functionUnderTest(business.id);
  
  // Assert: Verify the outcome
  expect(result).toMatchObject({ /* expected structure */ });
});
```

### 3. **Mocks External Dependencies, Not Internal Functions**

```typescript
// ✅ GOOD: Mock external services
vi.mock('@/lib/crawler/firecrawl', () => ({
  crawl: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  createCrawlJob: vi.fn(),
}));

// ❌ BAD: Mock internal functions
vi.spyOn(module, 'internalHelper'); // Don't test implementation details
```

### 4. **Uses Test Factories for Data Creation**

```typescript
// ✅ GOOD: Use test factories
const business = BusinessTestFactory.create({ 
  id: 123,
  status: 'pending',
});

// ❌ BAD: Manual object creation
const business = {
  id: 123,
  name: 'Test',
  status: 'pending',
  // ... many more fields
};
```

### 5. **One Behavior Per Test (Single Responsibility)**

```typescript
// ✅ GOOD: One behavior per test
it('creates crawl job when business status is pending', ...);
it('updates business status after crawl', ...);
it('propagates error message on failure', ...);

// ❌ BAD: Multiple behaviors in one test
it('creates crawl job and updates status and sends email', ...);
```

### 6. **Test Name Describes Behavior in Plain Language**

```typescript
// ✅ GOOD: Describes behavior
it('creates crawl job when business status is pending', ...)
it('returns 403 when user lacks permission', ...)
it('propagates error message to crawl job', ...)

// ❌ BAD: Describes implementation
it('calls createCrawlJob function', ...)
it('sets errorMessage property', ...)
it('returns true', ...)
```

### 7. **Uses Dynamic Imports for Code Under Test**

```typescript
// ✅ GOOD: Dynamic import (allows test to exist before implementation)
const { functionUnderTest } = await import('../module');
const result = await functionUnderTest(input);

// ❌ BAD: Static import (requires implementation to exist)
import { functionUnderTest } from '../module';
```

**Why**: In RED phase, the implementation doesn't exist yet. Dynamic imports allow the test to be written first.

---

## 🔍 Validation Checklist for RED Phase Tests

When writing a RED phase test, verify:

- [ ] **Test is written FIRST** (before implementation code)
- [ ] **File has specification header** (describes feature, acceptance criteria)
- [ ] **Test describes behavior** (what should happen, not how)
- [ ] **Test uses AAA pattern** (Arrange-Act-Assert)
- [ ] **Test name is descriptive** (plain language, describes behavior)
- [ ] **Test mocks external dependencies** (not internal functions)
- [ ] **Test uses test factories** (not manual object creation)
- [ ] **Test has one behavior** (single responsibility)
- [ ] **Test uses dynamic imports** (allows test-first development)
- [ ] **Test will fail when first written** (expected in RED phase)
- [ ] **Test failure message is clear** (indicates what needs to be implemented)

---

## 🎯 RED Phase Test Quality Indicators

### ✅ Good RED Phase Test

```typescript
/**
 * SPECIFICATION: Error Message Propagation
 * 
 * When crawl execution fails:
 * - Error message should be stored in crawl job
 * - Crawl job status should be 'error'
 * - Business status should be 'error'
 */
it('propagates error message to crawl job when crawl fails', async () => {
  // Arrange
  const business = BusinessTestFactory.create();
  vi.spyOn(crawler, 'crawl').mockRejectedValue(new Error('Network timeout'));
  
  // Act
  const { executeCrawlJob } = await import('../business-execution');
  await executeCrawlJob(business.id);
  
  // Assert
  const crawlJob = await getCrawlJob(business.id);
  expect(crawlJob.status).toBe('error');
  expect(crawlJob.errorMessage).toContain('Network timeout');
});
```

**Why it's good**:
- ✅ Clear specification comment
- ✅ Tests behavior (error propagation), not implementation
- ✅ Uses AAA pattern
- ✅ Descriptive test name
- ✅ Will fail in RED phase (expected)
- ✅ Clear failure message will guide implementation

### ❌ Bad RED Phase Test

```typescript
it('test business execution', async () => {
  const business = { id: 1, name: 'Test' };
  await executeBusinessFlow(business.id);
  expect(createCrawlJob).toHaveBeenCalled();
});
```

**Why it's bad**:
- ❌ No specification documentation
- ❌ Vague test name ("test business execution")
- ❌ Tests implementation (calls function), not behavior
- ❌ Manual object creation (not using factory)
- ❌ No clear behavior definition

---

## 📚 Reference: Existing Patterns in Codebase

### Pattern 1: Service Test Structure

See: `lib/services/__tests__/automation-service.tdd.test.ts`

```23:50:lib/services/__tests__/automation-service.tdd.test.ts
describe('🔴 RED: Automation Service Specification', () => {
  /**
   * SPECIFICATION 1: Get Automation Config
   * 
   * Given: Team with subscription tier
   * When: Getting automation config
   * Then: Returns correct config for tier
   */
  it('returns correct automation config per tier', async () => {
    // Arrange: Team with Free tier
    const freeTeam = { planName: 'free' };
    const proTeam = { planName: 'pro' };

    // Act: Get automation config (TEST DRIVES IMPLEMENTATION)
    const { getAutomationConfig } = await import('../automation-service');
    const freeConfig = getAutomationConfig(freeTeam);
    const proConfig = getAutomationConfig(proTeam);

    // Assert: Verify tier-based config (behavior: correct config per tier)
    expect(freeConfig).toMatchObject({
      crawlFrequency: 'manual',
      autoPublish: false,
    });
    expect(proConfig).toMatchObject({
      crawlFrequency: 'monthly',
      autoPublish: true,
    });
  });
```

### Pattern 2: DTO Test Structure

See: `lib/data/__tests__/activity-dto.tdd.test.ts`

```36:71:lib/data/__tests__/activity-dto.tdd.test.ts
describe('🔴 RED: Activity DTO Specification', () => {
  /**
   * SPECIFICATION 1: Transform Crawl Jobs to Activity Items
   * 
   * Given: Crawl jobs from database
   * When: Activity DTO transforms them
   * Then: Activities have correct structure and type
   */
  it('transforms crawl jobs to activity items', async () => {
    // Arrange: Crawl job data
    const crawlJob = CrawlJobTestFactory.create({
      id: 1,
      businessId: 123,
      status: 'completed',
      progress: 100,
      createdAt: new Date('2025-01-15T10:00:00Z'),
    });

    const business = BusinessTestFactory.create({ id: 123, name: 'Example Business' });

    // Act: Transform to activity (TEST DRIVES IMPLEMENTATION)
    // GREEN PHASE: Implementation exists - test verifies behavior
    const activityDTO = await import('../activity-dto');
    const activity = await activityDTO.toActivityDTO(crawlJob, business);

    // Assert: Verify activity structure (behavior: correct activity format)
    expect(activity).toMatchObject({
      id: 'crawl-1',
      type: 'crawl',
      businessId: '123',
      businessName: 'Example Business',
      status: 'completed',
      timestamp: expect.any(String),
      message: expect.stringContaining('Example Business'),
    });
  });
```

---

## 🚀 How AI Agents Should Write RED Phase Tests

### Step 1: Understand the Requirement

Before writing a test, understand:
- **What feature** needs to be implemented?
- **Who** is the user/stakeholder?
- **What value** does it provide?
- **What are the acceptance criteria?**

### Step 2: Write Specification Header

Document the specification:
- Feature description
- User story format (As a... I want... So that...)
- Acceptance criteria list
- TDD cycle note

### Step 3: Structure the Test

1. **Describe block**: `describe('🔴 RED: [Feature] Specification', ...)`
2. **Specification comment**: Given-When-Then format
3. **Test name**: Behavior description in plain language
4. **AAA pattern**: Arrange → Act → Assert
5. **Dynamic imports**: Allow test-first development
6. **Behavior assertions**: Test what, not how

### Step 4: Verify Test Will Fail

The test should:
- ✅ Fail when first written (expected in RED phase)
- ✅ Have a clear failure message
- ✅ Indicate what needs to be implemented
- ✅ Not require implementation to exist

### Step 5: Validate Against Checklist

Use the validation checklist above to ensure the test is correctly structured.

---

## 📖 Related Documentation

- [TDD Strategy Guide](./TDD_STRATEGY.md) - Comprehensive TDD methodology
- [TDD Specification Guide](./TDD_SPECIFICATION_GUIDE.md) - Writing tests as specifications
- [TDD Quick Start](./TDD_QUICK_START.md) - Quick reference
- [TDD Red Phase Fixes](./TDD_RED_PHASE_FIXES.md) - Examples of RED phase implementations

---

## 🎓 Key Takeaways

1. **Tests ARE specifications** - They define what the system should do
2. **Write tests FIRST** - Before any implementation code
3. **Test behavior, not implementation** - Define WHAT, not HOW
4. **Use AAA pattern** - Arrange → Act → Assert
5. **Mock external dependencies** - Not internal functions
6. **One behavior per test** - Single responsibility principle
7. **Dynamic imports** - Allow test-first development
8. **Clear failure messages** - Guide implementation

---

**Remember**: A correctly structured RED phase test is an executable specification that drives implementation. If the test doesn't clearly define what should happen, the implementation will be unclear too.




