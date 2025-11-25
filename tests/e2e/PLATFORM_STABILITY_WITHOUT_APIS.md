# Platform Stability Testing Without External APIs

## Overview

This guide explains how to verify platform stability and completeness **without external API connections**. This is critical for:
- Fast, reliable tests
- Cost savings (no paid API calls)
- Deterministic test results
- Testing platform logic, not external services

## Problem: LLM Responses Appear Incorrect

**Issue**: When running tests, you may see:
- OpenRouter API 403 errors (key limit exceeded)
- LLM responses that don't match expected format
- Tests failing due to external API dependencies

**Root Cause**: The platform is making real API calls instead of using mocks.

## Solution: Ensure All External Services Are Mocked

### 1. Automatic Mocking (Recommended)

The test setup now automatically mocks all external services:

```typescript
// tests/e2e/critical-platform-stability.tdd.spec.ts
test.beforeEach(async ({ page }) => {
  await setupIsolatedTestEnvironment(page);
});
```

This ensures:
- ✅ OpenRouter API calls are intercepted and mocked
- ✅ Google Search API is mocked
- ✅ Firecrawl API is mocked
- ✅ Wikidata API is mocked (optional)
- ✅ Stripe API is mocked

### 2. Manual Mocking (If Needed)

If you need to mock services manually:

```typescript
import { mockExternalServices } from './helpers/api-helpers';

test('my test', async ({ page }) => {
  await mockExternalServices(page); // Mocks OpenRouter, Stripe, etc.
  // ... your test code
});
```

### 3. Verify Mocking Is Working

Check the test output:
- ✅ **Good**: No 403 errors, no "API request failed" messages
- ❌ **Bad**: "OpenRouter API error: 403 Forbidden" means mocks aren't working

## Platform Stability Checklist

Use this checklist to verify platform stability without external APIs:

### ✅ 1. Test Environment Isolation

```typescript
import { verifyTestEnvironmentIsolation } from './helpers/test-setup';

test('verify isolation', async ({ page }) => {
  const isolated = await verifyTestEnvironmentIsolation(page);
  expect(isolated).toBe(true);
});
```

### ✅ 2. Internal APIs Work

Test that internal API endpoints respond correctly:
- `/api/dashboard` - Returns dashboard data
- `/api/business` - Business CRUD operations
- `/api/team` - Team management
- `/api/fingerprint` - Fingerprint generation (uses mocked LLM)

### ✅ 3. Database Operations Succeed

Verify database operations work:
- User sign-up/sign-in
- Business creation
- Data persistence across page refreshes
- Concurrent operations don't corrupt data

### ✅ 4. UI Components Render

Test that UI components work:
- Forms submit correctly
- Loading states display
- Error messages show user-friendly text
- Navigation works

### ✅ 5. Data Flow Through All Layers

Verify complete data flow:
- Database → Service → DTO → Component
- Status updates propagate correctly
- Real-time polling works
- Data persists correctly

## Running Platform Stability Tests

### Run All Stability Tests

```bash
pnpm test:e2e critical-platform-stability.tdd.spec.ts
```

### Run Specific Test

```bash
pnpm test:e2e critical-platform-stability.tdd.spec.ts -g "complete CFP flow"
```

### Verify Mocks Are Working

Check test output for:
- ✅ No "403 Forbidden" errors
- ✅ No "API request failed" messages
- ✅ Tests complete quickly (< 2 minutes per test)
- ✅ Mock responses are used (check logs for "Using mock response")

## Troubleshooting

### Issue: Still Getting 403 Errors

**Cause**: Mocks aren't being applied

**Solution**:
1. Ensure `setupIsolatedTestEnvironment()` is called in `beforeEach`
2. Check that `mockExternalServices()` is being called
3. Verify `playwright.config.ts` sets `OPENROUTER_API_KEY: ''`

### Issue: LLM Responses Are Incorrect

**Cause**: Mock responses might not match expected format

**Solution**:
1. Check `tests/e2e/helpers/api-helpers.ts` - `mockOpenRouterAPI()` function
2. Verify mock responses include business names correctly
3. Check `lib/llm/response-analyzer.ts` - ensures responses are parsed correctly

### Issue: Tests Are Slow

**Cause**: Real API calls are being made

**Solution**:
1. Verify mocks are set up (check test output)
2. Ensure `OPENROUTER_API_KEY` is empty in test environment
3. Check that `USE_MOCK_FIRECRAWL='true'` is set

## Mock Response Quality

### Current Mock Responses

The `mockOpenRouterAPI()` function generates responses based on prompt type:

1. **Recommendation queries**: Returns numbered list with business name and competitors
2. **Factual queries**: Returns information about the business
3. **Opinion queries**: Returns sentiment about the business

### Improving Mock Responses

If LLM responses appear incorrect, improve mocks in:
- `tests/e2e/helpers/api-helpers.ts` - `mockOpenRouterAPI()` function
- `lib/llm/openrouter-client.ts` - `MockResponseGenerator` class

## Best Practices

1. **Always mock external services** in E2E tests
2. **Use real internal APIs** to test actual logic
3. **Verify mocks are working** before running full test suite
4. **Keep mock responses realistic** to catch parsing issues
5. **Test data flow** not external API behavior

## Summary

To determine platform stability without external APIs:

1. ✅ Ensure all external services are mocked (`setupIsolatedTestEnvironment`)
2. ✅ Verify internal APIs work correctly
3. ✅ Test database operations succeed
4. ✅ Verify UI components render
5. ✅ Test complete data flow through all layers

The platform is **stable and complete** when all these checks pass **without any external API connections**.

