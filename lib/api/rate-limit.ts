/**
 * Basic Rate Limiting
 * 
 * Simple in-memory rate limiting for API routes.
 * Can be upgraded to Redis-based rate limiting later.
 * 
 * SOLID: Single Responsibility - rate limiting only
 * DRY: Centralized rate limiting logic
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (simple, no external dependencies)
// TODO: Upgrade to Redis for multi-instance deployments
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Default rate limits
 */
export const RATE_LIMITS = {
  // General API: 100 requests per hour
  api: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
  // Authentication: 10 requests per hour
  auth: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  // Business creation: 5 requests per hour
  businessCreate: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  // CFP processing: 3 requests per hour
  cfp: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
} as const;

/**
 * Check if request should be rate limited
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns true if rate limited, false otherwise
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically (every 1000 checks)
  if (Math.random() < 0.001) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Increment count
  entry.count += 1;
  rateLimitStore.set(identifier, entry);

  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    limited,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request
 * 
 * @param request - Next.js request object
 * @returns Client identifier (IP address or user ID)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier (not ideal, but better than nothing)
  return 'unknown';
}

/**
 * Rate limit middleware helper
 * 
 * @param request - Next.js request
 * @param config - Rate limit configuration
 * @returns Response if rate limited, null otherwise
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Response | null {
  const identifier = getClientIdentifier(request);
  const { limited, remaining, resetAt } = isRateLimited(identifier, config);

  if (limited) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${new Date(resetAt).toISOString()}`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetAt.toString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Get current rate limit status without incrementing counter
 * 
 * Useful for checking status without affecting the rate limit count.
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): { count: number; remaining: number; limited: boolean; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // No entry or expired - return default status
    return {
      count: 0,
      remaining: config.maxRequests,
      limited: false,
      resetAt: now + config.windowMs,
    };
  }

  // Return current status without incrementing
  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    count: entry.count,
    remaining,
    limited,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for an identifier
 * 
 * Clears the rate limit entry, allowing fresh requests.
 * Useful for testing or admin operations.
 * 
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}


