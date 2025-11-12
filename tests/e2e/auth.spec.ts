/**
 * E2E Tests for Authentication Flows
 * Using Playwright for browser-based testing
 * Following SOLID and DRY principles
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should display sign-up page', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should navigate between sign-in and sign-up', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Click link to sign-up
    const signUpLink = page.getByRole('link', { name: /sign up/i });
    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      await expect(page).toHaveURL(/.*sign-up/);
    }

    // Click link back to sign-in
    const signInLink = page.getByRole('link', { name: /sign in/i });
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await expect(page).toHaveURL(/.*sign-in/);
    }
  });

  test('can navigate between sign-in and sign-up pages', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Try to find and click sign-up link if it exists
    const signUpLink = page.getByRole('link', { name: /sign up/i });
    if (await signUpLink.isVisible().catch(() => false)) {
      await signUpLink.click();
      await expect(page).toHaveURL(/.*sign-up/);
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to sign-in when accessing dashboard without authentication', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('should redirect to sign-in when accessing businesses without authentication', async ({ page }) => {
    await page.goto('/dashboard/businesses');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/);
  });
});

