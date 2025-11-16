# Stripe Tests Setup with Vitest

## Overview

Comprehensive test suite for Stripe payment functionality using Vitest, including:
- **Unit Tests**: Individual function testing
- **Integration Tests**: API route testing  
- **E2E Tests**: Complete payment flow testing

## Test Files Created

### 1. Unit Tests
- `lib/payments/__tests__/stripe.test.ts` - Tests for Stripe service functions

### 2. Integration Tests
- `app/api/stripe/__tests__/webhook.test.ts` - Webhook endpoint tests
- `app/api/stripe/__tests__/checkout.test.ts` - Checkout endpoint tests

### 3. E2E Tests
- `tests/e2e/stripe.test.ts` - End-to-end payment flow tests

### 4. Test Fixtures
- `tests/fixtures/stripe.ts` - Stripe test data and helpers

## Running Tests

### Run All Stripe Tests
```bash
pnpm test:stripe
```

### Run with Watch Mode
```bash
pnpm test:stripe:watch
```

### Run with Coverage
```bash
pnpm test:stripe:coverage
```

### Run Specific Test File
```bash
pnpm test lib/payments/__tests__/stripe.test.ts
pnpm test app/api/stripe/__tests__/webhook.test.ts
pnpm test tests/e2e/stripe.test.ts
```

## Test Coverage

### Unit Tests Coverage
- ✅ `createCheckoutSession` - All scenarios
- ✅ `createCustomerPortalSession` - All scenarios
- ✅ `handleSubscriptionChange` - All status types
- ✅ `getStripePrices` - Price listing
- ✅ `getStripeProducts` - Product listing

### Integration Tests Coverage
- ✅ Webhook signature verification
- ✅ Subscription event handling
- ✅ Checkout session processing
- ✅ Error handling
- ✅ Edge cases

### E2E Tests Coverage
- ✅ Complete payment flow
- ✅ Subscription cancellation
- ✅ Subscription updates
- ✅ Error scenarios

## Mocking Strategy

### Stripe SDK
The Stripe SDK is fully mocked to prevent actual API calls:
- All Stripe API methods are mocked
- Realistic mock responses
- Error scenarios tested

### Database
Database queries are mocked:
- `getTeamByStripeCustomerId`
- `updateTeamSubscription`
- User and team queries

### Environment Variables
Test environment variables are set in `beforeEach` hooks:
```typescript
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
process.env.BASE_URL = 'http://localhost:3000';
```

## Known Issues & Fixes

### Issue 1: Stripe Response Type Casting
**Problem**: TypeScript type errors with `Stripe.Response<T>`
**Fix**: Use `as any` for mock responses

### Issue 2: Webhook Secret Environment Variable
**Problem**: Environment variable not set when module loads
**Fix**: Set in `beforeEach` hook before tests run

### Issue 3: E2E Test Mocking
**Problem**: Stripe instance needs to be mocked at module level
**Fix**: Mock Stripe SDK before importing route handlers

## Test Fixtures

The `tests/fixtures/stripe.ts` file provides:
- Mock Stripe objects (Customer, Product, Price, Subscription, etc.)
- Helper functions for creating test data
- Realistic test data structures

## Writing New Tests

### Example: Testing a New Stripe Function

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { yourNewFunction } from '../stripe';

describe('yourNewFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Mock Stripe API call
    vi.mocked(stripe.someMethod).mockResolvedValue({
      // mock response
    });

    // Call function
    const result = await yourNewFunction();

    // Assert
    expect(result).toEqual(expected);
  });
});
```

## CI/CD Integration

Tests are automatically run in CI/CD:
- On every pull request
- Before deployment
- In Vercel build process (via `vercel-build` script)

## Next Steps

1. ✅ Unit tests for Stripe service functions
2. ✅ Integration tests for API routes
3. ✅ E2E tests for payment flows
4. ⏳ Add more edge case tests
5. ⏳ Add performance tests
6. ⏳ Add load tests for webhooks

## Troubleshooting

### Tests Failing Due to Mock Issues
- Ensure all Stripe API calls are properly mocked
- Check that environment variables are set in test setup
- Verify mock return values match expected types

### Database Mock Issues
- Ensure database query functions are properly mocked
- Check that mock return values match database schema

### Webhook Signature Issues
- Webhook signature verification is mocked in tests
- Real webhook tests require Stripe CLI or test webhooks

## Related Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Testing Guide](../../TESTING.md)

