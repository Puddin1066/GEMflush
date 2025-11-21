# Scheduler Service Tests

Comprehensive test suite for the scheduler service following SOLID and DRY principles.

## Test Structure

### Unit Tests (`scheduler-service.unit.test.ts`)
Tests individual functions in isolation with mocked dependencies:
- `handleAutoPublish()` - Auto-publishing logic
- `processScheduledAutomation()` - Unified scheduling logic
- Error handling and edge cases

**Principles:**
- **SOLID**: Each test focuses on a single responsibility
- **DRY**: Reuses test helpers and mocks
- **Isolation**: Mocks all dependencies at module level

### Integration Tests (`scheduler-service.integration.test.ts`)
Tests the full CFP pipeline with real database:
- Full automation flow (crawl → fingerprint → publish)
- Frequency-aware processing
- Error handling with real database
- Batch processing

**Principles:**
- **SOLID**: Tests integration between components
- **DRY**: Reuses test factories and helpers
- **Real Data**: Uses real database, only mocks external APIs

### Test Helpers (`scheduler-test-helpers.ts`)
Centralized test utilities:
- `MockBusinessFactory` - Generate test business objects
- `MockTeamFactory` - Generate test team objects
- `MockPublishDataFactory` - Generate mock publish DTOs

**Principles:**
- **DRY**: Single source of truth for test data
- **SOLID**: Each factory has single responsibility

## Running Tests

```bash
# Run all scheduler tests
pnpm test lib/services/__tests__/scheduler-service

# Run unit tests only
pnpm test scheduler-service.unit

# Run integration tests only
pnpm test scheduler-service.integration

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

## Mocking Strategy

### Unit Tests
- **All dependencies mocked** at module level
- Tests focus on function logic, not dependencies
- Fast execution, no external calls

### Integration Tests
- **Only external APIs mocked** (Firecrawl, OpenRouter, Wikidata)
- **Real database** used for data persistence
- Tests real integration between components

## Writing New Tests

### Example: Testing a New Function

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

### Example: Testing Integration

```typescript
describe('Integration: New Feature', () => {
  it('should process through full pipeline', async () => {
    // Create real test data
    const testUser = await TestUserFactory.createUserWithTeam();
    const business = await TestBusinessFactory.createBusiness(testUser.team.id);
    
    // Test integration
    const result = await processScheduledAutomation();
    
    // Verify with real database
    const updated = await db.select().from(businesses).where(eq(businesses.id, business.id));
    expect(updated[0].status).toBe('published');
    
    // Cleanup
    await DatabaseCleanup.cleanupBusiness(business.id);
  });
});
```

## Best Practices

1. **SOLID Principles:**
   - Each test has single responsibility
   - Tests are independent and isolated
   - Mock dependencies, not implementation

2. **DRY Principles:**
   - Use test factories for data creation
   - Reuse test helpers and utilities
   - Centralize common test patterns

3. **Test Organization:**
   - Group related tests in `describe` blocks
   - Use descriptive test names
   - Follow Arrange-Act-Assert pattern

4. **Error Handling:**
   - Test both success and failure paths
   - Verify error messages and status codes
   - Test graceful degradation

## Related Files

- `lib/services/scheduler-service.ts` - Implementation
- `lib/services/automation-service.ts` - Automation configuration
- `app/api/cron/weekly-crawls/route.ts` - Cron endpoint
- `app/api/cron/monthly/route.ts` - Monthly endpoint (deprecated)


