# Scheduler Service Test Suite

Comprehensive test suite for the refactored scheduler service, following SOLID and DRY principles.

## Overview

The test suite covers:
- **Unit Tests**: Individual function testing with mocked dependencies
- **Integration Tests**: Full CFP pipeline testing with real database
- **Endpoint Tests**: Cron endpoint behavior testing

## Test Files

### Unit Tests
- `lib/services/__tests__/scheduler-service.unit.test.ts`
  - Tests `handleAutoPublish()` in isolation
  - Tests `processScheduledAutomation()` with mocked dependencies
  - Tests error handling and edge cases

### Integration Tests
- `lib/services/__tests__/scheduler-service.integration.test.ts`
  - Tests full CFP pipeline (crawl → fingerprint → publish)
  - Uses real database, mocks only external APIs
  - Tests frequency-aware processing
  - Tests error handling with real data

### Test Helpers
- `lib/services/__tests__/scheduler-test-helpers.ts`
  - `MockBusinessFactory` - Generate test business objects
  - `MockTeamFactory` - Generate test team objects
  - `MockPublishDataFactory` - Generate mock publish DTOs

### Endpoint Tests
- `app/api/cron/weekly-crawls/__tests__/route.test.ts`
  - Tests unified cron endpoint
  - Tests authentication and authorization
  - Tests error handling

- `app/api/cron/monthly/__tests__/route.test.ts`
  - Tests deprecated monthly endpoint (backward compatibility)
  - Tests unified processing integration

## SOLID Principles Applied

### Single Responsibility
- Each test file has a single responsibility:
  - Unit tests: Test individual functions
  - Integration tests: Test component integration
  - Endpoint tests: Test API behavior

- Each test case focuses on one scenario:
  ```typescript
  it('should publish successfully when conditions are met', async () => {
    // Tests only the success path
  });
  ```

### Open/Closed Principle
- Tests are extensible through factories and helpers
- New test cases can be added without modifying existing ones

### Dependency Inversion
- Unit tests mock dependencies at module level
- Integration tests use real dependencies where appropriate
- External APIs are always mocked

## DRY Principles Applied

### Test Factories
Centralized factories eliminate duplication:

```typescript
// Instead of creating business objects in every test:
const business = MockBusinessFactory.createCrawled({
  name: 'Test Business',
  status: 'crawled',
});

// Instead of creating teams in every test:
const team = MockTeamFactory.createPro();
```

### Reusable Mocks
Mocks are defined once and reused:

```typescript
// Mock at module level
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  // ...
}));
```

### Test Helpers
Common test patterns are extracted:

```typescript
// Reused across multiple tests
const { TestUserFactory, TestBusinessFactory } = await import('@/tests/utils/test-helpers');
```

## Running Tests

```bash
# Run all scheduler tests
pnpm test lib/services/__tests__/scheduler-service

# Run unit tests only
pnpm test scheduler-service.unit

# Run integration tests only
pnpm test scheduler-service.integration

# Run endpoint tests
pnpm test app/api/cron/weekly-crawls/__tests__
pnpm test app/api/cron/monthly/__tests__

# Run with coverage
pnpm test:coverage lib/services/__tests__/scheduler-service
```

## Test Coverage

### Unit Tests Cover:
- ✅ `handleAutoPublish()` success cases
- ✅ `handleAutoPublish()` error cases
- ✅ `handleAutoPublish()` notability checks
- ✅ `processScheduledAutomation()` batch processing
- ✅ `processScheduledAutomation()` frequency filtering
- ✅ Error handling and graceful degradation

### Integration Tests Cover:
- ✅ Full CFP pipeline (crawl + fingerprint + publish)
- ✅ Frequency-aware processing (monthly/weekly/daily)
- ✅ Missed schedule recovery
- ✅ Tier-based automation (Free/Pro/Agency)
- ✅ Error handling with real database
- ✅ Business status transitions

### Endpoint Tests Cover:
- ✅ Authentication and authorization
- ✅ Successful processing
- ✅ Error handling
- ✅ Response format

## Mocking Strategy

### Unit Tests
- **All dependencies mocked** at module level
- Fast execution, no external calls
- Tests focus on function logic

### Integration Tests
- **Only external APIs mocked** (Firecrawl, OpenRouter, Wikidata)
- **Real database** used for data persistence
- Tests real integration between components

### External APIs Mocked
- Firecrawl API (web crawling)
- OpenRouter API (LLM fingerprinting)
- Wikidata Publisher (entity publishing)

## Writing New Tests

### Example: Unit Test

```typescript
describe('newFunction', () => {
  it('should do something', async () => {
    // Arrange
    const business = MockBusinessFactory.create();
    const team = MockTeamFactory.createPro();
    
    // Act
    const result = await newFunction(business, team);
    
    // Assert
    expect(result).toEqual(expected);
  });
});
```

### Example: Integration Test

```typescript
describe('Integration: New Feature', () => {
  let testUser: { user: { id: number }; team: Team };
  let testBusiness: Business;

  beforeAll(async () => {
    testUser = await TestUserFactory.createUserWithTeam();
    testBusiness = await TestBusinessFactory.createBusiness(testUser.team.id);
  });

  afterAll(async () => {
    await DatabaseCleanup.cleanupBusiness(testBusiness.id);
    await DatabaseCleanup.cleanupUser(testUser.user.id);
  });

  it('should process through full pipeline', async () => {
    const result = await processScheduledAutomation();
    
    const updated = await db.select()
      .from(businesses)
      .where(eq(businesses.id, testBusiness.id));
    
    expect(updated[0].status).toBe('published');
  });
});
```

## Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should do something', async () => {
     // Arrange: Set up test data
     const business = MockBusinessFactory.create();
     
     // Act: Execute the function
     const result = await processBusiness(business);
     
     // Assert: Verify the result
     expect(result).toBe(expected);
   });
   ```

2. **Descriptive Test Names**
   - Use clear, descriptive names
   - Include what is being tested and expected outcome
   - Example: `should skip publish when notability check fails`

3. **Isolation**
   - Each test is independent
   - Use `beforeEach` to reset mocks
   - Use `afterAll` to cleanup test data

4. **Error Testing**
   - Test both success and failure paths
   - Verify error messages and status codes
   - Test graceful degradation

## Related Documentation

- [Scheduler Refactoring](../development/SCHEDULER_REFACTORING.md)
- [Testing Setup](../testing/TESTING_SETUP.md)
- [Test Helpers](../../tests/utils/test-helpers.ts)



