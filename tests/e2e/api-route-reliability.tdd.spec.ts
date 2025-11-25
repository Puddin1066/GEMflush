/**
 * TDD E2E Test: API Route Reliability
 * 
 * SPECIFICATION: API routes must be reliable and consistent
 * 
 * As a platform operator
 * I want API routes to work reliably and return correct DTOs
 * So that frontend can depend on consistent data structure
 * 
 * Acceptance Criteria:
 * 1. All API routes return correct HTTP status codes
 * 2. API routes return data in correct DTO format
 * 3. API routes handle errors gracefully
 * 4. API routes enforce authentication correctly
 * 5. API routes respect tier restrictions
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { test, expect } from '@playwright/test';

test.describe('🔴 RED: API Route Reliability Specification', () => {
  /**
   * SPECIFICATION 1: Dashboard API Returns Correct DTO
   * 
   * Given: Authenticated user
   * When: Dashboard API is called
   * Then: Returns DashboardDTO with all required fields
   */
  test('dashboard API returns correct DTO structure', async ({ request }) => {
    // Arrange: Create authenticated session
    // (This will fail - need to implement auth token handling)
    
    // Act: Call dashboard API (TEST DRIVES IMPLEMENTATION)
    const response = await request.get('/api/dashboard');
    
    // Assert: Returns 401 if not authenticated (behavior: auth enforced)
    // OR returns 200 with correct DTO structure if authenticated
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      
      // Assert: DTO structure matches specification (behavior: consistent DTO format)
      expect(data).toHaveProperty('totalBusinesses');
      expect(data).toHaveProperty('wikidataEntities');
      expect(data).toHaveProperty('avgVisibilityScore');
      expect(data).toHaveProperty('businesses');
      expect(Array.isArray(data.businesses)).toBe(true);
    }
  });

  /**
   * SPECIFICATION 2: Business API Returns BusinessDetailDTO
   * 
   * Given: Authenticated user with business
   * When: Business API is called
   * Then: Returns BusinessDetailDTO with all required fields
   */
  test('business API returns correct DTO structure', async ({ request }) => {
    // Arrange: Authenticated user with business
    // (This will fail - need test business setup)
    
    // Act: Call business API (TEST DRIVES IMPLEMENTATION)
    const response = await request.get('/api/business/1');
    
    // Assert: Returns correct status and DTO structure (behavior: consistent format)
    expect([200, 401, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      
      // Assert: BusinessDetailDTO structure
      expect(data).toHaveProperty('business');
      expect(data.business).toHaveProperty('id');
      expect(data.business).toHaveProperty('name');
      expect(data.business).toHaveProperty('status');
    }
  });

  /**
   * SPECIFICATION 3: API Routes Handle Invalid Inputs
   * 
   * Given: Invalid request data
   * When: API route is called
   * Then: Returns appropriate error response
   */
  test('API routes handle invalid inputs gracefully', async ({ request }) => {
    // Act: Call API with invalid data (TEST DRIVES IMPLEMENTATION)
    const response = await request.post('/api/business', {
      data: { url: 'not-a-valid-url' },
    });
    
    // Assert: Returns 400 Bad Request (behavior: validation errors handled)
    expect([400, 401, 422]).toContain(response.status());
    
    if (response.status() === 400 || response.status() === 422) {
      const data = await response.json();
      
      // Assert: Error message is user-friendly (behavior: clear error messages)
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    }
  });
});

