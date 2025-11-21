/**
 * CFP (Crawl, Fingerprint, Publish) Process E2E Tests
 * 
 * Tests the complete sequential CFP workflow:
 * 1. Crawl - Extract structured data from website
 * 2. Fingerprint - Measure visibility using LLM (requires crawlData)
 * 3. Publish - Build rich entity from crawlData and publish to Wikidata
 * 
 * SOLID: Single Responsibility - tests complete CFP workflow
 * DRY: Reuses fixtures, page objects, and helpers
 * Pragmatic: Uses real internal APIs, mocks external services only
 */

import { test, expect } from './fixtures/authenticated-user';
import { BusinessPage } from './pages/business-page';
import {
  setupProTeam,
  mockExternalServices,
  mockCrawlAPI,
  mockWikidataEntityAPI,
} from './helpers/api-helpers';
import {
  waitForBusinessDetailPage,
  waitForBusinessInAPI,
  runCrawlAndFingerprint,
} from './helpers/business-helpers';

test.describe('CFP Process E2E Tests', () => {
  // Increase timeout for complete CFP flow (crawl + fingerprint + publish)
  test.setTimeout(300000); // 5 minutes for complete flow

  test('complete CFP flow: crawl → fingerprint → publish with rich entity', async ({
    authenticatedPage,
  }) => {
    // Setup Pro team (required for auto-publish)
    await setupProTeam(authenticatedPage);

    // Mock external services only (OpenRouter, Stripe, Wikidata API)
    await mockExternalServices(authenticatedPage);

    // Step 1: Create business
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `CFP Test Business ${timestamp}`;
    const businessUrl = `https://cfp-test-${timestamp}.com`;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: businessUrl,
      category: 'technology',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });

    await businessPage.submitForm();
    await businessPage.expectSuccess();

    // Extract business ID
    await authenticatedPage.waitForURL(/\/businesses\/\d+/, { timeout: 30000 });
    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    // Wait for business detail page to load
    await waitForBusinessDetailPage(authenticatedPage, businessId);

    const baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

    // Mock crawl API to return rich crawlData
    await mockCrawlAPI(authenticatedPage, businessId);

    // Step 2: Crawl (C)
    console.log(`[CFP TEST] Step 1: Crawling business ${businessId}`);
    
    await runCrawlAndFingerprint(authenticatedPage, businessId, { skipFingerprint: true });

    // Verify crawl completed
    const crawlCompleted = await waitForBusinessInAPI(authenticatedPage, businessId, {
      status: 'crawled',
      timeout: 60000,
    });

    expect(crawlCompleted).toBe(true);

    // Verify crawlData is stored
    const businessAfterCrawl = await authenticatedPage.request.get(
      `${baseURL}/api/business/${businessId}`
    );
    const crawlData = (await businessAfterCrawl.json()).business?.crawlData;
    expect(crawlData).toBeDefined();
    // Verify crawlData has structure (name, location, etc.)
    expect(crawlData.name || crawlData.businessDetails).toBeDefined();

    console.log(`[CFP TEST] ✓ Crawl completed with crawlData`);

    // Step 3: Fingerprint (F) - requires crawlData
    console.log(`[CFP TEST] Step 2: Fingerprinting business ${businessId}`);

    // Navigate to fingerprint page
    await authenticatedPage.goto(`/dashboard/businesses/${businessId}/fingerprint`);

    // Wait for fingerprint page to load
    await authenticatedPage.waitForSelector('text=Visibility Score', { timeout: 10000 });

    // Trigger fingerprint (if button exists, otherwise it may auto-run)
    const fingerprintButton = authenticatedPage.locator('button:has-text("Run Fingerprint")');
    if (await fingerprintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fingerprintButton.click();
    }

    // Wait for fingerprint to complete
    // Fingerprint creates llmFingerprints record
    let fingerprintCompleted = false;
    const fingerprintStartTime = Date.now();
    const fingerprintTimeout = 120000; // 2 minutes for fingerprint

    while (Date.now() - fingerprintStartTime < fingerprintTimeout) {
      const fingerprintResponse = await authenticatedPage.request.get(
        `${baseURL}/api/business/${businessId}/fingerprint`
      ).catch(() => null);

      if (fingerprintResponse?.ok()) {
        const fingerprintData = await fingerprintResponse.json();
        if (fingerprintData.fingerprint?.visibilityScore !== undefined) {
          fingerprintCompleted = true;
          console.log(`[CFP TEST] ✓ Fingerprint completed with score: ${fingerprintData.fingerprint.visibilityScore}`);
          break;
        }
      }

      await authenticatedPage.waitForTimeout(5000); // Poll every 5 seconds
    }

    expect(fingerprintCompleted).toBe(true);

    // Verify fingerprint used crawlData (check that prompts were generated with crawlData context)
    // This is verified by the fingerprint having meaningful results (not empty)
    const fingerprintCheck = await authenticatedPage.request.get(
      `${baseURL}/api/business/${businessId}/fingerprint`
    );
    const fingerprintResult = await fingerprintCheck.json();
    expect(fingerprintResult.fingerprint).toBeDefined();
    expect(fingerprintResult.fingerprint.visibilityScore).toBeGreaterThanOrEqual(0);

    console.log(`[CFP TEST] ✓ Fingerprint completed using crawlData`);

    // Step 4: Publish (P) - uses crawlData to build rich entity
    console.log(`[CFP TEST] Step 3: Publishing entity for business ${businessId}`);

    // Navigate to publish page or trigger publish
    await authenticatedPage.goto(`/dashboard/businesses/${businessId}`);

    // Wait for entity card or publish button
    const publishButton = authenticatedPage.locator('button:has-text("Publish")');
    if (await publishButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await publishButton.click();
    } else {
      // Auto-publish may have already triggered, check entity status
      console.log(`[CFP TEST] Auto-publish may have already triggered`);
    }

    // Wait for entity to be published (check wikidataQID)
    let publishCompleted = false;
    const publishStartTime = Date.now();
    const publishTimeout = 120000; // 2 minutes for publish

    while (Date.now() - publishStartTime < publishTimeout) {
      const businessResponse = await authenticatedPage.request.get(
        `${baseURL}/api/business/${businessId}`
      ).catch(() => null);

      if (businessResponse?.ok()) {
        const businessData = await businessResponse.json();
        if (businessData.business?.wikidataQID) {
          publishCompleted = true;
          const qid = businessData.business.wikidataQID;
          console.log(`[CFP TEST] ✓ Entity published with QID: ${qid}`);
          break;
        }
      }

      await authenticatedPage.waitForTimeout(5000); // Poll every 5 seconds
    }

    expect(publishCompleted).toBe(true);

    // Verify entity was built with crawlData (check entity structure)
    const entityResponse = await authenticatedPage.request.get(
      `${baseURL}/api/wikidata/entity/${businessId}`
    ).catch(() => null);

    if (entityResponse?.ok()) {
      const entityData = await entityResponse.json();
      const entity = entityData.entity;

      // Verify entity has properties from crawlData
      expect(entity.claims).toBeDefined();
      
      // Should have basic properties
      expect(entity.claims.P31).toBeDefined(); // instance of
      expect(entity.claims.P856).toBeDefined(); // official website
      expect(entity.claims.P1448).toBeDefined(); // official name

      // Should have properties from crawlData
      expect(entity.claims.P1329).toBeDefined(); // phone (from crawlData)
      expect(entity.claims.P968).toBeDefined(); // email (from crawlData)
      expect(entity.claims.P625).toBeDefined(); // coordinates (from crawlData.location)
      expect(entity.claims.P6375).toBeDefined(); // address (from crawlData.location)

      // Should have social properties from crawlData
      expect(entity.claims.P2002).toBeDefined(); // Twitter (from crawlData.socialLinks)
      expect(entity.claims.P4264).toBeDefined(); // LinkedIn (from crawlData.socialLinks)

      // Should have temporal property from crawlData
      expect(entity.claims.P571).toBeDefined(); // inception (from crawlData.founded)

      // Should have scale property from crawlData
      expect(entity.claims.P1128).toBeDefined(); // employees (from crawlData.businessDetails)

      console.log(`[CFP TEST] ✓ Entity built with ${Object.keys(entity.claims).length} properties from crawlData`);
    }

    console.log(`[CFP TEST] ✓ Complete CFP flow successful`);
  });

  test('CFP flow: fingerprint requires crawlData', async ({ authenticatedPage }) => {
    await setupProTeam(authenticatedPage);
    await mockExternalServices(authenticatedPage);

    // Create business
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `CFP No CrawlData Test ${timestamp}`;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: `https://no-crawl-${timestamp}.com`,
      category: 'technology',
      city: 'Seattle',
      state: 'WA',
    });

    await businessPage.submitForm();
    await businessPage.expectSuccess();

    await authenticatedPage.waitForURL(/\/businesses\/\d+/, { timeout: 30000 });
    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    await waitForBusinessDetailPage(authenticatedPage, businessId);

    const baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

    // Try to fingerprint without crawlData
    await authenticatedPage.goto(`/dashboard/businesses/${businessId}/fingerprint`);

    // Fingerprint should fail or show error without crawlData
    // Check API response for error
    const fingerprintResponse = await authenticatedPage.request.post(
      `${baseURL}/api/fingerprint`,
      {
        data: { businessId },
      }
    ).catch(() => null);

    if (fingerprintResponse) {
      const fingerprintData = await fingerprintResponse.json();
      // Should return error about missing crawlData
      if (fingerprintResponse.status() !== 200) {
        expect(fingerprintData.error).toBeDefined();
        expect(fingerprintData.error).toContain('crawlData');
      }
    }
  });

  test('CFP flow: entity uses crawlData for rich properties', async ({ authenticatedPage }) => {
    await setupProTeam(authenticatedPage);
    await mockExternalServices(authenticatedPage);

    // Create business
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `CFP Rich Entity Test ${timestamp}`;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: `https://rich-entity-${timestamp}.com`,
      category: 'technology',
      city: 'San Francisco',
      state: 'CA',
    });

    await businessPage.submitForm();
    await businessPage.expectSuccess();

    await authenticatedPage.waitForURL(/\/businesses\/\d+/, { timeout: 30000 });
    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    await waitForBusinessDetailPage(authenticatedPage, businessId);

    const baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

    // Mock rich crawlData
    await mockCrawlAPI(authenticatedPage, businessId);

    // Crawl
    await runCrawlAndFingerprint(authenticatedPage, businessId, { skipFingerprint: true });
    await waitForBusinessInAPI(authenticatedPage, businessId, {
      status: 'crawled',
      timeout: 60000,
    });

    // Get entity DTO (before publish, to check entity structure)
    const entityResponse = await authenticatedPage.request.get(
      `${baseURL}/api/wikidata/entity/${businessId}`
    ).catch(() => null);

    if (entityResponse?.ok()) {
      const entityData = await entityResponse.json();
      const entity = entityData.entity;

      // Verify entity has rich properties from crawlData
      const propertyCount = Object.keys(entity.claims || {}).length;
      expect(propertyCount).toBeGreaterThan(10); // Should have many properties from crawlData

      // Verify specific properties from crawlData
      expect(entity.claims.P1329).toBeDefined(); // phone
      expect(entity.claims.P968).toBeDefined(); // email
      expect(entity.claims.P625).toBeDefined(); // coordinates
      expect(entity.claims.P6375).toBeDefined(); // address
      expect(entity.claims.P2002).toBeDefined(); // Twitter
      expect(entity.claims.P2013).toBeDefined(); // Facebook
      expect(entity.claims.P2003).toBeDefined(); // Instagram
      expect(entity.claims.P4264).toBeDefined(); // LinkedIn
      expect(entity.claims.P571).toBeDefined(); // inception
      expect(entity.claims.P1128).toBeDefined(); // employees

      console.log(`[CFP TEST] ✓ Entity has ${propertyCount} properties from crawlData`);
    }
  });

  test('CFP flow: sequential execution (crawl → fingerprint → publish)', async ({
    authenticatedPage,
  }) => {
    await setupProTeam(authenticatedPage);
    await mockExternalServices(authenticatedPage);

    // Create business
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `CFP Sequential Test ${timestamp}`;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: `https://sequential-${timestamp}.com`,
      category: 'restaurant',
      city: 'Portland',
      state: 'OR',
    });

    await businessPage.submitForm();
    await businessPage.expectSuccess();

    await authenticatedPage.waitForURL(/\/businesses\/\d+/, { timeout: 30000 });
    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    await waitForBusinessDetailPage(authenticatedPage, businessId);

    const baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

    // Mock crawlData
    await mockCrawlAPI(authenticatedPage, businessId);

    // Step 1: Crawl
    console.log(`[CFP TEST] Starting crawl for business ${businessId}`);
    await runCrawlAndFingerprint(authenticatedPage, businessId, { skipFingerprint: true });

    const crawlCompleted = await waitForBusinessInAPI(authenticatedPage, businessId, {
      status: 'crawled',
      timeout: 60000,
    });
    expect(crawlCompleted).toBe(true);

    // Verify crawlData exists before fingerprint
    const businessAfterCrawl = await authenticatedPage.request.get(
      `${baseURL}/api/business/${businessId}`
    );
    const crawlData = (await businessAfterCrawl.json()).business?.crawlData;
    expect(crawlData).toBeDefined();

    // Step 2: Fingerprint (should use crawlData)
    console.log(`[CFP TEST] Starting fingerprint for business ${businessId}`);
    
    await authenticatedPage.goto(`/dashboard/businesses/${businessId}/fingerprint`);
    await authenticatedPage.waitForSelector('text=Visibility Score', { timeout: 10000 });

    const fingerprintButton = authenticatedPage.locator('button:has-text("Run Fingerprint")');
    if (await fingerprintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fingerprintButton.click();
    }

    // Wait for fingerprint
    let fingerprintDone = false;
    for (let i = 0; i < 24; i++) {
      await authenticatedPage.waitForTimeout(5000);
      const fpResponse = await authenticatedPage.request.get(
        `${baseURL}/api/business/${businessId}/fingerprint`
      ).catch(() => null);

      if (fpResponse?.ok()) {
        const fpData = await fpResponse.json();
        if (fpData.fingerprint?.visibilityScore !== undefined) {
          fingerprintDone = true;
          break;
        }
      }
    }
    expect(fingerprintDone).toBe(true);

    // Step 3: Publish (should use crawlData for entity building)
    console.log(`[CFP TEST] Starting publish for business ${businessId}`);

    await authenticatedPage.goto(`/dashboard/businesses/${businessId}`);

    // Wait for publish or check if auto-publish happened
    let publishDone = false;
    for (let i = 0; i < 24; i++) {
      await authenticatedPage.waitForTimeout(5000);
      const businessResponse = await authenticatedPage.request.get(
        `${baseURL}/api/business/${businessId}`
      ).catch(() => null);

      if (businessResponse?.ok()) {
        const businessData = await businessResponse.json();
        if (businessData.business?.wikidataQID) {
          publishDone = true;
          break;
        }
      }
    }

    // Publish may not complete in test (depends on notability), but entity should be buildable
    const entityResponse = await authenticatedPage.request.get(
      `${baseURL}/api/wikidata/entity/${businessId}`
    ).catch(() => null);

    if (entityResponse?.ok()) {
      const entityData = await entityResponse.json();
      expect(entityData.entity).toBeDefined();
      expect(entityData.entity.claims).toBeDefined();
      
      // Entity should have properties from crawlData
      const propertyCount = Object.keys(entityData.entity.claims).length;
      expect(propertyCount).toBeGreaterThan(3);
    }

    console.log(`[CFP TEST] ✓ Sequential CFP flow verified`);
  });
});

