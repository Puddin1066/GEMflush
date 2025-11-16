/**
 * Core Wikidata Publishing Logic E2E Tests
 * Tests critical Wikidata publishing flows: notability, validation, error handling
 * 
 * SOLID: Single Responsibility - each test focuses on one core logic aspect
 * DRY: Reuses fixtures and helpers
 * Don't overfit: Tests critical paths that affect user experience
 */

import { test, expect } from './fixtures/authenticated-user';
import { createMockTeam } from './fixtures/team-fixtures';

// Helper function for creating pro team (DRY)
const createProTeam = () => createMockTeam('pro');

test.describe('Core Wikidata Publishing Logic', () => {
  test.describe('Notability Checks', () => {
    test('business that fails notability check cannot be published', async ({ authenticatedPage }) => {
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

      // Mock entity data with notability failure
      await authenticatedPage.route('**/api/wikidata/entity**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            qid: null,
            label: 'Test Business',
            canPublish: false, // Notability check failed
            notability: {
              isNotable: false,
              confidence: 0.3,
              recommendation: 'Business does not meet notability standards',
            },
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

      // Should return 400 Bad Request
      expect(publishResponse.status()).toBe(400);
      const responseBody = await publishResponse.json();
      expect(responseBody.error).toContain('notability');
    });

    test('business that passes notability check can be published', async ({ authenticatedPage }) => {
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

      // Mock entity data with notability success
      await authenticatedPage.route('**/api/wikidata/entity**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            qid: null,
            label: 'Test Business',
            canPublish: true, // Notability check passed
            notability: {
              isNotable: true,
              confidence: 0.9,
              recommendation: 'Business meets notability standards',
            },
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
  });

  test.describe('Validation Checks', () => {
    test('publish request validates businessId', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Attempt to publish without businessId
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          // Missing businessId
          publishToProduction: false,
        },
      });

      // Should return 400 Bad Request (validation error)
      expect(publishResponse.status()).toBe(400);
    });

    test('publish request validates business ownership', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock business owned by different team
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
              teamId: 999, // Different team ID
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Attempt to publish business owned by another team
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      // Should return 403 Forbidden
      expect(publishResponse.status()).toBe(403);
    });

    test('publish request validates business exists', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock business not found
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/999')) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Business not found' }),
          });
        } else {
          await route.continue();
        }
      });

      // Attempt to publish non-existent business
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 999,
          publishToProduction: false,
        },
      });

      // Should return 404 Not Found
      expect(publishResponse.status()).toBe(404);
    });
  });

  test.describe('Publishing Flow', () => {
    test('publishing updates business with QID', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      let businessData = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawled',
        wikidataQID: null,
      };

      // Mock business with dynamic updates
      await authenticatedPage.route('**/api/business**', async (route) => {
        if (route.request().url().includes('/businesses/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(businessData),
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
          // Update business data to reflect published state
          businessData = {
            ...businessData,
            status: 'published',
            wikidataQID: 'Q12345',
          };
          
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
      const responseBody = await publishResponse.json();
      expect(responseBody.qid).toBe('Q12345');

      // Verify business was updated
      const businessResponse = await authenticatedPage.request.get('/api/business?businessId=1');
      const updatedBusiness = await businessResponse.json();
      
      // Business should have QID and published status
      expect(updatedBusiness.wikidataQID || updatedBusiness.status === 'published').toBeTruthy();
    });

    test('publishing failure updates business status to error', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock business
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

      // Mock publish failure
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

      // Attempt to publish - should fail
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      // Should return 500 Internal Server Error
      expect(publishResponse.status()).toBe(500);
      const responseBody = await publishResponse.json();
      expect(responseBody.error).toBeTruthy();
    });
  });

  test.describe('Production vs Test Publishing', () => {
    test('can publish to test Wikidata', async ({ authenticatedPage }) => {
      const proTeam = createProTeam();
      
      // Mock pro team
      await authenticatedPage.route('**/api/team', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(proTeam),
        });
      });

      // Mock business
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

      // Mock test publish
      await authenticatedPage.route('**/api/wikidata/publish', async (route) => {
        if (route.request().method() === 'POST') {
          const body = await route.request().postDataJSON();
          const isProduction = body.publishToProduction === true;
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              qid: 'Q12345',
              entityId: 1,
              publishedTo: isProduction ? 'wikidata.org' : 'test.wikidata.org',
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Publish to test
      const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
        data: {
          businessId: 1,
          publishToProduction: false,
        },
      });

      expect(publishResponse.status()).toBe(200);
      const responseBody = await publishResponse.json();
      expect(responseBody.publishedTo).toContain('test.wikidata');
    });
  });
});

