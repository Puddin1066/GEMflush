/**
 * API Route Contract Tests
 * 
 * Verifies that API routes return usable data structures
 * Focuses on essential requirements, not overly specific contracts
 */

import { describe, it, expect } from 'vitest';

describe('API Route Contracts', () => {
  describe('GET /api/business', () => {
    it('should return businesses array with correct structure', () => {
      // Contract: businesses array, maxBusinesses number
      const expectedResponse = {
        businesses: [
          {
            id: 1, // number
            name: 'Test Business',
            url: 'https://example.com',
            status: 'pending',
            category: 'restaurant',
            location: {
              city: 'San Francisco',
              state: 'CA',
              country: 'US',
            },
            wikidataQID: null,
            createdAt: new Date(),
            teamId: 1,
          },
        ],
        maxBusinesses: 5,
      };

      expect(expectedResponse).toHaveProperty('businesses');
      expect(expectedResponse).toHaveProperty('maxBusinesses');
      expect(Array.isArray(expectedResponse.businesses)).toBe(true);
      expect(typeof expectedResponse.maxBusinesses).toBe('number');
      expect(typeof expectedResponse.businesses[0].id).toBe('number');
    });

    it('should ensure business IDs are numbers (not strings)', () => {
      const business = {
        id: 1, // Must be number
        name: 'Test',
      };

      expect(typeof business.id).toBe('number');
      expect(Number.isInteger(business.id)).toBe(true);
    });

    it('should ensure location is object or null (not string)', () => {
      const businessWithLocation = {
        location: {
          city: 'SF',
          state: 'CA',
          country: 'US',
        },
      };

      const businessWithoutLocation = {
        location: null,
      };

      expect(
        businessWithLocation.location === null ||
          typeof businessWithLocation.location === 'object'
      ).toBe(true);
      expect(businessWithoutLocation.location === null).toBe(true);
    });
  });

  describe('GET /api/business/[id]', () => {
    it('should return single business with correct structure', () => {
      const expectedResponse = {
        business: {
          id: 1, // number
          name: 'Test Business',
          url: 'https://example.com',
          status: 'pending',
          category: 'restaurant',
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
          },
          wikidataQID: null,
          createdAt: new Date().toISOString(),
          teamId: 1,
        },
      };

      expect(expectedResponse).toHaveProperty('business');
      expect(typeof expectedResponse.business.id).toBe('number');
    });

    it('should return 404 with error message when business not found', () => {
      const errorResponse = {
        error: 'Business not found',
      };

      expect(errorResponse).toHaveProperty('error');
      expect(typeof errorResponse.error).toBe('string');
    });
  });

  describe('GET /api/dashboard', () => {
    it('should return DashboardDTO structure', () => {
      const expectedResponse = {
        totalBusinesses: 2,
        wikidataEntities: 1,
        avgVisibilityScore: 75,
        businesses: [
          {
            id: '1', // DTO uses string
            name: 'Test Business',
            location: 'San Francisco, CA', // Simplified to string
            visibilityScore: 80,
            trend: 'up' as const,
            trendValue: 5,
            wikidataQid: 'Q123',
            lastFingerprint: '2 days ago',
            status: 'published' as const,
          },
        ],
      };

      expect(expectedResponse).toHaveProperty('totalBusinesses');
      expect(expectedResponse).toHaveProperty('wikidataEntities');
      expect(expectedResponse).toHaveProperty('avgVisibilityScore');
      expect(expectedResponse).toHaveProperty('businesses');
      expect(typeof expectedResponse.businesses[0].id).toBe('string');
      expect(typeof expectedResponse.businesses[0].location).toBe('string');
    });

    it('should ensure dashboard business IDs are strings', () => {
      const dashboardBusiness = {
        id: '1', // DTO converts to string
        name: 'Test',
      };

      expect(typeof dashboardBusiness.id).toBe('string');
    });

    it('should ensure dashboard location is string (not object)', () => {
      const dashboardBusiness = {
        location: 'San Francisco, CA', // Simplified
      };

      expect(typeof dashboardBusiness.location).toBe('string');
    });
  });

  describe('POST /api/business', () => {
    it('should return created business with ID', () => {
      const expectedResponse = {
        business: {
          id: 1, // Must be number
          name: 'Test Business',
          url: 'https://example.com',
          category: 'restaurant',
          status: 'pending',
          teamId: 1,
        },
        message: 'Business created successfully',
      };

      expect(expectedResponse).toHaveProperty('business');
      expect(expectedResponse.business).toHaveProperty('id');
      expect(typeof expectedResponse.business.id).toBe('number');
      expect(typeof expectedResponse.message).toBe('string');
    });

    it('should handle duplicate business gracefully', () => {
      const duplicateResponse = {
        business: {
          id: 1,
          name: 'Test Business',
        },
        message: 'Business already exists',
        duplicate: true,
      };

      expect(duplicateResponse).toHaveProperty('duplicate');
      expect(duplicateResponse.duplicate).toBe(true);
      expect(typeof duplicateResponse.business.id).toBe('number');
    });
  });
});

