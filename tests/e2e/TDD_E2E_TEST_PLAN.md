# TDD E2E Test Plan: Platform Stability & Reliability

## Purpose

This document outlines end-to-end tests written following **TRUE TDD principles** to ensure stable, reliable platform operation. All tests are written FIRST to specify behavior, then implementation follows to satisfy the tests.

## Test Philosophy

Following `docs/development/TRUE_TDD_PROCESS.md`:

1. **Tests FIRST** - Write failing tests that specify desired behavior
2. **RED** - Tests fail initially (this is correct)
3. **GREEN** - Implement minimal code to make tests pass
4. **REFACTOR** - Improve code while keeping tests green

## Critical Test Categories

### 1. Platform Stability Tests (`critical-platform-stability.tdd.spec.ts`)

**Purpose**: Ensure core platform operations work reliably end-to-end

**Tests**:
- ✅ Complete CFP flow executes automatically end-to-end
- ✅ Dashboard updates in real-time during processing
- ✅ Errors are handled gracefully with user-friendly messages
- ✅ Data persists correctly through page refreshes and navigation
- ✅ Authentication/authorization prevents unauthorized access
- ✅ Tier restrictions are enforced correctly
- ✅ Concurrent operations don't corrupt data
- ✅ API routes return correct DTOs consistently
- ✅ Loading states are displayed during async operations
- ✅ Complete data flow works through all layers

**Status**: 🔴 Written - Implementation needed to pass

### 2. API Route Reliability Tests (`api-route-reliability.tdd.spec.ts`)

**Purpose**: Ensure API routes are reliable and return consistent DTOs

**Tests**:
- ✅ Dashboard API returns correct DTO structure
- ✅ Business API returns BusinessDetailDTO
- ✅ API routes handle invalid inputs gracefully
- ✅ API routes enforce authentication correctly

**Status**: 🔴 Written - Implementation needed to pass

### 3. Data Consistency Tests (`data-consistency-reliability.tdd.spec.ts`)

**Purpose**: Ensure data remains consistent across all operations

**Tests**:
- ✅ Business status updates are atomic and consistent
- ✅ Fingerprint data persists correctly across page loads
- ✅ Wikidata QID persists after publishing
- ✅ Business limit is enforced correctly

**Status**: 🔴 Written - Implementation needed to pass

## Running Tests

```bash
# Run all TDD E2E tests
pnpm test:e2e critical-platform-stability.tdd.spec.ts
pnpm test:e2e api-route-reliability.tdd.spec.ts
pnpm test:e2e data-consistency-reliability.tdd.spec.ts

# Run in UI mode for debugging
pnpm test:e2e:ui critical-platform-stability

# Run in headed mode (see browser)
pnpm test:e2e:headed critical-platform-stability
```

## Test Implementation Strategy

### Phase 1: Make Tests Fail (RED)

Current status: Tests are written and will fail because:
1. Auth helper may not support tier creation
2. Some API routes may not return correct DTO structure
3. Real-time updates may not work correctly
4. Error handling may not be user-friendly
5. Data persistence may have issues

**This is expected and correct for TDD!**

### Phase 2: Implement to Pass (GREEN)

For each failing test:
1. Identify what's missing
2. Implement minimal code to make test pass
3. Verify test passes
4. Move to next test

### Phase 3: Refactor (Keep Tests Green)

Once all tests pass:
1. Improve code quality
2. Optimize performance
3. Add error handling
4. Ensure tests still pass

## Critical Behaviors Specified

### 1. Complete CFP Flow Reliability

**Specification**: When a Pro user creates a business with URL, the complete CFP flow (Crawl → Fingerprint → Publish) must execute automatically without manual intervention.

**Test**: `complete CFP flow executes automatically end-to-end`

**Expected Behavior**:
- Business creation triggers automatic crawl
- Crawl completion triggers automatic fingerprint
- Fingerprint completion triggers automatic publish (Pro tier)
- Status progresses: pending → crawling → crawled → generating → published
- All dashboard cards populate with data

### 2. Real-Time Updates

**Specification**: Dashboard must update in real-time during processing without manual refresh.

**Test**: `dashboard updates in real-time during processing`

**Expected Behavior**:
- Status changes are reflected automatically
- Polling updates UI every 5 seconds (configurable)
- No manual refresh needed
- Loading indicators shown during updates

### 3. Error Handling

**Specification**: All errors must be displayed user-friendly with retry options.

**Test**: `errors are handled gracefully with user-friendly messages`

**Expected Behavior**:
- Error messages are user-friendly (not technical)
- Retry buttons are available
- Back navigation is available
- Error states don't break UI

### 4. Data Persistence

**Specification**: All data must persist correctly through page refreshes and navigation.

**Test**: `data persists correctly through page refreshes and navigation`

**Expected Behavior**:
- Business data persists after refresh
- Fingerprint data persists after refresh
- Wikidata QID persists after refresh
- Status is consistent across page loads

### 5. Authentication/Authorization

**Specification**: Unauthenticated users cannot access protected routes.

**Test**: `unauthenticated users cannot access protected routes`

**Expected Behavior**:
- Redirects to sign-in page
- API routes return 401 Unauthorized
- Middleware enforces authentication

### 6. Tier Restrictions

**Specification**: Free tier users cannot access Pro-tier features.

**Test**: `free tier users cannot access Pro-tier features`

**Expected Behavior**:
- Upgrade prompts shown
- Feature gates prevent access
- API routes enforce tier restrictions

## Next Steps

1. **Run tests** - See what fails (RED phase)
2. **Implement** - Make minimal changes to pass (GREEN phase)
3. **Refactor** - Improve while keeping tests green
4. **Add more tests** - Specify additional behaviors as needed

## Notes

- Tests use Playwright for browser automation
- Mocking is used for external APIs (OpenRouter, Wikidata, Firecrawl)
- Tests run sequentially to avoid database conflicts
- Test database should be used for isolation
- Clean up test data after each test

