/**
 * Automation Service Tests
 * Tests tier-based automation configuration
 */

import { describe, it, expect } from 'vitest';
import {
  getAutomationConfig,
  shouldAutoCrawl,
  shouldAutoPublish,
  calculateNextCrawlDate,
  getEntityRichnessForTier,
} from '../automation-service';
import type { Team, Business } from '@/lib/db/schema';

describe('AutomationService', () => {
  describe('getAutomationConfig', () => {
    it('should return manual config for free tier', () => {
      const team = { planName: 'free' } as Team;
      const config = getAutomationConfig(team);

      expect(config.crawlFrequency).toBe('manual');
      expect(config.fingerprintFrequency).toBe('manual');
      expect(config.autoPublish).toBe(false);
      expect(config.entityRichness).toBe('basic');
    });

    it('should return automated config for pro tier', () => {
      const team = { planName: 'pro' } as Team;
      const config = getAutomationConfig(team);

      expect(config.crawlFrequency).toBe('weekly');
      expect(config.fingerprintFrequency).toBe('weekly');
      expect(config.autoPublish).toBe(true);
      expect(config.entityRichness).toBe('enhanced');
      expect(config.progressiveEnrichment).toBe(false);
    });

    it('should return automated config with enrichment for agency tier', () => {
      const team = { planName: 'agency' } as Team;
      const config = getAutomationConfig(team);

      expect(config.crawlFrequency).toBe('weekly');
      expect(config.autoPublish).toBe(true);
      expect(config.entityRichness).toBe('complete');
      expect(config.progressiveEnrichment).toBe(true);
    });

    it('should default to free tier for null team', () => {
      const config = getAutomationConfig(null);
      expect(config.crawlFrequency).toBe('manual');
      expect(config.autoPublish).toBe(false);
    });
  });

  describe('shouldAutoCrawl', () => {
    it('should return false for free tier', () => {
      const team = { planName: 'free' } as Team;
      const business = { automationEnabled: true } as Business;
      
      expect(shouldAutoCrawl(business, team)).toBe(false);
    });

    it('should return false if automation not enabled', () => {
      const team = { planName: 'pro' } as Team;
      const business = { automationEnabled: false } as Business;
      
      expect(shouldAutoCrawl(business, team)).toBe(false);
    });

    it('should return true for pro tier with automation enabled and next crawl due', () => {
      const team = { planName: 'pro' } as Team;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const business = {
        automationEnabled: true,
        nextCrawlAt: pastDate,
      } as Business;
      
      expect(shouldAutoCrawl(business, team)).toBe(true);
    });

    it('should return true for pro tier with automation enabled but no next crawl scheduled', () => {
      const team = { planName: 'pro' } as Team;
      const business = {
        automationEnabled: true,
        nextCrawlAt: null,
      } as Business;
      
      expect(shouldAutoCrawl(business, team)).toBe(true);
    });
  });

  describe('shouldAutoPublish', () => {
    it('should return false for free tier', () => {
      const team = { planName: 'free' } as Team;
      const business = { status: 'crawled' } as Business;
      
      expect(shouldAutoPublish(business, team)).toBe(false);
    });

    it('should return false if business not crawled', () => {
      const team = { planName: 'pro' } as Team;
      const business = { status: 'pending' } as Business;
      
      expect(shouldAutoPublish(business, team)).toBe(false);
    });

    it('should return true for pro tier with crawled business', () => {
      const team = { planName: 'pro' } as Team;
      const business = { status: 'crawled' } as Business;
      
      expect(shouldAutoPublish(business, team)).toBe(true);
    });

    it('should return true for published business if crawl is newer than publish', () => {
      const team = { planName: 'pro' } as Team;
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const business = {
        status: 'published',
        lastCrawledAt: now,
        lastAutoPublishedAt: yesterday,
      } as Business;
      
      expect(shouldAutoPublish(business, team)).toBe(true);
    });
  });

  describe('calculateNextCrawlDate', () => {
    it('should calculate weekly crawl date (7 days ahead)', () => {
      const next = calculateNextCrawlDate('weekly');
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      
      // Allow 1 second difference for execution time
      const diff = Math.abs(next.getTime() - expected.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should calculate daily crawl date (1 day ahead)', () => {
      const next = calculateNextCrawlDate('daily');
      const expected = new Date();
      expected.setDate(expected.getDate() + 1);
      
      const diff = Math.abs(next.getTime() - expected.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('getEntityRichnessForTier', () => {
    it('should return basic for free tier', () => {
      expect(getEntityRichnessForTier('free')).toBe('basic');
    });

    it('should return enhanced for pro tier', () => {
      expect(getEntityRichnessForTier('pro')).toBe('enhanced');
    });

    it('should return complete for agency tier', () => {
      expect(getEntityRichnessForTier('agency')).toBe('complete');
    });
  });
});

