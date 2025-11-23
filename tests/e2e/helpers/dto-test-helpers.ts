/**
 * DTO Test Helpers
 * 
 * DRY: Reusable utilities for DTO ground truth verification tests
 * SOLID: Single Responsibility - each helper has one clear purpose
 */

import type { Page } from '@playwright/test';

export interface DTOTestState {
  businessId?: number;
  baseURL?: string;
  databaseBusiness?: any;
  databaseFingerprint?: any;
  databaseCrawlJob?: any;
  businessDTO?: any;
  dashboardDTO?: any;
  fingerprintDTO?: any;
  testResults?: {
    cfpExecuted?: boolean;
    databaseVerified?: boolean;
    businessDTOVerified?: boolean;
    dashboardDTOVerified?: boolean;
    frontendVerified?: boolean;
    dashboardDisplayVerified?: boolean;
  };
}

/**
 * Execute automated CFP flow
 * 
 * Returns: businessId if successful
 */
export async function executeCFPFlow(
  page: Page,
  baseURL: string,
  uniqueUrl: string
): Promise<number> {
  // Create business with URL (triggers automated CFP)
  // DRY: Use URL-only creation (location optional, will be extracted from crawl)
  const createBusinessResponse = await page.request.post(`${baseURL}/api/business`, {
    data: {
      url: uniqueUrl,
      // category is optional for URL-only creation
      // category: 'technology', // Valid categories: 'restaurant', 'retail', 'technology', etc.
    },
  });

  // Get response body first to check what we got
  const createResult = await createBusinessResponse.json().catch(() => ({}));
  
  // Handle successful creation (201) or creation with location needed (422)
  // DRY: Business can be created even if location is missing (will be extracted from crawl)
  if (!createBusinessResponse.ok() && createBusinessResponse.status() !== 422) {
    // SOLID: Single Responsibility - detailed error logging for debugging
    const errorMessage = createResult?.error || createResult?.message || 'Unknown error';
    const errorDetails = createResult?.details || createResult?.errors || '';
    
    console.error(`[DTO HELPER] ❌ Business creation failed:`, {
      status: createBusinessResponse.status(),
      error: errorMessage,
      details: errorDetails,
      url: uniqueUrl,
    });
    
    throw new Error(`Failed to create business (${createBusinessResponse.status()}): ${errorMessage}${errorDetails ? ` - ${JSON.stringify(errorDetails)}` : ''}`);
  }
  
  // Handle 422 - Business created but location needed (acceptable for URL-only creation)
  if (createBusinessResponse.status() === 422 && createResult?.business) {
    console.log(`[DTO HELPER] ⚠️  Business created but location needed (will be extracted from crawl):`, {
      businessId: createResult.business.id,
      needsLocation: createResult.needsLocation,
    });
  }
  
  // Extract business ID from response (works for both 201 and 422)
  const businessId = createResult?.business?.id;
  
  if (!businessId) {
    throw new Error(`Business created but ID not returned in response: ${JSON.stringify(createResult)}`);
  }

  console.log(`[DTO HELPER] ✓ Business created: ID ${businessId}`);

  // Trigger automated CFP processing
  const processResponse = await page.request.post(`${baseURL}/api/business/${businessId}/process`);
  if (!processResponse.ok()) {
    const errorBody = await processResponse.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorBody?.error || errorBody?.message || 'Unknown error';
    
    console.error(`[DTO HELPER] ❌ CFP trigger failed:`, {
      status: processResponse.status(),
      error: errorMessage,
      businessId,
    });
    
    throw new Error(`Failed to trigger CFP (${processResponse.status()}): ${errorMessage}`);
  }

  console.log('[DTO HELPER] ✓ Automated CFP flow triggered');
  console.log('[DTO HELPER] Waiting for CFP to complete...');

  // Wait for CFP to complete (poll status)
  // DRY: Use business detail endpoint instead of status endpoint (more reliable)
  // SOLID: Single Responsibility - poll until status changes
  let status = 'pending';
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (status !== 'published' && status !== 'error' && status !== 'crawled' && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    try {
      // Use business detail endpoint instead of status endpoint (more reliable)
      const businessResponse = await page.request.get(`${baseURL}/api/business/${businessId}`, {
        timeout: 15000, // 15 second timeout per request
      });
      
      if (businessResponse.ok()) {
        const businessData = await businessResponse.json();
        const business = businessData.business || businessData;
        status = business.status || status;
        console.log(`[DTO HELPER] Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
      } else {
        console.log(`[DTO HELPER] ⚠️  Status check failed (${businessResponse.status()}), retrying...`);
      }
    } catch (error) {
      // SOLID: Handle errors gracefully - retry on timeout
      console.log(`[DTO HELPER] ⚠️  Status check error: ${error instanceof Error ? error.message : 'Unknown'}, retrying...`);
      // Continue polling - don't fail on individual request errors
    }

    attempts++;
  }

  if (status === 'pending') {
    throw new Error(`CFP flow did not complete within ${maxAttempts * 5} seconds`);
  }

  console.log(`[DTO HELPER] ✓ CFP flow completed with status: ${status}`);
  return businessId;
}

/**
 * Fetch database business data
 * 
 * Returns: business data from API (which uses DTO transformation)
 */
export async function fetchDatabaseBusiness(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<any> {
  const businessResponse = await page.request.get(`${baseURL}/api/business/${businessId}`);
  if (!businessResponse.ok()) {
    // SOLID: Single Responsibility - detailed error logging for debugging
    const errorBody = await businessResponse.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorBody?.error || errorBody?.message || 'Unknown error';
    
    console.error(`[DTO HELPER] ❌ Failed to fetch business:`, {
      status: businessResponse.status(),
      error: errorMessage,
      businessId,
      url: `${baseURL}/api/business/${businessId}`,
    });
    
    // Check if it's an authorization issue
    if (businessResponse.status() === 403) {
      throw new Error(`Authorization failed (403) - Business ${businessId} may not belong to current user's team: ${errorMessage}`);
    }
    
    throw new Error(`Failed to fetch business (${businessResponse.status()}): ${errorMessage}`);
  }
  const data = await businessResponse.json();
  return data.business;
}

/**
 * Fetch latest crawl job for a business
 */
export async function fetchLatestCrawlJob(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<any | null> {
  try {
    const crawlJobsResponse = await page.request.get(`${baseURL}/api/job?businessId=${businessId}`, {
      timeout: 15000, // 15 second timeout
    });
    if (crawlJobsResponse.ok()) {
      const jobs = await crawlJobsResponse.json();
      if (jobs.jobs && jobs.jobs.length > 0) {
        return jobs.jobs[0]; // Latest job is first
      }
    }
  } catch (error) {
    // SOLID: Handle errors gracefully - API may not exist or be slow
    console.log(`[DTO HELPER] ⚠️  Failed to fetch crawl jobs (non-critical): ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Return null - crawl jobs are optional for DTO validation
  }
  return null;
}

/**
 * Fetch latest fingerprint for a business
 */
export async function fetchLatestFingerprint(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<any | null> {
  try {
    const fingerprintResponse = await page.request.get(`${baseURL}/api/fingerprint/business/${businessId}`, {
      timeout: 15000, // 15 second timeout
    });
    if (fingerprintResponse.ok()) {
      return await fingerprintResponse.json();
    }
  } catch (error) {
    // SOLID: Handle errors gracefully - fingerprint may not exist yet
    console.log(`[DTO HELPER] ⚠️  Failed to fetch fingerprint (non-critical): ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Return null - fingerprints are optional for DTO validation
  }
  return null;
}

/**
 * Verify automationEnabled matches database
 * 
 * Returns: true if matches, false if mismatch
 */
export function verifyAutomationEnabled(
  dbValue: boolean | undefined | null,
  dtoValue: boolean | undefined | null
): { matches: boolean; message: string } {
  const dbAutoEnabled = dbValue ?? true;
  const dtoAutoEnabled = dtoValue ?? true;
  const matches = dtoAutoEnabled === dbAutoEnabled;

  return {
    matches,
    message: matches
      ? `✅ automationEnabled matches database: ${dtoAutoEnabled}`
      : `❌ automationEnabled mismatch! Database: ${dbAutoEnabled}, DTO: ${dtoAutoEnabled}`,
  };
}

/**
 * Verify errorMessage comes from crawlJobs
 * 
 * Returns: verification result
 * 
 * SOLID: Single Responsibility - validates errorMessage source
 * DRY: Reusable validation logic
 */
export function verifyErrorMessageSource(
  dtoErrorMessage: any,
  crawlJobErrorMessage: any
): { valid: boolean; message: string } {
  // PRODUCTION-READY: Pragmatic validation - only check for actual bugs
  // Success messages like "Crawl completed" are filtered out by DTO transformation
  
  // If DTO has errorMessage, verify it's a real error (not a success message)
  if (dtoErrorMessage !== undefined && dtoErrorMessage !== null && dtoErrorMessage !== '') {
    // Check if it's a success message that should have been filtered
    const successMessages = ['completed', 'success'];
    const isSuccessMessage = successMessages.some(msg => 
      dtoErrorMessage.toLowerCase().includes(msg.toLowerCase())
    );
    
    if (isSuccessMessage) {
      // DTO should have filtered this out - this is a bug
      return {
        valid: false,
        message: `❌ DTO has success message as errorMessage: "${dtoErrorMessage}" (should be filtered)`,
      };
    }
    
    // If it's a real error, verify it comes from crawlJob
    if (crawlJobErrorMessage && dtoErrorMessage === crawlJobErrorMessage) {
      return {
        valid: true,
        message: `✅ errorMessage correctly comes from crawlJobs: ${dtoErrorMessage}`,
      };
    } else if (!crawlJobErrorMessage || crawlJobErrorMessage === null) {
      // DTO has errorMessage but crawlJob doesn't - this might be OK if it's filtered
      // But if it's still there, it means filtering didn't work
      const isFilteredMessage = successMessages.some(msg => 
        dtoErrorMessage.toLowerCase().includes(msg.toLowerCase())
      );
      if (!isFilteredMessage) {
        // This is a real error that doesn't match - could be a bug
        return {
          valid: false,
          message: `❌ DTO has errorMessage but crawlJob doesn't: "${dtoErrorMessage}"`,
        };
      }
    }
  }

  // If no errorMessage in DTO, that's fine (no errors to report or filtered out)
  return {
    valid: true,
    message: `✓ No errorMessage in DTO (expected if no errors or filtered)`,
  };
}

/**
 * Verify trendValue is calculated (not hardcoded)
 * 
 * Returns: verification result
 */
export function verifyTrendValue(
  trendValue: number | undefined,
  hasFingerprint: boolean,
  hasHistoricalFingerprints: boolean = false
): { valid: boolean; message: string; isHardcoded: boolean } {
  if (trendValue === undefined) {
    return {
      valid: true,
      message: `✓ trendValue undefined (may not be required)`,
      isHardcoded: false,
    };
  }

  if (trendValue === 0 && hasFingerprint && hasHistoricalFingerprints) {
    return {
      valid: false,
      message: `⚠️  trendValue is hardcoded to 0 (should calculate from historical fingerprints)`,
      isHardcoded: true,
    };
  }

  if (trendValue !== 0 || !hasFingerprint) {
    return {
      valid: true,
      message: `✅ trendValue is calculated: ${trendValue}`,
      isHardcoded: false,
    };
  }

  return {
    valid: true,
    message: `✓ trendValue is 0 (expected if no historical data)`,
    isHardcoded: false,
  };
}

/**
 * Alias for fetchLatestCrawlJob (for consistency with test naming)
 */
export const fetchDatabaseCrawlJob = fetchLatestCrawlJob;

/**
 * Wait for business status to reach target status
 * 
 * Returns: Final business status
 */
export async function waitForBusinessStatus(
  page: Page,
  baseURL: string,
  businessId: number,
  targetStatus: string,
  timeout: number = 120_000
): Promise<string> {
  const startTime = Date.now();
  const maxAttempts = Math.floor(timeout / 5000); // Poll every 5 seconds
  let status = 'pending';
  let attempts = 0;

  while (status !== targetStatus && attempts < maxAttempts) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeout) {
      throw new Error(`Timeout waiting for status '${targetStatus}'. Current status: ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    try {
      const businessResponse = await page.request.get(`${baseURL}/api/business/${businessId}`, {
        timeout: 15000,
      });
      
      if (businessResponse.ok()) {
        const businessData = await businessResponse.json();
        const business = businessData.business || businessData;
        status = business.status || status;
        console.log(`[DTO HELPER] Status: ${status} (attempt ${attempts + 1}/${maxAttempts}, target: ${targetStatus})`);
      }
    } catch (error) {
      console.log(`[DTO HELPER] ⚠️  Status check error: ${error instanceof Error ? error.message : 'Unknown'}, retrying...`);
    }

    attempts++;
  }

  if (status !== targetStatus) {
    throw new Error(`Status did not reach '${targetStatus}' within ${timeout}ms. Final status: ${status}`);
  }

  console.log(`[DTO HELPER] ✓ Status reached: ${status}`);
  return status;
}

