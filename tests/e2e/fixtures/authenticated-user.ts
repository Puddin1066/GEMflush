/**
 * Playwright Fixtures for Authenticated Users
 * Creates test users via API and authenticates for E2E tests
 */

import { test as base, expect } from '@playwright/test';

type AuthenticatedUserFixtures = {
  authenticatedPage: any;
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

  authenticatedPage: async ({ page, testUser }, use) => {
    // Sign up the test user via UI
    await page.goto('/sign-up');
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    await use(page);
  },
});

export { expect };

