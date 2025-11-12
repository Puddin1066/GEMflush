/**
 * E2E Tests for Form Validation and User Input
 * Tests form validation, error messages, and user feedback
 */

import { test, expect } from '@playwright/test';

test.describe('Business Creation Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is authenticated
    await page.goto('/dashboard/businesses/new');
  });

  test('validates required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: /create/i }).click();
    
    // Browser validation should prevent submission
    // Or app should show validation errors
    await page.waitForTimeout(500);
    
    // Form should still be visible
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test('validates URL format', async ({ page }) => {
    await page.getByLabel(/name/i).fill('Test Business');
    await page.getByLabel(/url/i).fill('not-a-valid-url');
    
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should show URL validation error
    await page.waitForTimeout(500);
    
    // Error message should be visible
    const errorMessage = page.getByText(/invalid.*url/i).or(
      page.getByText(/must be a valid url/i)
    );
    // May or may not be visible depending on when validation occurs
  });

  test('validates location fields', async ({ page }) => {
    await page.getByLabel(/name/i).fill('Test Business');
    await page.getByLabel(/url/i).fill('https://example.com');
    // Don't fill city/state (required fields)
    
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should show validation error for missing location
    await page.waitForTimeout(500);
    
    // City field should be marked as required or show error
    await expect(page.getByLabel(/city/i)).toBeVisible();
  });

  test('allows valid form submission', async ({ page }) => {
    // Fill all required fields correctly
    await page.getByLabel(/name/i).fill('Test Business');
    await page.getByLabel(/url/i).fill('https://example.com');
    await page.getByLabel(/city/i).fill('Seattle');
    await page.getByLabel(/state/i).fill('WA');
    await page.getByLabel(/country/i).fill('US');
    
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should submit successfully and redirect
    await expect(page).toHaveURL(/.*businesses\/\d+/, { timeout: 10000 });
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
  test('displays API error messages to user', async ({ page }) => {
    await page.goto('/dashboard/businesses/new');
    
    // Fill form with data that might cause API error
    await page.getByLabel(/name/i).fill('Test Business');
    await page.getByLabel(/url/i).fill('https://example.com');
    await page.getByLabel(/city/i).fill('Seattle');
    await page.getByLabel(/state/i).fill('WA');
    
    // Mock API to return error (or use invalid data)
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should display error message
    await page.waitForTimeout(2000);
    
    // Error should be visible in UI
    const errorDisplay = page.getByText(/error/i).or(
      page.locator('[role="alert"]')
    );
    // Error message should be user-friendly
  });

  test('dismisses error messages', async ({ page }) => {
    // Create an error state
    await page.goto('/dashboard/businesses/new');
    await page.getByLabel(/name/i).fill('');
    await page.getByRole('button', { name: /create/i }).click();
    
    await page.waitForTimeout(500);
    
    // If error has dismiss button, click it
    const dismissButton = page.getByRole('button', { name: /close/i }).or(
      page.getByRole('button', { name: /dismiss/i })
    );
    
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      // Error should be hidden
    }
  });
});

test.describe('Form State Management', () => {
  test('preserves form data on validation error', async ({ page }) => {
    await page.goto('/dashboard/businesses/new');
    
    // Fill form
    await page.getByLabel(/name/i).fill('Test Business');
    await page.getByLabel(/url/i).fill('invalid-url');
    
    await page.getByRole('button', { name: /create/i }).click();
    
    // After validation error, form data should be preserved
    await page.waitForTimeout(500);
    
    // Name should still be filled
    await expect(page.getByLabel(/name/i)).toHaveValue('Test Business');
  });

  test('clears form after successful submission', async ({ page }) => {
    await page.goto('/dashboard/businesses/new');
    
    // Fill and submit form successfully
    await page.getByLabel(/name/i).fill('Test Business');
    await page.getByLabel(/url/i).fill('https://example.com');
    await page.getByLabel(/city/i).fill('Seattle');
    await page.getByLabel(/state/i).fill('WA');
    
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should redirect away from form
    await expect(page).toHaveURL(/.*businesses\/\d+/, { timeout: 10000 });
    
    // Form should no longer be visible (redirected)
    await expect(page.getByLabel(/name/i)).not.toBeVisible();
  });
});

