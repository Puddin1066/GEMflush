/**
 * E2E Tests for Monthly Cron Processing
 * DRY/SOLID: Focused on verifying the cron entrypoint and basic UI effects.
 */

import { test, expect } from '@playwright/test';
import { setupFreeTeam, cleanupRoutes } from './helpers/api-helpers';
import { createTestUserAndSignIn } from './helpers/auth-helper';

test.describe('Monthly Cron Processing', () => {
  test.afterEach(async ({ page }) => {
    await cleanupRoutes(page);
  });

  test('cron endpoint responds and does not error when disabled', async ({ request }) => {
    const response = await request.get('/api/cron/monthly');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // In non-production environments RUN_MONTHLY_PROCESSING is typically unset/false
    expect(data).toHaveProperty('success');
  });

  test('user can still view dashboard after cron execution', async ({ page, request }) => {
    await createTestUserAndSignIn(page);
    await setupFreeTeam(page);

    // Call cron endpoint (idempotent, should not break anything)
    const cronResponse = await request.get('/api/cron/monthly');
    expect(cronResponse.ok()).toBeTruthy();

    // Navigate to dashboard to ensure UI still loads and businesses grid is visible
    await page.goto('/dashboard');
    await expect(page.getByText('Your Businesses')).toBeVisible();
  });
});


