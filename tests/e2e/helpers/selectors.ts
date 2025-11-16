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

/**
 * Get upgrade CTA (DRY: reusable selector)
 * Returns the first upgrade button or text found
 */
export function getUpgradeCTA(page: Page): Locator {
  return page.getByRole('button', { name: /upgrade/i }).first().or(
    page.getByText(/upgrade/i).first()
  );
}

/**
 * Check if upgrade CTA is visible (DRY: reusable assertion helper)
 * SOLID: Single Responsibility - only checks visibility
 * Don't overfit: Flexible check for any upgrade-related element
 */
export async function expectUpgradeCTAVisible(page: Page): Promise<void> {
  // Check for upgrade buttons first (most common case)
  const upgradeButtons = page.getByRole('button', { name: /upgrade/i });
  const buttonCount = await upgradeButtons.count();
  
  if (buttonCount > 0) {
    // At least one upgrade button exists, verify it's visible
    const firstButton = upgradeButtons.first();
    const isVisible = await firstButton.isVisible().catch(() => false);
    if (isVisible) {
      return; // Found visible upgrade button
    }
  }
  
  // Check for upgrade text (headings, paragraphs, etc.)
  const upgradeText = page.getByText(/upgrade/i).first();
  const unlockText = page.getByText(/unlock/i).first();
  
  const textVisible = await upgradeText.isVisible().catch(() => false);
  const unlockVisible = await unlockText.isVisible().catch(() => false);
  
  if (!textVisible && !unlockVisible) {
    // Last resort: check if any element with upgrade/unlock is visible
    const anyUpgrade = page.locator('text=/upgrade|unlock/i').first();
    const anyVisible = await anyUpgrade.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!anyVisible) {
      throw new Error('No upgrade CTA found on page');
    }
  }
}

