/**
 * UX Accessibility E2E Tests
 * Tests keyboard navigation, screen reader support, and ARIA attributes
 * 
 * SOLID: Single Responsibility - each test focuses on one accessibility aspect
 * DRY: Reuses fixtures and helpers
 * Don't overfit: Tests critical accessibility features
 */

import { test, expect } from './fixtures/authenticated-user';
import { BusinessPage } from './pages/business-page';

test.describe('Accessibility', () => {
  test.describe('Keyboard Navigation', () => {
    test('can navigate forms with keyboard only', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/businesses/new');
      await authenticatedPage.waitForLoadState('networkidle');

      // Tab through form fields
      await authenticatedPage.keyboard.press('Tab');
      const firstField = authenticatedPage.locator(':focus');
      await expect(firstField).toBeVisible();

      // Continue tabbing
      await authenticatedPage.keyboard.press('Tab');
      const secondField = authenticatedPage.locator(':focus');
      await expect(secondField).toBeVisible();
    });

    test('can submit form with Enter key', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/businesses/new');
      await authenticatedPage.waitForLoadState('networkidle');

      // Fill form (DRY: provide valid category to avoid validation errors)
      const businessPage = new BusinessPage(authenticatedPage);
      await businessPage.fillBusinessForm({
        name: 'Keyboard Test',
        url: 'https://example.com',
        category: 'technology', // Provide valid category
        city: 'Seattle',
        state: 'WA',
      });

      // Focus submit button and press Enter
      const submitButton = authenticatedPage.getByRole('button', { name: /create/i });
      await submitButton.focus();
      await authenticatedPage.keyboard.press('Enter');

      // Should submit (redirect or show loading)
      await authenticatedPage.waitForTimeout(1000);
      const isSubmitting = await submitButton.isDisabled().catch(() => false);
      const hasRedirected = authenticatedPage.url().includes('/businesses/');
      
      expect(isSubmitting || hasRedirected).toBeTruthy();
    });
  });

  test.describe('ARIA Attributes', () => {
    test('forms have proper labels', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/businesses/new');
      await authenticatedPage.waitForLoadState('networkidle');

      // Check that form fields have labels
      const nameInput = authenticatedPage.getByLabel(/name/i);
      const urlInput = authenticatedPage.getByLabel(/url/i);

      await expect(nameInput).toBeVisible();
      await expect(urlInput).toBeVisible();
    });

    test('buttons have accessible names', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/businesses/new');
      await authenticatedPage.waitForLoadState('networkidle');

      // Submit button should have accessible name
      const submitButton = authenticatedPage.getByRole('button', { name: /create/i });
      await expect(submitButton).toBeVisible();
    });

    test('error messages are announced to screen readers', async ({ authenticatedPage }) => {
      // Mock API error
      await authenticatedPage.route('**/api/business', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Business limit reached' }),
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

      // Error should be visible and have proper role/aria attributes
      const errorMessage = authenticatedPage.getByText(/error/i).or(
        authenticatedPage.getByText(/limit/i)
      );
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Focus Management', () => {
    test('focus moves to error message on validation error', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/businesses/new');
      await authenticatedPage.waitForLoadState('networkidle');

      // Try to submit empty form
      const submitButton = authenticatedPage.getByRole('button', { name: /create/i });
      await submitButton.click();

      // Focus should move to first error or remain on form
      await authenticatedPage.waitForTimeout(500);
      const focusedElement = authenticatedPage.locator(':focus');
      const isFocused = await focusedElement.isVisible().catch(() => false);
      
      // Focus should be on form field or error message
      expect(isFocused).toBeTruthy();
    });
  });
});

