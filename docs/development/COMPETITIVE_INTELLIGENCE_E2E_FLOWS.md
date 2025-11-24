# Competitive Intelligence E2E Flows

## Overview

Three comprehensive e2e flows have been created to develop and verify the competitive edge and competitive intelligence data flow and ranking UX through the DTO layer. These flows follow the iterative test methodology pattern established in `ITERATIVE_FLOW_TEST_METHODOLOGY.md`.

## Flows Created

### 1. Competitive Leaderboard DTO Flow
**File**: `tests/e2e/competitive-leaderboard-dto-flow.spec.ts`

**Purpose**: Validates complete competitive leaderboard data flow through DTO layer

**Flow**: Database (llmFingerprints.competitiveLeaderboard) → DTO (toCompetitiveLeaderboardDTO) → API → Competitive Page UI

**Steps**:
1. Execute Automated CFP Core Logic
2. Trigger Fingerprint Generation with Competitive Data
3. Verify PostgreSQL Database Storage (Ground Truth)
4. Verify DTO Transformation (toCompetitiveLeaderboardDTO)
5. Verify API Response
6. Verify UI Display (Competitive Page)
7. Summary - Verify All Issues Are Addressed

**Key Validations**:
- Competitive leaderboard data structure in database
- DTO transformation accuracy (market share calculations, insights generation)
- API response structure
- UI display on competitive page
- Market share calculations sum to ~100%

**Issues Identified from Terminal Logs**:
- Lines 87-96: Fingerprint queries returning DTOs with competitive data
- Lines 190-297: Competitive page access and fingerprint history queries
- Competitive leaderboard DTO transformation needs verification

---

### 2. Ranking Trend Calculation Flow
**File**: `tests/e2e/ranking-trend-calculation-flow.spec.ts`

**Purpose**: Validates ranking trends are calculated correctly through DTO layer from fingerprint history

**Flow**: Database (llmFingerprints history) → DTO (trend calculation) → API → Dashboard/UI

**Steps**:
1. Execute Automated CFP Core Logic
2. Generate First Fingerprint
3. Generate Second Fingerprint (for trend calculation)
4. Verify Fingerprint History (Database Ground Truth)
5. Verify Trend Calculation in DTO Layer
6. Verify Dashboard Display
7. Summary - Verify All Issues Are Addressed

**Key Validations**:
- Fingerprint history structure
- Trend calculation from historical fingerprints (not hardcoded)
- Trend accuracy (trendValue and trend direction)
- Dashboard display of trends
- Hardcoded trendValue detection (should be calculated, not hardcoded to 0)

**Issues Identified from Terminal Logs**:
- Lines 34-48: DashboardBusinessDTO hardcoded trendValue warnings
- Lines 87-96: Fingerprint queries returning DTOs with trend data
- Lines 188-189: Fingerprint history API calls
- trendValue should be calculated from historical fingerprints, not hardcoded to 0

---

### 3. Competitive Intelligence Cards Flow
**File**: `tests/e2e/competitive-intelligence-cards-flow.spec.ts`

**Purpose**: Validates competitive intelligence cards update with valuable, accurate data through DTO layer

**Flow**: Database → DTO Transformation → API → UI Cards (Competitive Page, Business Detail, Dashboard)

**Steps**:
1. Execute Automated CFP Core Logic
2. Generate Fingerprint with Competitive Data
3. Verify Leaderboard Data Structure (DTO Layer)
4. Verify Market Position Card
5. Verify Competitor Rankings Card
6. Verify Insights Card
7. Verify UI Cards Display (Competitive Page)
8. Summary - Verify All Issues Are Addressed

**Key Validations**:
- Market position card accuracy (position matches mention rate)
- Competitor rankings card accuracy (market share calculations, ranking sequence)
- Insights card value (recommendations, top competitor, competitive gap)
- UI cards display correctly on competitive page
- Market share calculations sum to ~100%

**Issues Identified from Terminal Logs**:
- Lines 87-96: Fingerprint DTOs with competitive data
- Lines 190-297: Competitive page with leaderboard cards
- Cards should display accurate market position, competitor rankings, and insights
- Market share calculations should be accurate and sum to ~100%

---

## Running the Tests

### Run All Three Flows
```bash
pnpm test:e2e -- tests/e2e/competitive-leaderboard-dto-flow.spec.ts tests/e2e/ranking-trend-calculation-flow.spec.ts tests/e2e/competitive-intelligence-cards-flow.spec.ts
```

### Run Individual Flow
```bash
# Competitive Leaderboard DTO Flow
pnpm test:e2e -- tests/e2e/competitive-leaderboard-dto-flow.spec.ts

# Ranking Trend Calculation Flow
pnpm test:e2e -- tests/e2e/ranking-trend-calculation-flow.spec.ts

# Competitive Intelligence Cards Flow
pnpm test:e2e -- tests/e2e/competitive-intelligence-cards-flow.spec.ts
```

