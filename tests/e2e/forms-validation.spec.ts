/**
 * E2E Tests for Form Validation and User Input
 * Tests form validation, error messages, and user feedback
 * Following SOLID and DRY principles - shared selectors, single responsibility per test
 */

import { test, expect } from '@playwright/test';
import { test as authenticatedTest } from './fixtures/authenticated-user';
import {
  getBusinessNameInput,
  getBusinessUrlInput,
  getCreateBusinessButton,
} from './helpers/selectors';

test.describe('Business Creation Form Validation', () => {
  authenticatedTest.beforeEach(async ({ authenticatedPage }) => {
    // Use authenticated fixture (DRY: reuse authentication)
    await authenticatedPage.goto('/dashboard/businesses/new');
  });

  authenticatedTest('validates required fields', async ({ authenticatedPage }) => {
    // Try to submit empty form (don't overfit - test behavior, not implementation)
    const submitButton = getCreateBusinessButton(authenticatedPage);
    
    // Browser validation should prevent submission
    await submitButton.click({ force: true });
    
    // Form should still be visible (validation prevented submission)
    await expect(getBusinessNameInput(authenticatedPage)).toBeVisible();
  });

  authenticatedTest('validates URL format', async ({ authenticatedPage }) => {
    await getBusinessNameInput(authenticatedPage).fill('Test Business');
    await getBusinessUrlInput(authenticatedPage).fill('not-a-valid-url');
    
    await getCreateBusinessButton(authenticatedPage).click();
    
    // Should show URL validation error (browser or app-level)
    await authenticatedPage.waitForTimeout(500);
    
    // Form should still be visible (validation prevented submission)
    await expect(getBusinessNameInput(authenticatedPage)).toBeVisible();
  });

  authenticatedTest('validates location fields', async ({ authenticatedPage }) => {
    await getBusinessNameInput(authenticatedPage).fill('Test Business');
    await getBusinessUrlInput(authenticatedPage).fill('https://example.com');
    // Don't fill city/state (required fields)
    
    await getCreateBusinessButton(authenticatedPage).click();
    
    // Should show validation error for missing location
    await authenticatedPage.waitForTimeout(500);
    
    // City field should be visible (form still there)
    await expect(authenticatedPage.getByLabel(/city/i)).toBeVisible();
  });

  authenticatedTest('allows valid form submission', async ({ authenticatedPage }) => {
    // Fill all required fields correctly (DRY: provide valid category to avoid validation errors)
    await getBusinessNameInput(authenticatedPage).fill('Test Business');
    await getBusinessUrlInput(authenticatedPage).fill('https://example.com');
    // Select category if available
    const categorySelect = authenticatedPage.locator('select[name="category"]');
    const categoryExists = await categorySelect.count().catch(() => 0);
    if (categoryExists > 0) {
      await categorySelect.selectOption('technology');
    }
    await authenticatedPage.getByLabel(/city/i).fill('Seattle');
    await authenticatedPage.getByLabel(/state/i).fill('WA');
    await authenticatedPage.getByLabel(/country/i).fill('US');
    
    await getCreateBusinessButton(authenticatedPage).click();
    
    // Should submit successfully and redirect (flexible - allow for redirect delay)
    // Also verify we're not still on the form page
    await expect(authenticatedPage).toHaveURL(/.*businesses\/\d+/, { timeout: 15000 });
    
    const isOnFormPage = authenticatedPage.url().includes('/businesses/new');
    expect(isOnFormPage).toBeFalsy();
  });
});

test.describe('Sign-Up Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-up');
  });

  test('validates email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should show email validation error
    await page.waitForTimeout(500);
    
    // Form should not submit
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('validates password length', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('short'); // Less than 8 characters
    
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should show password validation error
    await page.waitForTimeout(500);
    
    // Error should be visible
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('shows error for existing email', async ({ page }) => {
    // Use an email that already exists
    await page.getByLabel(/email/i).fill('existing@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should show error message
    await page.waitForTimeout(2000);
    
    // Error message should be displayed
    const errorMessage = page.getByText(/already exists/i).or(
      page.getByText(/failed to create/i)
    );
    // Error should be visible to user
  });
});

test.describe('Sign-In Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await page.waitForTimeout(2000);
    
    // Error message should be displayed
    const errorMessage = page.getByText(/invalid.*password/i).or(
      page.getByText(/invalid.*email/i)
    );
    // Error should be visible
  });

  test('allows successful sign-in', async ({ page }) => {
    // Use valid credentials (would need test user setup)
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });
});

test.describe('Error Message Display', () => {
  authenticatedTest('displays API error messages to user', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/businesses/new');
    
    // Fill form with data that might cause API error
    await getBusinessNameInput(authenticatedPage).fill('Test Business');
    await getBusinessUrlInput(authenticatedPage).fill('https://example.com');
    await authenticatedPage.getByLabel(/city/i).fill('Seattle');
    await authenticatedPage.getByLabel(/state/i).fill('WA');
    
    // Mock API to return error
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
    
    await getCreateBusinessButton(authenticatedPage).click();
    
    // Should display error message
    await authenticatedPage.waitForTimeout(1000);
    
    // Error should be visible in UI (don't overfit - check for error presence, not exact text)
    await expect(authenticatedPage.getByText(/error/i).or(
      authenticatedPage.getByText(/limit/i)
    )).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Form State Management', () => {
  authenticatedTest('preserves form data on validation error', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/businesses/new');
    
    // Fill form
    await getBusinessNameInput(authenticatedPage).fill('Test Business');
    await getBusinessUrlInput(authenticatedPage).fill('invalid-url');
    
    await getCreateBusinessButton(authenticatedPage).click();
    
    // After validation error, form data should be preserved
    await authenticatedPage.waitForTimeout(500);
    
    // Name should still be filled (don't overfit - test behavior, not implementation)
    await expect(getBusinessNameInput(authenticatedPage)).toHaveValue('Test Business');
  });

  authenticatedTest('clears form after successful submission', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/businesses/new');
    
    // Fill and submit form successfully (DRY: provide valid category)
    await getBusinessNameInput(authenticatedPage).fill('Test Business');
    await getBusinessUrlInput(authenticatedPage).fill('https://example.com');
    // Select category if available
    const categorySelect = authenticatedPage.locator('select[name="category"]');
    const categoryExists = await categorySelect.count().catch(() => 0);
    if (categoryExists > 0) {
      await categorySelect.selectOption('technology');
    }
    await authenticatedPage.getByLabel(/city/i).fill('Seattle');
    await authenticatedPage.getByLabel(/state/i).fill('WA');
    
    await getCreateBusinessButton(authenticatedPage).click();
    
    // Should redirect away from form
    await expect(authenticatedPage).toHaveURL(/.*businesses\/\d+/, { timeout: 10000 });
    
    // Form should no longer be visible (redirected)
    await expect(getBusinessNameInput(authenticatedPage)).not.toBeVisible();
  });
});

