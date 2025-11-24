/**
 * TDD Test: OpenRouter Client - Tests Drive Implementation
 * 
 * SPECIFICATION: OpenRouter API Integration
 * 
 * As a system
 * I want to query LLM models via OpenRouter API
 * So that I can generate business visibility analysis
 * 
 * IMPORTANT: These tests specify DESIRED behavior for OpenRouter integration.
 * Tests verify that API calls work correctly with caching and error handling.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired OpenRouter client behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
  },
}));

vi.mock('crypto', () => ({
  default: {
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mock-hash'),
      })),
    })),
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('🔴 RED: OpenRouter Client - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    vi.mocked(global.fetch).mockReset();
  });

  /**
   * SPECIFICATION 1: query() - MUST Query LLM Models
   * 
   * DESIRED BEHAVIOR: query() MUST send requests to OpenRouter API and
   * return LLM responses with token usage.
   */
  describe('query', () => {
    it('MUST query OpenRouter API and return response', async () => {
      // Arrange: Mock OpenRouter API response
      const mockResponse = {
        id: 'gen-123',
        model: 'openai/gpt-4-turbo',
        choices: [{
          message: {
            role: 'assistant',
            content: 'Test response from LLM',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Arrange: Set API key
      process.env.OPENROUTER_API_KEY = 'test-key-123';

      // Act: Query OpenRouter (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Assert: SPECIFICATION - MUST return LLM response
      expect(result).toBeDefined();
      expect(result.content).toBe('Test response from LLM');
      expect(result.tokensUsed).toBe(30);
      expect(result.model).toBe('openai/gpt-4-turbo');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('MUST include API key in request headers', async () => {
      // Arrange: Set API key
      process.env.OPENROUTER_API_KEY = 'test-key-123';

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'gen-123',
          model: 'openai/gpt-4-turbo',
          choices: [{ message: { role: 'assistant', content: 'Test' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as Response);

      // Act: Query OpenRouter (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Assert: SPECIFICATION - MUST include API key
      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const options = fetchCall[1] as RequestInit;
      expect(options.headers).toMatchObject({
        'Authorization': expect.stringContaining('test-key-123'),
      });
    });

    it('MUST use mock responses when API key is missing', async () => {
      // Arrange: No API key
      const originalKey = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      // Act: Query OpenRouter without API key (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      const result = await client.query('openai/gpt-4-turbo', 'What is Test Business?');

      // Assert: SPECIFICATION - MUST return mock response
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);
      // Should not call real API (mock response is returned)
      expect(global.fetch).not.toHaveBeenCalled();

      // Restore API key
      if (originalKey) {
        process.env.OPENROUTER_API_KEY = originalKey;
      }
    });

    it('MUST handle API errors gracefully', async () => {
      // Arrange: API error response
      process.env.OPENROUTER_API_KEY = 'test-key';
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' }),
      } as Response);

      // Act: Query OpenRouter with error (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      
      // Assert: SPECIFICATION - MUST handle error gracefully
      // Should fallback to mock or throw appropriate error
      await expect(client.query('openai/gpt-4-turbo', 'Test')).rejects.toThrow();
    });

    it('MUST cache responses in development mode', async () => {
      // Arrange: Development mode with cache
      process.env.NODE_ENV = 'development';
      process.env.OPENROUTER_API_KEY = 'test-key';

      const mockResponse = {
        id: 'gen-123',
        model: 'openai/gpt-4-turbo',
        choices: [{ message: { role: 'assistant', content: 'Cached response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      const fs = await import('fs');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);
      vi.mocked(fs.default.mkdirSync).mockImplementation(() => undefined as any);
      vi.mocked(fs.default.writeFileSync).mockImplementation(() => undefined as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Query OpenRouter (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Assert: SPECIFICATION - MUST cache response
      expect(fs.default.writeFileSync).toHaveBeenCalled();
    });

    it('MUST use cached response when available', async () => {
      // Arrange: Cached response exists
      process.env.NODE_ENV = 'development';

      const fs = await import('fs');
      const cachedResponse = {
        prompt: 'Test prompt',
        model: 'openai/gpt-4-turbo',
        response: {
          content: 'Cached response',
          tokensUsed: 30,
          model: 'openai/gpt-4-turbo',
        },
        timestamp: Date.now(),
      };

      vi.mocked(fs.default.existsSync).mockReturnValue(true);
      vi.mocked(fs.default.readFileSync).mockReturnValue(JSON.stringify(cachedResponse));

      // Act: Query OpenRouter (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Assert: SPECIFICATION - MUST return cached response
      expect(result.content).toBe('Cached response');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  /**
   * SPECIFICATION 2: getDefaultModels() - MUST Return Default Models
   * 
   * DESIRED BEHAVIOR: getDefaultModels() MUST return the list of default
   * LLM models used for fingerprinting.
   */
  describe('getDefaultModels', () => {
    it('MUST return default model list', async () => {
      // Act: Get default models (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      const models = client.getDefaultModels();

      // Assert: SPECIFICATION - MUST return default models
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      // Should include common models
      expect(models).toContain('openai/gpt-4-turbo');
    });
  });
});

