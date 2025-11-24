/**
 * TDD Test: POST /api/cfp - CFP Orchestrator API
 * 
 * SPECIFICATION: Complete CFP Workflow Orchestration
 * 
 * As a user
 * I want to trigger a complete CFP workflow (Crawl → Fingerprint → Publish)
 * So that I can process a business URL end-to-end
 * 
 * Acceptance Criteria:
 * 1. Returns 200 with CFP result when workflow succeeds
 * 2. Returns 400 when URL is missing
 * 3. Returns 400 when URL format is invalid
 * 4. Executes complete CFP workflow (crawl, fingerprint, optional publish)
 * 5. Returns structured result with business data and entity
 * 6. Handles errors gracefully
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * No Overfitting: Test behavior, not implementation details
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/services/cfp-orchestrator', () => ({
  executeCFPFlow: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      start: vi.fn(() => 'operation-123'),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      complete: vi.fn(), // Required by route
    },
  },
}));

describe('POST /api/cfp - CFP Orchestrator', () => {
  let mockExecuteCFPFlow: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const cfpOrchestrator = await import('@/lib/services/cfp-orchestrator');
    mockExecuteCFPFlow = cfpOrchestrator.executeCFPFlow;
  });

  /**
   * SPECIFICATION 1: Returns 200 with CFP result when workflow succeeds
   */
  it('returns 200 with CFP result when workflow succeeds', async () => {
    // Arrange
    const mockResult = {
      success: true,
      business: {
        id: 123,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'published',
      },
      entity: {
        labels: { en: { value: 'Test Business' } },
        claims: {},
      },
      qid: 'Q123456',
    };

    mockExecuteCFPFlow.mockResolvedValue(mockResult);

    // Act
    const { POST } = await import('@/app/api/cfp/route');
    const request = new NextRequest('http://localhost/api/cfp', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com',
        options: {
          publishTarget: 'test',
          includeFingerprint: true,
          shouldPublish: false,
        },
      }),
    });
    const response = await POST(request);

    // Assert: Verify API contract (behavior: successful CFP workflow)
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.business).toBeDefined();
    expect(data.entity).toBeDefined();
    expect(mockExecuteCFPFlow).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        publishTarget: 'test',
        includeFingerprint: true,
        shouldPublish: false,
      })
    );
  });

  /**
   * SPECIFICATION 2: Returns 400 when URL is missing
   */
  it('returns 400 when URL is missing', async () => {
    // Arrange
    const { POST } = await import('@/app/api/cfp/route');
    const request = new NextRequest('http://localhost/api/cfp', {
      method: 'POST',
      body: JSON.stringify({
        options: { publishTarget: 'test' },
      }),
    });

    // Act
    const response = await POST(request);

    // Assert: Verify validation (behavior: required field validation)
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('URL is required');
    expect(mockExecuteCFPFlow).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 3: Returns 400 when URL format is invalid
   */
  it('returns 400 when URL format is invalid', async () => {
    // Arrange
    const { POST } = await import('@/app/api/cfp/route');
    const request = new NextRequest('http://localhost/api/cfp', {
      method: 'POST',
      body: JSON.stringify({
        url: 'not-a-valid-url',
      }),
    });

    // Act
    const response = await POST(request);

    // Assert: Verify URL validation (behavior: format validation)
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid URL format');
    expect(mockExecuteCFPFlow).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 4: Executes complete CFP workflow
   */
  it('executes complete CFP workflow with correct options', async () => {
    // Arrange
    mockExecuteCFPFlow.mockResolvedValue({
      success: true,
      business: { id: 123 },
      entity: {},
    });

    // Act
    const { POST } = await import('@/app/api/cfp/route');
    const request = new NextRequest('http://localhost/api/cfp', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com',
        options: {
          publishTarget: 'test',
          includeFingerprint: true,
          shouldPublish: true,
          timeout: 90000,
        },
      }),
    });
    await POST(request);

    // Assert: Verify CFP workflow called (behavior: workflow execution)
    expect(mockExecuteCFPFlow).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        publishTarget: 'test',
        includeFingerprint: true,
        shouldPublish: true,
        timeout: 90000,
        allowMockData: true, // Default
      })
    );
  });

  /**
   * SPECIFICATION 5: Returns structured result with business data and entity
   */
  it('returns structured result with all required fields', async () => {
    // Arrange
    const mockResult = {
      success: true,
      business: {
        id: 123,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'published',
        wikidataQID: 'Q123456',
      },
      entity: {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: { P1: [{ value: 'test' }] },
      },
      qid: 'Q123456',
      fingerprint: {
        visibilityScore: 75,
        mentionRate: 80,
      },
    };

    mockExecuteCFPFlow.mockResolvedValue(mockResult);

    // Act
    const { POST } = await import('@/app/api/cfp/route');
    const request = new NextRequest('http://localhost/api/cfp', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    const response = await POST(request);

    // Assert: Verify structured response (behavior: complete data returned)
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.business).toBeDefined();
    expect(data.entity).toBeDefined();
    expect(data.qid).toBe('Q123456');
  });

  /**
   * SPECIFICATION 6: Handles errors gracefully
   */
  it('handles CFP workflow errors gracefully', async () => {
    // Arrange
    mockExecuteCFPFlow.mockRejectedValue(new Error('CFP workflow failed'));

    // Act
    const { POST } = await import('@/app/api/cfp/route');
    const request = new NextRequest('http://localhost/api/cfp', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    const response = await POST(request);

    // Assert: Verify error handling (behavior: graceful error response)
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  /**
   * SPECIFICATION 7: Applies timeout limits
   */
  it('applies maximum timeout limit of 120000ms', async () => {
    // Arrange
    mockExecuteCFPFlow.mockResolvedValue({
      success: true,
      business: { id: 123 },
      entity: {},
    });

    // Act
    const { POST } = await import('@/app/api/cfp/route');
    const request = new NextRequest('http://localhost/api/cfp', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com',
        options: {
          timeout: 300000, // Request 5 minutes
        },
      }),
    });
    await POST(request);

    // Assert: Verify timeout capped (behavior: safety limits)
    expect(mockExecuteCFPFlow).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        timeout: 120000, // Capped at 2 minutes
      })
    );
  });
});

