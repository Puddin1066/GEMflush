# Core Logic E2E Tests

## Overview

Comprehensive E2E tests for **subscription tier upgrades** and **Wikidata publishing** core logic flows. These tests verify critical business logic, permission checks, state transitions, and edge cases.

## Test Files

### 1. `core-subscription-logic.spec.ts`
Tests subscription tier upgrade logic and permission enforcement.

**Coverage:**
- ✅ Permission checks at API level (403 errors for free users)
- ✅ Permission checks at UI level (feature gates)
- ✅ State transitions (pending → crawled → published)
- ✅ Business limit enforcement (free: 1, pro: 5, agency: 25)
- ✅ Expired subscription handling
- ✅ Upgrade flow integration (unlocks features immediately)

### 2. `core-wikidata-logic.spec.ts`
Tests Wikidata publishing logic and validation.

**Coverage:**
- ✅ Notability checks (blocks non-notable businesses)
- ✅ Validation checks (businessId, ownership, existence)
- ✅ Publishing flow (updates business with QID)
- ✅ Error handling (publishing failures)
- ✅ Production vs test publishing

## Critical Logic Flows Tested

### Subscription Upgrade Flow

```
Free User → Click Upgrade → Stripe Checkout → Webhook → Team Updated → Features Unlocked
```

**Tests verify:**
1. Free user cannot publish (API returns 403)
2. Free user sees upgrade CTA (UI shows feature gate)
3. Pro user can publish (API returns 200)
4. Pro user sees publish button (UI shows enabled button)
5. Expired subscription cannot publish (even if planName is 'pro')

### Wikidata Publishing Flow

```
Pro User → Business Crawled → Notability Check → Publish → QID Assigned → Status Updated
```

**Tests verify:**
1. Business must be crawled before publishing (400 error)
2. Notability check blocks non-notable businesses (400 error)
3. Ownership validation (403 error for wrong team)
4. Publishing updates business with QID
5. Publishing failures update status to 'error'

### Permission Enforcement

**Multi-layer validation:**
- **API Level**: `canPublishToWikidata(team)` in `/api/wikidata/publish`
- **UI Level**: `FeatureGate` component wraps publish button
- **Business Logic**: Checks `team.planName` and `team.subscriptionStatus`

**Tests verify both layers work correctly.**

## Running Tests

```bash
# Run all core logic tests
pnpm test:e2e core-subscription-logic core-wikidata-logic

# Run subscription tests only
pnpm test:e2e core-subscription-logic

# Run Wikidata tests only
pnpm test:e2e core-wikidata-logic

# Run with UI (see browser)
pnpm test:e2e core-subscription-logic --headed
```

## Test Principles

### SOLID
- **Single Responsibility**: Each test focuses on one core logic aspect
- **Open/Closed**: Tests extensible via fixtures
- **Dependency Inversion**: Tests depend on abstractions (API routes, not implementation)

### DRY
- Reuses fixtures (`createFreeTeam`, `createProTeam`, `createAgencyTeam`)
- Reuses page objects (`BusinessPage`)
- Centralizes common assertions

### Don't Overfit
- Tests critical paths, not every edge case
- Flexible assertions (multiple valid states)
- Focus on behavior, not implementation details

## Key Test Scenarios

### Subscription Logic

1. **Free User Cannot Publish**
   - API returns 403 with "Upgrade to Pro" message
   - UI shows upgrade CTA instead of publish button

2. **Pro User Can Publish**
   - API returns 200 with QID
   - UI shows enabled publish button

3. **Expired Subscription**
   - Even if `planName` is 'pro', canceled subscription blocks publishing
   - Tests subscription status validation

4. **Business Limit Enforcement**
   - Free: 1 business max (403 on second)
   - Pro: 5 businesses max (succeeds up to limit)
   - Tests `canAddBusiness()` logic

5. **Upgrade Unlocks Features**
   - Simulates upgrade flow
   - Verifies features unlock immediately after upgrade

### Wikidata Publishing Logic

1. **Notability Checks**
   - Blocks businesses that fail notability
   - Allows businesses that pass notability
   - Tests `getWikidataPublishDTO()` logic

2. **Validation Checks**
   - Validates `businessId` presence
   - Validates business ownership
   - Validates business existence
   - Tests input validation at API level

3. **State Transitions**
   - `pending` → `crawled` → `published`
   - Verifies status updates correctly
   - Verifies QID assignment

4. **Error Handling**
   - Publishing failures update status to 'error'
   - Tests graceful error handling

5. **Production vs Test**
   - Can publish to test Wikidata
   - Tests `publishToProduction` flag

## Integration with Existing Tests

These tests complement existing test suites:

- **`subscription-upgrade-workflows.spec.ts`**: Tests UI flows
- **`wikidata-publishing-workflows.spec.ts`**: Tests UI flows
- **`core-subscription-logic.spec.ts`**: Tests API logic (NEW)
- **`core-wikidata-logic.spec.ts`**: Tests API logic (NEW)

**Together, they provide comprehensive coverage:**
- UI flows (user interactions)
- API logic (permissions, validation, state transitions)
- Edge cases (expired subscriptions, notability failures)

## Expected Benefits

1. **Catch Logic Bugs Early**: Tests fail when core logic breaks
2. **Prevent Regressions**: Ensure permission checks don't regress
3. **Document Expected Behavior**: Tests serve as logic documentation
4. **Improve Confidence**: Know that critical business logic works

## Maintenance

- Update tests when business logic changes
- Add tests for new permission checks
- Add tests for new validation rules
- Keep tests focused on critical paths





