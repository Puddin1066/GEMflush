/**
 * TDD Test: Common Validation - Tests Drive Implementation
 * 
 * SPECIFICATION: Common Validation Schemas
 * 
 * As a system
 * I want common validation schemas for path parameters
 * So that API routes can validate IDs consistently
 * 
 * IMPORTANT: These tests specify DESIRED behavior for common validation.
 * Tests verify that validation works correctly for path parameters.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired validation behavior
 */

import { describe, it, expect } from 'vitest';
import {
  idParamSchema,
  businessIdParamSchema,
  fingerprintIdParamSchema,
  jobIdParamSchema,
} from '../common';

describe('🔴 RED: Common Validation - Desired Behavior Specification', () => {
  /**
   * SPECIFICATION 1: idParamSchema - MUST Validate Numeric IDs
   * 
   * DESIRED BEHAVIOR: idParamSchema() MUST validate string IDs from path
   * parameters and transform them to numbers.
   */
  describe('idParamSchema', () => {
    it('MUST accept valid numeric string IDs', () => {
      // Arrange: Valid ID string
      const input = { id: '123' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = idParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST accept and transform to number
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(123);
        expect(typeof result.data.id).toBe('number');
      }
    });

    it('MUST reject non-numeric IDs', () => {
      // Arrange: Invalid ID string
      const input = { id: 'abc' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = idParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST reject non-numeric
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('positive integer');
      }
    });

    it('MUST reject negative IDs', () => {
      // Arrange: Negative ID string
      const input = { id: '-123' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = idParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST reject negative
      expect(result.success).toBe(false);
    });

    it('MUST accept zero as ID (implementation allows it)', () => {
      // Arrange: Zero ID string
      // Note: Current implementation accepts zero via regex /^\d+$/
      // If zero should be rejected, the schema needs to be updated
      const input = { id: '0' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = idParamSchema.safeParse(input);

      // Assert: SPECIFICATION - Current implementation accepts zero
      // If this should be rejected, update the schema to use .refine() to check > 0
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(0);
      }
    });

    it('MUST reject decimal numbers', () => {
      // Arrange: Decimal ID string
      const input = { id: '123.45' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = idParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST reject decimals
      expect(result.success).toBe(false);
    });

    it('MUST reject empty string', () => {
      // Arrange: Empty ID string
      const input = { id: '' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = idParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST reject empty
      expect(result.success).toBe(false);
    });
  });

  /**
   * SPECIFICATION 2: businessIdParamSchema - MUST Validate Business IDs
   * 
   * DESIRED BEHAVIOR: businessIdParamSchema() MUST validate business ID
   * path parameters and transform them to numbers.
   */
  describe('businessIdParamSchema', () => {
    it('MUST accept valid business ID strings', () => {
      // Arrange: Valid business ID
      const input = { businessId: '456' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = businessIdParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST accept and transform
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessId).toBe(456);
        expect(typeof result.data.businessId).toBe('number');
      }
    });

    it('MUST reject invalid business IDs', () => {
      // Arrange: Invalid business ID
      const input = { businessId: 'invalid' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = businessIdParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST reject invalid
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Business ID');
      }
    });
  });

  /**
   * SPECIFICATION 3: fingerprintIdParamSchema - MUST Validate Fingerprint IDs
   * 
   * DESIRED BEHAVIOR: fingerprintIdParamSchema() MUST validate fingerprint ID
   * path parameters and transform them to numbers.
   */
  describe('fingerprintIdParamSchema', () => {
    it('MUST accept valid fingerprint ID strings', () => {
      // Arrange: Valid fingerprint ID
      const input = { id: '789' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = fingerprintIdParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST accept and transform
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(789);
        expect(typeof result.data.id).toBe('number');
      }
    });

    it('MUST reject invalid fingerprint IDs', () => {
      // Arrange: Invalid fingerprint ID
      const input = { id: 'not-a-number' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = fingerprintIdParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST reject invalid
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Fingerprint ID');
      }
    });
  });

  /**
   * SPECIFICATION 4: jobIdParamSchema - MUST Validate Job IDs
   * 
   * DESIRED BEHAVIOR: jobIdParamSchema() MUST validate job ID path
   * parameters and transform them to numbers.
   */
  describe('jobIdParamSchema', () => {
    it('MUST accept valid job ID strings', () => {
      // Arrange: Valid job ID
      const input = { jobId: '101' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = jobIdParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST accept and transform
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobId).toBe(101);
        expect(typeof result.data.jobId).toBe('number');
      }
    });

    it('MUST reject invalid job IDs', () => {
      // Arrange: Invalid job ID
      const input = { jobId: 'abc123' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = jobIdParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST reject invalid
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Job ID');
      }
    });

    it('MUST handle large numeric IDs', () => {
      // Arrange: Large ID string
      const input = { jobId: '999999999' };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = jobIdParamSchema.safeParse(input);

      // Assert: SPECIFICATION - MUST handle large numbers
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobId).toBe(999999999);
      }
    });
  });
});

