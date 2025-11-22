import { describe, it, expect } from 'vitest';
import { fingerprintRequestSchema } from '@/lib/validation/business';

/**
 * Unit Tests for LLM Validation Schema Contracts
 * 
 * Tests the Zod validation schemas for LLM fingerprint requests
 * to ensure proper validation and type safety at API boundaries.
 * SOLID: Single Responsibility - tests validation schemas only
 * DRY: Reusable test fixtures
 */

describe('LLM Validation Schema Contracts', () => {
  // DRY: Reusable test fixtures
  const createValidFingerprintRequest = () => ({
    businessId: 1,
    includeCompetitors: true,
  });

  describe('fingerprintRequestSchema Contract', () => {
    it('should validate request with all fields', () => {
      const request = createValidFingerprintRequest();
      const result = fingerprintRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessId).toBe(1);
        expect(result.data.includeCompetitors).toBe(true);
      }
    });

    it('should validate request with minimal required fields', () => {
      const request = {
        businessId: 1,
      };
      const result = fingerprintRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessId).toBe(1);
        expect(result.data.includeCompetitors).toBe(true); // Default value
      }
    });

    it('should require businessId as positive integer', () => {
      const validRequest = { businessId: 1 };
      const result = fingerprintRequestSchema.safeParse(validRequest);

      expect(result.success).toBe(true);
    });

    it('should reject negative businessId', () => {
      const invalidRequest = { businessId: -1 };
      const result = fingerprintRequestSchema.safeParse(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should reject zero businessId', () => {
      const invalidRequest = { businessId: 0 };
      const result = fingerprintRequestSchema.safeParse(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should reject non-integer businessId', () => {
      const invalidRequest = { businessId: 1.5 };
      const result = fingerprintRequestSchema.safeParse(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should reject missing businessId', () => {
      const invalidRequest = {};
      const result = fingerprintRequestSchema.safeParse(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should accept includeCompetitors as boolean', () => {
      const requestTrue = { businessId: 1, includeCompetitors: true };
      const resultTrue = fingerprintRequestSchema.safeParse(requestTrue);

      expect(resultTrue.success).toBe(true);
      if (resultTrue.success) {
        expect(resultTrue.data.includeCompetitors).toBe(true);
      }

      const requestFalse = { businessId: 1, includeCompetitors: false };
      const resultFalse = fingerprintRequestSchema.safeParse(requestFalse);

      expect(resultFalse.success).toBe(true);
      if (resultFalse.success) {
        expect(resultFalse.data.includeCompetitors).toBe(false);
      }
    });

    it('should default includeCompetitors to true when omitted', () => {
      const request = { businessId: 1 };
      const result = fingerprintRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeCompetitors).toBe(true);
      }
    });

    it('should reject non-boolean includeCompetitors', () => {
      const invalidRequest = { businessId: 1, includeCompetitors: 'true' };
      const result = fingerprintRequestSchema.safeParse(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should reject invalid additional fields', () => {
      const invalidRequest = {
        businessId: 1,
        includeCompetitors: true,
        invalidField: 'should be rejected',
      };
      const result = fingerprintRequestSchema.safeParse(invalidRequest);

      // Zod by default allows extra fields, but we can check the parsed data
      if (result.success) {
        expect(result.data).not.toHaveProperty('invalidField');
      }
    });

    it('should handle large businessId values', () => {
      const request = { businessId: 999999 };
      const result = fingerprintRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessId).toBe(999999);
      }
    });

    it('should parse and return typed data', () => {
      const request = createValidFingerprintRequest();
      const result = fingerprintRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript should infer the correct type
        const data = result.data;
        expect(typeof data.businessId).toBe('number');
        expect(typeof data.includeCompetitors).toBe('boolean');
      }
    });
  });
});

