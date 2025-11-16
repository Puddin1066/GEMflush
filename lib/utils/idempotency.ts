/**
 * Idempotency Utilities
 * Prevents duplicate operations when the same request is made multiple times
 * 
 * Supports:
 * - Idempotency-Key header (standard approach)
 * - Business logic-based duplicate detection
 */

import { NextRequest } from 'next/server';

// In-memory cache for idempotency keys (TTL: 24 hours)
// In production, use Redis or a database table
const idempotencyCache = new Map<string, { response: any; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get idempotency key from request header
 */
export function getIdempotencyKey(request: NextRequest): string | null {
  return request.headers.get('Idempotency-Key') || 
         request.headers.get('idempotency-key') ||
         null;
}

/**
 * Check if an idempotency key has been used and return cached response
 */
export function getCachedResponse(key: string): any | null {
  const cached = idempotencyCache.get(key);
  if (!cached) {
    return null;
  }

  // Check if cache entry has expired
  const now = Date.now();
  if (now - cached.timestamp > IDEMPOTENCY_TTL) {
    idempotencyCache.delete(key);
    return null;
  }

  return cached.response;
}

/**
 * Cache a response for an idempotency key
 */
export function cacheResponse(key: string, response: any): void {
  idempotencyCache.set(key, {
    response,
    timestamp: Date.now(),
  });
}

/**
 * Clean up expired cache entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyCache.delete(key);
    }
  }
}

/**
 * Generate a deterministic idempotency key from request data
 * Useful when client doesn't provide an idempotency key
 */
export function generateIdempotencyKey(
  userId: number,
  operation: string,
  data: Record<string, any>
): string {
  // Create a deterministic key from user, operation, and relevant data
  const keyData = {
    userId,
    operation,
    ...data,
  };
  const keyString = JSON.stringify(keyData);
  
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `${operation}:${userId}:${Math.abs(hash)}`;
}

