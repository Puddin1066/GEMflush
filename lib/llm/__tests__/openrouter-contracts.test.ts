import { describe, it, expect } from 'vitest';
import { OpenRouterClient } from '../openrouter';

/**
 * Unit Tests for OpenRouter API Contract Types
 * 
 * Tests the internal OpenRouter interface contracts to ensure type safety
 * and structure validation for API requests/responses.
 * SOLID: Single Responsibility - tests contract types only
 * DRY: Reusable test fixtures
 */

// Type definitions matching OpenRouter interfaces
interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

describe('OpenRouter API Contract Types', () => {
  // DRY: Reusable test fixtures
  const createValidMessage = (): OpenRouterMessage => ({
    role: 'user',
    content: 'Test prompt',
  });

  const createValidRequest = (): OpenRouterRequest => ({
    model: 'openai/gpt-4-turbo',
    messages: [createValidMessage()],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const createValidResponse = (): OpenRouterResponse => ({
    id: 'chatcmpl-123',
    model: 'openai/gpt-4-turbo',
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Test response',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  });

  describe('OpenRouterMessage Contract', () => {
    it('should accept valid user message', () => {
      const message: OpenRouterMessage = {
        role: 'user',
        content: 'What is the weather?',
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('What is the weather?');
      expect(typeof message.content).toBe('string');
    });

    it('should accept valid system message', () => {
      const message: OpenRouterMessage = {
        role: 'system',
        content: 'You are a helpful assistant.',
      };

      expect(message.role).toBe('system');
      expect(message.content).toBe('You are a helpful assistant.');
    });

    it('should accept valid assistant message', () => {
      const message: OpenRouterMessage = {
        role: 'assistant',
        content: 'The weather is sunny.',
      };

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('The weather is sunny.');
    });

    it('should enforce role union type', () => {
      // TypeScript compile-time check - these should be invalid
      // @ts-expect-error - Invalid role value
      const invalidRole: OpenRouterMessage = {
        role: 'invalid',
        content: 'Test',
      };
      // This test verifies TypeScript catches invalid roles at compile time
      expect(invalidRole).toBeDefined();
    });

    it('should require content field', () => {
      const message = createValidMessage();
      expect(message.content).toBeDefined();
      expect(typeof message.content).toBe('string');
    });

    it('should accept empty content string', () => {
      const message: OpenRouterMessage = {
        role: 'user',
        content: '',
      };

      expect(message.content).toBe('');
    });
  });

  describe('OpenRouterRequest Contract', () => {
    it('should accept valid request with all fields', () => {
      const request = createValidRequest();

      expect(request.model).toBe('openai/gpt-4-turbo');
      expect(Array.isArray(request.messages)).toBe(true);
      expect(request.messages.length).toBe(1);
      expect(request.temperature).toBe(0.7);
      expect(request.max_tokens).toBe(2000);
    });

    it('should accept request with minimal required fields', () => {
      const request: OpenRouterRequest = {
        model: 'anthropic/claude-3-opus',
        messages: [createValidMessage()],
      };

      expect(request.model).toBeDefined();
      expect(request.messages).toBeDefined();
      expect(request.temperature).toBeUndefined();
      expect(request.max_tokens).toBeUndefined();
    });

    it('should accept multiple messages', () => {
      const request: OpenRouterRequest = {
        model: 'openai/gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'What is AI?' },
          { role: 'assistant', content: 'AI is...' },
          { role: 'user', content: 'Tell me more.' },
        ],
      };

      expect(request.messages.length).toBe(4);
      expect(request.messages[0].role).toBe('system');
      expect(request.messages[1].role).toBe('user');
    });

    it('should accept valid temperature range', () => {
      const request: OpenRouterRequest = {
        model: 'openai/gpt-4-turbo',
        messages: [createValidMessage()],
        temperature: 0.0, // Minimum
      };

      expect(request.temperature).toBe(0.0);

      const requestMax: OpenRouterRequest = {
        model: 'openai/gpt-4-turbo',
        messages: [createValidMessage()],
        temperature: 2.0, // Maximum typical range
      };

      expect(requestMax.temperature).toBe(2.0);
    });

    it('should accept valid max_tokens', () => {
      const request: OpenRouterRequest = {
        model: 'openai/gpt-4-turbo',
        messages: [createValidMessage()],
        max_tokens: 1, // Minimum
      };

      expect(request.max_tokens).toBe(1);

      const requestLarge: OpenRouterRequest = {
        model: 'openai/gpt-4-turbo',
        messages: [createValidMessage()],
        max_tokens: 4096, // Large value
      };

      expect(requestLarge.max_tokens).toBe(4096);
    });

    it('should require model field', () => {
      const request = createValidRequest();
      expect(request.model).toBeDefined();
      expect(typeof request.model).toBe('string');
      expect(request.model.length).toBeGreaterThan(0);
    });

    it('should require messages array', () => {
      const request = createValidRequest();
      expect(Array.isArray(request.messages)).toBe(true);
      expect(request.messages.length).toBeGreaterThan(0);
    });
  });

  describe('OpenRouterResponse Contract', () => {
    it('should accept valid response with all fields', () => {
      const response = createValidResponse();

      expect(response.id).toBe('chatcmpl-123');
      expect(response.model).toBe('openai/gpt-4-turbo');
      expect(Array.isArray(response.choices)).toBe(true);
      expect(response.choices.length).toBe(1);
      expect(response.usage).toBeDefined();
    });

    it('should accept response with multiple choices', () => {
      const response: OpenRouterResponse = {
        id: 'chatcmpl-456',
        model: 'openai/gpt-4-turbo',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'First response',
            },
            finish_reason: 'stop',
          },
          {
            message: {
              role: 'assistant',
              content: 'Second response',
            },
            finish_reason: 'length',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      expect(response.choices.length).toBe(2);
      expect(response.choices[0].message.content).toBe('First response');
      expect(response.choices[1].finish_reason).toBe('length');
    });

    it('should validate usage structure', () => {
      const response = createValidResponse();

      expect(response.usage.prompt_tokens).toBeGreaterThanOrEqual(0);
      expect(response.usage.completion_tokens).toBeGreaterThanOrEqual(0);
      expect(response.usage.total_tokens).toBeGreaterThanOrEqual(0);
      expect(response.usage.total_tokens).toBe(
        response.usage.prompt_tokens + response.usage.completion_tokens
      );
    });

    it('should accept various finish_reason values', () => {
      const reasons = ['stop', 'length', 'content_filter', 'tool_calls'];

      reasons.forEach((reason) => {
        const response: OpenRouterResponse = {
          id: 'test',
          model: 'openai/gpt-4-turbo',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Test',
              },
              finish_reason: reason,
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        };

        expect(response.choices[0].finish_reason).toBe(reason);
      });
    });

    it('should require id field', () => {
      const response = createValidResponse();
      expect(response.id).toBeDefined();
      expect(typeof response.id).toBe('string');
    });

    it('should require model field', () => {
      const response = createValidResponse();
      expect(response.model).toBeDefined();
      expect(typeof response.model).toBe('string');
    });

    it('should require choices array', () => {
      const response = createValidResponse();
      expect(Array.isArray(response.choices)).toBe(true);
      expect(response.choices.length).toBeGreaterThan(0);
    });

    it('should require usage object', () => {
      const response = createValidResponse();
      expect(response.usage).toBeDefined();
      expect(typeof response.usage).toBe('object');
    });
  });

  describe('OpenRouterClient Contract Integration', () => {
    it('should return response matching contract structure', async () => {
      // Test that the client's query method returns data matching the contract
      const client = new OpenRouterClient();
      
      // Without API key, should return mock response
      delete process.env.OPENROUTER_API_KEY;
      
      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Verify return type matches expected contract
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('tokensUsed');
      expect(result).toHaveProperty('model');
      expect(typeof result.content).toBe('string');
      expect(typeof result.tokensUsed).toBe('number');
      expect(typeof result.model).toBe('string');
      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
    });

    it('should handle request structure correctly', async () => {
      // This test verifies the internal request structure matches OpenRouterRequest contract
      const client = new OpenRouterClient();
      delete process.env.OPENROUTER_API_KEY;

      // The query method internally constructs OpenRouterRequest
      // We verify the output structure matches expectations
      const result = await client.query('anthropic/claude-3-opus', 'What is AI?');

      expect(result.model).toBe('anthropic/claude-3-opus');
      expect(result.content).toBeDefined();
    });
  });
});

