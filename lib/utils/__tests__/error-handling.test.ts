/**
 * Unit tests for Error Handling Utilities
 * Tests retry logic, error classification, and sanitization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withRetry,
  isRetryableError,
  calculateRetryDelay,
  handleParallelProcessingError,
  createErrorResponse,
  sanitizeErrorForLogging,
  ProcessingError,
  RETRY_CONFIGS,
} from '../error-handling';

describe('Error Handling Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ProcessingError', () => {
    it('should create ProcessingError with all properties', () => {
      const context = { operation: 'test', businessId: 1 };
      const error = new ProcessingError('Test error', 'TEST_ERROR', true, context);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.context).toEqual(context);
      expect(error.name).toBe('ProcessingError');
    });
  });

  describe('isRetryableError', () => {
    const config = RETRY_CONFIGS.firecrawl;

    it('should identify retryable errors', () => {
      expect(isRetryableError(new Error('Rate Limit exceeded'), config)).toBe(true);
      expect(isRetryableError(new Error('Network timeout occurred'), config)).toBe(true);
      expect(isRetryableError(new Error('HTTP 429 Too Many Requests'), config)).toBe(true);
      expect(isRetryableError(new Error('Server error 502'), config)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(isRetryableError(new Error('Invalid API key'), config)).toBe(false);
      expect(isRetryableError(new Error('Business not found'), config)).toBe(false);
      expect(isRetryableError(new Error('Validation failed'), config)).toBe(false);
    });

    it('should handle empty retryable patterns', () => {
      const emptyConfig = { ...config, retryableErrors: undefined };
      expect(isRetryableError(new Error('Rate Limit'), emptyConfig)).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    const config = RETRY_CONFIGS.firecrawl;

    it('should calculate exponential backoff delay', () => {
      const delay1 = calculateRetryDelay(1, config);
      const delay2 = calculateRetryDelay(2, config);
      const delay3 = calculateRetryDelay(3, config);

      expect(delay1).toBeGreaterThanOrEqual(config.baseDelayMs * 0.75); // With jitter
      expect(delay1).toBeLessThanOrEqual(config.baseDelayMs * 1.25);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateRetryDelay(10, config);
      expect(delay).toBeLessThanOrEqual(config.maxDelayMs * 1.25); // Account for jitter
    });

    it('should include jitter in delay calculation', () => {
      const delays = Array.from({ length: 10 }, () => calculateRetryDelay(1, config));
      const uniqueDelays = new Set(delays);
      
      // With jitter, delays should vary
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('withRetry', () => {
    const context = { operation: 'test', businessId: 1 };
    const config = RETRY_CONFIGS.firecrawl;

    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, context, config);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Rate Limit exceeded'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, context, config);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Invalid API key'));

      await expect(withRetry(operation, context, config)).rejects.toThrow(ProcessingError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Rate Limit exceeded'));
      const shortConfig = { ...config, maxAttempts: 2 };

      await expect(withRetry(operation, context, shortConfig)).rejects.toThrow(ProcessingError);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should wait between retry attempts', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Rate Limit exceeded'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await withRetry(operation, context, { ...config, baseDelayMs: 100 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(75); // Account for jitter
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle non-Error objects', async () => {
      const operation = vi.fn().mockRejectedValue('string error');

      await expect(withRetry(operation, context, config)).rejects.toThrow(ProcessingError);
    });
  });

  describe('handleParallelProcessingError', () => {
    const context = { operation: 'parallel', businessId: 1 };

    it('should continue in degraded mode when only fingerprint fails', () => {
      const crawlError = null;
      const fingerprintError = new Error('LLM API error');

      const result = handleParallelProcessingError(crawlError, fingerprintError, context);

      expect(result.shouldContinue).toBe(true);
      expect(result.degradedMode).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Fingerprint failed');
    });

    it('should not continue when crawl fails', () => {
      const crawlError = new Error('Firecrawl API error');
      const fingerprintError = null;

      const result = handleParallelProcessingError(crawlError, fingerprintError, context);

      expect(result.shouldContinue).toBe(false);
      expect(result.degradedMode).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Crawl failed');
    });

    it('should handle both processes failing', () => {
      const crawlError = new Error('Firecrawl API error');
      const fingerprintError = new Error('LLM API error');

      const result = handleParallelProcessingError(crawlError, fingerprintError, context);

      expect(result.shouldContinue).toBe(false);
      expect(result.degradedMode).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle both processes succeeding', () => {
      const result = handleParallelProcessingError(null, null, context);

      expect(result.shouldContinue).toBe(true);
      expect(result.degradedMode).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createErrorResponse', () => {
    const context = { operation: 'test', businessId: 1 };

    it('should create response for ProcessingError', () => {
      const error = new ProcessingError('Test error', 'TEST_CODE', true, context);
      const response = createErrorResponse(error, context);

      expect(response.error).toBe('Test error');
      expect(response.code).toBe('TEST_CODE');
      expect(response.retryable).toBe(true);
      expect(response.context).toEqual(context);
    });

    it('should create response for regular Error', () => {
      const error = new Error('Regular error');
      const response = createErrorResponse(error, context);

      expect(response.error).toBe('Regular error');
      expect(response.code).toBeUndefined();
      expect(response.retryable).toBeUndefined();
      expect(response.context).toEqual(context);
    });

    it('should handle errors without message', () => {
      const error = new Error();
      const response = createErrorResponse(error, context);

      expect(response.error).toBe('Internal server error');
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('should sanitize API keys from error messages', () => {
      const error = new Error('API call failed with Bearer sk-1234567890abcdef');
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.message).toBe('API call failed with [REDACTED]');
      expect(sanitized.name).toBe('Error');
    });

    it('should sanitize passwords from error messages', () => {
      const error = new Error('Login failed with password: secret123');
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.message).toBe('Login failed with [REDACTED]');
    });

    it('should sanitize tokens from error messages', () => {
      const error = new Error('Token validation failed: token=abc123def456');
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.message).toBe('Token validation failed: [REDACTED]');
    });

    it('should sanitize API keys from stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test (Bearer sk-secret123)';
      
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.stack).toContain('[REDACTED]');
      expect(sanitized.stack).not.toContain('sk-secret123');
    });

    it('should preserve non-sensitive information', () => {
      const error = new Error('Business not found with ID 123');
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.message).toBe('Business not found with ID 123');
      expect(sanitized.name).toBe('Error');
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Test error');
      delete error.stack;
      
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized.message).toBe('Test error');
      expect(sanitized.stack).toBeUndefined();
    });
  });

  describe('RETRY_CONFIGS', () => {
    it('should have proper configuration for firecrawl', () => {
      const config = RETRY_CONFIGS.firecrawl;
      
      expect(config.maxAttempts).toBeGreaterThan(1);
      expect(config.baseDelayMs).toBeGreaterThan(0);
      expect(config.maxDelayMs).toBeGreaterThan(config.baseDelayMs);
      expect(config.backoffMultiplier).toBeGreaterThan(1);
      expect(config.retryableErrors).toContain('Rate Limit');
      expect(config.retryableErrors).toContain('429');
    });

    it('should have proper configuration for llm', () => {
      const config = RETRY_CONFIGS.llm;
      
      expect(config.maxAttempts).toBeGreaterThan(1);
      expect(config.retryableErrors).toContain('Rate Limit');
      expect(config.retryableErrors).toContain('429');
    });

    it('should have proper configuration for database', () => {
      const config = RETRY_CONFIGS.database;
      
      expect(config.maxAttempts).toBeGreaterThan(1);
      expect(config.retryableErrors).toContain('connection');
      expect(config.retryableErrors).toContain('timeout');
    });
  });
});

