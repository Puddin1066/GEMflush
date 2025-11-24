/**
 * Automation Frequency Tests
 * 
 * Verifies that automation is configured for MONTHLY frequency
 * for both fingerprints and wikidata publication
 */

import { describe, it, expect } from 'vitest';
import { getAutomationConfig } from '@/lib/services/automation-service';

describe('Automation Frequency', () => {
  describe('Pro Tier', () => {
    it('should configure monthly fingerprint frequency', () => {
      const team = { planName: 'pro' } as any;
      const config = getAutomationConfig(team);

      expect(config.fingerprintFrequency).toBe('monthly');
    });

    it('should enable auto-publish', () => {
      const team = { planName: 'pro' } as any;
      const config = getAutomationConfig(team);

      expect(config.autoPublish).toBe(true);
    });
  });

  describe('Agency Tier', () => {
    it('should configure monthly fingerprint frequency', () => {
      const team = { planName: 'agency' } as any;
      const config = getAutomationConfig(team);

      expect(config.fingerprintFrequency).toBe('monthly');
    });

    it('should enable auto-publish', () => {
      const team = { planName: 'agency' } as any;
      const config = getAutomationConfig(team);

      expect(config.autoPublish).toBe(true);
    });
  });

  describe('Free Tier', () => {
    it('should be manual only', () => {
      const team = { planName: 'free' } as any;
      const config = getAutomationConfig(team);

      expect(config.fingerprintFrequency).toBe('manual');
      expect(config.autoPublish).toBe(false);
    });
  });
});

