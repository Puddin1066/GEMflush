/**
 * Wikidata Publishing Debug Test
 * 
 * DEVELOPMENT TEST for debugging Wikidata publishing issues, specifically:
 * - Type mismatches in reference snaks
 * - Property type validation
 * - Entity cleaning and adaptation for test.wikidata.org
 * - Error handling and detailed logging
 * 
 * This test is designed to be run repeatedly during development to:
 * 1. Quickly iterate on fixes
 * 2. Capture detailed error information
 * 3. Verify entity structure before/after cleaning
 * 4. Test specific publishing scenarios
 * 
 * SOLID: Single Responsibility - focused on debugging publishing issues
 * DRY: Reuses existing helpers and fixtures
 * Pragmatic: Uses real APIs to catch real-world issues
 * 
 * Usage:
 *   pnpm exec playwright test wikidata-publish-debug.spec.ts
 *   pnpm exec playwright test wikidata-publish-debug.spec.ts --debug
 * 
 * Prerequisites:
 * - WIKIDATA_PUBLISH_MODE='real' (set in playwright.config.ts)
 * - WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD env vars
 * - Pro tier subscription (for publishing permissions)
 */

import { test, expect } from './fixtures/authenticated-user';
import { BusinessPage } from './pages/business-page';
import {
  setupProTeam,
  mockExternalServices,
} from './helpers/api-helpers';
import {
  waitForBusinessDetailPage,
  runCrawlAndFingerprint,
} from './helpers/business-helpers';
import { REAL_TEST_SITE_ALPHA_DENTAL } from './helpers/real-sites';

/**
 * Helper: Analyze entity structure for debugging
 * DRY: Reusable entity analysis logic
 * SOLID: Single Responsibility - only analyzes entity structure
 */
function analyzeEntityStructure(entity: any, context: string) {
  const claims = entity?.claims || {};
  const claimKeys = Object.keys(claims);
  const allClaims = Object.values(claims).flat() as any[];
  
  const structure = {
    labels: Object.keys(entity?.labels || {}),
    descriptions: Object.keys(entity?.descriptions || {}),
    properties: claimKeys,
    claimCount: claimKeys.length,
    totalStatements: allClaims.length,
    hasReferences: allClaims.some(claim => claim.references && claim.references.length > 0),
    referenceCount: allClaims.reduce((sum, claim) => sum + (claim.references?.length || 0), 0),
  };

  console.log(`[DEBUG TEST] ${context}:`);
  console.log(JSON.stringify(structure, null, 2));

  return structure;
}

/**
 * Helper: Log detailed claim and reference snak information
 * DRY: Reusable logging for claim analysis
 * SOLID: Single Responsibility - only logs claim details
 */
