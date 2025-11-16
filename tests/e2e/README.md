# E2E Tests for UX/UI Data Flows

## Current Status: ⚠️ Partial Coverage

### What's Tested
- ✅ Authentication redirects
- ✅ Sign-in/sign-up page display
- ✅ Protected route access

### What's Missing (Critical)
- ❌ Complete user workflows (onboarding, business creation, crawl, fingerprint)
- ❌ Form interactions (validation, submission, error handling)
- ❌ Loading states (buttons, forms, data fetching)
- ❌ Data display flows (dashboard, business detail, results)
- ❌ Error handling in UI (network errors, API errors, validation errors)
- ❌ Interactive elements (buttons, links, forms)

## Test Files

### Implemented
- `auth.spec.ts` - Basic authentication flows
- `dashboard.spec.ts` - Dashboard redirects
- `businesses.spec.ts` - Business page redirects
- `user-workflows.spec.ts` - Complete user workflows (skeleton)
- `forms-validation.spec.ts` - Form validation (skeleton)

### Helpers
- `helpers/auth-helper.ts` - Authentication helper functions

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e user-workflows

# Run in UI mode
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed
```

## Next Steps

1. **Set up test user factory** - Create test users for E2E tests
2. **Implement workflow tests** - Complete user flow tests
3. **Add API mocking** - Mock slow operations
4. **Add page objects** - Reusable page interactions
5. **Set up test database** - Use test database for E2E tests

## Test Implementation Notes

### Authentication
Tests need authenticated sessions. Use `createTestUserAndSignIn()` helper or set up test users in database.

### API Mocking
For slow operations (LLM, Wikidata), use Playwright's route interception to mock API calls.

### Test Data
Set up test data before tests and clean up after tests. Use transactions for test isolation.

### Page Objects
Create page objects for reusable interactions (forms, buttons, navigation).

## Coverage Goals

### Phase 1: Critical Flows (80% coverage)
- User onboarding flow
- Business creation flow
- Crawl workflow
- Fingerprint workflow

### Phase 2: Error Handling (90% coverage)
- Form validation errors
- API errors
- Network errors
- Business limit errors

### Phase 3: Edge Cases (95% coverage)
- Loading states
- Empty states
- Error recovery
- Data refresh


