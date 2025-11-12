/**
 * E2E Test Authentication Helper
 * Creates test users and authenticates for E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Creates a test user and signs them in
 * Returns the user email for use in tests
 */
export async function createTestUserAndSignIn(page: Page): Promise<string> {
  const email = `test-${Date.now()}@example.com`;
  const password = 'testpassword123';

  // Navigate to sign-up
  await page.goto('/sign-up');
  
  // Fill sign-up form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  
  // Submit
  await page.getByRole('button', { name: /sign up/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/.*dashboard/, { timeout: 10000 });
  
  return email;
}

/**
 * Signs in with existing credentials
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/.*dashboard/, { timeout: 10000 });
}

