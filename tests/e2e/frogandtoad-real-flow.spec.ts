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
import { REAL_TEST_SITE_RIDA_FREE_DENTAL } from './helpers/real-sites';

test.describe('RIDA Free Dental Care - Real End-to-End Flow', () => {
  // Allow plenty of time for real crawl, fingerprint, and publish
  test.setTimeout(240_000); // 4 minutes

  test('crawl RIDA free dental care page, fingerprint, and publish rich Wikidata entity', async ({
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

    // 1. Create business for RIDA free dental care page using real form + APIs
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `RIDA Free Dental Care ${timestamp}`;
    const businessUrl = REAL_TEST_SITE_RIDA_FREE_DENTAL;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: businessUrl,
      category: 'retail',
      city: 'Providence',
      state: 'RI',
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

    // 3. Run REAL crawl + fingerprint (no mocks) – this will hit the RIDA site and OpenRouter
    await runCrawlAndFingerprint(authenticatedPage, businessId);

    // 4. Trigger publish via real API call (cleaner than relying on UI wiring)
    const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
      data: { businessId, publishToProduction: false },
    });
    
    // Capture exact error if publish fails
    if (!publishResponse.ok()) {
      const errorData = await publishResponse.json();
      const status = publishResponse.status();
      // eslint-disable-next-line no-console
      console.error(`[ERROR] Publish failed with status ${status}:`, JSON.stringify(errorData, null, 2));
      throw new Error(`Publish failed: ${status} - ${JSON.stringify(errorData)}`);
    }
    
    expect(publishResponse.ok()).toBe(true);
    const publishData = await publishResponse.json();
    const qid = publishData.qid as string | undefined;
    expect(qid).toBeTruthy();
    // eslint-disable-next-line no-console
    console.log(`[REAL] RIDA publish API returned QID: ${qid}`);

    // 5. Wait for business status to transition to 'published' (pipeline side-effect)
    const published = await waitForBusinessInAPI(authenticatedPage, businessId, {
      status: 'published',
      timeout: 120_000,
    });
    expect(published).toBe(true);

    // 6. After publish, wait for the entity preview card with stats to render
    const entityCard = await waitForEntityCard(authenticatedPage, businessId);

    const statsSection = entityCard
      .getByText(/\d+\s+properties?/i)
      .or(entityCard.getByText(/\d+\s+references?/i))
      .first();
    await expect(statsSection).toBeVisible({ timeout: 10_000 });

    const statsText = await entityCard.textContent();
    const claimsMatch = statsText?.match(/(\d+)\s+properties?/i);
    if (claimsMatch) {
      const claimsCount = parseInt(claimsMatch[1], 10);
      expect(claimsCount).toBeGreaterThanOrEqual(3); // rich enough structure
    }
  });
});


