?/**
 * User Business Helper
 * DRY: Centralizes single business per user pattern (realistic user journey)
 * SOLID: Single Responsibility - manages user's primary business
 * Pragmatic: Real users typically have one main business they manage
 */

import { Page } from '@playwright/test';

/**
 * Get or create a single business for the authenticated user
 * DRY: Reuses existing business if available, creates only if needed
 * Pragmatic: Real users typically manage one primary business
 * 
 * @param page - Authenticated page
 * @param businessName - Name for business (used if creating new)
 * @returns Business ID and URL
 */
export async function getOrCreateUserBusiness(
  page: Page,
  businessName: string = 'My Business'
): Promise<{ businessId: number; url: string }> {
  const baseURL = page.url().split('/dashboard')[0] || 'http://localhost:3000';
  
  // Get existing businesses for user
  const businessesResponse = await page.request.get(`${baseURL}/api/business`);
  const businessesData = await businessesResponse.json();
  const existingBusinesses = businessesData?.businesses || [];
  
  // If user has existing business, reuse it (DRY: realistic user pattern)
  if (existingBusinesses.length > 0) {
    const existingBusiness = existingBusinesses[0];
    console.log(`[TEST] Reusing existing business ${existingBusiness.id} for user (DRY: realistic pattern)`);
    return {
      businessId: existingBusiness.id,
      url: existingBusiness.url,
    };
  }
  
  // No existing business - create one (realistic: new user onboarding)
  console.log(`[TEST] Creating new business for user: ${businessName}`);
  
  // Use a real, stable URL that works for testing
  // DRY: Use same URL per user to avoid duplicates and allow caching
  const businessUrl = 'https://example.com'; // Real URL that works
  
  const createResponse = await page.request.post(`${baseURL}/api/business`, {
    data: {
      name: businessName,
      url: businessUrl,
      category: 'technology',
      location: {
        city: 'Seattle',
        state: 'WA',
        country: 'US',
      },
    },
  });
  
  if (!createResponse.ok()) {
    const error = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to create business: ${error.error || 'Unknown error'}`);
  }
  
  const createData = await createResponse.json();
  const businessId = createData.business?.id;
  
  if (!businessId) {
    throw new Error('Business created but ID not returned');
  }
  
  console.log(`[TEST] Created business ${businessId} for user`);
  
  return {
    businessId,
    url: businessUrl,
  };
}

/**
 * Get existing business ID for user (returns null if none exists)
 * DRY: Helper to check if user has existing business
 */
export async function getUserBusinessId(page: Page): Promise<number | null> {
  const baseURL = page.url().split('/dashboard')[0] || 'http://localhost:3000';
  
  const businessesResponse = await page.request.get(`${baseURL}/api/business`);
  const businessesData = await businessesResponse.json();
  const existingBusinesses = businessesData?.businesses || [];
  
  return existingBusinesses.length > 0 ? existingBusinesses[0].id : null;
}


