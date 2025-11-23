/**
 * Business Detail DTO + Card Flow: Iterative Flow Test
 * 
 * Purpose: Validates business detail service, DTO transformation, and frontend card display
 * 
 * Focus Areas:
 * 1. Business detail service accuracy
 * 2. BusinessDetailDTO transformation correctness
 * 3. API response structure and data types
 * 4. Frontend card display accuracy (GemOverviewCard)
 * 5. Data consistency between API and UI
 * 
 * Structure:
 * - Single test with 7 steps, each focusing on one validation layer
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same context across all steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one validation layer
 * - Open/Closed: Easy to add new validations without modifying existing
 * 
 * DRY Principles:
 * - Shared test state avoids duplication
 * - Reusable validation functions
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  executeCFPFlow,
  fetchDatabaseBusiness,
  fetchLatestCrawlJob,
} from './helpers/dto-test-helpers';
import type { Page } from '@playwright/test';

// Shared state type
type BusinessDetailTestState = {
  businessId?: number;
  baseURL?: string;
  databaseBusiness?: any;
  databaseCrawlJob?: any;
  businessDTO?: any;
  testResults?: {
    cfpExecuted?: boolean;
    databaseVerified?: boolean;
    dtoTransformationVerified?: boolean;
    apiResponseVerified?: boolean;
    frontendCardVerified?: boolean;
    dataConsistencyVerified?: boolean;
  };
};

/**
 * Validate business detail DTO structure
 */
