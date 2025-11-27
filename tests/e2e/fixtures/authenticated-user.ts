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
    // Strategy: Use same approach as auth.spec.ts which works
    
    // Clear any existing session cookies first (SOLID: ensure clean state)
    // DRY: Prevents issues from previous test runs
    await page.context().clearCookies();
    
    // Navigate to sign-up page
    await page.goto('/sign-up', { waitUntil: 'networkidle' });
    
    // Wait for URL to stabilize (handle any redirects)
    try {
      await page.waitForURL(/.*sign-up/, { timeout: 5000 });
    } catch (error) {
      // URL didn't match /sign-up - check what we got
      const currentUrl = page.url();
      if (currentUrl.includes('/sign-in') && !currentUrl.includes('/sign-up')) {
        throw new Error(
          `BUG IDENTIFIED: Sign-up page redirected to sign-in.\n` +
          `Expected: /sign-up\n` +
          `Actual: ${currentUrl}\n` +
          `This is a routing bug. Possible causes:\n` +
          `1. Middleware redirecting (check middleware.ts)\n` +
          `2. Client-side redirect in Login component (check app/(login)/login.tsx)\n` +
          `3. Next.js routing issue (check app/(login)/sign-up/page.tsx)\n` +
          `4. Stale session cookie not cleared (check cookie clearing logic)`
        );
      }
      // Some other URL - re-throw original error
      throw error;
    }
    
    // Double-check URL after wait
    const currentUrl = page.url();
    if (currentUrl.includes('/sign-in') && !currentUrl.includes('/sign-up')) {
      throw new Error(
        `BUG IDENTIFIED: Sign-up page redirected to sign-in after URL wait.\n` +
        `Expected: /sign-up\n` +
        `Actual: ${currentUrl}\n` +
        `This indicates a redirect is happening after page load.`
      );
    }
    
    // Check if page loaded correctly (not 404)
    const pageTitle = await page.title();
    if (pageTitle.includes('404') || pageTitle.includes('not found')) {
      // Page returned 404 - wait a bit and retry, or check if server is running
      await page.waitForTimeout(2000); // Give server time to start
      await page.reload({ waitUntil: 'networkidle' });
      const retryTitle = await page.title();
      if (retryTitle.includes('404') || retryTitle.includes('not found')) {
        throw new Error(
          `Sign-up page returned 404. Server may not be running or route not found.\n` +
          `URL: ${page.url()}\n` +
          `Title: ${retryTitle}\n` +
          `Please ensure the dev server is running: pnpm dev`
        );
      }
    }
    
    // Wait for React to hydrate - use same pattern as auth.spec.ts (proven to work)
    try {
      // Wait for form element first (most reliable indicator)
      await page.waitForSelector('form', { timeout: 20000, state: 'visible' });
      
      // Wait for email input (using name attribute - most reliable)
      await page.waitForSelector('input[name="email"]', { timeout: 10000, state: 'visible' });
      
      // Wait for password input
      await page.waitForSelector('input[name="password"]', { timeout: 10000, state: 'visible' });
      
      // Verify we're still on sign-up page (not redirected during hydration)
      const finalUrl = page.url();
      if (!finalUrl.includes('/sign-up')) {
        throw new Error(
          `BUG IDENTIFIED: Page redirected from /sign-up to ${finalUrl} during React hydration.\n` +
          `This indicates a client-side redirect bug. Check app/(login)/login.tsx useEffect hooks.`
        );
      }
      
      // Check which heading is visible to determine which page we're on
      const signUpHeading = page.getByRole('heading', { name: /create your account/i });
      const signInHeading = page.getByRole('heading', { name: /sign in/i });
      
      const isSignUpVisible = await signUpHeading.isVisible({ timeout: 5000 }).catch(() => false);
      const isSignInVisible = await signInHeading.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isSignInVisible && !isSignUpVisible) {
        throw new Error(
          `BUG IDENTIFIED: Sign-up page shows sign-in content. URL: ${finalUrl}\n` +
          `This indicates a routing or component rendering bug.\n` +
          `Check: app/(login)/sign-up/page.tsx and app/(login)/login.tsx mode prop`
        );
      }
      
      // Also verify heading is visible (confirms page structure)
      await expect(signUpHeading).toBeVisible({ timeout: 10000 });
      
    } catch (error) {
      // Better error reporting - capture page state for debugging
      const pageText = await page.textContent('body').catch(() => '') || '';
      const pageTitle = await page.title().catch(() => '') || '';
      const pageUrl = page.url();
      
      console.error('Sign-up page failed to load:', {
        error: error instanceof Error ? error.message : String(error),
        pageUrl,
        pageTitle,
        pageTextPreview: pageText.substring(0, 500),
        hasForm: await page.locator('form').count().catch(() => 0),
        hasEmailInput: await page.locator('input[name="email"]').count().catch(() => 0),
      });
      
      throw new Error(
        `Sign-up form did not load: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        `URL: ${pageUrl}\n` +
        `Title: ${pageTitle}\n` +
        `Page preview: ${pageText.substring(0, 200)}`
      );
    }
    
    // Fill form - use name attribute first (most reliable), fallback to label
    const emailInput = page.locator('input[name="email"]').first();
    const passwordInput = page.locator('input[name="password"]').first();
    
    await emailInput.fill(testUser.email, { timeout: 10000 });
    await passwordInput.fill(testUser.password, { timeout: 10000 });
    
    // Submit form and wait for navigation
    const submitButton = page.getByRole('button', { name: /sign up/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    
    await Promise.all([
      page.waitForURL(/.*dashboard/, { timeout: 30000 }),
      submitButton.click()
    ]);

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

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

