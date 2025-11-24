# Test-Driven Development (TDD) Strategy

**Purpose**: Guide for implementing TDD with Vitest to achieve production-ready status  
**Date**: January 2025  
**Framework**: Vitest  
**Status**: 🟢 Active Implementation

---

## 📚 TDD Principles

Following the [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development) methodology:

### 🎯 **Core TDD Philosophy: Tests ARE the Specification**

**Critical Principle**: Tests are written FIRST as executable specifications that define the desired behavior. The codebase is then developed to satisfy these specifications.

```
┌─────────────────────────────────────────────────┐
│ 1. Write Test (Specification) → Defines Behavior │
│ 2. Test Fails (RED) → Expected, no code exists   │
│ 3. Write Minimal Code → Satisfy Specification    │
│ 4. Test Passes (GREEN) → Specification Met       │
│ 5. Refactor → Improve while keeping spec valid   │
└─────────────────────────────────────────────────┘
```

### The Red-Green-Refactor Cycle

```
1. 🔴 RED:   Write a failing test FIRST (this is the specification)
2. 🟢 GREEN: Write minimal code to satisfy the specification
3. 🔵 REFACTOR: Improve code while keeping specification valid
```

### Core TDD Rules

1. **Tests ARE the specification** - Write tests first to define behavior
2. **Write tests before code** - Tests drive development, not the reverse
3. **One failing test at a time** - Focus on one behavior specification
4. **Minimal implementation** - Only write code to satisfy the specification
5. **Refactor immediately** - Improve code while keeping specs valid
6. **Test behavior, not implementation** - Specifications define WHAT, not HOW

---

## 🎯 Current State Analysis

### ✅ What's Already Tested

- **Unit Tests**: 100+ test files exist
- **Integration Tests**: Business flows, CFP orchestrator, API routes
- **E2E Tests**: Publishing flow, subscription flows (some failing)
- **Test Infrastructure**: Vitest configured, coverage reporting

### ❌ Critical Gaps for Production Readiness

Based on analysis, these areas need TDD coverage:

#### 1. **Business Execution Service** (P0 - Critical)
- **Status**: Partially tested, critical bugs exist
- **Issues**: Crawl job creation failing, error propagation
- **Location**: `lib/services/business-execution.ts`
- **Priority**: 🔴 HIGH - Blocking production

#### 2. **Error Handling & Recovery** (P0 - Critical)
- **Status**: Basic coverage, needs comprehensive TDD
- **Issues**: Silent failures, missing error messages
- **Location**: `lib/utils/error-handling.ts`, service error handlers
- **Priority**: 🔴 HIGH - User experience critical

#### 3. **Data Validation Layer** (P1 - High)
- **Status**: Some tests exist, needs TDD approach
- **Issues**: Edge cases not covered
- **Location**: `lib/validation/`, DTO validation
- **Priority**: 🟡 MEDIUM - Data integrity

#### 4. **API Route Contracts** (P1 - High)
- **Status**: Partial coverage
- **Issues**: Missing error scenarios, edge cases
- **Location**: `app/api/**/route.ts`
- **Priority**: 🟡 MEDIUM - API reliability

#### 5. **Database Transactions** (P1 - High)
- **Status**: Limited test coverage
- **Issues**: Rollback scenarios, concurrent access
- **Location**: `lib/db/queries.ts`, transaction handlers
- **Priority**: 🟡 MEDIUM - Data consistency

---

## 🚀 TDD Implementation Strategy

### 📋 **Writing Tests as Specifications**

When writing tests first, think of them as **executable specifications**:

```typescript
/**
 * SPECIFICATION: Business Execution Service
 * 
 * As a system administrator
 * I want crawl jobs to be created automatically
 * So that businesses can be processed without manual intervention
 * 
 * Acceptance Criteria:
 * - When a business status is 'pending', a crawl job should be created
 * - The crawl job should have status 'pending'
 * - The crawl job should be linked to the business
 */
describe('BusinessExecutionService - Specification', () => {
  it('creates crawl job when business status is pending', async () => {
    // SPECIFICATION: Given a business with status 'pending'
    const business = createTestBusiness({ status: 'pending' });
    
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

**Key Point**: The test above IS the specification. The implementation must satisfy it.

### Phase 1: Critical Path TDD (Week 1-2)

**Goal**: Fix blocking issues using TDD (Tests as Specifications)

#### Step 1: Business Execution Service

**TDD Workflow (Specification-First)**:

```typescript
/**
 * STEP 1: RED - Write Specification (Test)
 * This test DEFINES what the system should do
 */
