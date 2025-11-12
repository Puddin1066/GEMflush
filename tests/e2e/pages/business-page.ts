/**
 * Page Object for Business Pages
 * Encapsulates business-related UI interactions
 */

import { Page, expect } from '@playwright/test';

export class BusinessPage {
  constructor(private page: Page) {}

  async navigateToCreate() {
    await this.page.goto('/dashboard/businesses/new');
    await expect(this.page.getByRole('heading', { name: /add new business/i })).toBeVisible();
  }

  async fillBusinessForm(data: {
    name: string;
    url: string;
    category?: string;
    city: string;
    state: string;
    country?: string;
    address?: string;
  }) {
    await this.page.getByLabel(/business name/i).or(
      this.page.getByLabel(/name/i)
    ).fill(data.name);

    await this.page.getByLabel(/website url/i).or(
      this.page.getByLabel(/url/i)
    ).fill(data.url);

    if (data.category) {
      await this.page.locator('select[name="category"]').selectOption(data.category);
    }

    if (data.address) {
      await this.page.getByLabel(/address/i).fill(data.address);
    }

    await this.page.getByLabel(/city/i).fill(data.city);
    await this.page.getByLabel(/state/i).fill(data.state);
    
    if (data.country) {
      await this.page.getByLabel(/country/i).fill(data.country);
    }
  }

  async submitForm() {
    const submitButton = this.page.getByRole('button', { name: /create/i }).or(
      this.page.getByRole('button', { name: /submit/i })
    );
    await submitButton.click();
  }

  async expectLoadingState() {
    const submitButton = this.page.getByRole('button', { name: /creating/i }).or(
      this.page.getByRole('button', { name: /create/i })
    );
    await expect(submitButton).toBeDisabled();
  }

  async expectSuccess() {
    // Flexible - wait for redirect to business detail page (don't overfit: test behavior)
    // Allow for redirect delay or URL pattern variations
    await expect(this.page).toHaveURL(/.*businesses\/\d+/, { timeout: 15000 });
    
    // Also verify we're not still on the form page (additional safety check)
    const isOnFormPage = this.page.url().includes('/businesses/new');
    expect(isOnFormPage).toBeFalsy();
  }

  async expectError(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      await expect(this.page.getByText(/error/i)).toBeVisible();
    }
  }

  async expectValidationError() {
    // Form should still be visible (didn't submit)
    await expect(this.page.getByLabel(/name/i)).toBeVisible();
  }
}

export class BusinessDetailPage {
  constructor(private page: Page) {}

  async navigateTo(businessId: number) {
    await this.page.goto(`/dashboard/businesses/${businessId}`);
  }

  async clickCrawlButton() {
    const crawlButton = this.page.getByRole('button', { name: /crawl/i });
    await crawlButton.click();
  }

  async expectCrawlLoading() {
    const crawlButton = this.page.getByRole('button', { name: /crawling/i }).or(
      this.page.getByRole('button', { name: /crawl/i })
    );
    await expect(crawlButton).toBeDisabled();
  }

  async clickAnalyzeButton() {
    const analyzeButton = this.page.getByRole('button', { name: /analyze/i }).or(
      this.page.getByRole('button', { name: /fingerprint/i })
    );
    await analyzeButton.click();
  }

  async expectFingerprintLoading() {
    // Flexible test - check for loading state (don't overfit: test behavior, not implementation)
    // Loading state can be: button disabled, button shows "Analyzing...", or loading skeleton visible
    const loadingSkeleton = this.page.getByText(/running analysis/i).or(
      this.page.getByText(/analyzing/i)
    );
    const analyzeButton = this.page.getByRole('button', { name: /analyze/i });
    
    // Check if loading skeleton is visible OR button is disabled (flexible - don't overfit)
    const hasLoadingState = await loadingSkeleton.isVisible({ timeout: 2000 }).catch(() => false);
    const isButtonDisabled = await analyzeButton.isDisabled({ timeout: 2000 }).catch(() => false);
    
    // At least one loading indicator should be present
    expect(hasLoadingState || isButtonDisabled).toBeTruthy();
  }

  async expectBusinessName(name: string) {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async expectVisibilityScore() {
    await expect(
      this.page.getByText(/visibility/i).or(
        this.page.getByText(/score/i)
      )
    ).toBeVisible({ timeout: 10000 });
  }
}

export class BusinessesListPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/dashboard/businesses');
  }

  async clickAddBusiness() {
    await this.page.getByRole('button', { name: /add business/i }).click();
  }

  async expectEmptyState() {
    await expect(
      this.page.getByText(/no businesses/i).or(
        this.page.getByText(/get started/i)
      )
    ).toBeVisible();
  }

  async expectBusinessCount(count: number) {
    const businesses = this.page.locator('[data-testid="business-card"]').or(
      this.page.locator('a[href*="/businesses/"]')
    );
    await expect(businesses).toHaveCount(count);
  }

  async clickBusiness(name: string) {
    await this.page.getByRole('link', { name }).click();
  }
}

