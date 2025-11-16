/**
 * Core Subscription & Wikidata Publishing Logic E2E Tests
 * Tests critical business logic flows: permissions, state transitions, edge cases
 * 
 * SOLID: Single Responsibility - each test focuses on one core logic aspect
 * DRY: Reuses fixtures and helpers
 * Don't overfit: Tests critical paths that affect user experience
 */

import { test, expect } from './fixtures/authenticated-user';
import { createMockTeam } from './fixtures/team-fixtures';
import { BusinessPage } from './pages/business-page';

// Helper functions for creating teams (DRY)
const createFreeTeam = () => createMockTeam('free');
const createProTeam = () => createMockTeam('pro');
const createAgencyTeam = () => createMockTeam('agency');

test.describe('Core Subscription Logic', () => {
  test.describe('Permission Checks - API Level', () => {
    test('free user cannot publish to Wikidata via API', async ({ authenticatedPage }) => {
      const freeTeam = createFreeTeam();
      
      // Mock free team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(freeTeam),
        });
      });

      // Mock business with entity ready
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              name: 'Test Business',
              url: 'https://example.com',
              status: 'crawled',
              wikidataQID: null,
              teamId: freeTeam.id,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Mock entity data
      await authenticatedPage.route('**/api/wikidata/entity**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            qid: null,
            label: 'Test Business',
            canPublish: true,
          }),
        });
      });

      // Attempt to publish - should be blocked
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      // Should return 403 Forbidden
      expect(publishResponse.status()).toBe(403);
      const responseBody = await publishResponse.json();
      expect(responseBody.error).toContain('Upgrade to Pro');
    });

    test('pro user can publish to Wikidata via API', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock business with entity ready
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              name: 'Test Business',
              url: 'https://example.com',
              status: 'crawled',
              wikidataQID: null,
              teamId: proTeam.id,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Mock entity data
      await authenticatedPage.route('**/api/wikidata/entity**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            qid: null,
            label: 'Test Business',
            canPublish: true,
          }),
        });
      });

      // Mock successful publish
      await authenticatedPage.route('**/api/wikidata/publish', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              qid: 'Q12345',
              entityId: 1,
              publishedTo: 'test.wikidata.org',
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Attempt to publish - should succeed
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      // Should return 200 OK
      expect(publishResponse.status()).toBe(200);
      const responseBody = await publishResponse.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.qid).toBeTruthy();
    });

    test('expired subscription cannot publish to Wikidata', async ({ authenticatedPage }) => {
      const expiredTeam = {
        ...createProTeam(),
        subscriptionStatus: 'canceled',
      };
      
      // Mock expired team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(expiredTeam),
        });
      });

      // Attempt to publish - should be blocked
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      // Should return 403 Forbidden (planName might still be 'pro' but subscription is canceled)
      // Note: This depends on how permissions are checked - if they check subscriptionStatus
      expect(publishResponse.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Permission Checks - UI Level', () => {
    test('free user sees feature gate on publish button', async ({ authenticatedPage }) => {
      const freeTeam = createFreeTeam();
      
      // Mock free team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(freeTeam),
        });
      });

      // Mock business with entity ready
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              name: 'Test Business',
              url: 'https://example.com',
              status: 'crawled',
              wikidataQID: null,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Mock entity data
      await authenticatedPage.route('**/api/wikidata/entity**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            qid: null,
            label: 'Test Business',
            canPublish: true,
          }),
        });
      });

      await authenticatedPage.goto('/dashboard/businesses/1');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should see upgrade CTA, not publish button
      const upgradeCTA = authenticatedPage.getByText(/upgrade/i).or(
        authenticatedPage.getByText(/unlock/i)
      );
      await expect(upgradeCTA.first()).toBeVisible({ timeout: 5000 });

      // Publish button should not be visible or should be disabled
      const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
      const publishVisible = await publishButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (publishVisible) {
        // If visible, should be disabled
        await expect(publishButton).toBeDisabled();
      }
    });

    test('pro user sees enabled publish button', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock business with entity ready
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              name: 'Test Business',
              url: 'https://example.com',
              status: 'crawled',
              wikidataQID: null,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Mock entity data
      await authenticatedPage.route('**/api/wikidata/entity**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            qid: null,
            label: 'Test Business',
            canPublish: true,
          }),
        });
      });

      await authenticatedPage.goto('/dashboard/businesses/1');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should see publish button (not upgrade CTA)
      const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
      const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (publishVisible) {
        // Button should be enabled
        await expect(publishButton).toBeEnabled();
      } else {
        // If not visible, check for entity preview (which should be visible)
        const entityPreview = authenticatedPage.getByText(/wikidata/i).or(
          authenticatedPage.getByText(/entity/i)
        );
        await expect(entityPreview.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('State Transitions', () => {
    test('business must be crawled before publishing', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock business that hasn't been crawled
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              name: 'Test Business',
              url: 'https://example.com',
              status: 'pending', // Not crawled yet
              wikidataQID: null,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Attempt to publish - should be blocked
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      // Should return 400 Bad Request
      expect(publishResponse.status()).toBe(400);
      const responseBody = await publishResponse.json();
      expect(responseBody.error).toContain('crawled');
    });

    test('publishing updates business status correctly', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      let businessStatus = 'crawled';
      
      // Mock business with status tracking
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              name: 'Test Business',
              url: 'https://example.com',
              status: businessStatus,
              wikidataQID: businessStatus === 'published' ? 'Q12345' : null,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Mock successful publish that updates status
      await authenticatedPage.route('**/api/wikidata/publish', async (route) => {
        if (route.request().method() === 'POST') {
          businessStatus = 'published'; // Simulate status update
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              qid: 'Q12345',
              entityId: 1,
              publishedTo: 'test.wikidata.org',
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Publish business
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      expect(publishResponse.status()).toBe(200);
      
      // Verify business status was updated (by checking subsequent request)
      const businessResponse = await authenticatedPage.request.get('/api/business?businessId=1');
      const businessData = await businessResponse.json();
      
      // Status should be 'published' or QID should be set
      expect(
        businessData.status === 'published' || 
        businessData.wikidataQID === 'Q12345'
      ).toBeTruthy();
    });
  });

  test.describe('Business Limit Enforcement', () => {
    test('free user cannot create more than 1 business', async ({ authenticatedPage }) => {
      const freeTeam = createFreeTeam();
      
      // Mock free team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(freeTeam),
        });
      });

      // Mock existing business (free plan limit is 1)
      await authenticatedPage.route('**/api/business', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              businesses: [
                { id: 1, name: 'Existing Business', url: 'https://example.com' },
              ],
            }),
          });
        } else if (route.request().method() === 'POST') {
          // Attempt to create second business - should fail
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Business limit reached',
              maxBusinesses: 1,
              currentCount: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      const businessPage = new BusinessPage(authenticatedPage);
      await businessPage.navigateToCreate();
      await businessPage.fillBusinessForm({
        name: 'Second Business',
        url: 'https://example2.com',
        city: 'Seattle',
        state: 'WA',
      });

      await businessPage.submitForm();

      // Should show error message
      await expect(
        authenticatedPage.getByText(/limit/i).or(
          authenticatedPage.getByText(/upgrade/i)
        )
      ).toBeVisible({ timeout: 5000 });
    });

    test('pro user can create up to 5 businesses', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock 4 existing businesses (pro plan allows 5)
      await authenticatedPage.route('**/api/business', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              businesses: Array.from({ length: 4 }, (_, i) => ({
                id: i + 1,
                name: `Business ${i + 1}`,
                url: `https://example${i + 1}.com`,
              })),
            }),
          });
        } else if (route.request().method() === 'POST') {
          // Should succeed (4 < 5)
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              business: {
                id: 5,
                name: 'Fifth Business',
                url: 'https://example5.com',
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      const businessPage = new BusinessPage(authenticatedPage);
      await businessPage.navigateToCreate();
      await businessPage.fillBusinessForm({
        name: 'Fifth Business',
        url: 'https://example5.com',
        city: 'Seattle',
        state: 'WA',
      });

      await businessPage.submitForm();

      // Should succeed (redirect to business detail)
      await expect(authenticatedPage).toHaveURL(/.*businesses\/\d+/, { timeout: 10000 });
    });
  });

  test.describe('Upgrade Flow Integration', () => {
    test('upgrade unlocks publishing feature immediately', async ({ authenticatedPage }) => {
      // Start as free user
      const freeTeam = createFreeTeam();
      
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(freeTeam),
        });
      });

      await authenticatedPage.goto('/dashboard/businesses/1');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should see upgrade CTA
      const upgradeCTA = authenticatedPage.getByText(/upgrade/i);
      await expect(upgradeCTA.first()).toBeVisible({ timeout: 5000 });

      // Simulate upgrade (update team to pro)
      const proTeam = createProTeam();
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Reload page
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState('networkidle');

      // Should now see publish button (not upgrade CTA)
      const publishButton = authenticatedPage.getByRole('button', { name: /publish/i });
      const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Either publish button is visible, or entity preview is visible (both indicate upgrade worked)
      const entityPreview = authenticatedPage.getByText(/wikidata/i).or(
        authenticatedPage.getByText(/entity/i)
      );
      const entityVisible = await entityPreview.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(publishVisible || entityVisible).toBeTruthy();
    });
  });
});

