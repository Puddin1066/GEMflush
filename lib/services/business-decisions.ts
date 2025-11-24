/**
 * Business Decision Functions
 * 
 * Simple decision functions for API routes
 * TODO: Implement proper cache/frequency logic
 */

import type { Business, Team } from '@/lib/db/schema';

/**
 * Check if crawl is needed
 * TODO: Implement proper cache checking logic
 */
export async function shouldCrawl(business: Business): Promise<boolean> {
  // For now, always allow crawl (cache logic to be implemented)
  // This prevents build errors while maintaining functionality
  return true;
}

/**
 * Check if fingerprint can run (frequency enforcement)
 * TODO: Implement proper frequency checking logic
 */
export async function canRunFingerprint(business: Business, team: Team): Promise<boolean> {
  // For now, always allow fingerprint (frequency logic to be implemented)
  // This prevents build errors while maintaining functionality
  return true;
}


