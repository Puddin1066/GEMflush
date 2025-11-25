/**
 * E2E Test Business Helper
 * DRY: Extracts common business creation patterns from tests
 * 
 * Following TDD: Helper supports test requirements
 */

import { Page, expect } from '@playwright/test';

export interface CreateBusinessOptions {
  url?: string;
  waitForRedirect?: boolean;
  timeout?: number;
}

export interface CreateBusinessResult {
  businessId?: number;
  redirected: boolean;
  url: string;
}

/**
 * Creates a business via the UI
 * DRY: Centralized business creation pattern used across multiple tests
 * 
 * @param page - Playwright page instance
 * @param options - Creation options
 * @returns Result with business ID if redirect occurred
 */
export async function createBusinessViaUI(
  page: Page,
  options: CreateBusinessOptions = {}
): Promise<CreateBusinessResult> {
  const {
    url = 'https://example.com',
    waitForRedirect = true,
    timeout = 20000,
  } = options;

  // Navigate to businesses page if not already there
  const currentUrl = page.url();
  if (!currentUrl.includes('/dashboard/businesses')) {
    await page.goto('/dashboard/businesses');
  }

  // Open business creation dialog
  await page.click('button:has-text("Add Business")');
  
  // Wait for dialog to open
  await page.waitForSelector('input[id="url"]', { timeout: 5000 });
  
  // Fill URL form
  await page.fill('input[id="url"]', url);
  
  // Submit form
  const formButton = page.locator('button[type="submit"]:has-text("Create Business")');
  await formButton.click();
  
  // Wait for redirect if requested
  if (waitForRedirect) {
    try {
      await page.waitForURL(/\/dashboard\/businesses\/\d+/, { timeout });
      const match = page.url().match(/\/dashboard\/businesses\/(\d+)/);
      return {
        businessId: match ? parseInt(match[1], 10) : undefined,
        redirected: true,
        url: page.url(),
      };
    } catch (error) {
      // Check if we're still on businesses list (might be loading or error)
      const finalUrl = page.url();
      if (finalUrl.includes('/dashboard/businesses') && !finalUrl.match(/\/\d+$/)) {
        // Might need to wait for redirect or check for error
        await page.waitForTimeout(2000);
        // Try clicking business link if it appears
        const businessLink = page.locator('a[href*="/businesses/"]').first();
        const linkExists = await businessLink.isVisible({ timeout: 5000 }).catch(() => false);
        if (linkExists) {
          await businessLink.click();
          await page.waitForURL(/\/dashboard\/businesses\/\d+/, { timeout: 10000 });
          const match = page.url().match(/\/dashboard\/businesses\/(\d+)/);
          return {
            businessId: match ? parseInt(match[1], 10) : undefined,
            redirected: true,
            url: page.url(),
          };
        }
      }
      return {
        redirected: false,
        url: finalUrl,
      };
    }
  }
  
  return {
    redirected: false,
    url: page.url(),
  };
}

/**
 * Waits for business detail page to load
 * DRY: Centralized wait logic for business detail pages
 * 
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time
 */
export async function waitForBusinessDetailPage(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  // Wait for URL to match business detail pattern
  await page.waitForURL(/\/dashboard\/businesses\/\d+/, { timeout });
  
  // Wait for page content to load (gem-card indicates business data loaded)
  await expect(page.locator('[class*="gem-card"]').first()).toBeVisible({ timeout });
}

/**
 * Navigates to business detail page by clicking on business card
 * DRY: Centralized navigation pattern
 * 
 * @param page - Playwright page instance
 * @param index - Index of business card to click (default: 0 for first)
 */
export async function navigateToBusinessDetail(
  page: Page,
  index: number = 0
): Promise<void> {
  const businessCard = page.locator('[class*="gem-card"]').nth(index);
  await businessCard.click();
  await waitForBusinessDetailPage(page);
}


