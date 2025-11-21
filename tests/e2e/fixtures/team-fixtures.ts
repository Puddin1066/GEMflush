/**
 * Team Fixtures for E2E Tests
 * DRY: Reusable fixtures for different plan tiers
 * SOLID: Single Responsibility - only handles team plan setup
 */

import { test as base, type Page } from '@playwright/test';
import type { Team } from '@/lib/db/schema';

type PlanTier = 'free' | 'pro' | 'agency';

interface TeamFixtures {
  freeTeam: Team;
  proTeam: Team;
  agencyTeam: Team;
  freePage: Page;
  proPage: Page;
  agencyPage: Page;
}

/**
 * Mock team data for different plan tiers
 * DRY: Centralized team data
 */
const createMockTeam = (planTier: PlanTier): Team => {
  const baseTeam = {
    id: 1,
    name: 'Test Team',
    createdAt: new Date(),
    updatedAt: new Date(),
    stripeCustomerId: planTier === 'free' ? null : `cus_test_${planTier}`,
    stripeSubscriptionId: planTier === 'free' ? null : `sub_test_${planTier}`,
    stripeProductId: planTier === 'free' ? null : `prod_test_${planTier}`,
    subscriptionStatus: planTier === 'free' ? null : ('active' as const),
  };

  return {
    ...baseTeam,
    planName: planTier,
    planId: planTier, // Alias for planName
  } as Team;
};

export const testWithTeam = base.extend<TeamFixtures>({
  freeTeam: async ({}, use) => {
    const team = createMockTeam('free');
    await use(team);
  },

  proTeam: async ({}, use) => {
    const team = createMockTeam('pro');
    await use(team);
  },

  agencyTeam: async ({}, use) => {
    const team = createMockTeam('agency');
    await use(team);
  },

  freePage: async ({ page }, use) => {
    // Mock API to return free team
    await page.route('**/api/team', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockTeam('free')),
      });
    });
    await use(page);
  },

  proPage: async ({ page }, use) => {
    // Mock API to return pro team
    await page.route('**/api/team', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockTeam('pro')),
      });
    });
    await use(page);
  },

  agencyPage: async ({ page }, use) => {
    // Mock API to return agency team
    await page.route('**/api/team', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockTeam('agency')),
      });
    });
    await use(page);
  },
});

export { createMockTeam, type PlanTier };










