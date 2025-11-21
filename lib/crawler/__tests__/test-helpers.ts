/**
 * Test Helpers for Crawler Tests
 * DRY: Centralized test utilities to avoid duplication
 * SOLID: Single Responsibility - test utilities only
 */

import { vi } from 'vitest';
import type { FirecrawlResponse } from '../index';
import type { CrawledData } from '@/lib/types/gemflush';

/**
 * Create a mock Firecrawl API response
 */
export function createMockFirecrawlResponse(
  overrides?: Partial<FirecrawlResponse>
): FirecrawlResponse {
  return {
    success: true,
    data: {
      html: '<html><head><title>Test Business</title></head><body><h1>Test Business</h1></body></html>',
      markdown: '# Test Business\n\nTest business description',
      metadata: {
        title: 'Test Business',
        description: 'Test business description',
        language: 'en',
      },
    },
    ...overrides,
  };
}

/**
 * Create mock LLM response for enhancement
 */
export function createMockLLMResponse(overrides?: Partial<CrawledData['llmEnhanced']>) {
  return {
    businessDetails: {
      industry: 'Technology',
    },
    llmEnhanced: {
      extractedEntities: ['Test Business'],
      businessCategory: 'Technology',
      serviceOfferings: ['Service 1', 'Service 2'],
      targetAudience: 'Businesses',
      keyDifferentiators: ['Differentiator 1'],
      confidence: 0.8,
      model: 'openai/gpt-4-turbo',
      processedAt: new Date().toISOString(),
      ...overrides,
    },
  };
}

/**
 * Mock fetch response helper
 * Properly mocks Response with async methods
 */
export function mockFetchResponse(
  status: number,
  data: unknown,
  headers?: Record<string, string>
): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  } as unknown as Response;
  return response;
}

/**
 * Mock Firecrawl API key environment variable
 */
export function mockFirecrawlApiKey(key: string = 'fc-test-key') {
  const originalKey = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = key;
  return () => {
    if (originalKey) {
      process.env.FIRECRAWL_API_KEY = originalKey;
    } else {
      delete process.env.FIRECRAWL_API_KEY;
    }
  };
}

