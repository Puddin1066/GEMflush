import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createBusinessSchema, updateBusinessSchema } from '@/lib/validation/business';

// Mock Next.js request
const createMockRequest = (body: any): NextRequest => {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as any;
};

describe('Business API Validation Integration', () => {
  describe('POST /api/business - createBusinessSchema', () => {
    it('should validate request body for business creation', async () => {
      const validBody = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const request = createMockRequest(validBody);
      const body = await request.json();
      const result = createBusinessSchema.safeParse(body);

      expect(result.success).toBe(true);
    });

    it('should reject invalid business creation request', async () => {
      const invalidBody = {
        name: 'A', // Too short
        url: 'not-a-url',
      };

      const request = createMockRequest(invalidBody);
      const body = await request.json();
      const result = createBusinessSchema.safeParse(body);

      expect(result.success).toBe(false);
    });
  });

  describe('PATCH /api/business - updateBusinessSchema', () => {
    it('should validate partial update request', async () => {
      const validBody = {
        name: 'Updated Name',
      };

      const request = createMockRequest(validBody);
      const body = await request.json();
      const result = updateBusinessSchema.safeParse(body);

      expect(result.success).toBe(true);
    });

    it('should reject invalid partial update', async () => {
      const invalidBody = {
        name: 'A', // Too short
      };

      const request = createMockRequest(invalidBody);
      const body = await request.json();
      const result = updateBusinessSchema.safeParse(body);

      expect(result.success).toBe(false);
    });
  });
});