describe('BusinessExecutionService - Specification', () => {
  it('creates crawl job when business status is pending', async () => {
    // SPECIFICATION: Given a pending business
    const business = createTestBusiness({ status: 'pending' });
    
    // SPECIFICATION: When execution is triggered
    await executeBusinessFlow(business.id);
    
    // SPECIFICATION: Then crawl job should be created
    const crawlJob = await getCrawlJob(business.id);
    expect(crawlJob).toBeDefined();
    expect(crawlJob.status).toBe('pending');
  });
});

/**
 * STEP 2: GREEN - Implement to satisfy specification
 * Write minimal code to make the test pass
 */

/**
 * STEP 3: REFACTOR - Improve while keeping specification valid
 * Refactor code, tests should still pass
 */
```

**Test Cases to Write First**:
1. ✅ Crawl job creation succeeds
2. ✅ Error messages propagate correctly
3. ✅ Status transitions work correctly
4. ✅ Transaction rollback on errors
5. ✅ Concurrent execution handling

#### Step 2: Error Handling

**TDD Workflow**:

```typescript
// 1. RED: Write failing test
describe('Error Handling', () => {
  it('propagates error messages to crawl job', async () => {
    // Arrange
    const business = createTestBusiness();
    vi.spyOn(crawler, 'crawl').mockRejectedValue(new Error('Crawl failed'));
    
    // Act
    await executeCrawlJob(business.id);
    
    // Assert
    const job = await getCrawlJob(business.id);
    expect(job.errorMessage).toBe('Crawl failed');
    expect(job.status).toBe('error');
  });
});
```

### Phase 2: Comprehensive Coverage (Week 3-4)

**Goal**: Achieve 80%+ test coverage on critical paths

#### Test Categories

1. **Unit Tests** (Fast, isolated)
   - Individual functions
   - Pure logic
   - Data transformations

2. **Integration Tests** (Medium speed, real dependencies)
   - Service interactions
   - Database operations
   - API route behavior

3. **E2E Tests** (Slow, full stack)
   - User workflows
   - Complete business flows
   - Cross-feature integration

---

## 📝 TDD Best Practices

### 0. **Tests ARE Specifications** (Most Important)

**Before writing any code:**
1. Write the test first (this is your specification)
2. The test defines WHAT should happen
3. Implementation satisfies the specification
4. Tests serve as executable documentation

**Example:**
```typescript
// ✅ GOOD: Test as specification
it('creates crawl job when business status is pending', async () => {
  // This test DEFINES the behavior
  // Implementation must satisfy this specification
});

// ❌ BAD: Test after code
// (Code written first, then test written to verify)
```

### 1. Test Structure (AAA Pattern)

```typescript
describe('FeatureName', () => {
  it('should do something specific', async () => {
    // Arrange: Set up test data and mocks
    const input = createTestData();
    vi.spyOn(dependency, 'method').mockResolvedValue(mockResult);
    
    // Act: Execute the code under test
    const result = await functionUnderTest(input);
    
    // Assert: Verify the outcome
    expect(result).toEqual(expectedOutput);
  });
});
```

### 2. Test Naming Convention

```typescript
// ✅ Good: Describes behavior
it('creates crawl job when business status is pending', ...)
it('returns 403 when user lacks permission', ...)
it('propagates error message to crawl job', ...)

// ❌ Bad: Describes implementation
it('calls createCrawlJob function', ...)
it('sets errorMessage property', ...)
```

### 3. Mock Strategy

```typescript
// ✅ Good: Mock at module level
vi.mock('@/lib/crawler/firecrawl', () => ({
  crawl: vi.fn(),
}));

// ✅ Good: Mock external APIs
vi.mock('@/lib/wikidata/client', () => ({
  publishEntity: vi.fn(),
}));

