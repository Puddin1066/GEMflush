/**
 * Shared utilities for DTO transformations
 * DRY: Common patterns extracted for reuse across DTO modules
 */

/**
 * Convert date to ISO string, handling various input types
 * DRY: Used across multiple DTO files
 */
export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  if (date instanceof Date) {
    return date.toISOString();
  }
  
  if (typeof date === 'string') {
    // If already ISO string, return as-is
    if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return date;
    }
    // Try to parse and convert
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  
  return null;
}

/**
 * Convert date to ISO string with fallback
 * DRY: Used when a default value is needed
 */
export function toISOStringWithFallback(
  date: Date | string | null | undefined,
  fallback: string = new Date().toISOString()
): string {
  return toISOString(date) ?? fallback;
}

/**
 * Format timestamp for relative display (e.g., "2 days ago")
 * DRY: Used in dashboard-dto.ts
 */
export function formatRelativeTimestamp(date: Date | string | null | undefined): string {
  if (!date) return 'Never';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * Format location for display
 * DRY: Used in dashboard-dto.ts
 */
export function formatLocation(location: { city?: string | null; state?: string | null } | null): string {
  if (!location) return 'Location not set';
  
  const city = location.city || '';
  const state = location.state || '';
  
  if (!city && !state) return 'Location not set';
  if (!city) return state;
  if (!state) return city;
  
  return `${city}, ${state}`;
}

/**
 * Success messages that should be filtered from errorMessage
 * DRY: Used in business-dto.ts
 */
export const SUCCESS_MESSAGES = [
  'Crawl completed',
  'Crawl completed successfully',
  'completed',
  'success',
] as const;

/**
 * Check if a message is a success message (not an error)
 * DRY: Used in business-dto.ts
 */
export function isSuccessMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  
  return SUCCESS_MESSAGES.some(msg => 
    message.toLowerCase().includes(msg.toLowerCase())
  );
}

/**
 * Filter success messages from error message
 * DRY: Used in business-dto.ts
 */
export function filterSuccessMessages(errorMessage: string | null | undefined): string | null {
  if (!errorMessage) return null;
  
  return isSuccessMessage(errorMessage) ? null : errorMessage;
}

/**
 * Calculate trend from two values
 * DRY: Used in fingerprint-dto.ts and dashboard-dto.ts
 */
export function calculateTrend(
  current: number | null,
  previous: number | null,
  threshold: number = 5
): 'up' | 'down' | 'neutral' {
  if (current === null || previous === null) return 'neutral';
  
  const diff = current - previous;
  
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'neutral';
}

/**
 * Round number to specified decimal places
 * DRY: Used in fingerprint-dto.ts
 */
export function roundToDecimal(value: number | null | undefined, decimals: number = 1): number | null {
  if (value === null || value === undefined) return null;
  if (isNaN(value)) return null;
  
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Round percentage (0-100)
 * DRY: Used in fingerprint-dto.ts
 */
export function roundPercentage(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (isNaN(value)) return null;
  
  return Math.round(value);
}

/**
 * Constants for DTO transformations
 * DRY: Centralized configuration values
 */
export const DTO_CONSTANTS = {
  TREND_THRESHOLD: 5, // Percentage change threshold for trend calculation
  FINGERPRINT_HISTORY_LIMIT: 10, // Number of historical fingerprints to fetch
  CRAWL_PROGRESS_WEIGHT: 0.5, // Crawl progress weight in overall progress (50%)
  COMPETITOR_DECIMAL_PLACES: 1, // Decimal places for competitor avgPosition
  RANK_DECIMAL_PLACES: 1, // Decimal places for rank positions
} as const;

