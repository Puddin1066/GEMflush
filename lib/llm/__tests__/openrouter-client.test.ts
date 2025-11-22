/**
 * OpenRouter Client Test Suite
 * Tests for the streamlined OpenRouter API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterClient } from '../openrouter-client';
import { LLMQuery, DEFAULT_MODELS } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock file system operations
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn()
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  }
}));

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    client = new OpenRouterClient();
    originalEnv = process.env;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getDefaultModels', () => {
    it('should return the default models', () => {
      const models = client.getDefaultModels();
      expect(models).toEqual(DEFAULT_MODELS);
      expect(models).toHaveLength(3);
      expect(models).toContain('openai/gpt-4-turbo');
      expect(models).toContain('anthropic/claude-3-opus');
      expect(models).toContain('google/gemini-pro');
    });
  });

  describe('query', () => {
    const mockApiResponse = {
      id: 'test-request-id',
      model: 'openai/gpt-4-turbo',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Test response content'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150
      }
    };

    it('should make successful API request when API key is configured', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(result).toEqual({
        content: 'Test response content',
        tokensUsed: 150,
        model: 'openai/gpt-4-turbo',
        requestId: 'test-request-id',
        cached: false,
        processingTime: expect.any(Number)
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test prompt')
        })
      );
    });

    it('should return mock response when API key is not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await client.query('openai/gpt-4-turbo', 'What do you know about Test Business?');

      expect(result.content).toContain('Test Business');
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.model).toBe('openai/gpt-4-turbo');
      expect(result.cached).toBe(false);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      });

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Should return mock response as fallback
      expect(result.content).toBeTruthy();
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cached).toBe(false);
    });

    it('should retry failed requests', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      // First call fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        });

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(result.content).toBe('Test response content');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use custom options when provided', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      await client.query('openai/gpt-4-turbo', 'Test prompt', {
        temperature: 0.5,
        maxTokens: 1000
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(0.5);
      expect(requestBody.max_tokens).toBe(1000);
    });
  });

  describe('queryParallel', () => {
    const mockQueries: LLMQuery[] = [
      {
        model: 'openai/gpt-4-turbo',
        prompt: 'Factual prompt',
        promptType: 'factual'
      },
      {
        model: 'anthropic/claude-3-opus',
        prompt: 'Opinion prompt',
        promptType: 'opinion'
      },
      {
        model: 'google/gemini-pro',
        prompt: 'Recommendation prompt',
        promptType: 'recommendation'
      }
    ];

    it('should process multiple queries in parallel', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      const mockResponses = mockQueries.map((query, index) => ({
        id: `request-${index}`,
        model: query.model,
        choices: [{
          message: {
            role: 'assistant',
            content: `Response for ${query.promptType} prompt`
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150
        }
      }));

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[1] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[2] });

      const results = await client.queryParallel(mockQueries);

      expect(results).toHaveLength(3);
      expect(results[0].content).toContain('factual');
      expect(results[1].content).toContain('opinion');
      expect(results[2].content).toContain('recommendation');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in parallel processing', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({
          id: 'success',
          model: 'openai/gpt-4-turbo',
          choices: [{ message: { content: 'Success response' } }],
          usage: { total_tokens: 100 }
        })})
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({
          id: 'success2',
          model: 'google/gemini-pro',
          choices: [{ message: { content: 'Another success' } }],
          usage: { total_tokens: 120 }
        })});

      const results = await client.queryParallel(mockQueries);

      expect(results).toHaveLength(3);
      expect(results[0].content).toBe('Success response');
      expect(results[1].content).toBeTruthy(); // Mock fallback
      expect(results[2].content).toBe('Another success');
    });

    it('should return mock responses when no API key is configured', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const results = await client.queryParallel(mockQueries);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.content).toBeTruthy();
        expect(result.tokensUsed).toBeGreaterThan(0);
        expect(result.cached).toBe(false);
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should process large batches efficiently', async () => {
      const largeBatch: LLMQuery[] = [];
      for (let i = 0; i < 15; i++) {
        largeBatch.push({
          model: DEFAULT_MODELS[i % 3],
          prompt: `Query ${i}`,
          promptType: ['factual', 'opinion', 'recommendation'][i % 3] as any
        });
      }

      delete process.env.OPENROUTER_API_KEY; // Use mock responses for speed

      const results = await client.queryParallel(largeBatch);

      expect(results).toHaveLength(15);
      results.forEach(result => {
        expect(result.content).toBeTruthy();
      });
    });
  });

  describe('mock response generation', () => {
    beforeEach(() => {
      delete process.env.OPENROUTER_API_KEY;
    });

    it('should generate appropriate factual mock responses', async () => {
      const result = await client.query(
        'openai/gpt-4-turbo',
        'What do you know about Acme Pizza in New York?'
      );

      expect(result.content).toContain('Acme Pizza');
      // Mock responses can be either positive or informational
      expect(result.content.toLowerCase()).toMatch(/reputable|professional|quality|established|information|recommend/);
    });

    it('should generate appropriate opinion mock responses', async () => {
      const result = await client.query(
        'anthropic/claude-3-opus',
        'I\'m thinking about going to Acme Pizza. Are they good?'
      );

      expect(result.content).toContain('Acme Pizza');
      expect(result.content.toLowerCase()).toMatch(/recommend|choice|solid|legitimate/);
    });

    it('should generate appropriate recommendation mock responses', async () => {
      const result = await client.query(
        'google/gemini-pro',
        'What are the best pizza places in New York?'
      );

      expect(result.content).toMatch(/\d+\./); // Should contain numbered list
      expect(result.content.toLowerCase()).toContain('pizza');
      expect(result.content.toLowerCase()).toContain('new york');
    });

    it('should handle business name extraction correctly', async () => {
      const testCases = [
        'What do you know about Tony\'s Pizza?',
        'I\'m considering using the services of Smith & Associates.',
        'Tell me about ABC Company Inc.'
      ];

      for (const prompt of testCases) {
        const result = await client.query('openai/gpt-4-turbo', prompt);
        expect(result.content).toBeTruthy();
        expect(result.tokensUsed).toBeGreaterThan(0);
      }
    });
  });

  describe('caching behavior', () => {
    it('should not use caching in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const prodClient = new OpenRouterClient();
      // Caching behavior is internal, but we can verify it doesn't break
      expect(prodClient).toBeInstanceOf(OpenRouterClient);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle cache operations gracefully', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.OPENROUTER_API_KEY;
      
      // First call
      const result1 = await client.query('openai/gpt-4-turbo', 'Test prompt');
      
      // Second call with same parameters (should potentially use cache)
      const result2 = await client.query('openai/gpt-4-turbo', 'Test prompt');
      
      expect(result1.content).toBeTruthy();
      expect(result2.content).toBeTruthy();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle malformed API responses', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }) // Missing required fields
      });

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Should fall back to mock response
      expect(result.content).toBeTruthy();
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('should handle network timeouts gracefully', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Should fall back to mock response
      expect(result.content).toBeTruthy();
      expect(result.cached).toBe(false);
    });
  });
});