function logClaimDetails(claims: Record<string, any[]>, context: string) {
  console.log(`[DEBUG TEST] ${context} detailed claim structure:`);
  
  for (const [pid, claimArray] of Object.entries(claims)) {
    if (Array.isArray(claimArray) && claimArray.length > 0) {
      const firstClaim = claimArray[0];
      const mainsnak = firstClaim?.mainsnak;
      const datavalue = mainsnak?.datavalue;
      
      console.log(`[DEBUG TEST]   ${pid}:`);
      console.log(`[DEBUG TEST]     mainsnak type: ${datavalue?.type}`);
      const valuePreview = datavalue?.value 
        ? (typeof datavalue.value === 'string' 
            ? datavalue.value.substring(0, 100)
            : JSON.stringify(datavalue.value).substring(0, 100))
        : 'N/A';
      console.log(`[DEBUG TEST]     mainsnak value: ${valuePreview}`);
      console.log(`[DEBUG TEST]     references: ${firstClaim?.references?.length || 0}`);
      
      // Log reference snaks (where type mismatches often occur)
      if (firstClaim?.references && firstClaim.references.length > 0) {
        for (let i = 0; i < firstClaim.references.length; i++) {
          const ref = firstClaim.references[i];
          if (ref.snaks) {
            console.log(`[DEBUG TEST]       Reference ${i} snaks:`);
            for (const [refPid, refSnakArray] of Object.entries(ref.snaks)) {
              if (Array.isArray(refSnakArray) && refSnakArray.length > 0) {
                const refSnak = refSnakArray[0];
                const refValue = refSnak?.datavalue?.value;
                const refValuePreview = typeof refValue === 'string'
                  ? refValue.substring(0, 80)
                  : JSON.stringify(refValue).substring(0, 80);
                console.log(`[DEBUG TEST]         ${refPid}: type=${refSnak?.datavalue?.type}, value=${refValuePreview}`);
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Helper: Check for problematic properties that should be removed for test.wikidata.org
 * DRY: Reusable property validation
 * SOLID: Single Responsibility - only checks property compatibility
 */
function checkProblematicProperties(claims: Record<string, any[]>) {
  const problematicProperties = ['P31', 'P856', 'P1128', 'P2003'];
  const found = problematicProperties.filter(pid => claims[pid]);
  
  if (found.length > 0) {
    console.log('[DEBUG TEST] ⚠️  Entity contains properties that should be removed for test.wikidata.org:');
    found.forEach(pid => console.log(`[DEBUG TEST]   - ${pid} (should be removed)`));
    return found;
  }
  
  console.log('[DEBUG TEST] ✓ No problematic properties found');
  return [];
}

/**
 * Helper: Analyze publish error for type mismatches
 * DRY: Reusable error analysis
 * SOLID: Single Responsibility - only analyzes errors
 */
function analyzePublishError(errorData: any) {
  if (!errorData.error) return;
  
  console.log('[DEBUG TEST] Error message:', errorData.error);
  
  if (errorData.error.includes('Bad value type')) {
    console.log('[DEBUG TEST] ⚠️  TYPE MISMATCH DETECTED');
    console.log('[DEBUG TEST] This usually means:');
    console.log('[DEBUG TEST]   - A property expects one type but received another');
    console.log('[DEBUG TEST]   - Common issue: reference snaks have wrong types');
    console.log('[DEBUG TEST]   - Check entity cleaning logic in publisher.ts');
    return true;
  }
  
  return false;
}

test.describe('Wikidata Publishing Debug', () => {
  // Allow plenty of time for real API calls
  test.setTimeout(300_000); // 5 minutes

  test('debug: publish entity and capture detailed error information', async ({
    authenticatedPage,
  }) => {
    console.log('[DEBUG TEST] ========================================');
    console.log('[DEBUG TEST] Wikidata Publishing Debug Test');
    console.log('[DEBUG TEST] ========================================');

    // Setup Pro team (required for publishing)
    await setupProTeam(authenticatedPage);
    await mockExternalServices(authenticatedPage);

    const baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

    // Step 1: Create business
    console.log('[DEBUG TEST] Step 1: Creating business...');
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `Debug Test ${timestamp}`;
    const businessUrl = REAL_TEST_SITE_ALPHA_DENTAL;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: businessUrl,
      category: 'healthcare',
      city: 'Providence',
      state: 'RI',
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
    console.log(`[DEBUG TEST] ✓ Business created: ${businessId}`);

    // Step 2: Wait for business detail page
    await waitForBusinessDetailPage(authenticatedPage, businessId);

    // Step 3: Crawl and fingerprint
    console.log('[DEBUG TEST] Step 2: Running crawl and fingerprint...');
    await runCrawlAndFingerprint(authenticatedPage, businessId, { skipFingerprint: false });

    // Verify business has crawl data
    const businessAfterCrawl = await authenticatedPage.request.get(
      `${baseURL}/api/business/${businessId}`
    );
    const businessData = await businessAfterCrawl.json();
    console.log(`[DEBUG TEST] ✓ Business status: ${businessData.business?.status}`);
    expect(['crawled', 'fingerprinted', 'published']).toContain(businessData.business?.status);

    // Step 4: Get entity data before publishing (if available)
    console.log('[DEBUG TEST] Step 3: Fetching entity data before publishing...');
    const entityResponse = await authenticatedPage.request.get(
      `${baseURL}/api/wikidata/entity/${businessId}`
    );
    if (entityResponse.ok()) {
      const entityData = await entityResponse.json();
      if (entityData.entity) {
        analyzeEntityStructure(entityData.entity, 'Entity structure before publishing');
        logClaimDetails(entityData.entity.claims || {}, 'Before publishing');
        checkProblematicProperties(entityData.entity.claims || {});
      }
    }

    // Step 5: Attempt to publish
    console.log('[DEBUG TEST] Step 4: Attempting to publish to Wikidata...');
    const publishResponse = await authenticatedPage.request.post('/api/wikidata/publish', {
      data: {
        businessId,
        publishToProduction: false, // Always use test.wikidata.org for debugging
      },
      timeout: 120_000, // 120 seconds for real API operations
    });

    const publishData = await publishResponse.json();
    
    // Log response status
    console.log('[DEBUG TEST] Publish response status:', publishResponse.status());

    // Step 6: Analyze results
    if (!publishResponse.ok()) {
      console.log('[DEBUG TEST] ❌ Publishing failed');
      
      // Analyze error (DRY: use helper)
      const hasTypeMismatch = analyzePublishError(publishData);
      
      // If type mismatch, log full error for debugging
      if (hasTypeMismatch) {
        console.log('[DEBUG TEST] Full error response:', JSON.stringify(publishData, null, 2));
      }
      
      // Verify business status didn't change
      const businessAfterPublish = await authenticatedPage.request.get(
        `${baseURL}/api/business/${businessId}`
      );
      const businessAfterData = await businessAfterPublish.json();
      console.log(`[DEBUG TEST] Business status after failed publish: ${businessAfterData.business?.status}`);
      expect(businessAfterData.business?.wikidataQID).toBeNull();
    } else {
      console.log('[DEBUG TEST] ✓ Publishing succeeded!');
      console.log('[DEBUG TEST] QID:', publishData.qid);
      console.log('[DEBUG TEST] Published to:', publishData.publishedTo);
      
      // CRITICAL: Analyze the entity that was actually published (from response)
      if (publishData.entity) {
        console.log('[DEBUG TEST] Step 5: Analyzing published entity structure...');
        analyzeEntityStructure(publishData.entity, 'Entity structure that was published');
        logClaimDetails(publishData.entity.claims || {}, 'Published entity');
        checkProblematicProperties(publishData.entity.claims || {});
      }
      
      // Verify business was updated
      const businessAfterPublish = await authenticatedPage.request.get(
        `${baseURL}/api/business/${businessId}`
      );
      const businessAfterData = await businessAfterPublish.json();
      expect(businessAfterData.business?.wikidataQID).toBe(publishData.qid);
      console.log('[DEBUG TEST] ✓ Business QID stored correctly');
    }

    console.log('[DEBUG TEST] ========================================');
    console.log('[DEBUG TEST] Test complete');
    console.log('[DEBUG TEST] ========================================');
  });

  test('debug: test entity cleaning and adaptation', async ({
    authenticatedPage,
  }) => {
    console.log('[DEBUG TEST] ========================================');
    console.log('[DEBUG TEST] Entity Cleaning Debug Test');
    console.log('[DEBUG TEST] ========================================');

    await setupProTeam(authenticatedPage);
    await mockExternalServices(authenticatedPage);

    const baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

    // Create a minimal business for testing
    const businessPage = new BusinessPage(authenticatedPage);
    await businessPage.navigateToCreate();

    const timestamp = Date.now();
    const businessName = `Clean Test ${timestamp}`;

    await businessPage.fillBusinessForm({
      name: businessName,
      url: 'https://example.com',
      category: 'technology',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    });

    await businessPage.submitForm();
    await businessPage.expectSuccess();

    const url = authenticatedPage.url();
    const businessIdMatch = url.match(/\/businesses\/(\d+)/);
    expect(businessIdMatch).toBeTruthy();
    const businessId = parseInt(businessIdMatch![1]);

    await waitForBusinessDetailPage(authenticatedPage, businessId);

    // Get entity before cleaning (DRY: use helpers)
    const entityResponse = await authenticatedPage.request.get(
      `${baseURL}/api/wikidata/entity/${businessId}`
    );
    if (entityResponse.ok()) {
      const entityData = await entityResponse.json();
      if (entityData.entity) {
        const structure = analyzeEntityStructure(entityData.entity, 'Entity before cleaning');
        checkProblematicProperties(entityData.entity.claims || {});
        
        // Check for references
        if (structure.hasReferences) {
          console.log('[DEBUG TEST] ⚠️  Entity contains references (should be removed for test.wikidata.org)');
        } else {
          console.log('[DEBUG TEST] ✓ No references found');
        }
      }
    }

    console.log('[DEBUG TEST] ========================================');
  });
});

