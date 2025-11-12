/**
 * Shared Test Selectors (DRY Principle)
 * Centralized selectors to avoid duplication across tests
 * Don't overfit - these are flexible selectors that test behavior, not implementation
 */

import { Locator, Page } from '@playwright/test';

/**
 * Get business name input with fallback (flexible - don't overfit)
 */
export function getBusinessNameInput(page: Page): Locator {
  return page.getByLabel(/business name/i).or(page.getByLabel(/name/i));
}

/**
 * Get business URL input with fallback
 */
export function getBusinessUrlInput(page: Page): Locator {
  return page.getByLabel(/website url/i).or(page.getByLabel(/url/i));
}

/**
 * Get create business button with fallback
 */
export function getCreateBusinessButton(page: Page): Locator {
  return page.getByRole('button', { name: /create business/i }).or(
    page.getByRole('button', { name: /create/i })
  );
}

/**
 * Get sign-up button with fallback
 */
export function getSignUpButton(page: Page): Locator {
  return page.getByRole('button', { name: /sign up/i }).or(
    page.getByRole('button', { name: /create.*account/i })
  );
}

/**
 * Get sign-in button with fallback
 */
export function getSignInButton(page: Page): Locator {
  return page.getByRole('button', { name: /sign in/i }).or(
    page.getByRole('button', { name: /log in/i })
  );
}

