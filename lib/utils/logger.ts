/**
 * Enhanced logging utility for processing and debugging
 * Provides structured logs with timing, context, and performance metrics
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  businessId?: number;
  jobId?: number | string;
  url?: string;
  status?: string;
  attempt?: number;
  maxAttempts?: number;
  duration?: number;
  [key: string]: unknown;
}

class Logger {
  private service: string;
  private startTimes: Map<string, number> = new Map();

  constructor(service: string) {
    this.service = service;
  }

  /**
   * Start timing an operation
   */
  start(operation: string, context?: LogContext): string {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTimes.set(operationId, Date.now());
    this.log('info', `▶ ${operation}`, { ...context, operationId });
    return operationId;
  }

  /**
   * Log with level and context
   * DRY: Centralized logging logic with environment-aware behavior
   * SOLID: Single Responsibility - handles all logging concerns
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || (isProduction ? 'warn' : 'debug');
    
    // In production, only log warnings and errors unless LOG_LEVEL is set
    if (isProduction && level === 'info' && logLevel !== 'info' && logLevel !== 'debug') {
      return;
    }
    if (isProduction && level === 'debug' && logLevel !== 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${this.service}]`;
    const contextStr = context ? this.formatContext(context) : '';
    const logMessage = `${prefix} ${message}${contextStr}`;

    switch (level) {
      case 'debug':
        if (logLevel === 'debug') {
          console.log(`🔍 ${logMessage}`);
        }
        break;
      case 'info':
        console.log(`ℹ️  ${logMessage}`);
        break;
      case 'warn':
        console.warn(`⚠️  ${logMessage}`);
        break;
      case 'error':
        console.error(`❌ ${logMessage}`);
        break;
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message with stack trace
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof Error && error.stack) {
      errorContext.stack = error.stack.split('\n').slice(0, 3).join(' → '); // First 3 lines of stack
    }

    this.log('error', message, errorContext);
  }

  /**
   * Log debug message (only in debug mode)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log performance metric
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const durationStr = duration >= 1000 
      ? `${(duration / 1000).toFixed(2)}s` 
      : `${Math.round(duration)}ms`;
    
    this.log('info', `⏱️  ${operation} completed in ${durationStr}`, {
      ...context,
      duration: Math.round(duration),
      durationMs: duration,
    });
  }

  /**
   * Complete an operation with timing
   */
  complete(operationId: string, operation: string, context?: LogContext): void {
    const startTime = this.startTimes.get(operationId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performance(operation, duration, context);
      this.startTimes.delete(operationId);
    } else {
      this.log('info', `✓ ${operation} completed`, context);
    }
  }

  /**
   * Log status change
   */
  statusChange(from: string, to: string, context?: LogContext): void {
    this.log('info', `🔄 Status: ${from} → ${to}`, context);
  }

  /**
   * Log retry attempt
   */
  retry(attempt: number, maxAttempts: number, operation: string, delay: number, context?: LogContext): void {
    this.log('warn', `🔄 Retrying ${operation} (attempt ${attempt + 1}/${maxAttempts}) in ${delay}ms`, {
      ...context,
      attempt: attempt + 1,
      maxAttempts,
      delay,
    });
  }

  /**
   * Format context object for display
   */
  private formatContext(context: LogContext): string {
    const parts: string[] = [];

    if (context.businessId) {
      parts.push(`business=${context.businessId}`);
    }
    if (context.jobId !== undefined) {
      parts.push(`job=${context.jobId}`);
    }
    if (context.url) {
      const url = context.url.length > 50 ? `${context.url.substring(0, 47)}...` : context.url;
      parts.push(`url=${url}`);
    }
    if (context.status) {
      parts.push(`status=${context.status}`);
    }
    if (context.attempt && context.maxAttempts) {
      parts.push(`attempt=${context.attempt}/${context.maxAttempts}`);
    }
    if (context.duration !== undefined) {
      parts.push(`duration=${context.duration}ms`);
    }

    // Add any other context fields
    Object.entries(context).forEach(([key, value]) => {
      if (!['businessId', 'jobId', 'url', 'status', 'attempt', 'maxAttempts', 'duration'].includes(key)) {
        if (value !== undefined && value !== null) {
          const strValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value);
          parts.push(`${key}=${strValue}`);
        }
      }
    });

    return parts.length > 0 ? ` | ${parts.join(', ')}` : '';
  }
}

/**
 * Create a logger instance for a service
 */
export function createLogger(service: string): Logger {
  return new Logger(service);
}

/**
 * Pre-configured loggers for common services
 */
export const loggers = {
  processing: createLogger('PROCESSING'),
  scheduler: createLogger('SCHEDULER'),
  crawler: createLogger('CRAWLER'),
  fingerprint: createLogger('FINGERPRINT'),
  api: createLogger('API'),
};

