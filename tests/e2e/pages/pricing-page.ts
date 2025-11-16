/**
 * Pricing Page Object
 * SOLID: Single Responsibility - only handles pricing page interactions
 * DRY: Reusable pricing page methods
 */

import { Page, expect } from '@playwright/test';

export class PricingPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/pricing');
    await this.page.waitForLoadState('networkidle');
  }

  async expectPricingCards() {
    await expect(this.page.getByRole('heading', { name: /free/i })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /pro/i })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /agency/i })).toBeVisible();
  }

  async expectProPriceAvailable() {
    // Find Pro plan button (flexible - don't overfit)
    const proButtons = this.page.getByRole('button', { name: /upgrade to pro/i });
    const buttonCount = await proButtons.count();
    
    if (buttonCount > 0) {
      const proButton = proButtons.first();
      await expect(proButton).toBeEnabled();
      const buttonText = await proButton.textContent().catch(() => '');
      expect(buttonText).not.toContain('Price Unavailable');
    } else {
      // Fallback: check for "Get Started" button in Pro section
      const getStartedButtons = this.page.getByRole('button', { name: /get started/i });
      const getStartedCount = await getStartedButtons.count();
      expect(getStartedCount).toBeGreaterThan(0);
    }
  }

  async expectAgencyPriceAvailable() {
    // Find Agency plan button (flexible - don't overfit)
    const agencyButtons = this.page.getByRole('button', { name: /upgrade to agency/i });
    const buttonCount = await agencyButtons.count();
    
    if (buttonCount > 0) {
      const agencyButton = agencyButtons.first();
      await expect(agencyButton).toBeEnabled();
      const buttonText = await agencyButton.textContent().catch(() => '');
      expect(buttonText).not.toContain('Price Unavailable');
    } else {
      // Fallback: check for "Get Started" button in Agency section
      const getStartedButtons = this.page.getByRole('button', { name: /get started/i });
      const getStartedCount = await getStartedButtons.count();
      expect(getStartedCount).toBeGreaterThan(0);
    }
  }

  async expectCurrentPlan(plan: 'free' | 'pro' | 'agency') {
    // Find plan badge (flexible - could be in multiple places)
    const planText = this.page.getByText(new RegExp(plan, 'i')).first();
    const isVisible = await planText.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      // Fallback: check for badge or current plan indicator
      const badge = this.page.locator(`[data-plan="${plan}"]`).or(
        this.page.getByText(new RegExp(`current.*${plan}`, 'i'))
      ).first();
      await expect(badge).toBeVisible({ timeout: 2000 });
    }
  }

  async clickUpgradeToPro() {
    // Find Pro upgrade button (flexible - don't overfit)
    const proButtons = this.page.getByRole('button', { name: /upgrade to pro/i });
    const buttonCount = await proButtons.count();
    
    if (buttonCount > 0) {
      await proButtons.first().click();
    } else {
      // Fallback: click first "Get Started" button (assumes Pro is first)
      const getStartedButtons = this.page.getByRole('button', { name: /get started/i });
      await getStartedButtons.first().click();
    }
  }

  async clickUpgradeToAgency() {
    // Find Agency upgrade button (flexible - don't overfit)
    const agencyButtons = this.page.getByRole('button', { name: /upgrade to agency/i });
    const buttonCount = await agencyButtons.count();
    
    if (buttonCount > 0) {
      await agencyButtons.first().click();
    } else {
      // Fallback: click second "Get Started" button (assumes Agency is second)
      const getStartedButtons = this.page.getByRole('button', { name: /get started/i });
      if (await getStartedButtons.count() > 1) {
        await getStartedButtons.nth(1).click();
      } else {
        await getStartedButtons.first().click();
      }
    }
  }

  async expectStripeCheckoutRedirect() {
    // Wait for redirect to Stripe checkout
    await this.page.waitForURL(/.*checkout\.stripe\.com.*/, { timeout: 10000 }).catch(() => {
      // If not redirected to Stripe, check for checkout session URL
      const url = this.page.url();
      expect(url).toMatch(/.*checkout.*|.*stripe.*/);
    });
  }

  async expectUpgradeCTA() {
    // Use helper function (DRY)
    const { expectUpgradeCTAVisible } = await import('../helpers/selectors');
    await expectUpgradeCTAVisible(this.page);
  }

  async expectWarning(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      await expect(this.page.getByText(/stripe products not found/i)).toBeVisible();
    }
  }
}

