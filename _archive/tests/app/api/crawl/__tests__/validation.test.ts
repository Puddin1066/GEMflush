import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { crawlRequestSchema } from '@/lib/validation/business';

// Mock Next.js request
const createMockRequest = (body: any): NextRequest => {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as any;
};

describe('Crawl API Validation Integration', () => {
  describe('POST /api/crawl - crawlRequestSchema', () => {
    it('should validate crawl request body', async () => {
      const validBody = {
        businessId: 1,
        forceRecrawl: false,
      };

      const request = createMockRequest(validBody);
      const body = await request.json();
      const result = crawlRequestSchema.safeParse(body);

      expect(result.success).toBe(true);
    });

    it('should reject invalid crawl request', async () => {
      const invalidBody = {
        businessId: 0, // Not positive
      };

      const request = createMockRequest(invalidBody);
      const body = await request.json();
      const result = crawlRequestSchema.safeParse(body);

      expect(result.success).toBe(false);
    });

    it('should default forceRecrawl when not provided', async () => {
      const body = {
        businessId: 1,
      };

      const request = createMockRequest(body);
      const parsedBody = await request.json();
      const result = crawlRequestSchema.safeParse(parsedBody);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forceRecrawl).toBe(false);
      }
    });
  });
});

