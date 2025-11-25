# TDD E2E Tests: Platform Stability & Reliability

## Overview

This directory contains end-to-end tests written following **TRUE TDD principles** to ensure stable, reliable platform operation. All tests are written FIRST to specify behavior, then implementation follows.

**Status**: 🔴 **RED** - Tests are failing as expected (this is correct for TDD!)

## Test Files Created

### 1. Critical Platform Stability (`critical-platform-stability.tdd.spec.ts`)

**10 comprehensive E2E tests** specifying critical platform behaviors:

1. ✅ Complete CFP flow executes automatically end-to-end
2. ✅ Dashboard updates in real-time during processing
3. ✅ Errors are handled gracefully with user-friendly messages
4. ✅ Data persists correctly through page refreshes and navigation
5. ✅ **PASSING**: Unauthenticated users cannot access protected routes
6. ✅ Free tier users cannot access Pro-tier features
7. ✅ Concurrent operations complete without data corruption
8. ✅ API routes return data in correct DTO format
9. ✅ Loading states are displayed during async operations
10. ✅ Complete data flow works through all layers

### 2. API Route Reliability (`api-route-reliability.tdd.spec.ts`)

**4 tests** specifying API route behavior:

1. ✅ Dashboard API returns correct DTO structure
2. ✅ Business API returns BusinessDetailDTO
3. ✅ API routes handle invalid inputs gracefully
4. ✅ API routes enforce authentication correctly

### 3. Data Consistency Reliability (`data-consistency-reliability.tdd.spec.ts`)

**4 tests** specifying data consistency:

1. ✅ Business status updates are atomic and consistent
2. ✅ Fingerprint data persists correctly across page loads
3. ✅ Wikidata QID persists after publishing
4. ✅ Business limit is enforced correctly

## TDD Process Status

### ✅ RED Phase (Current)

**Tests are failing** - This is correct and expected!

**Why tests fail**:
1. Auth helper needs tier support implementation
2. Real-time updates may not work correctly
3. Error handling may need improvement
4. Data persistence issues may exist
5. Some API routes may not return correct DTOs

**This is TDD working correctly** - Tests specify what SHOULD happen, implementation will make them pass.

### 🔄 Next: GREEN Phase

For each failing test:
1. Identify what's missing
2. Implement minimal code to make test pass
3. Verify test passes
4. Move to next test

### 🔄 Then: REFACTOR Phase

Once all tests pass:
1. Improve code quality
2. Optimize performance
3. Add error handling
4. Ensure tests still pass

## Running Tests

```bash
# Run all TDD E2E tests
pnpm test:e2e critical-platform-stability.tdd.spec.ts
pnpm test:e2e api-route-reliability.tdd.spec.ts
pnpm test:e2e data-consistency-reliability.tdd.spec.ts

# Run in UI mode for debugging
pnpm test:e2e:ui critical-platform-stability

# Run specific test
pnpm test:e2e -g "complete CFP flow"
```

## Current Test Results

**Status**: 🔴 9 failing, 1 passing (10 total)

- ✅ 1 test passing: Authentication enforcement works
- ❌ 9 tests failing: Behavior needs implementation

**This is expected for TRUE TDD!**

## Test Specifications

Each test specifies:
1. **Given** - Initial state
2. **When** - Action taken
3. **Then** - Expected behavior (assertions)

Tests drive implementation, not verify existing code.

## Implementation Priority

Based on test failures, prioritize:

1. **Auth Helper Tier Support** - Fix tier creation for tests
2. **Real-Time Updates** - Implement polling/updates
3. **Error Handling** - User-friendly error messages
4. **Data Persistence** - Ensure data persists correctly
5. **API DTOs** - Ensure routes return correct DTOs

## Notes

- Tests use Playwright for browser automation
- Mocking is used for external APIs (configured in playwright.config.ts)
- Tests run sequentially to avoid database conflicts
- Clean up test data after each test

## References

- **TDD Process**: `docs/development/TRUE_TDD_PROCESS.md`
- **Test Plan**: `tests/e2e/TDD_E2E_TEST_PLAN.md`
- **E2E README**: `tests/e2e/README.md`