// ❌ Bad: Mock internal functions
vi.spyOn(module, 'internalHelper'); // Don't test implementation
```

### 4. DRY Principles in Tests

```typescript
// ✅ Good: Shared test helpers
const createTestBusiness = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Business',
  status: 'pending',
  ...overrides,
});

// ✅ Good: Table-driven tests
it.each([
  { status: 'pending', expected: 'crawling' },
  { status: 'crawled', expected: 'fingerprinting' },
])('transitions from $status to $expected', ({ status, expected }) => {
  // Test implementation
});
```

### 5. SOLID Principles in Tests

```typescript
// ✅ Single Responsibility: One test, one behavior
it('creates crawl job', ...);
it('updates business status', ...);

// ❌ Bad: Multiple behaviors in one test
it('creates crawl job and updates status and sends email', ...);
```

---

## 🔧 Vitest TDD Workflow

### 🚀 Starting Your TDD Session

**First Step**: Start Vitest in watch mode (essential for TDD)

```bash
# Start watch mode (recommended for TDD)
pnpm tdd

# Or use the full command
pnpm test:watch
```

**What happens:**
- Vitest watches for file changes
- Automatically re-runs tests when you save
- Perfect for RED → GREEN → REFACTOR cycle
- Shows real-time test results

### Daily TDD Cycle

```bash
# 1. Start watch mode (keep this running)
pnpm tdd

# 2. Write failing test (RED) → Save → Test fails ✅
# 3. Write minimal code (GREEN) → Save → Test passes ✅
# 4. Refactor → Save → Test still passes ✅
# 5. Repeat for next feature
```

### Running Tests

```bash
# Watch mode (development) - USE THIS FOR TDD
pnpm tdd
pnpm test:watch

# Single run (CI/verification)
pnpm test:run
pnpm tdd:run

# Specific file
pnpm test lib/services/__tests__/business-execution.test.ts

# With coverage
pnpm test:coverage
pnpm tdd:coverage

# Specific pattern
pnpm test --grep "crawl job"

# Visual UI (browser-based)
pnpm test:ui
```

### Watch Mode Interactive Commands

When `pnpm tdd` is running, you can press:
- `a` - Run all tests
- `f` - Run only failed tests
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern
- `q` - Quit watch mode
- `r` - Rerun tests
- `u` - Update snapshots

### Using TDD Workflow Script

```bash
# Automated TDD workflow helper
./scripts/tdd-workflow.sh lib/services/__tests__/my-feature.test.ts
```

**See**: `docs/development/TDD_GETTING_STARTED.md` for complete guide

### Test Organization

```
lib/
  services/
    business-execution.ts          # Production code
    __tests__/
      business-execution.test.ts   # Unit tests
      business-execution.integration.test.ts  # Integration tests

app/
  api/
    business/
      [id]/
        process/
          route.ts                 # Production code
          __tests__/
            route.test.ts          # API route tests
