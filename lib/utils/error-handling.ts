/**
 * Enhanced Error Handling Utilities for Parallel Processing
 * SOLID: Single Responsibility - centralized error handling logic
 * DRY: Reusable error handling patterns
 */

import { loggers } from './logger';

const log = loggers.processing;

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface ErrorContext {
  operation: string;
  businessId?: number;
  jobId?: number;
  url?: string;
  attempt?: number;
  metadata?: Record<string, any>;
}

export class ProcessingError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly context: ErrorContext;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    context: ErrorContext
  ) {
    super(message);
    this.name = 'ProcessingError';
    this.code = code;
    this.retryable = retryable;
    this.context = context;
  }
}

/**
 * Default retry configuration for different operations
 */
export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  firecrawl: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['Rate Limit', 'timeout', 'network', '429', '502', '503', '504'],
  },
  llm: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['Rate Limit', 'timeout', '429', '502', '503'],
  },
  database: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5,
    retryableErrors: ['connection', 'timeout', 'deadlock'],
  },
};

/**
 * Determine if an error is retryable based on error message and configuration
 */
export function isRetryableError(error: Error, config: RetryConfig): boolean {
  if (!config.retryableErrors) return false;
  
  const errorMessage = error.message.toLowerCase();
  return config.retryableErrors.some(retryablePattern => 
    errorMessage.includes(retryablePattern.toLowerCase())
  );
}

/**
 * Calculate delay for exponential backoff with jitter
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter (±25% randomization)
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
  return Math.round(cappedDelay + jitter);
}

/**
 * Execute operation with retry logic and comprehensive error handling
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  config: RetryConfig = RETRY_CONFIGS.firecrawl
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      log.debug('Executing operation with retry', {
        ...context,
        attempt,
        maxAttempts: config.maxAttempts,
      });

      const result = await operation();
      
      if (attempt > 1) {
        log.info('Operation succeeded after retry', {
          ...context,
          attempt,
          totalAttempts: attempt,
        });
      }

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
        log.warn('Operation failed', {
          ...context,
          attempt,
          maxAttempts: config.maxAttempts,
          willRetry: attempt < config.maxAttempts && isRetryableError(lastError, config),
          error: lastError.message,
        });

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt >= config.maxAttempts || !isRetryableError(lastError, config)) {
        break;
      }

      // Wait before retry
      const delay = calculateRetryDelay(attempt, config);
      log.debug('Waiting before retry', {
        ...context,
        attempt,
        delayMs: delay,
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted, throw final error
  const finalError = new ProcessingError(
    `Operation failed after ${config.maxAttempts} attempts: ${lastError?.message}`,
    'MAX_RETRIES_EXCEEDED',
    false,
    { ...context, attempt: config.maxAttempts }
  );

  log.error('Operation failed after all retries', {
    ...context,
    totalAttempts: config.maxAttempts,
    originalError: lastError?.message,
    error: finalError.message,
  });

  throw finalError;
}

/**
 * Handle parallel processing errors with graceful degradation
 */
export function handleParallelProcessingError(
  crawlError: Error | null,
  fingerprintError: Error | null,
  context: ErrorContext
): {
  shouldContinue: boolean;
  degradedMode: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (crawlError) {
    errors.push(`Crawl failed: ${crawlError.message}`);
  }
  
  if (fingerprintError) {
    errors.push(`Fingerprint failed: ${fingerprintError.message}`);
  }

  // If crawl succeeded but fingerprint failed, continue in degraded mode
  if (!crawlError && fingerprintError) {
    log.warn('Continuing in degraded mode - crawl succeeded, fingerprint failed', {
      ...context,
      fingerprintError: fingerprintError.message,
    });
    
    return {
      shouldContinue: true,
      degradedMode: true,
      errors,
    };
  }

  // If crawl failed, we can't continue effectively
  if (crawlError) {
    log.error('Cannot continue - crawl failed', {
      ...context,
      crawlError: crawlError.message,
    });
    
    return {
      shouldContinue: false,
      degradedMode: false,
      errors,
    };
  }

  // Both succeeded
  return {
    shouldContinue: true,
    degradedMode: false,
    errors: [],
  };
}

/**
 * Create standardized error responses for API endpoints
 */
export function createErrorResponse(
  error: Error,
  context: ErrorContext,
  statusCode: number = 500
): {
  error: string;
  code?: string;
  details?: any;
  retryable?: boolean;
  context: ErrorContext;
} {
  if (error instanceof ProcessingError) {
    return {
      error: error.message,
      code: error.code,
      retryable: error.retryable,
      context: error.context,
    };
  }

  return {
    error: error.message || 'Internal server error',
    context,
  };
}

/**
 * Sanitize error for logging (remove sensitive information)
 */
export function sanitizeErrorForLogging(error: Error): Record<string, any> {
  const sanitized: Record<string, any> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Remove sensitive patterns from error messages
  const sensitivePatterns = [
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
    /api[_-]?key[s]?["\s:=]+[A-Za-z0-9\-._~+/]+=*/gi,
    /password[s]?["\s:=]+[^\s"]+/gi,
    /token[s]?["\s:=]+[A-Za-z0-9\-._~+/]+=*/gi,
  ];

  sensitivePatterns.forEach(pattern => {
    if (sanitized.message) {
      sanitized.message = sanitized.message.replace(pattern, '[REDACTED]');
    }
    if (sanitized.stack) {
      sanitized.stack = sanitized.stack.replace(pattern, '[REDACTED]');
    }
  });

  return sanitized;
}
