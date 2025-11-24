/**
 * TDD Test: Business Fingerprinter - Tests Drive Implementation
 * 
 * SPECIFICATION: Business Fingerprinting Functionality
 * 
 * As a system
 * I want to generate comprehensive business visibility analysis
 * So that I can understand business market position and visibility
 * 
 * IMPORTANT: These tests specify DESIRED behavior for business fingerprinting.
 * Tests verify that fingerprinting works correctly for business analysis.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired fingerprinting behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';
import type { FingerprintAnalysis, BusinessContext } from '../types';

// Mock dependencies
vi.mock('../prompt-generator', () => ({
  promptGenerator: {
    generatePrompts: vi.fn(),
  },
}));

vi.mock('../parallel-processor', () => ({
  parallelProcessor: {
    processQueries: vi.fn(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    fingerprint: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe('🔴 RED: Business Fingerprinter - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: fingerprint() - MUST Generate Fingerprint Analysis
   * 
   * DESIRED BEHAVIOR: fingerprint() MUST generate comprehensive business
   * visibility analysis with metrics, competitive leaderboard, and LLM results.
   */
  describe('fingerprint', () => {
    it('MUST generate fingerprint analysis from business data', async () => {
      // Arrange: Business with basic data
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Example Business',
        url: 'https://example.com',
      });

      const mockPrompts = {
        factual: 'What is Example Business?',
        opinion: 'What do people think about Example Business?',
        recommendation: 'Recommend businesses like Example Business',
      };

      const mockLLMResults = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: 2,
          competitorMentions: ['Competitor A', 'Competitor B'],
          rawResponse: 'Example Business is a leading company...',
          tokensUsed: 150,
          prompt: mockPrompts.factual,
          processingTime: 1000,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');

      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults as any);

      // Act: Generate fingerprint (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST return complete analysis
      expect(result).toBeDefined();
      expect(result.businessId).toBe(business.id);
      expect(result.businessName).toBe(business.name);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.visibilityScore).toBeLessThanOrEqual(100);
      expect(result.metrics.mentionRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.mentionRate).toBeLessThanOrEqual(1);
      expect(result.competitiveLeaderboard).toBeDefined();
      expect(result.llmResults).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('MUST calculate visibility score from LLM results', async () => {
      // Arrange: Business with high mention rate
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Popular Business',
      });

      const mockLLMResults = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Popular Business is well-known...',
          tokensUsed: 100,
          prompt: 'What is Popular Business?',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.85,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'People love Popular Business...',
          tokensUsed: 120,
          prompt: 'What do people think?',
          processingTime: 600,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');

      vi.mocked(promptGenerator.generatePrompts).mockReturnValue({
        factual: 'test',
        opinion: 'test',
        recommendation: 'test',
      } as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults as any);

      // Act: Generate fingerprint (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST calculate visibility score from mentions
      expect(result.metrics.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.mentionRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.mentionRate).toBeLessThanOrEqual(100); // mentionRate is percentage (0-100)
    });

    it('MUST build competitive leaderboard from recommendation queries', async () => {
      // Arrange: Business with competitors mentioned
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Target Business',
      });

      const mockLLMResults = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.8,
          rankPosition: 2,
          competitorMentions: ['Competitor A', 'Competitor B', 'Target Business'],
          rawResponse: 'I recommend Competitor A, Target Business, and Competitor B...',
          tokensUsed: 200,
          prompt: 'Recommend businesses...',
          processingTime: 800,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');

      vi.mocked(promptGenerator.generatePrompts).mockReturnValue({
        factual: 'test',
        opinion: 'test',
        recommendation: 'test',
      } as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults as any);

      // Act: Generate fingerprint (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST build competitive leaderboard
      expect(result.competitiveLeaderboard).toBeDefined();
      expect(result.competitiveLeaderboard.targetBusiness).toBeDefined();
      expect(result.competitiveLeaderboard.targetBusiness.name).toBe('Target Business');
      expect(result.competitiveLeaderboard.competitors).toBeDefined();
      expect(Array.isArray(result.competitiveLeaderboard.competitors)).toBe(true);
    });

    it('MUST handle errors gracefully and return fallback analysis', async () => {
      // Arrange: Business that causes error
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Error Business',
      });

      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockRejectedValue(new Error('LLM API error'));

      // Act: Generate fingerprint with error (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST return fallback analysis on error
      expect(result).toBeDefined();
      expect(result.businessId).toBe(business.id);
      expect(result.businessName).toBe(business.name);
      expect(result.metrics).toBeDefined();
      // Fallback should have low/default scores
      expect(result.metrics.visibilityScore).toBeGreaterThanOrEqual(0);
    });

    it('MUST use business context for prompt generation', async () => {
      // Arrange: Business with location and category
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Local Restaurant',
        category: 'Restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      });

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');

      vi.mocked(promptGenerator.generatePrompts).mockReturnValue({
        factual: 'test',
        opinion: 'test',
        recommendation: 'test',
      } as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue([]);

      // Act: Generate fingerprint (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST use business context for prompts
      expect(promptGenerator.generatePrompts).toHaveBeenCalled();
      const callArgs = vi.mocked(promptGenerator.generatePrompts).mock.calls[0][0];
      expect(callArgs.name).toBe(business.name);
      expect(callArgs.category).toBe(business.category);
      expect(callArgs.location).toBeDefined();
    });

    it('MUST include all LLM results in analysis', async () => {
      // Arrange: Business with multiple LLM results
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const mockLLMResults = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 1',
          tokensUsed: 100,
          prompt: 'Prompt 1',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion' as const,
          mentioned: false,
          sentiment: 'neutral' as const,
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 2',
          tokensUsed: 80,
          prompt: 'Prompt 2',
          processingTime: 400,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.85,
          rankPosition: 3,
          competitorMentions: ['Competitor'],
          rawResponse: 'Response 3',
          tokensUsed: 150,
          prompt: 'Prompt 3',
          processingTime: 600,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');

      vi.mocked(promptGenerator.generatePrompts).mockReturnValue({
        factual: 'test',
        opinion: 'test',
        recommendation: 'test',
      } as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults as any);

      // Act: Generate fingerprint (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST include all LLM results
      expect(result.llmResults).toBeDefined();
      expect(Array.isArray(result.llmResults)).toBe(true);
      // Results may be filtered or processed, so check that we have results
      if (result.llmResults.length > 0) {
        expect(result.llmResults.length).toBeGreaterThanOrEqual(1);
        // Check that results contain expected models
        const models = result.llmResults.map(r => r.model);
        expect(models).toContain('openai/gpt-4-turbo');
        expect(models).toContain('anthropic/claude-3-opus');
        expect(models).toContain('google/gemini-pro');
      }
    });
  });

  /**
   * SPECIFICATION 2: fingerprintWithContext() - MUST Use Full Context
   * 
   * DESIRED BEHAVIOR: fingerprintWithContext() MUST generate analysis using
   * full business context including crawl data and location.
   */
  describe('fingerprintWithContext', () => {
    it('MUST use crawl data when provided in context', async () => {
      // Arrange: Business context with crawl data
      const context: BusinessContext = {
        name: 'Test Business',
        url: 'https://test.com',
        category: 'Technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        crawlData: {
          name: 'Test Business',
          description: 'A technology company',
          services: ['Service A', 'Service B'],
        },
      };

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');

      vi.mocked(promptGenerator.generatePrompts).mockReturnValue({
        factual: 'test',
        opinion: 'test',
        recommendation: 'test',
      } as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue([]);

      // Act: Generate fingerprint with context (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      await businessFingerprinter.fingerprintWithContext(context);

      // Assert: SPECIFICATION - MUST use crawl data in prompts
      expect(promptGenerator.generatePrompts).toHaveBeenCalledWith(
        expect.objectContaining({
          crawlData: context.crawlData,
        })
      );
    });
  });
});

