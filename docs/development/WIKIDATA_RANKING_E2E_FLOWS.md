# Wikidata Publishing & Ranking UX E2E Flows

## Overview

This document describes two new iterative e2e flow tests created based on terminal logging analysis. These tests follow the [Iterative Flow Test Methodology](./ITERATIVE_FLOW_TEST_METHODOLOGY.md) to systematically validate the Wikidata publishing flow and ranking/fingerprint UX flow through the DTO layer.

## Test Files Created

### 1. Wikidata Publishing Flow Test
**File**: `tests/e2e/wikidata-publishing-flow.spec.ts`

**Purpose**: Validates complete end-to-end Wikidata publishing flow through DTO layer

**Issues Identified from Terminal Logs**:
- Line 19-27: LLM query failures, JSON parsing errors in entity builder
- Line 22: "Property suggestion error: SyntaxError: Unexpected token 'I', "I can help"... is not valid JSON"
- Lines 335, 337: 403 errors for wikidata entity endpoint
- Lines 389-427: Google search for references, notability assessment
- Lines 428-435: Database cache save error with ON CONFLICT issue
- Lines 417-422: Entity builder warnings about missing properties (P625, P6375)
- Lines 420-421: Property count warnings (only 4 properties, target is 10+)

**Test Steps**:
1. Execute Automated CFP Core Logic
2. Verify Crawl Completion
3. Verify Entity Building (DTO Layer)
4. Verify Notability Check
5. Verify Property Extraction
6. Verify Entity Publication Readiness
7. Verify UI Display
8. Summary - Verify All Issues

### 2. Ranking/Fingerprint UX Flow Test
**File**: `tests/e2e/ranking-fingerprint-ux-flow.spec.ts`

**Purpose**: Validates complete ranking and fingerprint UX flow through DTO layer

**Issues Identified from Terminal Logs**:
- Lines 102-120: DashboardBusinessDTO hardcoded trendValue warnings
- Lines 48-52, 60-65: Fingerprint queries and DTO returns
- Lines 229-300: Fingerprint analysis with LLM queries
- Lines 322-331: Fingerprint DTO returns with visibility scores
- Lines 41-45, 54-58: BusinessDetailDTO errorMessage warnings

**Test Steps**:
1. Execute Automated CFP Core Logic
2. Verify Fingerprint Generation
3. Verify Visibility Score Calculation (DTO Layer)
4. Verify Trend Calculation (DTO Layer)
5. Verify Dashboard Display
6. Verify History Chart Display
7. Summary - Verify All Issues

## Helper Files Created

### 1. Wikidata Test Helpers
**File**: `tests/e2e/helpers/wikidata-test-helpers.ts`

**Functions**:
- `fetchWikidataEntityDTO()` - Fetch entity DTO from API
- `verifyEntityProperties()` - Verify property extraction
- `verifyNotabilityCheck()` - Verify notability assessment
- `verifyEntityBuilderErrors()` - Check for entity builder errors
- `verifyPublicationReadiness()` - Verify publication readiness

### 2. Fingerprint Test Helpers
**File**: `tests/e2e/helpers/fingerprint-test-helpers.ts`

**Functions**:
- `fetchFingerprintDTO()` - Fetch fingerprint DTO from API
- `fetchFingerprintHistory()` - Fetch fingerprint history
- `verifyVisibilityScoreCalculation()` - Verify visibility score calculation
- `verifyTrendCalculation()` - Verify trend calculation (checks for hardcoded values)
- `calculateTrendFromHistory()` - Calculate trend from historical data

## Running the Tests

### Run Wikidata Publishing Flow Test
```bash
pnpm test:e2e wikidata-publishing-flow
```

### Run Ranking/Fingerprint UX Flow Test
```bash
pnpm test:e2e ranking-fingerprint-ux-flow
```

### Run Both Tests
```bash
pnpm test:e2e wikidata-publishing-flow ranking-fingerprint-ux-flow
```

## Expected Issues to Fix

### Wikidata Publishing Flow Issues

1. **JSON Parsing Errors in Entity Builder**
   - **Location**: `lib/wikidata/entity-builder.ts:708`
   - **Issue**: LLM response not valid JSON ("I can help..." instead of JSON)
   - **Fix**: Improve JSON extraction/parsing, handle non-JSON responses gracefully

