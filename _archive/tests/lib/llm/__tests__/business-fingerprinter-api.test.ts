/**
 * TDD Test: BusinessFingerprinter - OpenRouter API Integration
 * 
 * SPECIFICATION: Business Fingerprinting via OpenRouter
 * 
 * As a system
 * I want to fingerprint businesses using OpenRouter API
 * So that I can analyze business visibility across LLM models
 * 
 * Acceptance Criteria:
 * 1. Fingerprints business using multiple LLM models
 * 2. Returns visibility score and metrics
 * 3. Handles errors gracefully
 * 4. Uses OpenRouter API for LLM queries
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessFingerprinter } from '../business-fingerprinter';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies
vi.mock('../openrouter-client', () => ({
  openRouterClient: {
    queryParallel: vi.fn(),
  },
}));

vi.mock('../parallel-processor', () => ({
  parallelProcessor: {
    processQueries: vi.fn(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    llm: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe('BusinessFingerprinter - OpenRouter API Integration', () => {
  let fingerprinter: BusinessFingerprinter;
  let mockQueryParallel: any;
  let mockProcessQueries: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { openRouterClient } = await import('../openrouter-client');
    const { parallelProcessor } = await import('../parallel-processor');

    mockQueryParallel = openRouterClient.queryParallel;
    mockProcessQueries = parallelProcessor.processQueries;

    fingerprinter = new BusinessFingerprinter();
  });

  /**
   * SPECIFICATION 1: Fingerprints business using multiple LLM models
   */
  it('fingerprints business using multiple LLM models via OpenRouter', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({
      id: 123,
      name: 'Test Business',
    });

    mockProcessQueries.mockResolvedValue([
      {
        model: 'openai/gpt-4-turbo',
        mentioned: true,
        confidence: 0.9,
        sentiment: 0.8,
      },
      {
        model: 'anthropic/claude-3-opus',
        mentioned: true,
        confidence: 0.85,
        sentiment: 0.75,
      },
    ]);

    // Act
    const result = await fingerprinter.fingerprint(business);

    // Assert: Verify OpenRouter used (behavior: multiple models queried)
    expect(mockProcessQueries).toHaveBeenCalled();
    expect(result.visibilityScore).toBeDefined();
    expect(result.visibilityScore).toBeGreaterThanOrEqual(0);
    expect(result.visibilityScore).toBeLessThanOrEqual(100);
  });

  /**
   * SPECIFICATION 2: Returns visibility score and metrics
   */
  it('returns comprehensive visibility metrics', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({ id: 123 });

    mockProcessQueries.mockResolvedValue([
      { mentioned: true, confidence: 0.9, sentiment: 0.8 },
      { mentioned: true, confidence: 0.85, sentiment: 0.75 },
      { mentioned: false, confidence: 0.5, sentiment: 0 },
    ]);

    // Act
    const result = await fingerprinter.fingerprint(business);

    // Assert: Verify metrics returned (behavior: comprehensive analysis)
    expect(result).toHaveProperty('visibilityScore');
    expect(result).toHaveProperty('mentionRate');
    expect(result).toHaveProperty('sentimentScore');
    expect(result).toHaveProperty('competitiveLeaderboard');
  });

  /**
   * SPECIFICATION 3: Handles errors gracefully
   */
  it('handles errors gracefully during fingerprinting', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({ id: 123 });

    mockProcessQueries.mockRejectedValue(new Error('API error'));

    // Act & Assert: Verify error handled (behavior: graceful degradation)
    await expect(fingerprinter.fingerprint(business)).rejects.toThrow();
  });
});



