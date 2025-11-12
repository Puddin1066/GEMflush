/**
 * E2E Tests for Business Management Flows
 * Using Playwright for browser-based testing
 * Following SOLID and DRY principles
 */

import { test, expect } from '@playwright/test';

test.describe('Business Management Flows', () => {
  test('redirects to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/businesses');
    await expect(page).toHaveURL(/.*sign-in/);
  });
});