2. **Missing Location Properties (P625, P6375)**
   - **Location**: `lib/wikidata/entity-builder.ts`
   - **Issue**: Location properties not added when business.location or crawl.location missing
   - **Fix**: Extract location from crawl data or business data more aggressively

3. **Property Count Below Target**
   - **Location**: `lib/wikidata/entity-builder.ts`
   - **Issue**: Only 4 properties extracted, target is 10+
   - **Fix**: Improve property extraction, add more property suggestions

4. **Database Cache Save Error**
   - **Location**: Database cache save operation
   - **Issue**: ON CONFLICT specification error
   - **Fix**: Fix database schema or cache save logic

5. **403 Errors for Wikidata Entity Endpoint**
   - **Location**: `app/api/wikidata/entity/[businessId]/route.ts`
   - **Issue**: Permission denied (may need Pro plan)
   - **Fix**: Ensure test user has Pro plan or handle 403 gracefully

### Ranking/Fingerprint UX Flow Issues

1. **Hardcoded trendValue**
   - **Location**: `lib/data/dashboard-dto.ts:64`
   - **Issue**: trendValue hardcoded to 0 instead of calculating from historical fingerprints
   - **Fix**: Calculate trendValue from fingerprint history

2. **Trend Calculation**
   - **Location**: `lib/data/dashboard-dto.ts:98-101`
   - **Issue**: Trend calculation is basic (just checks if fingerprint exists)
   - **Fix**: Compare with previous fingerprint to calculate actual trend

3. **Visibility Score Validation**
   - **Location**: Fingerprint DTO transformation
   - **Issue**: Need to verify visibility score is calculated correctly
   - **Fix**: Ensure visibility score calculation uses all components (mention rate, sentiment, rank)

## Iterative Debugging Process

Follow the iterative methodology:

1. **Run Test** → Identify failures
2. **Fix One Bug at a Time** (following SOLID/DRY)
3. **Re-run Test** → Verify fix
4. **Repeat** until all pass

### Example Fix Pattern

```typescript
// 1. Identify root cause
console.log('[DEBUG] Root cause: trendValue hardcoded to 0');

// 2. Apply fix following SOLID/DRY
// Single Responsibility: Fix trend calculation
// DRY: Reuse existing fingerprint history query

// 3. Add validation
expect(dashboardDTO.trendValue).not.toBe(0); // If history exists

// 4. Document fix
// Add comment explaining the fix
```

## Test Structure

Both tests follow the same structure:

```typescript
test.describe('Flow Name: Iterative Flow Test', () => {
  test.setTimeout(600_000);

  test('Complete Flow Verification', async ({ authenticatedPage }) => {
    const testState: FlowTestState = {
      testResults: {},
    };

    // Step 1: Setup
    await test.step('Step 1: Setup', async () => {
      // Execute operation
      // Store results in testState
    });

    // Step 2-N: Validation Steps
    // ...

    // Final Step: Summary
    await test.step('Step N: Summary', async () => {
      // Check all issues
      // Fail if critical issues found
    });
  });
});
```

## Key Features

### SOLID Principles
- **Single Responsibility**: Each step focuses on one validation point
- **Open/Closed**: Easy to add new steps without modifying existing
- **Dependency Inversion**: Depend on DTOs, not database directly

### DRY Principles
- **Shared Test State**: Avoids duplication across steps
- **Reusable Helpers**: Common operations extracted to helpers
- **Centralized Validation**: Validation logic in helper functions

### Pragmatic Validation
- **Core Flow Focus**: Validates main flow, not edge cases
- **Progressive Validation**: Skip passing steps to speed up iteration
- **Clear Logging**: Structured logging for debugging

## Next Steps

1. **Run Initial Tests**: Execute both tests to identify all bugs
2. **Fix Iteratively**: Fix one bug at a time, following SOLID/DRY
3. **Re-run After Each Fix**: Verify fix resolves issue
4. **Document Fixes**: Update this document with fixes applied
5. **Add to CI/CD**: Include tests in continuous integration

## Related Documentation

- [Iterative Flow Test Methodology](./ITERATIVE_FLOW_TEST_METHODOLOGY.md)
- [DTO Ground Truth Verification](../tests/e2e/dto-ground-truth-verification.spec.ts)
- [CFP End-to-End UX Flow](../tests/e2e/cfp-end-to-end-ux-flow.spec.ts)

