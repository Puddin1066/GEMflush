# E2E Testing Guide - Playwright

**Status:** ✅ Fully Configured  
**Test Coverage:** Complete workflows, error handling, loading states

---

## 🚀 Quick Start

### Run All E2E Tests
```bash
pnpm test:e2e
```

### Run in Interactive Mode (Recommended)
```bash
pnpm test:e2e:ui
```
Opens Playwright UI where you can:
- See test results visually
- Debug failed tests
- Watch tests run in real-time
- Re-run individual tests

### Run in Headed Mode (See Browser)
```bash
pnpm test:e2e:headed
```
Runs tests with visible browser windows.

---

## 📋 What's Tested

### ✅ Complete User Workflows (`complete-workflows.spec.ts`)

1. **User Onboarding Flow**
   - Sign up → Dashboard redirect
   - Welcome message display
   - Empty state handling

2. **Business Creation Flow**
   - Form filling and submission
   - Validation errors (invalid URL, missing fields)
   - API error handling (business limit reached)
   - Success redirect to business detail

3. **Business Detail Page Flow**
   - Business data loading
   - Crawl workflow (button click → loading state)
   - Fingerprint workflow (button click → loading state)

4. **Dashboard Data Flow**
   - Business list display
   - Empty state for new users
   - Navigation to business detail from list

5. **Error Handling**
   - Network errors
   - 401 redirects (unauthorized)
   - 404 errors (not found)

6. **Loading States**
   - Form submission loading
   - Data fetch loading skeletons

---

## 🛠️ Test Infrastructure

### Playwright Configuration
- **Location:** `playwright.config.ts`
- **Base URL:** `http://localhost:3000`
- **Auto-start server:** Yes (via `webServer` config)
- **Browser:** Chromium (default)
- **Screenshots:** On failure
- **Video:** Retained on failure

### Test Fixtures
- **Location:** `tests/e2e/fixtures/authenticated-user.ts`
- **Purpose:** Creates authenticated test users automatically
- **Usage:** `test('...', async ({ authenticatedPage }) => { ... })`

### Page Objects
- **Location:** `tests/e2e/pages/`
- **Files:**
  - `business-page.ts` - Business form interactions
  - `dashboard-page.ts` - Dashboard interactions
- **Purpose:** Reusable page interaction helpers

---

## 🧪 Running Specific Tests

### Run Single Test File
```bash
pnpm test:e2e complete-workflows
pnpm test:e2e user-workflows
pnpm test:e2e auth
```

### Run Tests Matching Pattern
```bash
pnpm test:e2e -g "business creation"
pnpm test:e2e -g "crawl"
```

### Run Tests in Specific Browser
Edit `playwright.config.ts` to enable:
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```

---

## 📊 Test Coverage

### Current Coverage
- ✅ Authentication flows
- ✅ Business CRUD operations
- ✅ Crawl workflow
- ✅ Fingerprint workflow
- ✅ Error handling
- ✅ Loading states
- ✅ Form validation

### Missing Coverage (Future)
- ⏳ Wikidata publishing workflow
- ⏳ Stripe checkout flow
- ⏳ Permission gating (Free vs Pro)
- ⏳ Multiple businesses workflow
- ⏳ Dashboard stats updates

---

## 🔧 Test Development

### Writing New Tests

1. **Use Authenticated Fixture:**
```typescript
import { test, expect } from './fixtures/authenticated-user';

test('my test', async ({ authenticatedPage }) => {
  // authenticatedPage is already signed in
  await authenticatedPage.goto('/dashboard');
});
```

2. **Use Page Objects:**
```typescript
import { BusinessPage } from './pages/business-page';

test('create business', async ({ authenticatedPage }) => {
  const businessPage = new BusinessPage(authenticatedPage);
  await businessPage.navigateToCreate();
  await businessPage.fillBusinessForm({ ... });
  await businessPage.submitForm();
});
```

3. **Mock API Routes:**
```typescript
await authenticatedPage.route('**/api/crawl', async (route) => {
  if (route.request().method() === 'POST') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobId: 1, status: 'queued' }),
    });
  } else {
    await route.continue();
  }
});
```

---

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run with debugger
PWDEBUG=1 pnpm test:e2e

# Or use VS Code debugger
# Set breakpoints in test files
# Press F5 to start debugging
```

### View Test Results
```bash
# Generate HTML report
pnpm test:e2e
# Opens `playwright-report/index.html`
```

### Screenshots & Videos
- Screenshots: Saved on failure in `test-results/`
- Videos: Saved on failure in `test-results/`
- Traces: Available in Playwright UI mode

---

## ⚙️ Configuration

### Environment Variables
```bash
# Base URL (default: http://localhost:3000)
BASE_URL=http://localhost:3000 pnpm test:e2e

# CI mode (enables retries)
CI=true pnpm test:e2e
```

### Test Database
Tests use the same database as development. For isolation:
1. Use test database: Set `DATABASE_URL` to test DB
2. Use transactions: Wrap tests in transactions
3. Clean up: Delete test data after tests

---

## 📝 Best Practices

1. **Use Fixtures** - Don't manually sign in for each test
2. **Use Page Objects** - Reusable interaction helpers
3. **Mock Slow APIs** - LLM, Wikidata calls should be mocked
4. **Test User Flows** - Test complete workflows, not just components
5. **Clean Up** - Remove test data after tests
6. **Isolate Tests** - Each test should be independent

---

## 🎯 Next Steps

### Add More Tests
1. **Wikidata Publishing:**
   ```typescript
   test('publish to wikidata workflow', async ({ authenticatedPage }) => {
     // Test Pro user publishing flow
   });
   ```

2. **Stripe Checkout:**
   ```typescript
   test('upgrade to pro workflow', async ({ authenticatedPage }) => {
     // Test Stripe checkout flow
   });
   ```

3. **Permission Gating:**
   ```typescript
   test('free user cannot publish', async ({ authenticatedPage }) => {
     // Test permission restrictions
   });
   ```

---

## 📚 Resources

- **Playwright Docs:** https://playwright.dev
- **Test Files:** `tests/e2e/`
- **Config:** `playwright.config.ts`
- **Fixtures:** `tests/e2e/fixtures/`
- **Page Objects:** `tests/e2e/pages/`

---

## ✅ Quick Checklist

Before running tests:
- [ ] Database is running
- [ ] `DATABASE_URL` is set
- [ ] Dev server can start (`pnpm dev` works)
- [ ] No blocking build errors

To run tests:
- [ ] `pnpm test:e2e` - Run all tests
- [ ] `pnpm test:e2e:ui` - Interactive mode
- [ ] Check results in `playwright-report/`

---

**Ready to test!** 🚀

Run `pnpm test:e2e:ui` to start interactive testing.

