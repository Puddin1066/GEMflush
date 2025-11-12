# Stripe Payment Tests

This directory contains comprehensive tests for Stripe payment functionality using Vitest.

## Test Structure

### Unit Tests (`stripe.test.ts`)
Tests for individual Stripe service functions:
- `createCheckoutSession` - Creating checkout sessions
- `createCustomerPortalSession` - Creating billing portal sessions
- `handleSubscriptionChange` - Processing subscription updates
- `getStripePrices` - Fetching prices
- `getStripeProducts` - Fetching products

### Integration Tests
Located in `app/api/stripe/__tests__/`:
- `webhook.test.ts` - Webhook endpoint tests
- `checkout.test.ts` - Checkout endpoint tests

### E2E Tests
Located in `tests/e2e/stripe.test.ts`:
- Complete payment flow tests
- Subscription lifecycle tests
- Error handling tests

## Running Tests

### Run All Stripe Tests
```bash
pnpm test stripe
```

### Run Unit Tests Only
```bash
pnpm test lib/payments
```

### Run Integration Tests Only
```bash
pnpm test app/api/stripe
```

### Run E2E Tests Only
```bash
pnpm test tests/e2e/stripe
```

### Run with Coverage
```bash
pnpm test:coverage stripe
```

### Run in Watch Mode
```bash
pnpm test:watch stripe
```

## Test Fixtures

Test fixtures are located in `tests/fixtures/stripe.ts` and provide:
- Mock Stripe objects (Customer, Product, Price, Subscription, etc.)
- Helper functions for creating test data
- Realistic test data structures

## Mocking Strategy

### Stripe SDK
The Stripe SDK is mocked to prevent actual API calls during tests. All Stripe API methods are mocked using Vitest's `vi.mock()`.

### Database
Database queries are mocked to isolate payment logic from database implementation.

### Environment Variables
Test environment variables are set in `beforeEach` hooks:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `BASE_URL`

## Writing New Tests

### Example: Testing a New Stripe Function

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { yourNewFunction } from '../stripe';
import * as stripeModule from '../stripe';

describe('yourNewFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Mock Stripe API call
    vi.mocked(stripeModule.stripe.someMethod).mockResolvedValue({
      // mock response
    });

    // Call function
    const result = await yourNewFunction();

    // Assert
    expect(result).toEqual(expected);
  });
});
```

## Test Coverage Goals

- **Unit Tests**: 100% coverage of payment service functions
- **Integration Tests**: All API routes tested
- **E2E Tests**: Complete user flows tested

## CI/CD Integration

Tests run automatically in CI/CD pipeline:
- On every pull request
- Before deployment
- In Vercel build process (via `vercel-build` script)

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

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Guide](../../../TESTING.md)

