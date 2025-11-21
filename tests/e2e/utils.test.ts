import { describe, it, expect } from 'vitest';
import {
  formatPercentage,
  formatVisibilityScore,
  formatMarketPosition,
  formatModelName,
  formatRelativeTime,
  formatSentiment,
  formatTrend,
  formatRank,
} from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

describe('Utils E2E Tests', () => {
  describe('Complete Formatting Workflows', () => {
    it('should format complete visibility score display', () => {
      const score = 75;
      const formatted = formatVisibilityScore(score);
      const percentage = formatPercentage(score / 100);

      expect(formatted.text).toBe('75%');
      expect(formatted.badge).toBe('Excellent');
      expect(percentage).toBe('75%');
    });

    it('should format complete market position display', () => {
      const position = formatMarketPosition('leading');
      
      expect(position.label).toBe('Leading');
      expect(position.icon).toBe('🏆');
      expect(position.colorClass).toBe('text-green-700');
      expect(position.bgClass).toBe('bg-green-100');
    });

    it('should format complete sentiment and trend display', () => {
      const sentiment = formatSentiment('positive');
      const trend = formatTrend('up');

      expect(sentiment.emoji).toBe('😊');
      expect(sentiment.colorClass).toBe('text-green-600');
      expect(trend.icon).toBe('↑');
      expect(trend.colorClass).toBe('text-green-600');
    });

    it('should format complete rank display', () => {
      const rank1 = formatRank(1);
      const rank4 = formatRank(4);

      expect(rank1.medal).toBe('🥇');
      expect(rank1.label).toBe('#1');
      expect(rank4.medal).toBe('');
      expect(rank4.label).toBe('#4');
    });
  });

  describe('Model Name Formatting Integration', () => {
    it('should format various model names correctly', () => {
      const models = [
        { input: 'openai/gpt-4-turbo', expected: 'GPT-4 Turbo' },
        { input: 'openai/gpt-3.5-turbo', expected: 'GPT-3.5 Turbo' },
        { input: 'anthropic/claude-3-opus', expected: 'Claude 3 Opus' },
      ];

      models.forEach(({ input, expected }) => {
        expect(formatModelName(input)).toBe(expected);
      });
    });
  });

  describe('Class Name Merging', () => {
    it('should merge classes for UI components', () => {
      const baseClasses = 'px-4 py-2';
      const conditionalClasses = cn(baseClasses, true && 'bg-blue-500', false && 'bg-red-500');
      
      expect(conditionalClasses).toContain('px-4');
      expect(conditionalClasses).toContain('py-2');
      expect(conditionalClasses).toContain('bg-blue-500');
      expect(conditionalClasses).not.toContain('bg-red-500');
    });
  });
});

