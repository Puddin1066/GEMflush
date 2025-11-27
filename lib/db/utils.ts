/**
 * Database Query Utilities
 * 
 * Common helper functions for database queries
 * Following DRY principles - reusable query patterns
 * 
 * SOLID: Single Responsibility - query utilities only
 */

/**
 * Get first result from query result array, or null if empty
 * 
 * DRY: Extracted common pattern used throughout queries.ts
 * 
 * @param result - Query result array
 * @returns First result or null
 */
export function getFirstResult<T>(result: T[]): T | null {
  return result.length > 0 ? result[0] : null;
}

/**
 * Get first result from query result array with type assertion
 * 
 * @param result - Query result array
 * @returns First result or null
 */
export function getFirstResultOrNull<T>(result: T[]): T | null {
  return result.length > 0 ? result[0] : null;
}

