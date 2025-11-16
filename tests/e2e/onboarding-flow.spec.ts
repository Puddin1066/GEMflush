/**
 * E2E: New user onboarding from URL submission to business detail page.
 * DRY/SOLID: Uses shared helpers and mocks only slow/external services.
 */

import { test, expect } from '@playwright/test';
import {
  cleanupRoutes,
  setupFreeTeam,
  mockExternalServices,
  mockCrawlAPI,
  mockFingerprintAPI,
  mockWikidataEntityAPI,
} from './helpers/api-helpers';
import { createTestUserAndSignIn } from './helpers/auth-helper';
import { BusinessPage } from './pages/business-page';

test.describe('Onboarding Flow - URL submission to business detail', () => {
  test.afterEach(async ({ page }) => {
    await cleanupRoutes(page);
  });

  test('new user can add a business URL and see the business detail overview', async ({ page }) => {
    // 1. Authenticated user + team context
    await createTestUserAndSignIn(page);
    await setupFreeTeam(page);

    // 2. Mock external/slow services (MOCKED behavior)
    await mockExternalServices(page);       // OpenRouter, Stripe checkout
    await mockCrawlAPI(page);               // /api/crawl + /api/job/*
    await mockFingerprintAPI(page);         // /api/fingerprint + /api/fingerprint/business/*
    await mockWikidataEntityAPI(page, 1);   // /api/wikidata/entity/*

    // Mock internal business API for a smooth, deterministic flow (MOCKED)
    const mockBusiness = {
      id: 1,
      name: 'Onboarding Test Business',
      url: 'https://example.com',
      status: 'pending',
      category: null,
      location: { city: 'San Francisco', state: 'CA', country: 'US' },
      teamId: 1,
    };

    await page.route('**/api/business', async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ business: mockBusiness, message: 'Business created successfully' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ businesses: [mockBusiness], maxBusinesses: 1 }),
        });
      }
    });

    await page.route('**/api/business/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ business: mockBusiness }),
      });
    });

    // 3–6. Use existing BusinessPage page-object to navigate and submit form
    const businessPage = new BusinessPage(page);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Onboarding Test Business',
      url: 'https://example.com',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    // 7. Verify we landed on the business detail page (robust, real selectors)
    await expect(
      page.getByRole('button', { name: /back to businesses/i })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/businesses\/\d+$/);
  });
});


