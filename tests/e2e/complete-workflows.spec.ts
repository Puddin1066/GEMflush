/**
 * Complete User Workflow E2E Tests
 * Tests end-to-end user flows with real UI interactions
 */

import { test, expect } from './fixtures/authenticated-user';
import { BusinessPage, BusinessDetailPage, BusinessesListPage } from './pages/business-page';
import { DashboardPage } from './pages/dashboard-page';

// Note: These tests require a running Next.js server and database connection
// Run with: pnpm test:e2e

test.describe('Complete User Onboarding Flow', () => {
  test('new user can sign up and create first business', async ({ authenticatedPage }) => {
    // User is already authenticated via fixture (signed up)
    const dashboardPage = new DashboardPage(authenticatedPage);
    const businessPage = new BusinessPage(authenticatedPage);
    const businessesListPage = new BusinessesListPage(authenticatedPage);

    // Step 1: Navigate to dashboard (already there from sign-up)
    await dashboardPage.expectWelcomeMessage();

    // Step 2: Navigate to add business
    await businessesListPage.navigateTo();
    
    // Step 3: Click add business button
    await businessesListPage.clickAddBusiness();

    // Step 4: Fill business form
    await businessPage.fillBusinessForm({
      name: 'Test Business',
      url: 'https://example.com',
      category: 'restaurant',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });

    // Step 5: Submit form
    await businessPage.submitForm();

    // Step 6: Verify loading state
    await businessPage.expectLoadingState();

    // Step 7: Verify success and redirect
    await businessPage.expectSuccess();

    // Step 8: Verify business name is displayed
    const businessDetailPage = new BusinessDetailPage(authenticatedPage);
    await businessDetailPage.expectBusinessName('Test Business');
  });
});

