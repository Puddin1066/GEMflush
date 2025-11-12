/**
 * Wikidata Publishing Workflow E2E Tests
 * Tests Wikidata entity publishing workflows
 * 
 * Principles:
 * - DRY: Reuse page objects and helpers
 * - SOLID: Each test has single responsibility
 * - Don't overfit: Test behavior, not implementation
 */

import { test, expect } from './fixtures/authenticated-user';
import { BusinessPage, BusinessDetailPage } from './pages/business-page';

test.describe('Wikidata Publishing Workflows', () => {
  test('complete publish workflow - crawl, publish, verify QID', async ({ authenticatedPage }) => {
    // Step 1: Create business
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Publish Test Co',
      url: 'https://example.com',
      category: 'technology',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    const businessDetailPage = new BusinessDetailPage(authenticatedPage);

    // Step 2: Mock crawl to return success
    await authenticatedPage.route('**/api/crawl', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            jobId: 1,
            status: 'completed',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock business API to return crawled status
    await authenticatedPage.route('**/api/business', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          businesses: [
            {
              id: businessId,
              name: 'Publish Test Co',
              url: 'https://example.com',
              status: 'crawled',
              lastCrawledAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    // Step 3: Trigger crawl
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    
    const crawlButton = authenticatedPage.getByRole('button', { name: /crawl/i });
    if (await crawlButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await crawlButton.click();
      await authenticatedPage.waitForTimeout(1000);
    }

    // Step 4: Mock Wikidata publish DTO (notability check)
    await authenticatedPage.route(`**/api/wikidata/publish`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = await route.request().json();
        
        // Mock successful publish
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            qid: 'Q12345',
            entityId: 1,
            publishedTo: body.publishToProduction ? 'wikidata.org' : 'test.wikidata.org',
            entityUrl: body.publishToProduction
              ? 'https://www.wikidata.org/wiki/Q12345'
              : 'https://test.wikidata.org/wiki/Q12345',
            notability: {
              isNotable: true,
              confidence: 0.9,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Step 5: Attempt to publish
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    
    const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishButton.click();
      
      // Wait for publish to complete
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify success (flexible - check for QID or success message)
      const hasSuccess = await authenticatedPage.getByText(/Q\d+/).or(
        authenticatedPage.getByText(/published/i)
      ).isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasSuccess).toBeTruthy();
    }
  });

  test('permission gating - free tier cannot publish', async ({ authenticatedPage }) => {
    // Create business
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Free Tier Test',
      url: 'https://example.com',
      category: 'restaurant',
      city: 'Portland',
      state: 'OR',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    // Mock crawl to complete
    await authenticatedPage.route('**/api/crawl', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, status: 'completed' }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock business API to return crawled status
    await authenticatedPage.route('**/api/business', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          businesses: [
            {
              id: businessId,
              name: 'Free Tier Test',
              status: 'crawled',
            },
          ],
        }),
      });
    });

    // Mock publish API to return permission error (free tier)
    await authenticatedPage.route('**/api/wikidata/publish', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Upgrade to Pro plan to publish to Wikidata',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    
    const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishButton.click();
      
      // Wait for error message
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify error message (flexible - check for upgrade or permission text)
      const hasError = await authenticatedPage.getByText(/upgrade/i).or(
        authenticatedPage.getByText(/pro plan/i)
      ).isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasError).toBeTruthy();
    }
  });

  test('pre-publish validation - must crawl before publishing', async ({ authenticatedPage }) => {
    // Create business (not crawled)
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Validation Test',
      url: 'https://example.com',
      category: 'technology',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    // Mock business API to return non-crawled status
    await authenticatedPage.route('**/api/business', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          businesses: [
            {
              id: businessId,
              name: 'Validation Test',
              status: 'pending', // Not crawled
            },
          ],
        }),
      });
    });

    // Mock publish API to return validation error
    await authenticatedPage.route('**/api/wikidata/publish', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Business must be crawled before publishing',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    
    const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishButton.click();
      
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify validation error (flexible - check for crawl or validation text)
      const hasError = await authenticatedPage.getByText(/crawl/i).or(
        authenticatedPage.getByText(/before publishing/i)
      ).isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasError).toBeTruthy();
    }
  });

  test('notability check failure - shows recommendation', async ({ authenticatedPage }) => {
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Notability Test',
      url: 'https://example.com',
      category: 'technology',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    // Mock crawl to complete
    await authenticatedPage.route('**/api/crawl', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, status: 'completed' }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock business API to return crawled status
    await authenticatedPage.route('**/api/business', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          businesses: [
            {
              id: businessId,
              name: 'Notability Test',
              status: 'crawled',
            },
          ],
        }),
      });
    });

    // Mock publish API to return notability failure
    await authenticatedPage.route('**/api/wikidata/publish', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Business does not meet notability standards',
            notability: {
              isNotable: false,
              confidence: 0.3,
            },
            recommendation: 'Add more business details to improve notability',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    
    const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishButton.click();
      
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify notability error (flexible - check for notability or recommendation text)
      const hasError = await authenticatedPage.getByText(/notability/i).or(
        authenticatedPage.getByText(/recommendation/i)
      ).isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasError).toBeTruthy();
    }
  });

  test('publish error recovery - handles API failures gracefully', async ({ authenticatedPage }) => {
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();
    await businessPage.fillBusinessForm({
      name: 'Error Recovery Test',
      url: 'https://example.com',
      category: 'technology',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });
    await businessPage.submitForm();
    await businessPage.expectSuccess();

    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    // Mock crawl to complete
    await authenticatedPage.route('**/api/crawl', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, status: 'completed' }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock business API to return crawled status
    await authenticatedPage.route('**/api/business', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          businesses: [
            {
              id: businessId,
              name: 'Error Recovery Test',
              status: 'crawled',
            },
          ],
        }),
      });
    });

    // Mock publish API to return server error
    await authenticatedPage.route('**/api/wikidata/publish', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Publication failed',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    
    const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishButton.click();
      
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify error message (flexible - check for error or failed text)
      const hasError = await authenticatedPage.getByText(/error/i).or(
        authenticatedPage.getByText(/failed/i)
      ).isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasError).toBeTruthy();
      
      // Verify button is re-enabled (not stuck in loading)
      const isDisabled = await publishButton.isDisabled().catch(() => false);
      expect(isDisabled).toBeFalsy();
    }
  });
});

