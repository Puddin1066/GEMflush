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
    await page.goto('/sign-up', { waitUntil: 'networkidle' });
    
    // Wait for React to hydrate - look for form or input elements
    // Try multiple strategies to find the form
    try {
      // First, wait for any form element
      await page.waitForSelector('form', { timeout: 20000, state: 'visible' });
      
      // Then wait for email input specifically
      await page.waitForSelector('input[name="email"], #email, input[type="email"]', { 
        timeout: 10000, 
        state: 'visible' 
      });
    } catch (error) {
      // If form doesn't load, check if page has an error
      const pageText = await page.textContent('body');
      const hasError = pageText?.includes('error') || pageText?.includes('Error');
      if (hasError) {
        console.error('Page has error:', pageText?.substring(0, 500));
      }
      throw new Error(`Sign-up form did not load: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Fill form - use name attribute first (most reliable)
    await page.locator('input[name="email"]').fill(testUser.email, { timeout: 10000 });
    await page.locator('input[name="password"]').fill(testUser.password, { timeout: 10000 });
    
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