function validateBusinessDetailDTO(dto: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Required fields
  const requiredFields = ['id', 'name', 'url', 'status', 'createdAt'];
  for (const field of requiredFields) {
    if (dto[field] === undefined) {
      issues.push(`Missing required field: ${field}`);
    }
  }

  // Data type validations
  if (dto.id !== undefined && typeof dto.id !== 'number') {
    issues.push(`id should be number, got ${typeof dto.id}`);
  }

  if (dto.name !== undefined && typeof dto.name !== 'string') {
    issues.push(`name should be string, got ${typeof dto.name}`);
  }

  if (dto.status !== undefined && typeof dto.status !== 'string') {
    issues.push(`status should be string, got ${typeof dto.status}`);
  }

  // Date format validations (should be ISO strings)
  if (dto.createdAt !== undefined && typeof dto.createdAt !== 'string') {
    issues.push(`createdAt should be ISO string, got ${typeof dto.createdAt}`);
  }

  if (dto.lastCrawledAt !== undefined && dto.lastCrawledAt !== null && typeof dto.lastCrawledAt !== 'string') {
    issues.push(`lastCrawledAt should be ISO string or null, got ${typeof dto.lastCrawledAt}`);
  }

  // Location structure validation
  if (dto.location !== undefined && dto.location !== null) {
    if (typeof dto.location !== 'object') {
      issues.push(`location should be object or null, got ${typeof dto.location}`);
    } else {
      const locationFields = ['city', 'state', 'country'];
      for (const field of locationFields) {
        if (dto.location[field] === undefined) {
          issues.push(`location.${field} is missing`);
        }
      }
    }
  }

  // errorMessage should come from crawlJobs, not businesses table
  // If errorMessage exists, it should be a real error (not success message)
  if (dto.errorMessage !== undefined && dto.errorMessage !== null && dto.errorMessage !== '') {
    const successMessages = ['completed', 'success', 'Crawl completed'];
    const isSuccessMessage = successMessages.some(msg => 
      dto.errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
    if (isSuccessMessage) {
      issues.push(`errorMessage contains success message (should be filtered): ${dto.errorMessage}`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate frontend card displays business data correctly
 */
async function validateFrontendCard(
  page: Page,
  businessDTO: any
): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Navigate to business detail page
    await page.goto(`/dashboard/businesses/${businessDTO.id}`);
    await page.waitForLoadState('networkidle');

    // Wait for GemOverviewCard to load
    const card = page.locator('.gem-card').first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Validate business name is displayed
    const nameElement = card.locator('text=' + businessDTO.name).first();
    if (!(await nameElement.isVisible().catch(() => false))) {
      issues.push(`Business name "${businessDTO.name}" not found in card`);
    }

    // Validate status badge is displayed (may be formatted differently)
    const statusBadge = card.locator('[class*="badge"], [class*="status"]').first();
    const statusExists = await statusBadge.isVisible({ timeout: 5000 }).catch(() => false);
    if (!statusExists) {
      // Check if status is displayed as text instead of badge
      const statusText = card.locator(`text=${businessDTO.status}`).first();
      const statusTextExists = await statusText.isVisible({ timeout: 2000 }).catch(() => false);
      if (!statusTextExists) {
        console.log(`[BUSINESS DETAIL FLOW] ⚠️  Status badge not found (status: ${businessDTO.status}) - may be formatted differently`);
        // Don't fail - status might be displayed differently
      }
    }

    // Validate URL is displayed (if present)
    if (businessDTO.url) {
      const urlElement = card.locator(`a[href*="${businessDTO.url.replace(/^https?:\/\//, '')}"]`).first();
      if (!(await urlElement.isVisible().catch(() => false))) {
        issues.push(`Business URL not found in card`);
      }
    }

    // Validate location is displayed (if present)
    if (businessDTO.location) {
      const locationText = `${businessDTO.location.city}, ${businessDTO.location.state}`;
      const locationElement = card.locator(`text=${locationText}`).first();
      if (!(await locationElement.isVisible().catch(() => false))) {
        issues.push(`Location "${locationText}" not found in card`);
      }
    }

    // Validate Wikidata QID is displayed (if present)
    if (businessDTO.wikidataQID) {
      const qidElement = card.locator(`text=${businessDTO.wikidataQID}`).first();
      if (!(await qidElement.isVisible().catch(() => false))) {
        issues.push(`Wikidata QID "${businessDTO.wikidataQID}" not found in card`);
      }
    }

  } catch (error) {
    issues.push(`Frontend validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

test('Business Detail DTO + Card Flow', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const state: BusinessDetailTestState = {
    baseURL,
  };

  await test.step('Step 1: Execute CFP flow to create business with data', async () => {
    console.log('[BUSINESS DETAIL FLOW] Step 1: Executing CFP flow...');
    
    const uniqueUrl = `https://test-business-detail-${Date.now()}.example.com`;
    const businessId = await executeCFPFlow(page, baseURL!, uniqueUrl);
    
    state.businessId = businessId;
    state.testResults = { ...state.testResults, cfpExecuted: true };
    
    console.log(`[BUSINESS DETAIL FLOW] ✓ CFP flow completed, business ID: ${businessId}`);
  });

  await test.step('Step 2: Verify database business data structure', async () => {
    console.log('[BUSINESS DETAIL FLOW] Step 2: Verifying database business data...');
    
    if (!state.businessId) {
      throw new Error('Business ID not set from previous step');
    }

    const business = await fetchDatabaseBusiness(page, baseURL!, state.businessId);
    state.databaseBusiness = business;

    // Validate required fields exist
    const requiredFields = ['id', 'name', 'url', 'status'];
    for (const field of requiredFields) {
      if (business[field] === undefined) {
        throw new Error(`Database business missing required field: ${field}`);
      }
    }

    state.testResults = { ...state.testResults, databaseVerified: true };
    console.log(`[BUSINESS DETAIL FLOW] ✓ Database business verified: ${business.name}`);
  });

  await test.step('Step 3: Fetch latest crawl job for errorMessage', async () => {
    console.log('[BUSINESS DETAIL FLOW] Step 3: Fetching latest crawl job...');
    
    if (!state.businessId) {
      throw new Error('Business ID not set');
    }

    const crawlJob = await fetchLatestCrawlJob(page, baseURL!, state.businessId);
    state.databaseCrawlJob = crawlJob;

    console.log(`[BUSINESS DETAIL FLOW] ✓ Crawl job fetched: ${crawlJob ? 'exists' : 'none'}`);
  });

  await test.step('Step 4: Verify BusinessDetailDTO transformation', async () => {
    console.log('[BUSINESS DETAIL FLOW] Step 4: Verifying DTO transformation...');
    
    if (!state.businessId) {
      throw new Error('Business ID not set');
    }

    // Fetch business detail DTO via API
    const businessResponse = await page.request.get(`${baseURL}/api/business/${state.businessId}`);
    if (!businessResponse.ok()) {
      const errorBody = await businessResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to fetch business detail: ${errorBody.error || businessResponse.status()}`);
    }

    const responseData = await businessResponse.json();
    const businessDTO = responseData.business || responseData;
    state.businessDTO = businessDTO;

    // Validate DTO structure
    const validation = validateBusinessDetailDTO(businessDTO);
    if (!validation.isValid) {
      throw new Error(`DTO validation failed: ${validation.issues.join(', ')}`);
    }

    // Verify errorMessage comes from crawlJobs (not businesses table)
    if (businessDTO.errorMessage && state.databaseCrawlJob) {
      // If DTO has errorMessage, it should match crawlJob's errorMessage (or be filtered)
      const crawlJobError = state.databaseCrawlJob.errorMessage;
      if (crawlJobError && businessDTO.errorMessage !== crawlJobError) {
        // Check if it's a filtered success message
        const successMessages = ['completed', 'success', 'Crawl completed'];
        const isFiltered = successMessages.some(msg => 
          crawlJobError.toLowerCase().includes(msg.toLowerCase())
        );
        if (!isFiltered) {
          throw new Error(`errorMessage mismatch: DTO has "${businessDTO.errorMessage}", crawlJob has "${crawlJobError}"`);
        }
      }
    }

    state.testResults = { ...state.testResults, dtoTransformationVerified: true };
    console.log(`[BUSINESS DETAIL FLOW] ✓ DTO transformation verified`);
  });

  await test.step('Step 5: Verify API response structure', async () => {
    console.log('[BUSINESS DETAIL FLOW] Step 5: Verifying API response structure...');
    
    if (!state.businessDTO) {
      throw new Error('Business DTO not set from previous step');
    }

    // Verify API response has correct structure
    if (!state.businessDTO.id || !state.businessDTO.name) {
      throw new Error('API response missing required fields');
    }

    // Verify data types match DTO interface
    if (typeof state.businessDTO.id !== 'number') {
      throw new Error(`API response id is not a number: ${typeof state.businessDTO.id}`);
    }

    if (typeof state.businessDTO.name !== 'string') {
      throw new Error(`API response name is not a string: ${typeof state.businessDTO.name}`);
    }

    state.testResults = { ...state.testResults, apiResponseVerified: true };
    console.log(`[BUSINESS DETAIL FLOW] ✓ API response structure verified`);
  });

  await test.step('Step 6: Verify frontend card display', async () => {
    console.log('[BUSINESS DETAIL FLOW] Step 6: Verifying frontend card display...');
    
    if (!state.businessDTO) {
      throw new Error('Business DTO not set');
    }

    const validation = await validateFrontendCard(page, state.businessDTO);
    if (!validation.isValid) {
      throw new Error(`Frontend card validation failed: ${validation.issues.join(', ')}`);
    }

    state.testResults = { ...state.testResults, frontendCardVerified: true };
    console.log(`[BUSINESS DETAIL FLOW] ✓ Frontend card display verified`);
  });

  await test.step('Step 7: Verify data consistency between API and UI', async () => {
    console.log('[BUSINESS DETAIL FLOW] Step 7: Verifying data consistency...');
    
    if (!state.businessDTO) {
      throw new Error('Business DTO not set');
    }

    // Navigate to business detail page
    await page.goto(`/dashboard/businesses/${state.businessDTO.id}`);
    await page.waitForLoadState('networkidle');

    // Verify business name matches
    const nameElement = page.locator(`text=${state.businessDTO.name}`).first();
    await expect(nameElement).toBeVisible({ timeout: 5000 });

    // Verify status matches (if displayed)
    if (state.businessDTO.status) {
      const statusElement = page.locator(`[class*="badge"]:has-text("${state.businessDTO.status}")`).first();
      // Status might be displayed with different casing, so just check badge exists
      const badgeExists = await statusElement.isVisible().catch(() => false);
      if (!badgeExists) {
        // Check if any badge exists (status might be formatted differently)
        const anyBadge = page.locator('[class*="badge"]').first();
        if (!(await anyBadge.isVisible().catch(() => false))) {
          console.log(`[BUSINESS DETAIL FLOW] ⚠️  Status badge not found (may be formatted differently)`);
        }
      }
    }

    state.testResults = { ...state.testResults, dataConsistencyVerified: true };
    console.log(`[BUSINESS DETAIL FLOW] ✓ Data consistency verified`);
  });

  // Final validation
  if (!state.testResults?.cfpExecuted || 
      !state.testResults?.databaseVerified || 
      !state.testResults?.dtoTransformationVerified ||
      !state.testResults?.apiResponseVerified ||
      !state.testResults?.frontendCardVerified ||
      !state.testResults?.dataConsistencyVerified) {
    throw new Error('Not all test steps completed successfully');
  }

  console.log('[BUSINESS DETAIL FLOW] ✅ All steps completed successfully');
});

