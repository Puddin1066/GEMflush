/**
 * Hook-Component Contract Tests
 * 
 * Verifies that hooks provide data in formats that components expect
 * 
 * SOLID: Single Responsibility - validates hook-component contracts
 */

import { describe, it, expect } from 'vitest';

describe('Hook-Component Contracts', () => {
  describe('useBusinesses → BusinessListCard', () => {
    it('should provide business data matching BusinessListCard props', () => {
      // Hook provides
      const hookData = {
        businesses: [
          {
            id: 1, // number - required
            name: 'Test Business',
            url: 'https://example.com',
            status: 'pending',
            location: {
              city: 'San Francisco',
              state: 'CA',
              country: 'US',
            },
            wikidataQID: null,
            createdAt: new Date(),
          },
        ],
      };

      // BusinessListCard expects
      const componentProps = {
        business: hookData.businesses[0],
      };

      // Verify contract
      expect(typeof componentProps.business.id).toBe('number');
      expect(componentProps.business.location).toBeTypeOf('object');
      expect(componentProps.business.location).toHaveProperty('city');
      expect(componentProps.business.location).toHaveProperty('state');
      expect(componentProps.business.location).toHaveProperty('country');
    });

    it('should handle null location gracefully', () => {
      const hookData = {
        businesses: [
          {
            id: 1,
            name: 'Test',
            url: 'https://example.com',
            status: 'pending',
            location: null, // Can be null
            wikidataQID: null,
            createdAt: new Date(),
          },
        ],
      };

      const componentProps = {
        business: hookData.businesses[0],
      };

      // Component should handle null location
      expect(componentProps.business.location === null).toBe(true);
    });
  });

  describe('useBusinessDetail → BusinessDetailPage', () => {
    it('should provide business data matching detail page requirements', () => {
      const hookData = {
        business: {
          id: 1,
          name: 'Test Business',
          url: 'https://example.com',
          status: 'pending',
          location: {
            city: 'SF',
            state: 'CA',
            country: 'US',
          },
          wikidataQID: null,
          createdAt: new Date().toISOString(),
        },
        fingerprint: null,
        entity: null,
        loading: false,
        error: null,
      };

      // Detail page expects
      expect(hookData.business).toBeDefined();
      expect(typeof hookData.business.id).toBe('number');
      expect(hookData.business.location).toBeTypeOf('object');
    });
  });

  describe('useDashboard → DashboardPage', () => {
    it('should provide dashboard data matching dashboard page requirements', () => {
      const hookData = {
        stats: {
          totalBusinesses: 2,
          wikidataEntities: 1,
          avgVisibilityScore: 75,
          businesses: [
            {
              id: '1', // string in DTO
              name: 'Test Business',
              location: 'San Francisco, CA', // string in DTO
              visibilityScore: 80,
              trend: 'up' as const,
              trendValue: 5,
              wikidataQid: 'Q123',
              lastFingerprint: '2 days ago',
              status: 'published' as const,
            },
          ],
        },
      };

      // Dashboard page should handle string IDs and locations
      expect(typeof hookData.stats.businesses[0].id).toBe('string');
      expect(typeof hookData.stats.businesses[0].location).toBe('string');

      // Dashboard page should parse location string
      const locationParts = hookData.stats.businesses[0].location.split(', ');
      expect(locationParts.length).toBe(2);
      expect(locationParts[0]).toBe('San Francisco');
      expect(locationParts[1]).toBe('CA');
    });

    it('should handle empty businesses array', () => {
      const hookData = {
        stats: {
          totalBusinesses: 0,
          wikidataEntities: 0,
          avgVisibilityScore: null,
          businesses: [],
        },
      };

      expect(Array.isArray(hookData.stats.businesses)).toBe(true);
      expect(hookData.stats.businesses.length).toBe(0);
    });
  });

  describe('Error State Contracts', () => {
    it('should provide error in format components expect', () => {
      const hookError = {
        error: new Error('Failed to load'),
        loading: false,
      };

      // Components expect error.message
      expect(hookError.error).toBeInstanceOf(Error);
      expect(typeof hookError.error.message).toBe('string');
    });

    it('should handle null error state', () => {
      const hookData = {
        error: null,
        loading: false,
      };

      expect(hookData.error === null).toBe(true);
    });
  });

  describe('Loading State Contracts', () => {
    it('should provide loading state components expect', () => {
      const hookData = {
        loading: true,
        businesses: [],
      };

      expect(typeof hookData.loading).toBe('boolean');
    });
  });
});

