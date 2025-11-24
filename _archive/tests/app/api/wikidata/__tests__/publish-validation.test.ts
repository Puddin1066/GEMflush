import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { wikidataPublishRequestSchema } from '@/lib/validation/business';

// Mock Next.js request
const createMockRequest = (body: any): NextRequest => {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as any;
};

describe('Wikidata Publish API Validation Integration', () => {
  describe('POST /api/wikidata/publish - wikidataPublishRequestSchema', () => {
    it('should validate publish request body', async () => {
      const validBody = {
        businessId: 1,
        publishToProduction: false,
      };

      const request = createMockRequest(validBody);
      const body = await request.json();
      const result = wikidataPublishRequestSchema.safeParse(body);

      expect(result.success).toBe(true);
    });

    it('should reject invalid publish request', async () => {
      const invalidBody = {
        businessId: 0, // Not positive
      };

      const request = createMockRequest(invalidBody);
      const body = await request.json();
      const result = wikidataPublishRequestSchema.safeParse(body);

      expect(result.success).toBe(false);
    });

    it('should default publishToProduction when not provided', async () => {
      const body = {
        businessId: 1,
      };

      const request = createMockRequest(body);
      const parsedBody = await request.json();
      const result = wikidataPublishRequestSchema.safeParse(parsedBody);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publishToProduction).toBe(false);
      }
    });
  });
});

