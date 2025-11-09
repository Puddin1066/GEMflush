import { describe, it, expect } from 'vitest';
import { createBusinessSchema, businessCategorySchema } from '../business';

describe('Business Validation', () => {
  describe('createBusinessSchema', () => {
    it('should validate a complete business object', () => {
      const validBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(validBusiness);
      expect(result.success).toBe(true);
    });

    it('should validate business with full address', () => {
      const validBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'retail',
        location: {
          address: '123 Main Street',
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          lat: 37.7749,
          lng: -122.4194,
        },
      };

      const result = createBusinessSchema.safeParse(validBusiness);
      expect(result.success).toBe(true);
    });

    it('should require business name', () => {
      const invalidBusiness = {
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidBusiness = {
        name: 'A',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 200 characters', () => {
      const invalidBusiness = {
        name: 'A'.repeat(201),
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should require valid URL', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'not-a-valid-url',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should require valid category', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'invalid-category',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should require location city', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should validate latitude range', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          lat: 91, // Invalid: > 90
          lng: -122.4194,
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should validate longitude range', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          lat: 37.7749,
          lng: -181, // Invalid: < -180
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });
  });

  describe('businessCategorySchema', () => {
    it('should include all business categories', () => {
      const categories = [
        'restaurant',
        'retail',
        'healthcare',
        'professional_services',
        'home_services',
        'automotive',
        'beauty',
        'fitness',
        'education',
        'entertainment',
        'real_estate',
        'technology',
        'other',
      ];

      categories.forEach(category => {
        expect(businessCategorySchema.options).toContain(category);
      });
    });
  });
});

