# Checkout, Subscription, Pro Tier & Wikidata Publishing Test Plan

**Purpose:** Comprehensive test suite for checkout flow, subscription upgrade, Pro tier access, and Wikidata publishing  
**Date:** December 2024  
**Principles:** DRY, SOLID, Pragmatic Testing (don't overfit)

---

## Test Strategy Overview

Following the three-tier testing approach:
- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test API endpoints with mocked dependencies
- **E2E Tests**: Test complete user journeys end-to-end

---

## 1. Unit Tests

### 1.1 Product Name Normalization (`lib/payments/__tests__/normalization.test.ts`)

**Purpose:** Test product name to plan ID normalization

**Test Cases:**
```typescript
describe('normalizeProductNameToPlanId', () => {
  it('normalizes "Pro Plan" to "pro"')
  it('normalizes "Pro" to "pro"')
  it('normalizes "Agency Plan" to "agency"')
  it('normalizes "Agency" to "agency"')
  it('handles case variations (e.g., "PRO PLAN")')
  it('handles null/undefined gracefully')
  it('falls back to normalized name for unknown products')
})
```

**Coverage:**
- ✅ All product name variations
- ✅ Edge cases (null, undefined, empty string)
- ✅ Case insensitivity

---

### 1.2 Subscription Handlers (`lib/payments/__tests__/subscription-handlers.test.ts`)

**Purpose:** Test subscription change handling logic

**Test Cases:**
```typescript
describe('handleSubscriptionChange', () => {
  describe('Active subscription', () => {
    it('updates team with pro plan from "Pro Plan" product name')
    it('updates team with pro plan from "Pro" product name')
    it('updates team with agency plan from "Agency Plan" product name')
    it('normalizes product name to plan ID correctly')
    it('handles product as object (expanded)')
    it('handles product as string (not expanded)')
  })
  
  describe('Subscription cancellation', () => {
    it('removes subscription data from team')
    it('sets planName to null')
  })
  
  describe('Error handling', () => {
    it('handles team not found gracefully')
    it('handles invalid customer ID')
  })
})
```

**Coverage:**
- ✅ Product name normalization in subscription handler
- ✅ Active/trialing subscriptions
- ✅ Cancelled/unpaid subscriptions
- ✅ Error scenarios

---

### 1.3 Permission Checks (`lib/gemflush/__tests__/permissions-extended.test.ts`)

**Purpose:** Test permission checks for Pro tier features

**Test Cases:**
```typescript
describe('Pro Tier Permissions', () => {
  describe('canPublishToWikidata', () => {
    it('returns false for free plan with planName "free"')
    it('returns true for pro plan with planName "pro"')
    it('returns true for agency plan with planName "agency"')
    it('handles null planName (defaults to free)')
    it('handles invalid planName (defaults to free)')
  })
  
  describe('Plan ID normalization edge cases', () => {
    it('works with normalized plan IDs ("pro", "agency", "free")')
    it('works with raw product names ("Pro Plan")')
    it('handles case variations')
  })
})
```

**Coverage:**
- ✅ All plan tiers
- ✅ Edge cases (null, invalid plan names)
- ✅ Normalized vs. raw product names

---

### 1.4 DTO Conversions (`lib/data/__tests__/wikidata-dto-extended.test.ts`)

**Purpose:** Test DTO conversion functions

**Test Cases:**
```typescript
describe('toWikidataEntityDetailDTO', () => {
  it('converts entity data with labels correctly')
  it('handles different label formats (object vs string)')
  it('extracts claims correctly')
  it('handles missing optional fields gracefully')
  it('includes QID when provided')
})
```

**Coverage:**
- ✅ Entity data conversion
- ✅ Different data formats
- ✅ Optional fields

---

## 2. Integration Tests

### 2.1 Checkout API (`app/api/stripe/__tests__/checkout-extended.test.ts`)

**Purpose:** Test checkout endpoint with product name normalization

**Test Cases:**
```typescript
describe('GET /api/stripe/checkout', () => {
  describe('Successful checkout', () => {
    it('processes checkout and normalizes "Pro Plan" to "pro"')
    it('processes checkout and normalizes "Pro" to "pro"')
    it('processes checkout and normalizes "Agency Plan" to "agency"')
    it('updates team with correct planName (normalized)')
    it('updates team with stripeCustomerId')
    it('updates team with stripeSubscriptionId')
    it('redirects to dashboard after success')
  })
  
  describe('Error handling', () => {
    it('redirects to pricing if no session_id')
    it('redirects to error if session invalid')
    it('redirects to error if user not found')
    it('redirects to error if team not found')
  })
})
```

**Coverage:**
- ✅ Product name normalization in checkout
- ✅ Database updates
- ✅ Error scenarios
- ✅ Redirect behavior

---

### 2.2 Webhook API (`app/api/stripe/__tests__/webhook-extended.test.ts`)

**Purpose:** Test webhook endpoint with checkout.session.completed handler

**Test Cases:**
```typescript
describe('POST /api/stripe/webhook', () => {
  describe('checkout.session.completed event', () => {
    it('handles checkout.session.completed for subscription mode')
    it('retrieves subscription and normalizes product name')
    it('updates team with normalized plan ID')
    it('handles webhook before redirect (race condition)')
    it('does not fail if team update fails (redirect will handle)')
  })
  
  describe('customer.subscription.updated event', () => {
    it('updates team subscription with normalized plan ID')
    it('normalizes product name correctly')
  })
  
  describe('customer.subscription.deleted event', () => {
    it('removes subscription data from team')
  })
  
  describe('Signature verification', () => {
    it('returns 400 if signature invalid')
    it('verifies signature correctly')
  })
})
```

**Coverage:**
- ✅ checkout.session.completed handler
- ✅ Product name normalization
- ✅ Race condition handling
- ✅ Signature verification

---

### 2.3 Wikidata Entity API (`app/api/wikidata/__tests__/entity-extended.test.ts`)

**Purpose:** Test entity API with Pro tier permission checks

**Test Cases:**
```typescript
describe('GET /api/wikidata/entity/[businessId]', () => {
  describe('Permission checks', () => {
    it('returns 403 for free tier users')
    it('returns entity data for pro tier users')
    it('returns entity data for agency tier users')
    it('handles planName normalization (e.g., "Pro Plan" -> "pro")')
  })
  
  describe('Business ownership', () => {
    it('returns 403 if business belongs to different team')
    it('returns entity for owned business')
  })
  
  describe('Entity data retrieval', () => {
    it('returns existing entity from database if published')
    it('builds entity from business data if not published')
    it('returns 400 if business not crawled')
  })
})
```

**Coverage:**
- ✅ Permission checks (403 for free tier)
- ✅ Business ownership verification
- ✅ Entity data retrieval (published vs. preview)
- ✅ Plan name normalization handling

---

### 2.4 Wikidata Publish API (`app/api/wikidata/__tests__/publish-extended.test.ts`)

**Purpose:** Test publish API with Pro tier permission checks

**Test Cases:**
```typescript
describe('POST /api/wikidata/publish', () => {
  describe('Permission checks', () => {
    it('returns 403 for free tier users')
    it('allows publishing for pro tier users')
    it('allows publishing for agency tier users')
    it('handles planName normalization')
  })
  
  describe('Business validation', () => {
    it('returns 400 if business not crawled')
    it('returns 403 if business belongs to different team')
    it('returns 404 if business not found')
  })
  
  describe('Publishing flow', () => {
    it('publishes entity to Wikidata successfully')
    it('updates business status to "published"')
    it('stores Wikidata entity in database')
    it('returns QID in response')
    it('handles publishing failures gracefully')
  })
  
  describe('Notability checks', () => {
    it('returns 400 if business not notable')
    it('includes notability data in response')
  })
})
```

**Coverage:**
- ✅ Permission checks (403 for free tier)
- ✅ Business validation
- ✅ Publishing flow
- ✅ Notability checks
- ✅ Error handling

---

### 2.5 Checkout → Subscription Flow (`tests/integration/checkout-subscription.test.ts`)

**Purpose:** Integration test for complete checkout → subscription update flow

**Test Cases:**
```typescript
describe('Checkout → Subscription Flow', () => {
  it('creates checkout session with correct metadata', () => {
    // Mock ONLY: stripe.checkout.sessions.create (external)
    // Use REAL: createCheckoutSession function
  })
  
  it('processes checkout redirect and updates team', () => {
    // Use REAL: /api/stripe/checkout endpoint
    // Use REAL: Database update operations
    // Verify: Team updated in real database
  })
  
  it('processes webhook and updates team (race condition)', () => {
    // Use REAL: /api/stripe/webhook endpoint
    // Use REAL: Database update operations
    // Mock ONLY: stripe.webhooks.constructEvent (external)
  })
  
  it('handles checkout before webhook arrives', () => {
    // Use REAL: Both endpoints and database
  })
  
  it('handles webhook before checkout redirect', () => {
    // Use REAL: Both endpoints and database
  })
  
  it('idempotent: both checkout and webhook can run', () => {
    // Use REAL: Both endpoints and database
    // Verify: Final state consistent regardless of order
  })
  
  it('normalizes product name consistently in both paths', () => {
    // Use REAL: Both endpoints
    // Verify: Same normalization logic used
  })
})
```

**Coverage:**
- ✅ Complete checkout flow
- ✅ Webhook vs. redirect race conditions
- ✅ Idempotency
- ✅ Product name normalization consistency

**Mocking:**
- ✅ Mock ONLY: `stripe.checkout.sessions.create` (external Stripe API)
- ✅ Mock ONLY: `stripe.webhooks.constructEvent` (external Stripe API)
- ✅ Mock ONLY: `stripe.subscriptions.retrieve` (external Stripe API)
- ❌ Use REAL: Database operations (real database connection)
- ❌ Use REAL: Team update logic (real implementation)

---

## 3. E2E Tests

### 3.1 Checkout Flow (`tests/e2e/checkout-flow.spec.ts`)

**Purpose:** E2E test for complete checkout experience

**Test Cases:**
```typescript
test.describe('Checkout Flow', () => {
  test('free user can initiate Pro checkout', async ({ authenticatedPage }) => {
    // 1. Start as free user (use real team API)
    // 2. Navigate to pricing page
    // 3. Click "Upgrade to Pro" button
    // 4. Verify redirect to Stripe checkout (mock only Stripe API, not internal)
    // 5. Simulate successful checkout (mock Stripe redirect)
    // 6. Use real /api/stripe/checkout endpoint to process session
    // 7. Verify redirect back to dashboard (real redirect)
    // 8. Verify team status is now "pro" (use real /api/team endpoint)
  })
  
  test('free user can initiate Agency checkout', async ({ authenticatedPage }) => {
    // Similar flow for Agency plan
  })
  
  test('shows error if price ID missing', async ({ authenticatedPage }) => {
    // Test error handling (use real validation logic)
  })
})
```

**Coverage:**
- ✅ Complete checkout user journey
- ✅ UI state updates
- ✅ Error handling
- ✅ Redirect flows

**Mocking:**
- ✅ Mock ONLY: `stripe.checkout.sessions.create` (external Stripe API)
- ✅ Mock ONLY: Stripe checkout session redirect (external service)
- ❌ Use REAL: `/api/stripe/checkout` endpoint (internal API)
- ❌ Use REAL: `/api/team` endpoint (internal API)
- ❌ Use REAL: Database operations (real database)

---

### 3.2 Subscription Upgrade Journey (`tests/e2e/subscription-upgrade-complete.spec.ts`)

**Purpose:** E2E test for subscription upgrade with permission verification

**Test Cases:**
```typescript
test.describe('Subscription Upgrade Journey', () => {
  test('free user upgrades to Pro and gains publishing access', async ({ authenticatedPage }) => {
    // 1. Start as free user
    // 2. Verify cannot access publishing features (403 on entity API)
    // 3. Navigate to pricing and initiate checkout
    // 4. Simulate successful checkout
    // 5. Verify team status updated to "pro"
    // 6. Verify can now access publishing features
    // 7. Verify publish button appears on business detail page
  })
  
  test('subscription upgrade persists across page reloads', async ({ authenticatedPage }) => {
    // Verify subscription status persists
  })
})
```

**Coverage:**
- ✅ Complete upgrade journey
- ✅ Permission changes
- ✅ Feature access verification
- ✅ Persistence

---

### 3.3 Pro Tier Feature Access (`tests/e2e/pro-tier-features.spec.ts`)

**Purpose:** E2E test for Pro tier feature gating

**Test Cases:**
```typescript
test.describe('Pro Tier Feature Access', () => {
  test('pro user can access entity preview', async ({ authenticatedPage }) => {
    // 1. Start as pro user
    // 2. Navigate to business detail page
    // 3. Verify entity preview card visible
    // 4. Verify entity data loads correctly
  })
  
  test('free user cannot access entity preview', async ({ authenticatedPage }) => {
    // 1. Start as free user
    // 2. Navigate to business detail page
    // 3. Verify entity preview card NOT visible
    // 4. Verify upgrade CTA visible instead
  })
  
  test('pro user can see publish button', async ({ authenticatedPage }) => {
    // Verify publish button appears for pro users
  })
  
  test('free user cannot see publish button', async ({ authenticatedPage }) => {
    // Verify publish button hidden for free users
  })
})
```

**Coverage:**
- ✅ Feature gating (visible/hidden)
- ✅ API permission checks (403)
- ✅ UI state based on plan tier

---

### 3.4 Wikidata Publishing Flow (`tests/e2e/wikidata-publishing-complete.spec.ts`)

**Purpose:** E2E test for complete Wikidata publishing journey

**Test Cases:**
```typescript
test.describe('Wikidata Publishing Flow', () => {
  test('pro user can publish entity to Wikidata', async ({ authenticatedPage }) => {
    // 1. Start as pro user (use real team API)
    // 2. Create business (use real /api/business endpoint)
    // 3. Crawl business (use real /api/crawl endpoint, mock slow results if needed)
    // 4. Navigate to business detail page
    // 5. Verify entity preview visible (use real /api/wikidata/entity endpoint)
    // 6. Click "Publish to Wikidata" button
    // 7. Mock ONLY /api/wikidata/publish (external Wikidata service)
    // 8. Verify QID displayed after publish (real UI state)
    // 9. Verify business status updated to "published" (use real /api/business endpoint)
  })
  
  test('free user cannot publish (shows upgrade prompt)', async ({ authenticatedPage }) => {
    // 1. Start as free user (use real team API)
    // 2. Create and crawl business (use real APIs)
    // 3. Navigate to business detail page
    // 4. Verify publish button NOT visible (real permission check)
    // 5. Verify upgrade CTA visible (real UI state)
  })
  
  test('publishing fails if business not crawled', async ({ authenticatedPage }) => {
    // Test error handling (use real validation logic)
  })
  
  test('publishing fails if business not notable', async ({ authenticatedPage }) => {
    // Test notability check (use real notability logic)
  })
})
```

**Coverage:**
- ✅ Complete publishing journey
- ✅ Permission checks
- ✅ Error handling
- ✅ Status updates

**Mocking:**
- ✅ Mock ONLY: `/api/wikidata/publish` (external Wikidata service)
- ✅ Mock ONLY: Crawl/fingerprint results if slow (but use real API call)
- ❌ Use REAL: `/api/business` endpoint (internal API)
- ❌ Use REAL: `/api/crawl` endpoint (internal API)
- ❌ Use REAL: `/api/wikidata/entity/[businessId]` endpoint (internal API)
- ❌ Use REAL: Database operations (real database)

---

### 3.5 Complete Journey (`tests/e2e/checkout-to-publish-journey.spec.ts`)

**Purpose:** E2E test for complete user journey: Free → Upgrade → Publish

**Test Cases:**
```typescript
test.describe('Complete Journey: Checkout → Upgrade → Publish', () => {
  test('free user upgrades to Pro and publishes to Wikidata', async ({ authenticatedPage }) => {
    // 1. Start as free user (use real team API)
    // 2. Create business (use real /api/business endpoint)
    // 3. Crawl business (use real /api/crawl endpoint)
    // 4. Verify cannot publish (use real permission check via /api/wikidata/entity)
    // 5. Navigate to pricing and upgrade to Pro (mock only Stripe checkout)
    // 6. Use real /api/stripe/checkout to process upgrade
    // 7. Verify team status updated to "pro" (use real /api/team endpoint)
    // 8. Navigate back to business detail page
    // 9. Verify can now publish (use real /api/wikidata/entity endpoint)
    // 10. Publish to Wikidata (mock ONLY /api/wikidata/publish - external service)
    // 11. Verify QID displayed (real UI state)
    // 12. Verify business status is "published" (use real /api/business endpoint)
  })
})
```

**Coverage:**
- ✅ Complete end-to-end journey
- ✅ State transitions
- ✅ Feature unlocking
- ✅ Integration of all components

**Mocking:**
- ✅ Mock ONLY: Stripe checkout session creation (external Stripe API)
- ✅ Mock ONLY: `/api/wikidata/publish` (external Wikidata service)
- ❌ Use REAL: All internal APIs (`/api/business`, `/api/team`, `/api/crawl`, `/api/wikidata/entity`)
- ❌ Use REAL: Database operations (real database)
- ❌ Use REAL: Permission checks (real logic)

---

## Test Implementation Guidelines

### DRY Principles
- ✅ Reuse fixtures for team setup (free, pro, agency)
- ✅ Reuse page objects for UI interactions
- ✅ Reuse helpers for API mocking
- ✅ Centralize normalization logic (don't duplicate)

### SOLID Principles
- ✅ Single Responsibility: Each test focuses on one aspect
- ✅ Open/Closed: Tests extensible via fixtures and helpers
- ✅ Dependency Inversion: Tests depend on abstractions (page objects, fixtures)

### Don't Overfit
- ✅ Test key user journeys, not every edge case
- ✅ Flexible assertions that test behavior, not implementation
- ✅ **Use real internal APIs whenever possible** - only mock external services
- ✅ Pragmatic: Test what matters for commercial KGAAS platform

### Minimal Mocking Philosophy
- ✅ **Default to Real APIs**: Use real internal endpoints and database operations
- ✅ **Mock Only External Services**: Stripe (external), Wikidata publishing (external)
- ✅ **Mock Only for Speed**: Crawl/fingerprint results if slow, but use real API calls
- ❌ **Don't Mock Internal APIs**: `/api/business`, `/api/team`, `/api/crawl`, etc.
- ❌ **Don't Mock Database**: Use real database connections in integration tests
- ❌ **Don't Mock Permissions**: Test with real permission logic

### Mocking Strategy (Minimal Mocking)

**CRITICAL: Do not excessively mock endpoints or APIs. Use real internal APIs whenever possible.**

#### ✅ **Use Real APIs** (Do NOT Mock):
- ✅ `/api/business` - Use real database for business CRUD
- ✅ `/api/team` - Use real database for team queries
- ✅ `/api/crawl` - Use real API (may mock slow results if needed for speed)
- ✅ `/api/fingerprint` - Use real API (may mock slow results if needed for speed)
- ✅ `/api/wikidata/entity/[businessId]` - Use real API for entity retrieval
- ✅ Database queries - Use real database connections in integration tests
- ✅ Authentication - Use real auth flow in E2E tests

#### ⚠️ **Mock Only When Necessary** (External Services):
- ⚠️ **Stripe Checkout**: Mock `stripe.checkout.sessions.create` (external service)
- ⚠️ **Stripe Webhooks**: Mock webhook signature verification (external service)
- ⚠️ **Wikidata Publishing**: Mock `/api/wikidata/publish` (external service)
- ⚠️ **Slow Operations**: Only mock crawl/fingerprint *results* if operation is slow, but use real API call

#### ❌ **Do NOT Mock**:
- ❌ Internal API endpoints (`/api/business`, `/api/team`, `/api/crawl`, etc.)
- ❌ Database operations (use real database in integration tests)
- ❌ Authentication flow (use real auth in E2E tests)
- ❌ Permission checks (test with real permission logic)
- ❌ Business logic (test with real implementation)

**Rationale**: Using real internal APIs ensures tests catch real integration issues and validate actual application behavior, not mock implementations.

---

## Running Tests

### Unit Tests
```bash
# Run all unit tests
pnpm test lib/payments/__tests__/ lib/gemflush/__tests__/ lib/data/__tests__/

# Run specific test file
pnpm test lib/payments/__tests__/normalization.test.ts
```

### Integration Tests
```bash
# Run all integration tests
pnpm test tests/integration/

# Run checkout/subscription integration tests
pnpm test tests/integration/checkout-subscription.test.ts
```

### E2E Tests
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific E2E test
pnpm test:e2e checkout-flow pro-tier-features

# Run with UI (headed mode)
pnpm test:e2e --headed
```

---

## Test Coverage Goals

### Unit Tests
- ✅ Product name normalization: 100%
- ✅ Subscription handlers: 95%+
- ✅ Permission checks: 100%
- ✅ DTO conversions: 95%+

### Integration Tests
- ✅ Checkout API: 95%+
- ✅ Webhook API: 95%+
- ✅ Wikidata Entity API: 95%+
- ✅ Wikidata Publish API: 95%+

### E2E Tests
- ✅ Checkout flow: All key journeys
- ✅ Subscription upgrade: Complete flow
- ✅ Pro tier access: Feature gating
- ✅ Wikidata publishing: Complete flow

---

## Next Steps

1. ✅ Create unit test files for normalization and subscription handlers
2. ✅ Extend integration tests for checkout and webhook
3. ✅ Create E2E tests for checkout flow and feature access
4. ✅ Implement complete journey E2E test
5. ✅ Run test suite and fix any failures
6. ✅ Achieve target coverage goals

---

## Notes

- All tests follow existing test patterns in the codebase
- Tests use Vitest for unit/integration, Playwright for E2E
- Mocking strategy aligns with existing approach (real internal APIs, mock external services)
- Tests focus on behavior, not implementation details
- Pragmatic approach: Test critical commercial flows, not exhaustive edge cases