```

---

## 📊 Production Readiness Checklist

### Critical Path Coverage

- [ ] Business execution service (100% coverage)
- [ ] Error handling and propagation (100% coverage)
- [ ] Database transactions (100% coverage)
- [ ] API authentication/authorization (100% coverage)
- [ ] Critical user workflows (E2E coverage)

### Test Quality Metrics

- [ ] **Coverage**: 80%+ on critical paths
- [ ] **Test Speed**: Unit tests < 100ms, Integration < 1s
- [ ] **Test Reliability**: 0% flaky tests
- [ ] **Test Maintainability**: Clear, readable, DRY

### Code Quality Metrics

- [ ] **SOLID Principles**: All code follows SOLID
- [ ] **DRY Principles**: No code duplication
- [ ] **Error Handling**: All errors handled gracefully
- [ ] **Type Safety**: 100% TypeScript coverage

---

## 🎯 TDD Roadmap to Production

### Week 1: Critical Bugs (TDD Fixes)

**Day 1-2**: Business Execution Service
- [ ] Write failing tests for crawl job creation
- [ ] Fix implementation to pass tests
- [ ] Refactor for maintainability

**Day 3-4**: Error Handling
- [ ] Write failing tests for error propagation
- [ ] Fix error handling implementation
- [ ] Add comprehensive error scenarios

**Day 5**: Integration & Validation
- [ ] Run full test suite
- [ ] Fix any regressions
- [ ] Document fixes

### Week 2: Comprehensive Coverage

**Day 1-2**: Data Validation Layer
- [ ] TDD all validation functions
- [ ] Edge case coverage
- [ ] Error scenario coverage

**Day 3-4**: API Route Contracts
- [ ] TDD all API routes
- [ ] Authentication/authorization tests
- [ ] Error response tests

**Day 5**: Database Operations
- [ ] TDD transaction handling
- [ ] Concurrent access tests
- [ ] Rollback scenario tests

### Week 3: E2E & Integration

**Day 1-3**: Critical User Flows
- [ ] TDD complete business creation flow
- [ ] TDD CFP execution flow
- [ ] TDD publishing flow

**Day 4-5**: Cross-Feature Integration
- [ ] TDD subscription upgrade flow
- [ ] TDD permission enforcement
- [ ] TDD status transition flows

### Week 4: Production Hardening

**Day 1-2**: Performance & Reliability
- [ ] Load testing with TDD
- [ ] Concurrent operation tests
- [ ] Timeout and retry tests

**Day 3-4**: Documentation & Review
- [ ] Document all test coverage
- [ ] Review test quality
- [ ] Refactor tests for maintainability

**Day 5**: Production Readiness Review
- [ ] Full test suite pass
- [ ] Coverage metrics review
- [ ] Production deployment checklist

---

## 🛠️ TDD Tools & Utilities

### Test Helpers

```typescript
// lib/test-helpers/index.ts
export const createTestBusiness = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Business',
  status: 'pending',
  ...overrides,
});

export const createTestTeam = (overrides = {}) => ({
  id: 'test-team-id',
  name: 'Test Team',
  planName: 'free',
  ...overrides,
});

export const createMockCrawlData = () => ({
  url: 'https://example.com',
  content: '<html>...</html>',
  metadata: { title: 'Example' },
});
```

### Mock Factories

```typescript
// lib/test-helpers/mocks.ts
export const mockFirecrawlClient = () => ({
  crawl: vi.fn().mockResolvedValue({
    success: true,
    data: createMockCrawlData(),
  }),
});

export const mockWikidataClient = () => ({
  publishEntity: vi.fn().mockResolvedValue({
    success: true,
    qid: 'Q123456',
  }),
});
```

---

## 📈 Success Metrics

### Test Coverage Goals

- **Critical Paths**: 100% coverage
- **Business Logic**: 90%+ coverage
- **API Routes**: 85%+ coverage
- **Utilities**: 80%+ coverage
- **Overall**: 80%+ coverage

### Quality Metrics

- **Test Execution Time**: < 30s for full suite
- **Flaky Test Rate**: 0%
- **Test Maintenance Cost**: Low (DRY, clear structure)
- **Bug Detection Rate**: High (tests catch bugs before production)

---

## 🔄 Continuous Improvement

### Weekly TDD Review

1. **Review Test Coverage**: Identify gaps
2. **Review Test Quality**: Refactor as needed
3. **Review Test Speed**: Optimize slow tests
4. **Review Flaky Tests**: Fix or remove

### Monthly TDD Audit

1. **Coverage Analysis**: Generate coverage reports
2. **Test Quality Audit**: Review test structure
3. **Performance Analysis**: Identify slow tests
4. **Documentation Update**: Keep docs current

---

## 📚 References

- [Test-Driven Development (Wikipedia)](https://en.wikipedia.org/wiki/Test-driven_development)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)

---

## 🎓 TDD Learning Resources

### Key Concepts

1. **Red-Green-Refactor Cycle**: Core TDD workflow
2. **Test First Development**: Write tests before code
3. **Behavior-Driven Testing**: Test what, not how
4. **Mock Strategy**: Mock external dependencies, not internals
5. **Test Isolation**: Each test should be independent

### Common Pitfalls to Avoid

1. ❌ Testing implementation details
2. ❌ Over-mocking internal functions
3. ❌ Writing tests after code
4. ❌ Skipping refactoring step
5. ❌ Writing tests that are too complex

---

**Next Steps**: Start with Phase 1, Week 1 - Business Execution Service TDD fixes