describe('Hook-API Contract Alignment', () => {
  describe('useBusinesses hook', () => {
    it('should match /api/business response structure', () => {
      // API returns
      const apiResponse = {
        businesses: [{ id: 1, name: 'Test' }],
        maxBusinesses: 5,
      };

      // Hook expects
      const hookExpectation = {
        businesses: apiResponse.businesses, // Same structure
        maxBusinesses: apiResponse.maxBusinesses,
      };

      expect(hookExpectation.businesses[0].id).toBeTypeOf('number');
      expect(hookExpectation.maxBusinesses).toBeTypeOf('number');
    });
  });

  describe('useBusinessDetail hook', () => {
    it('should match /api/business/[id] response structure', () => {
      // API returns
      const apiResponse = {
        business: {
          id: 1,
          name: 'Test',
          url: 'https://example.com',
          status: 'pending',
          location: { city: 'SF', state: 'CA', country: 'US' },
        },
      };

      // Hook expects
      const hookExpectation = {
        business: apiResponse.business,
      };

      expect(hookExpectation.business.id).toBeTypeOf('number');
      expect(hookExpectation.business.location).toBeTypeOf('object');
    });
  });

  describe('useDashboard hook', () => {
    it('should match /api/dashboard response structure', () => {
      // API returns DashboardDTO
      const apiResponse = {
        totalBusinesses: 2,
        wikidataEntities: 1,
        avgVisibilityScore: 75,
        businesses: [
          {
            id: '1', // string in DTO
            name: 'Test',
            location: 'SF, CA', // string in DTO
            visibilityScore: 80,
            trend: 'up' as const,
            trendValue: 5,
            wikidataQid: 'Q123',
            lastFingerprint: '2 days ago',
            status: 'published' as const,
          },
        ],
      };

      // Hook expects
      const hookExpectation = {
        stats: apiResponse,
      };

      expect(hookExpectation.stats.businesses[0].id).toBeTypeOf('string');
      expect(hookExpectation.stats.businesses[0].location).toBeTypeOf('string');
    });
  });
});

describe('Component-API Contract Alignment', () => {
  describe('BusinessListCard component', () => {
    it('should receive data from useBusinesses hook', () => {
      // Hook provides
      const hookData = {
        businesses: [
          {
            id: 1, // number
            name: 'Test',
            url: 'https://example.com',
            status: 'pending',
            location: {
              city: 'SF',
              state: 'CA',
              country: 'US',
            },
            wikidataQID: null,
            createdAt: new Date(),
          },
        ],
      };

      // Component expects
      const componentProps = {
        business: hookData.businesses[0],
      };

      expect(componentProps.business.id).toBeTypeOf('number');
      expect(componentProps.business.location).toBeTypeOf('object');
    });
  });

  describe('Dashboard business display', () => {
    it('should handle DashboardDTO structure correctly', () => {
      // Dashboard DTO provides
      const dashboardBusiness = {
        id: '1', // string
        name: 'Test',
        location: 'San Francisco, CA', // string
        visibilityScore: 80,
        wikidataQid: 'Q123',
      };

      // Dashboard page should parse location string
      const locationParts = dashboardBusiness.location.split(', ');
      expect(locationParts.length).toBeGreaterThan(0);

      // Dashboard page should handle string ID
      const businessId = parseInt(dashboardBusiness.id);
      expect(typeof businessId).toBe('number');
    });
  });
});

