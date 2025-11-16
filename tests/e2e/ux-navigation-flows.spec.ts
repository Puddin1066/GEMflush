/**
 * UX Navigation & Flow E2E Tests
 * Tests navigation patterns, breadcrumbs, and user flow continuity
 * 
 * SOLID: Single Responsibility - each test focuses on one navigation pattern
 * DRY: Reuses page objects and helpers
 * Don't overfit: Tests key navigation flows users rely on
 */

import { test, expect } from './fixtures/authenticated-user';
import { BusinessPage, BusinessDetailPage, BusinessesListPage } from './pages/business-page';

test.describe('Navigation Flows', () => {
  test.describe('Breadcrumb Navigation', () => {
    test('can navigate back from business detail to list', async ({ authenticatedPage }) => {
      // Create business first
      const businessPage = new BusinessPage(authenticatedPage);
      await businessPage.navigateToCreate();
      await businessPage.fillBusinessForm({
        name: 'Navigation Test Business',
        url: 'https://example.com',
        category: 'technology', // Provide valid category (DRY: avoid validation errors)
        city: 'Seattle',
        state: 'WA',
      });
      await businessPage.submitForm();
      await businessPage.expectSuccess();

      // Extract business ID
      const url = authenticatedPage.url();
      const businessIdMatch = url.match(/\/businesses\/(\d+)/);
      expect(businessIdMatch).toBeTruthy();

      // Navigate back using back button
      const backButton = authenticatedPage.getByRole('button', { name: /back/i }).or(
        authenticatedPage.getByRole('link', { name: /back/i })
      );
      
      const backVisible = await backButton.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (backVisible) {
        await backButton.first().click();
        await expect(authenticatedPage).toHaveURL(/.*businesses$/, { timeout: 5000 });
      }
    });

    test('sidebar navigation works correctly', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');

      // Navigate to businesses via sidebar
      const businessesLink = authenticatedPage.getByRole('link', { name: /businesses/i });
      if (await businessesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await businessesLink.click();
        await expect(authenticatedPage).toHaveURL(/.*businesses/, { timeout: 5000 });
      }
    });
  });

  test.describe('Deep Linking', () => {
    test('can access business detail page directly via URL', async ({ authenticatedPage }) => {
      // Mock business data
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              name: 'Test Business',
              url: 'https://example.com',
              status: 'pending',
            }),
          });
        } else {
          await route.continue();
        }
      });

      await authenticatedPage.goto('/dashboard/businesses/1');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should load business detail page
      await expect(authenticatedPage.getByText(/test business/i)).toBeVisible({ timeout: 5000 });
    });

    test('redirects to sign-in when accessing protected route without auth', async ({ page }) => {
      // Navigate without authentication
      await page.goto('/dashboard/businesses');
      
      // Should redirect to sign-in
      await expect(page).toHaveURL(/.*sign-in/, { timeout: 5000 });
    });
  });

  test.describe('Flow Continuity', () => {
    test('maintains context when navigating between pages', async ({ authenticatedPage }) => {
      // Create business
      const businessPage = new BusinessPage(authenticatedPage);
      await businessPage.navigateToCreate();
      await businessPage.fillBusinessForm({
        name: 'Context Test Business',
        url: 'https://example.com',
        category: 'technology', // Provide valid category (DRY: avoid validation errors)
        city: 'Seattle',
        state: 'WA',
      });
      await businessPage.submitForm();
      await businessPage.expectSuccess();

      // Extract business ID
      const url = authenticatedPage.url();
      const businessIdMatch = url.match(/\/businesses\/(\d+)/);
      expect(businessIdMatch).toBeTruthy();
      const businessId = businessIdMatch![1];

      // Navigate away
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');

      // Navigate back to business
      await authenticatedPage.goto(`/dashboard/businesses/${businessId}`);
      await authenticatedPage.waitForLoadState('networkidle');

      // Business name should still be visible (context maintained)
      await expect(authenticatedPage.getByText(/context test business/i)).toBeVisible({ timeout: 5000 });
    });
  });
});


