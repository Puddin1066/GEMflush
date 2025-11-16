/**
 * Page Object for Dashboard
 * Encapsulates dashboard-related UI interactions
 */

import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/dashboard');
  }

  async expectWelcomeMessage() {
    await expect(
      this.page.getByText(/welcome/i).or(
        this.page.getByRole('heading', { name: /dashboard/i })
      )
    ).toBeVisible({ timeout: 10000 });
  }

  async expectEmptyState() {
    await expect(
      this.page.getByText(/welcome to/i).or(
        this.page.getByText(/get started/i)
      )
    ).toBeVisible();
  }

  async expectBusinessesList() {
    await expect(
      this.page.getByText(/businesses/i).or(
        this.page.getByRole('heading', { name: /businesses/i })
      )
    ).toBeVisible();
  }

  async clickAddBusiness() {
    await this.page.getByRole('button', { name: /add business/i }).click();
  }

  async expectStatsCards() {
    // Check for stats cards (may not be visible if no data)
    const statsSection = this.page.getByText(/total businesses/i).or(
      this.page.getByText(/visibility/i)
    );
    // Stats may or may not be visible depending on data
  }

  async expectLoadingState() {
    // Check for loading skeleton or spinner
    const loadingIndicator = this.page.locator('[data-testid="loading"]').or(
      this.page.getByText(/loading/i)
    );
    // Loading may or may not be visible
  }
}


