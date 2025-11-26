/**
 * Business Decision Functions
 * 
 * Simple decision functions for API routes
 * Implements cache and frequency checking logic
 */

import type { Business, Team } from '@/lib/db/schema';
import { getAutomationConfig } from './automation-service';
import { getFingerprintHistory } from '@/lib/db/queries';

// Cache window: 7 days (businesses shouldn't be crawled more than once per week)
const CRAWL_CACHE_WINDOW_DAYS = 7;
const CRAWL_CACHE_WINDOW_MS = CRAWL_CACHE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Check if crawl is needed
 * Returns false if business was crawled recently (within cache window)
 */
export async function shouldCrawl(business: Business): Promise<boolean> {
  // If never crawled, allow crawl
  if (!business.lastCrawledAt) {
    return true;
  }

  // Check if last crawl is within cache window
  const now = new Date();
  const lastCrawlTime = business.lastCrawledAt.getTime();
  const cacheExpiryTime = lastCrawlTime + CRAWL_CACHE_WINDOW_MS;
  
  // If cache expired (last crawl older than cache window), allow crawl
  if (now.getTime() > cacheExpiryTime) {
    return true;
  }

  // Otherwise, cache is still valid, don't crawl
  return false;
}

/**
 * Check if fingerprint can run (frequency enforcement)
 * Returns false if fingerprint was run recently based on team's frequency limit
 */
export async function canRunFingerprint(business: Business, team: Team): Promise<boolean> {
  const config = getAutomationConfig(team);
  
  // If manual frequency, always allow (user-initiated)
  if (config.fingerprintFrequency === 'manual') {
    return true;
  }

  // Get fingerprints to check last run
  const fingerprints = await getFingerprintHistory(business.id);
  
  // If never fingerprinted, allow
  if (fingerprints.length === 0) {
    return true;
  }

  // Get most recent fingerprint
  const mostRecent = fingerprints.sort((a, b) => 
    b.createdAt.getTime() - a.createdAt.getTime()
  )[0];

  // Calculate frequency limit in days
  let frequencyDays: number;
  switch (config.fingerprintFrequency) {
    case 'weekly':
      frequencyDays = 7;
      break;
    case 'monthly':
      frequencyDays = 30;
      break;
    default:
      frequencyDays = 30; // Default to monthly
  }

  const frequencyWindowMs = frequencyDays * 24 * 60 * 60 * 1000;
  const now = new Date();
  const lastFingerprintTime = mostRecent.createdAt.getTime();
  const frequencyExpiryTime = lastFingerprintTime + frequencyWindowMs;

  // If frequency limit exceeded, allow fingerprint
  if (now.getTime() > frequencyExpiryTime) {
    return true;
  }

  // Otherwise, within frequency limit, don't allow
  return false;
}


