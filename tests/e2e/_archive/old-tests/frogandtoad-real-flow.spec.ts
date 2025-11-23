/**
 * REAL E2E: RIDA Free Dental Care – full crawl → fingerprint → rich Wikidata publish.
 *
 * IMPORTANT:
 * - No mocks here: uses real internal APIs and real external services (OpenRouter, test.wikidata.org).
 * - Requires a Pro-capable test account and valid env config (OpenRouter + Wikidata credentials).
 * - Expensive and slow: intended as a proof that the full platform works end-to-end.
 */

import { test, expect } from './fixtures/authenticated-user';
import { BusinessPage } from './pages/business-page';
import { waitForBusinessDetailPage, runCrawlAndFingerprint, waitForEntityCard, waitForBusinessInAPI } from './helpers/business-helpers';
import { setupProTeam } from './helpers/api-helpers';
import { REAL_TEST_SITE_ALPHA_DENTAL } from './helpers/real-sites';

test.describe('Alpha Dental Center - Real End-to-End Flow', () => {
  // Allow plenty of time for real crawl, fingerprint, and publish
  test.setTimeout(240_000); // 4 minutes

  test('crawl Alpha Dental Center page, fingerprint, and publish rich Wikidata entity', async ({
    authenticatedPage,
  }) => {
    // Note: WIKIDATA_PUBLISH_MODE='real' is set in playwright.config.ts webServer.env
    // This enables real test.wikidata.org Action API calls to capture real Wikidata API behavior
    // The same enriched entity JSON (PIDs, QIDs, notability, references) will be used
    // when switching to production wikidata.org by setting production=true
    // 
    // Google Search API is mocked via test mode (NODE_ENV=test + no GOOGLE_SEARCH_API_KEY)
    // This allows real notability logic to run while avoiding external API calls
    // 
    // Ensure Pro plan by updating team in database via test API
    // This ensures backend permission checks (canPublishToWikidata) pass
    await setupProTeam(authenticatedPage);

    // 1. Create business for Alpha Dental Center using real form + APIs
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `Alpha Dental Center ${timestamp}`;
    const businessUrl = REAL_TEST_SITE_ALPHA_DENTAL;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: businessUrl,
      category: 'healthcare',
      city: 'Attleboro',
      state: 'MA',
      country: 'US',
    });

    await businessPage.submitForm();
    await businessPage.expectSuccess();

    // 2. Extract business ID from URL and wait for detail page
    await authenticatedPage.waitForURL(/\/businesses\/\d+/, { timeout: 30_000 });
    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1], 10);

    await waitForBusinessDetailPage(authenticatedPage, businessId);

    // 3. Run REAL crawl + fingerprint (no mocks) – this will hit the Alpha Dental Center site and OpenRouter
    await runCrawlAndFingerprint(authenticatedPage, businessId);

    // 4. Trigger publish via real API call (cleaner than relying on UI wiring)
    // Note: Publish can take time due to notability checks, entity building, and Wikidata API calls
    // Increased timeout to 120s to allow for real API operations
    const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
      data: { businessId, publishToProduction: false },
      timeout: 120_000, // 120 seconds for real API operations
    });
    
    // Capture exact error if publish fails
    if (!publishResponse.ok()) {
      const errorData = await publishResponse.json();
      const status = publishResponse.status();
      // eslint-disable-next-line no-console
      console.error(`[ERROR] Publish failed with status ${status}:`, JSON.stringify(errorData, null, 2));
      
      // Log the entity JSON if it's included in the error response
      if (errorData.entity) {
        // eslint-disable-next-line no-console
        console.log('\n[ENTITY JSON] Entity that was attempted to be published:');
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(errorData.entity, null, 2));
        // eslint-disable-next-line no-console
        console.log('\n[ENTITY SUMMARY]');
        // eslint-disable-next-line no-console
        console.log(`  - Labels: ${Object.keys(errorData.entity.labels || {}).length} languages`);
        // eslint-disable-next-line no-console
        console.log(`  - Descriptions: ${Object.keys(errorData.entity.descriptions || {}).length} languages`);
        // eslint-disable-next-line no-console
        console.log(`  - Claims: ${Object.keys(errorData.entity.claims || {}).length} properties`);
        const totalClaims = Object.values(errorData.entity.claims || {}).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
        // eslint-disable-next-line no-console
        console.log(`  - Total statements: ${totalClaims}`);
      }
      
      throw new Error(`Publish failed: ${status} - ${JSON.stringify(errorData)}`);
    }
    
    expect(publishResponse.ok()).toBe(true);
    const publishData = await publishResponse.json();
    const qid = publishData.qid as string | undefined;
    expect(qid).toBeTruthy();
    // eslint-disable-next-line no-console
    console.log(`[REAL] Alpha Dental Center publish API returned QID: ${qid}`);
    
    // If entity is included in response, log it
    if (publishData.entity) {
      // eslint-disable-next-line no-console
      console.log('\n[ENTITY JSON] Entity that was published to Wikidata:');
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(publishData.entity, null, 2));
    }

    // 5. Wait for business status to transition to 'published' (pipeline side-effect)
    const published = await waitForBusinessInAPI(authenticatedPage, businessId, {
      status: 'published',
      timeout: 120_000,
    });
    expect(published).toBe(true);

    // 6. After publish, wait for the entity preview card to render
    const entityCard = await waitForEntityCard(authenticatedPage, businessId);
    
    // Verify entity card is visible and has content (value: users see their published entity)
    await expect(entityCard).toBeVisible({ timeout: 10_000 });
    const cardText = await entityCard.textContent();
    expect(cardText).toBeTruthy();
    expect(cardText?.length).toBeGreaterThan(50); // Card should have substantial content
    
    // Verify stats are visible (value: users see entity richness metrics)
    // Stats should always be visible in the enhanced card design
    const propertiesStat = entityCard.getByText(/\d+\s+properties?/i).first();
    await expect(propertiesStat).toBeVisible({ timeout: 5_000 });
    
    // Extract and verify metrics (value: users understand what was published)
    const statsText = await entityCard.textContent();
    const claimsMatch = statsText?.match(/(\d+)\s+properties?/i);
    expect(claimsMatch).toBeTruthy(); // Stats should be present
    
    if (claimsMatch) {
      const claimsCount = parseInt(claimsMatch[1], 10);
      // Note: test.wikidata.org has wrong property types, so we can only publish 2 properties (P1448, P2013)
      // Production will have all 7+ properties. For test, we expect at least 2.
      expect(claimsCount).toBeGreaterThanOrEqual(2); // test.wikidata.org limitations
    }
    
    // Verify published state is visible (value: users see confirmation of publication)
    const publishedIndicator = entityCard.getByText(/Published to Wikidata/i).or(
      entityCard.getByText(/Q\d+/i)
    ).first();
    await expect(publishedIndicator).toBeVisible({ timeout: 5_000 });
    
    // Verify QID is displayed (value: users can reference their entity)
    const qidMatch = statsText?.match(/Q\d+/);
    expect(qidMatch).toBeTruthy(); // QID should be visible
  });
});