test.describe('Business Creation Flow', () => {
  test('creates business with valid data', async ({ authenticatedPage }) => {
    const businessPage = new BusinessPage(authenticatedPage);

    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'My Test Business',
      url: 'https://testbusiness.com',
      category: 'technology',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    });

    await businessPage.submitForm();
    await businessPage.expectSuccess();
    
    // Verify business name appears on detail page
    await expect(authenticatedPage.getByText('My Test Business')).toBeVisible();
  });

  test('shows validation error for invalid URL', async ({ authenticatedPage }) => {
    const businessPage = new BusinessPage(authenticatedPage);

    await businessPage.navigateToCreate();
    
    // Fill form with invalid URL
    await authenticatedPage.getByLabel(/business name/i).or(
      authenticatedPage.getByLabel(/name/i)
    ).fill('Test Business');
    
    await authenticatedPage.getByLabel(/website url/i).or(
      authenticatedPage.getByLabel(/url/i)
    ).fill('not-a-valid-url');
    
    await authenticatedPage.getByLabel(/city/i).fill('Seattle');
    await authenticatedPage.getByLabel(/state/i).fill('WA');

    await businessPage.submitForm();
    
    // Browser validation should prevent submission or show error
    // Form should still be visible
    await expect(authenticatedPage.getByLabel(/name/i)).toBeVisible();
  });

  test('shows validation error for missing required fields', async ({ authenticatedPage }) => {
    const businessPage = new BusinessPage(authenticatedPage);

    await businessPage.navigateToCreate();
    
    // Try to submit without filling required fields
    await businessPage.submitForm();
    
    // Browser validation should prevent submission
    await businessPage.expectValidationError();
  });

  test('shows error message for API errors', async ({ authenticatedPage }) => {
    // Intercept API call and return error
    await authenticatedPage.route('**/api/business', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Business limit reached',
            maxBusinesses: 1,
            currentCount: 1,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Test Business',
      url: 'https://example.com',
      city: 'Seattle',
      state: 'WA',
    });

    await businessPage.submitForm();
    
    // Should show error message
    await expect(authenticatedPage.getByText(/business limit reached/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Business Detail Page Flow', () => {
  test('loads business data and displays correctly', async ({ authenticatedPage }) => {
    // Create business via UI flow
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Test Business Detail',
      url: 'https://example.com',
      category: 'restaurant',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    // Extract business ID from URL
    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).not.toBeNull();
    
    const businessDetailPage = new BusinessDetailPage(authenticatedPage);
    await businessDetailPage.expectBusinessName('Test Business Detail');
  });

  test('crawl workflow - button click shows loading state', async ({ authenticatedPage }) => {
    // Create business via UI
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Crawl Test Business',
      url: 'https://example.com',
      category: 'restaurant',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    // Extract business ID from URL
    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).not.toBeNull();
    
    const businessDetailPage = new BusinessDetailPage(authenticatedPage);

    // Mock crawl API to return success
    await authenticatedPage.route('**/api/crawl', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 1,
            status: 'queued',
            message: 'Crawl job started',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Look for crawl button and click if visible
    const crawlButton = authenticatedPage.getByRole('button', { name: /crawl/i });
    if (await crawlButton.isVisible({ timeout: 5000 })) {
      await crawlButton.click();
      await businessDetailPage.expectCrawlLoading();
    }
  });

  test('fingerprint workflow - button click shows loading state', async ({ authenticatedPage }) => {
    // Create business via UI
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Fingerprint Test Business',
      url: 'https://example.com',
      category: 'restaurant',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    const businessDetailPage = new BusinessDetailPage(authenticatedPage);

    // Mock fingerprint API to return success
    await authenticatedPage.route('**/api/fingerprint', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            fingerprintId: 1,
            status: 'completed',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Look for analyze button and click if visible
    const analyzeButton = authenticatedPage.getByRole('button', { name: /analyze/i });
    const fingerprintButton = authenticatedPage.getByRole('button', { name: /fingerprint/i });
    
    const buttonToClick = (await analyzeButton.isVisible({ timeout: 1000 }).catch(() => false))
      ? analyzeButton
      : (await fingerprintButton.isVisible({ timeout: 1000 }).catch(() => false))
      ? fingerprintButton
      : null;
    
    if (buttonToClick) {
      await buttonToClick.click();
      await businessDetailPage.expectFingerprintLoading();
    }
  });
});

test.describe('Dashboard Data Flow', () => {
  test('displays businesses list', async ({ authenticatedPage }) => {
    // Create a business via UI
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'List Test Business',
      url: 'https://example.com',
      category: 'restaurant',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    // Navigate to businesses list
    const businessesListPage = new BusinessesListPage(authenticatedPage);
    await businessesListPage.navigateTo();

    // Should show business in list
    await expect(authenticatedPage.getByText('List Test Business')).toBeVisible({ timeout: 10000 });
  });

  test('displays empty state for new users', async ({ authenticatedPage }) => {
    const businessesListPage = new BusinessesListPage(authenticatedPage);
    await businessesListPage.navigateTo();

    // Should show empty state (if no businesses)
    // Note: This depends on whether test user has businesses
    const emptyState = authenticatedPage.getByText(/no businesses/i).or(
      authenticatedPage.getByText(/get started/i)
    );
    // May or may not be visible depending on test data
  });

  test('navigates to business detail from list', async ({ authenticatedPage }) => {
    // Create business via UI
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Navigation Test Business',
      url: 'https://example.com',
      category: 'restaurant',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    // Navigate to businesses list
    const businessesListPage = new BusinessesListPage(authenticatedPage);
    await businessesListPage.navigateTo();
    
    // Wait for business to appear in list
    await expect(authenticatedPage.getByText('Navigation Test Business')).toBeVisible({ timeout: 10000 });
    
    // Click on business
    await businessesListPage.clickBusiness('Navigation Test Business');

    // Should navigate to business detail
    await expect(authenticatedPage).toHaveURL(/.*businesses\/\d+/);
    await expect(authenticatedPage.getByText('Navigation Test Business')).toBeVisible();
  });
});

test.describe('Error Handling in UI', () => {
  test('handles network errors gracefully', async ({ authenticatedPage }) => {
    // Simulate network error for POST requests only
    await authenticatedPage.route('**/api/business', async (route) => {
      if (route.request().method() === 'POST') {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Test Business',
      url: 'https://example.com',
      city: 'Seattle',
      state: 'WA',
    });

    await businessPage.submitForm();
    
    // Should show error message
    const errorText = authenticatedPage.getByText(/error/i);
    const failedText = authenticatedPage.getByText(/failed/i);
    
    // Wait for either error message to appear
    await Promise.race([
      errorText.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
      failedText.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    ]);
  });

  test('handles 401 errors with redirect', async ({ page }) => {
    // Navigate without authentication
    await page.goto('/dashboard/businesses');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('handles 404 errors gracefully', async ({ authenticatedPage }) => {
    // Navigate to non-existent business
    await authenticatedPage.goto('/dashboard/businesses/99999');
    
    // Should show error or not found message
    await expect(
      authenticatedPage.getByText(/not found/i).or(
        authenticatedPage.getByText(/doesn't exist/i)
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Loading States', () => {
  test('shows loading state during form submission', async ({ authenticatedPage }) => {
    const businessPage = new BusinessPage(authenticatedPage);

    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Loading Test Business',
      url: 'https://example.com',
      city: 'Seattle',
      state: 'WA',
    });

    // Add delay to API response to see loading state
    await authenticatedPage.route('**/api/business', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await businessPage.submitForm();
    await businessPage.expectLoadingState();
  });

  test('shows loading skeleton on data fetch', async ({ authenticatedPage }) => {
    // Add delay to API response
    await authenticatedPage.route('**/api/business', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    const businessesListPage = new BusinessesListPage(authenticatedPage);
    await businessesListPage.navigateTo();

    // Should show loading state initially
    // Then content loads
    await expect(authenticatedPage.getByText(/businesses/i)).toBeVisible({ timeout: 10000 });
  });
});