### Run with UI (Debug Mode)
```bash
pnpm test:e2e --ui -- tests/e2e/competitive-leaderboard-dto-flow.spec.ts
```

---

## Test Structure

All three flows follow the same iterative methodology pattern:

### Architecture
```
PostgreSQL (Ground Truth)
    ↓
DTO Transformation Layer
    ↓
API Routes
    ↓
UI Components
```

### Key Principles

**SOLID**:
- Single Responsibility: Each step focuses on one validation layer
- Open/Closed: Easy to add new steps without modifying existing

**DRY**:
- Shared test state avoids duplication
- Reusable helper functions from `tests/e2e/helpers/`

### Test Structure Pattern
```typescript
test.describe('Flow Name: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes

  test('Complete Flow Verification', async ({ authenticatedPage }) => {
    const testState: TestState = { testResults: {} };

    // Step 1: Setup
    await test.step('Step 1: Setup', async () => {
      // Execute operation
      // Store results in testState
    });

    // Step 2-N: Validation Layers
    await test.step('Step N: Verify Layer', async () => {
      // Verify layer
      // Check for issues
    });

    // Final Step: Summary
    await test.step('Summary', async () => {
      // Aggregate issues
      // Fail if critical issues found
    });
  });
});
```

---

## Helper Functions Used

### From `dto-test-helpers.ts`:
- `executeCFPFlow()` - Creates business and triggers CFP
- `waitForBusinessStatus()` - Waits for business status
- `fetchDatabaseBusiness()` - Fetches business from database

### From `fingerprint-test-helpers.ts`:
- `fetchFingerprintDTO()` - Fetches fingerprint DTO from API
- `fetchFingerprintHistory()` - Fetches fingerprint history
- `verifyTrendCalculation()` - Verifies trend calculation
- `calculateTrendFromHistory()` - Calculates trend from history

### Custom Helpers (in each test):
- `fetchDatabaseFingerprint()` - Fetches fingerprint from database
- `fetchDashboardDTO()` - Fetches dashboard DTO
- `verifyLeaderboardDTOStructure()` - Verifies leaderboard DTO structure
- `verifyMarketPositionCard()` - Verifies market position card
- `verifyCompetitorRankingsCard()` - Verifies competitor rankings card
- `verifyInsightsCard()` - Verifies insights card
- `verifyTrendAccuracy()` - Verifies trend accuracy

---

## Expected Issues to Find

Based on terminal logs and codebase analysis, these flows are designed to catch:

1. **Hardcoded trendValue**: DashboardBusinessDTO may hardcode trendValue to 0 instead of calculating from history
2. **Market share calculation errors**: Market shares may not sum to 100%
3. **Missing competitive data**: Competitive leaderboard may not be generated or transformed correctly
4. **DTO transformation issues**: DTOs may not correctly transform database data
5. **UI display issues**: Cards may not display accurate data or may be missing

---

## Iterative Development Process

Follow the iterative methodology:

1. **Run Test**: Execute the flow test
2. **Identify Issues**: Review test output for failures and warnings
3. **Fix One Issue**: Fix the most critical issue first
4. **Re-run Test**: Verify the fix resolves the issue
5. **Repeat**: Continue until all critical issues are resolved

### Example Iteration Cycle

```bash
# Run test
pnpm test:e2e -- tests/e2e/competitive-leaderboard-dto-flow.spec.ts

# Review output, identify issue (e.g., "Market share calculation issue")
# Fix issue in codebase (e.g., fix market share calculation in fingerprint-dto.ts)

# Re-run test
pnpm test:e2e -- tests/e2e/competitive-leaderboard-dto-flow.spec.ts

# Continue until all issues resolved
```

---

## Integration with Existing Tests

These flows complement existing e2e tests:
- `dto-ground-truth-verification.spec.ts` - General DTO verification
- `ranking-fingerprint-ux-flow.spec.ts` - Ranking/fingerprint UX
- `cfp-end-to-end-ux-flow.spec.ts` - CFP flow

These new flows focus specifically on:
- Competitive intelligence data flow
- Ranking trend calculations
- Competitive intelligence card accuracy

---

## Next Steps

1. **Run Initial Tests**: Execute all three flows to establish baseline
2. **Identify Issues**: Document all issues found
3. **Prioritize Fixes**: Fix critical issues first (hardcoded values, calculation errors)
4. **Iterate**: Re-run tests after each fix
5. **Document**: Update this document with findings and fixes

---

## Related Documentation

- `ITERATIVE_FLOW_TEST_METHODOLOGY.md` - Methodology for iterative flow testing
- `DTO_GROUND_TRUTH_ANALYSIS.md` - DTO ground truth analysis
- `DATA_LAYER_REFACTORING.md` - Data layer refactoring details
- `CFP_UX_TEST_RESULTS.md` - CFP UX test results


