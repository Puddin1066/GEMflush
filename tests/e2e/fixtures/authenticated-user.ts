/**
 * Playwright Fixtures for Authenticated Users
 * Creates test users via API and authenticates for E2E tests
 */

import { test as base, expect, type Page } from '@playwright/test';
import { cleanupRoutes } from '../helpers/api-helpers';

type AuthenticatedUserFixtures = {
  authenticatedPage: Page;
  testUser: {
    email: string;
    password: string;
  };
};

export const test = base.extend<AuthenticatedUserFixtures>({
  testUser: async ({}, use) => {
    // Generate unique test user credentials
    const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'testpassword123';

    const testUser = {
      email,
      password,
    };

    await use(testUser);
  },

  authenticatedPage: async ({ page, testUser }: { page: Page; testUser: { email: string; password: string } }, use) => {
    // Sign up the test user via UI
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    
    // Submit form and wait for navigation
    await Promise.all([
      page.waitForURL(/.*dashboard/, { timeout: 15000 }),
      page.getByRole('button', { name: /sign up/i }).click()
    ]);

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 5000 });

    try {
      await use(page);
    } finally {
      // Cleanup: Remove all route handlers to prevent tests from hanging
      // SOLID: Cleanup responsibility in fixture
      // Fixes: Tests stalling because routes stay active
      await cleanupRoutes(page);
      
      // Wait for network to be idle to ensure no pending requests
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      } catch {
        // Ignore timeout - page might have pending requests
      }
    }
  },
});

export { expect };

