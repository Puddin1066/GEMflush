import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterClient } from '../openrouter';

// Mock global fetch
global.fetch = vi.fn();

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenRouterClient();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('query', () => {
    it('should make API call when API key is configured', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      process.env.BASE_URL = 'https://test.com';

      const mockResponse = {
        id: 'test-id',
        model: 'openai/gpt-4-turbo',
        choices: [{
          message: {
            role: 'assistant',
            content: 'Test response content',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://test.com',
            'X-Title': 'GEMflush',
          }),
          body: JSON.stringify({
            model: 'openai/gpt-4-turbo',
            messages: [{ role: 'user', content: 'Test prompt' }],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        })
      );

      expect(result).toMatchObject({
        content: 'Test response content',
        tokensUsed: 30,
        model: 'openai/gpt-4-turbo',
      });
    });

    it('should return mock response when API key is not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await client.query('openai/gpt-4-turbo', 'What do you know about Test Business?');

      expect(fetch).not.toHaveBeenCalled();
      expect(result.content).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.model).toBe('openai/gpt-4-turbo');
    });

    it('should handle API errors and return mock response', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.content).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should handle network errors and return mock response', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.content).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should use default BASE_URL when not set', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      delete process.env.BASE_URL;

      const mockResponse = {
        id: 'test-id',
        model: 'openai/gpt-4-turbo',
        choices: [{ message: { role: 'assistant', content: 'Test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'HTTP-Referer': 'https://gemflush.com',
          }),
        })
      );
    });

    it('should handle missing usage data gracefully', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      const mockResponse = {
        id: 'test-id',
        model: 'openai/gpt-4-turbo',
        choices: [{ message: { role: 'assistant', content: 'Test' }, finish_reason: 'stop' }],
        usage: undefined,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(result.tokensUsed).toBe(0);
    });
  });

  describe('getMockResponse', () => {
    it('should generate factual response for factual prompts', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await client.query('openai/gpt-4-turbo', 'What do you know about Test Business?');

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should generate opinion response for opinion prompts', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await client.query('openai/gpt-4-turbo', 'Is Test Business reputable and reliable?');

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should generate recommendation response for recommendation prompts', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await client.query('openai/gpt-4-turbo', 'Can you recommend the best businesses?');

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should return tokensUsed in reasonable range', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      expect(result.tokensUsed).toBeGreaterThanOrEqual(100);
      expect(result.tokensUsed).toBeLessThanOrEqual(300);
    });
  });
});

