# Subscription Upgrade & Wikidata Publishing E2E Tests

## Overview

E2E tests for user tier upgrades, checkout flows, and Wikidata publishing workflows.

## Test Structure

### Files Created

1. **`subscription-upgrade-workflows.spec.ts`** - Tests for subscription upgrades and checkout
2. **`wikidata-publishing-workflows.spec.ts`** - Tests for Wikidata publishing with feature gates
3. **`fixtures/team-fixtures.ts`** - Reusable fixtures for different plan tiers (DRY)
4. **`pages/pricing-page.ts`** - Page object for pricing page interactions (DRY)
5. **`helpers/stripe-helpers.ts`** - Stripe test utilities (DRY)

## Test Principles

### SOLID
- **Single Responsibility**: Each test focuses on one workflow
- **Open/Closed**: Tests are extensible via fixtures and helpers
- **Dependency Inversion**: Tests depend on abstractions (page objects, fixtures)

### DRY
- **Fixtures**: Reusable team fixtures for different plan tiers
- **Page Objects**: Encapsulated UI interactions
- **Helpers**: Centralized Stripe mocking utilities

### Don't Overfit
- Tests focus on key user journeys, not every edge case
- Flexible assertions that test behavior, not implementation
- Tests verify UI state and user flows, not internal details

## Test Coverage

### Subscription Upgrade Workflows

1. **Free Tier User Experience**
   - Free user sees upgrade CTAs on dashboard
   - Free user sees upgrade prompt when trying to publish
   - Free user can navigate to pricing page

2. **Checkout Flow**
   - Free user can initiate Pro upgrade
   - Shows error when price ID is missing

3. **Pro Tier User Experience**
   - Pro user sees manage subscription option
   - Pro user can publish to Wikidata

4. **Pricing Page**
   - Displays all plan tiers with correct pricing
   - Shows current plan badge for logged-in users
   - Disables upgrade button for current plan

### Wikidata Publishing Workflows

1. **Free Tier - Feature Gating**
   - Free user sees upgrade prompt when trying to publish
   - Free user sees publishing onboarding journey

2. **Pro Tier - Publishing Flow**
   - Pro user can publish to Wikidata
   - Pro user sees published entity after publishing

3. **Progressive Onboarding**
   - Shows onboarding steps for new business
   - Shows progress through onboarding steps

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run subscription upgrade tests only
pnpm test:e2e subscription-upgrade-workflows

# Run Wikidata publishing tests only
pnpm test:e2e wikidata-publishing-workflows

# Run tests in headed mode (see browser)
pnpm test:e2e --headed

# Run tests with debug output
pnpm test:e2e --debug
```

## Test Environment

### Requirements

1. **Next.js server** running on `http://localhost:3000`
2. **Database** with test data
3. **Stripe test mode** (optional, for full integration testing)

### Setup

1. Start the Next.js server:
   ```bash
   pnpm dev
   ```

2. Run Stripe setup (if needed):
   ```bash
   pnpm setup:stripe
   ```

3. Run tests:
   ```bash
   pnpm test:e2e
   ```

## Test Limitations

### Server Actions

- Server actions run server-side and can't be easily mocked in Playwright
- Tests focus on UI behavior (button clicks, form submissions, error states)
- Actual Stripe redirects happen server-side and are verified via UI feedback

### Stripe Integration

- Tests verify UI behavior, not actual Stripe API calls
- For full Stripe integration testing, use Stripe test mode with real API keys
- Server-side Stripe API calls are tested in unit/integration tests

## Test Strategy

### UI Behavior Testing

- Verify button states (enabled/disabled)
- Verify form submissions
- Verify error messages
- Verify redirects (via URL changes)
- Verify UI feedback (loading states, success messages)

### Mocking Strategy

- Mock API routes (e.g., `/api/team`, `/api/business`)
- Mock server responses (e.g., team data, business data)
- Don't mock server actions (they run server-side)

### Assertion Strategy

- Flexible assertions that test behavior, not implementation
- Use `.or()` for multiple possible states
- Use timeouts for async operations
- Verify UI state, not internal details

## Future Improvements

1. **Stripe Test Mode Integration**
   - Use real Stripe test mode for full integration testing
   - Test actual checkout flow with test cards
   - Test webhook handling

2. **Visual Regression Testing**
   - Add visual regression tests for pricing page
   - Add visual regression tests for upgrade prompts

3. **Performance Testing**
   - Test page load times
   - Test API response times
   - Test checkout flow performance

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Stripe Test Mode](https://stripe.com/docs/testing)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)










