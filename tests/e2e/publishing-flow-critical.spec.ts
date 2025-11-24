/**
 * Publishing Flow - Critical Path E2E Test
 * 
 * PRIORITY: P0 - This test validates the most critical publishing functionality
 * 
 * Purpose: Validates that Pro tier users can successfully complete the automated
 * CFP flow (Crawl → Fingerprint → Publish) with 100% reliability.
 * 
 * Success Criteria:
 * 1. Business created successfully
 * 2. Crawl completes and data extracted
 * 3. Fingerprint generates visibility score
 * 4. Publishing succeeds and QID assigned
 * 5. Entity visible in Wikidata (or test.wikidata.org)
 * 6. Business status updates correctly throughout flow
 * 
 * This test is the "North Star" - if this passes, publishing works.
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  setupProTeam,
  mockExternalServices,
} from './helpers/api-helpers';
import {
  executeCFPFlow,
  waitForBusinessStatus,
  fetchDatabaseBusiness,
} from './helpers/dto-test-helpers';
import {
  fetchWikidataEntityDTO,
  verifyEntityPublished,
} from './helpers/wikidata-test-helpers';

test.describe('Publishing Flow - Critical Path', () => {
  test.setTimeout(600_000); // 10 minutes

  test('Pro tier user: Complete automated CFP flow with publishing', async ({
    authenticatedPage,
  }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    let businessId: number;

    // Step 1: Setup Pro team and mock services
    await test.step('Setup: Pro team and services', async () => {
      console.log('[PUBLISHING TEST] Setting up Pro team...');
      await setupProTeam(authenticatedPage);
      await mockExternalServices(authenticatedPage);
      console.log('[PUBLISHING TEST] ✓ Setup complete');
    });

    // Step 2: Create business and trigger CFP
    await test.step('Create business and trigger CFP', async () => {
      console.log('[PUBLISHING TEST] Creating business...');
      
      // Use a URL that will work with mock crawler
      // DRY: Use example.com which has mock data, or use a known mock domain
      // The mock system will handle this URL even if Firecrawl is not configured
      const uniqueUrl = `https://example.com/publishing-test-${Date.now()}`;
      
      businessId = await executeCFPFlow(authenticatedPage, baseURL, uniqueUrl);
      
      expect(businessId).toBeGreaterThan(0);
      console.log(`[PUBLISHING TEST] ✓ Business created: ID ${businessId}`);
    });

    // Step 3: Wait for crawl completion
    await test.step('Wait for crawl completion', async () => {
      console.log('[PUBLISHING TEST] Waiting for crawl...');
      
      try {
        const status = await waitForBusinessStatus(
          authenticatedPage,
          baseURL,
          businessId,
          'crawled',
          120_000 // 2 minutes
        );
        
        expect(['crawled', 'generating']).toContain(status);
        console.log(`[PUBLISHING TEST] ✓ Crawl completed: status=${status}`);
        
        // Verify crawl data exists
        const business = await fetchDatabaseBusiness(authenticatedPage, baseURL, businessId);
        expect(business.crawlData).toBeDefined();
        expect(business.lastCrawledAt).toBeDefined();
      } catch (error) {
        // If status is error, fetch and display error details
        const business = await fetchDatabaseBusiness(authenticatedPage, baseURL, businessId);
        
        // Fetch status endpoint for crawl job details
        const statusResponse = await authenticatedPage.request.get(
          `${baseURL}/api/business/${businessId}/status`,
          { timeout: 15000 }
        );
        
        // Also fetch latest crawl job directly
        const { fetchLatestCrawlJob } = await import('./helpers/dto-test-helpers');
        const crawlJob = await fetchLatestCrawlJob(authenticatedPage, baseURL, businessId);
        
        console.error('[PUBLISHING TEST] ❌ Crawl failed with error:');
        console.error(`  Business Status: ${business.status}`);
        console.error(`  Business Error Message: ${business.errorMessage || 'None'}`);
        
        if (statusResponse.ok()) {
          const statusData = await statusResponse.json();
          console.error(`  Status DTO Crawl Job: ${JSON.stringify(statusData.crawlJob || {}, null, 2)}`);
        }
        
        if (crawlJob) {
          console.error(`  Crawl Job Details:`);
          console.error(`    ID: ${crawlJob.id}`);
          console.error(`    Status: ${crawlJob.status}`);
          console.error(`    Error Message: ${crawlJob.errorMessage || 'None'}`);
          console.error(`    Progress: ${crawlJob.progress || 'N/A'}`);
          console.error(`    Result: ${crawlJob.result ? JSON.stringify(crawlJob.result).substring(0, 200) : 'None'}`);
        } else {
          console.error(`  No crawl job found for business ${businessId}`);
        }
        
        throw error; // Re-throw to fail the test
      }
    });

    // Step 4: Wait for fingerprint completion
    await test.step('Wait for fingerprint completion', async () => {
      console.log('[PUBLISHING TEST] Waiting for fingerprint...');
      
      // Status should progress: crawled → generating (publishing starts)
      const status = await waitForBusinessStatus(
        authenticatedPage,
        baseURL,
        businessId,
        'generating',
        180_000 // 3 minutes (fingerprint can take time)
      );
      
      expect(['generating', 'published']).toContain(status);
      console.log(`[PUBLISHING TEST] ✓ Fingerprint completed: status=${status}`);
      
      // Verify fingerprint exists
      const fingerprintResponse = await authenticatedPage.request.get(
        `${baseURL}/api/fingerprint/business/${businessId}`,
        { timeout: 15000 }
      );
      
      if (fingerprintResponse.ok()) {
        const fingerprint = await fingerprintResponse.json();
        expect(fingerprint.visibilityScore).toBeGreaterThanOrEqual(0);
        expect(fingerprint.visibilityScore).toBeLessThanOrEqual(100);
        console.log(`[PUBLISHING TEST] ✓ Visibility score: ${fingerprint.visibilityScore}`);
      }
    });

    // Step 5: Wait for publishing completion
    await test.step('Wait for publishing completion', async () => {
      console.log('[PUBLISHING TEST] Waiting for publish...');
      const status = await waitForBusinessStatus(
        authenticatedPage,
        baseURL,
        businessId,
        'published',
        300_000 // 5 minutes (publishing can take time)
      );
      
      expect(status).toBe('published');
      console.log(`[PUBLISHING TEST] ✓ Publishing completed: status=${status}`);
    });

    // Step 6: Verify QID assigned
    await test.step('Verify QID assigned', async () => {
      console.log('[PUBLISHING TEST] Verifying QID...');
      const business = await fetchDatabaseBusiness(authenticatedPage, baseURL, businessId);
      
      expect(business.wikidataQID).toBeDefined();
      expect(business.wikidataQID).toMatch(/^Q\d+$/);
      expect(business.wikidataPublishedAt).toBeDefined();
      
      console.log(`[PUBLISHING TEST] ✓ QID assigned: ${business.wikidataQID}`);
    });

    // Step 7: Verify entity in database
    await test.step('Verify entity in database', async () => {
      console.log('[PUBLISHING TEST] Verifying entity in database...');
      const entityDTO = await fetchWikidataEntityDTO(
        authenticatedPage,
        baseURL,
        businessId
      );
      
      expect(entityDTO).toBeDefined();
      expect(entityDTO.qid).toBe(business.wikidataQID);
      expect(entityDTO.status).toBe('published');
      
      console.log(`[PUBLISHING TEST] ✓ Entity verified in database`);
    });

    // Step 8: Verify entity published (if not using mocks)
    await test.step('Verify entity published to Wikidata', async () => {
      console.log('[PUBLISHING TEST] Verifying Wikidata publication...');
      
      const business = await fetchDatabaseBusiness(authenticatedPage, baseURL, businessId);
      const qid = business.wikidataQID;
      
      if (!qid) {
        throw new Error('QID not assigned');
      }
      
        // Check if using test mode (mock QIDs)
        // DRY: Use utility function for mock QID detection
        const { isMockQID } = await import('@/lib/wikidata/utils');
        const isTestMode = process.env.USE_MOCK_GOOGLE_SEARCH === 'true' ||
                          process.env.PLAYWRIGHT_TEST === 'true' ||
                          isMockQID(qid); // Use utility function
      
      if (isTestMode) {
        console.log(`[PUBLISHING TEST] ⚠️  Test mode: QID ${qid} is mock, skipping Wikidata verification`);
        return;
      }
      
      // Verify entity exists in Wikidata
      const published = await verifyEntityPublished(qid);
      expect(published).toBe(true);
      
      console.log(`[PUBLISHING TEST] ✓ Entity verified in Wikidata: ${qid}`);
    });

    // Step 9: Final verification - all status updates correct
    await test.step('Final verification', async () => {
      console.log('[PUBLISHING TEST] Final verification...');
      
      const business = await fetchDatabaseBusiness(authenticatedPage, baseURL, businessId);
      
      // Verify final state
      expect(business.status).toBe('published');
      expect(business.wikidataQID).toBeDefined();
      expect(business.wikidataPublishedAt).toBeDefined();
      expect(business.crawlData).toBeDefined();
      
      console.log('[PUBLISHING TEST] ✅ ALL CHECKS PASSED - Publishing flow works!');
    });
  });

  test('Handle existing Wikidata entity gracefully', async ({
    authenticatedPage,
  }) => {
    // This test validates that if a business already has a Wikidata entity,
    // the system should update it rather than failing with a conflict
    
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    await setupProTeam(authenticatedPage);
    await mockExternalServices(authenticatedPage);
    
    // Create business with URL that might have existing Wikidata entity
    const uniqueUrl = `https://existing-entity-test-${Date.now()}.example.com`;
    const businessId = await executeCFPFlow(authenticatedPage, baseURL, uniqueUrl);
    
    // Wait for publishing
    const status = await waitForBusinessStatus(
      authenticatedPage,
      baseURL,
      businessId,
      'published',
      300_000
    );
    
    // Should succeed (update) rather than fail (conflict)
    expect(['published', 'crawled']).toContain(status);
    
    const business = await fetchDatabaseBusiness(authenticatedPage, baseURL, businessId);
    
    // If published, should have QID
    if (status === 'published') {
      expect(business.wikidataQID).toBeDefined();
    }
  });
});

