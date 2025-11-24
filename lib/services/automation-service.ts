/**
 * Automation Configuration Service
 * 
 * Purpose: Tier-based automation configuration and decision logic (pure functions)
 * 
 * SOLID: Single Responsibility - handles automation configuration ONLY (no execution)
 * DRY: Centralizes tier-based automation logic
 * 
 * This service provides:
 * - Configuration based on subscription tier
 * - Decision functions (shouldAutoCrawl, shouldAutoPublish)
 * - Helper functions (calculateNextCrawlDate, getEntityRichnessForTier)
 * 
 * Note: This does NOT execute automation - it only provides configuration and decisions.
 * For execution, see: cfp-automation-service.ts
 */

import { Team, Business } from '@/lib/db/schema';
import { GEMFLUSH_PLANS } from '@/lib/gemflush/plans';
import type { SubscriptionPlan } from '@/lib/types/gemflush';

export interface AutomationConfig {
  crawlFrequency: 'manual' | 'monthly' | 'weekly' | 'daily';
  fingerprintFrequency: 'manual' | 'monthly' | 'weekly';
  autoPublish: boolean;
  entityRichness: 'basic' | 'enhanced' | 'complete';
  progressiveEnrichment: boolean;
}

/**
 * Get automation configuration for a team based on subscription tier
 */
export function getAutomationConfig(team: Team | null): AutomationConfig {
  const planTier = team?.planName || 'free';
  const plan = GEMFLUSH_PLANS[planTier] || GEMFLUSH_PLANS.free;

  // Free tier: manual only
  if (planTier === 'free') {
    return {
      crawlFrequency: 'manual',
      fingerprintFrequency: 'manual',
      autoPublish: false,
      entityRichness: 'basic',
      progressiveEnrichment: false,
    };
  }

  // Pro tier: automated monthly
  if (planTier === 'pro') {
    return {
      crawlFrequency: 'monthly',
      fingerprintFrequency: 'monthly',
      autoPublish: true,
      entityRichness: 'enhanced',
      progressiveEnrichment: false,
    };
  }

  // Agency tier: automated monthly with enrichment
  if (planTier === 'agency') {
    return {
      crawlFrequency: 'monthly',
      fingerprintFrequency: 'monthly',
      autoPublish: true,
      entityRichness: 'complete',
      progressiveEnrichment: true,
    };
  }

  // Default to free tier
  return {
    crawlFrequency: 'manual',
    fingerprintFrequency: 'manual',
    autoPublish: false,
    entityRichness: 'basic',
    progressiveEnrichment: false,
  };
}

/**
 * Check if automation should crawl a business
 * 
 * Handles all decision logic: team null check, manual frequency, automation enabled, and schedule checks.
 */
export function shouldAutoCrawl(business: Business, team: Team | null): boolean {
  // No team means no automation
  if (!team) {
    return false;
  }

  const config = getAutomationConfig(team);

  // Manual frequency means no auto-crawl
  if (config.crawlFrequency === 'manual') {
    return false;
  }

  // If automation not enabled, don't auto-crawl
  if (!business.automationEnabled) {
    return false;
  }

  // Check if next crawl is due
  if (business.nextCrawlAt) {
    return new Date(business.nextCrawlAt) <= new Date();
  }

  // If no next crawl scheduled but automation is enabled, schedule it
  return true;
}

/**
 * Check if automation should publish a business
 */
export function shouldAutoPublish(business: Business, team: Team | null): boolean {
  const config = getAutomationConfig(team);

  // Must have auto-publish enabled
  if (!config.autoPublish) {
    return false;
  }

  // Business must be crawled
  if (business.status !== 'crawled' && business.status !== 'published') {
    return false;
  }

  // If already published, check if we should re-publish (for updates)
  if (business.status === 'published') {
    // Re-publish if crawl data changed (simplified: check if last crawl is newer than last publish)
    if (business.lastCrawledAt && business.lastAutoPublishedAt) {
      return new Date(business.lastCrawledAt) > new Date(business.lastAutoPublishedAt);
    }
    // If published but no auto-publish timestamp, allow re-publish
    return !business.lastAutoPublishedAt;
  }

  // Not published yet, allow auto-publish if crawled
  return true;
}

/**
 * Calculate next crawl date based on frequency
 */
export function calculateNextCrawlDate(frequency: 'monthly' | 'weekly' | 'daily'): Date {
  const next = new Date();
  
  if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Get entity richness level for tier
 */
export function getEntityRichnessForTier(tier: string): 'basic' | 'enhanced' | 'complete' {
  if (tier === 'agency') {
    return 'complete';
  }
  if (tier === 'pro') {
    return 'enhanced';
  }
  return 'basic';
}

