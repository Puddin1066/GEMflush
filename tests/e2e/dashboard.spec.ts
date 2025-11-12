/**
 * E2E Tests for Dashboard Flows
 * Using Playwright for browser-based testing
 * Following SOLID and DRY principles
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Flows', () => {
  test('redirects to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*sign-in/);
  });
});


