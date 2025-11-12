import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatPercentage,
  formatVisibilityScore,
  formatMarketPosition,
  formatModelName,
  formatRelativeTime,
  formatSentiment,
  formatTrend,
  formatRank,
} from '../format';

// Mock date-fns
vi.mock('date-fns/formatDistanceToNow', () => ({
  formatDistanceToNow: vi.fn((date: Date, options?: { addSuffix?: boolean }) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (options?.addSuffix) {
      return `${minutes} minutes ago`;
    }
    return `${minutes} minutes`;
  }),
}));

describe('Format Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatPercentage', () => {
    it('should format decimal value as percentage', () => {
      expect(formatPercentage(0.75)).toBe('75%');
      expect(formatPercentage(0.5)).toBe('50%');
      expect(formatPercentage(0.123)).toBe('12%');
    });

    it('should format percentage value without conversion', () => {
      expect(formatPercentage(75)).toBe('75%');
      expect(formatPercentage(100)).toBe('100%');
    });

    it('should support custom decimal places', () => {
      expect(formatPercentage(0.753, 1)).toBe('75.3%');
      expect(formatPercentage(0.753, 2)).toBe('75.30%');
      expect(formatPercentage(0.5, 1)).toBe('50.0%');
    });

    it('should handle edge cases', () => {
      expect(formatPercentage(0)).toBe('0%');
      expect(formatPercentage(1)).toBe('100%');
      expect(formatPercentage(0.001, 2)).toBe('0.10%');
    });
  });

  describe('formatVisibilityScore', () => {
    it('should format excellent score (>= 70)', () => {
      const result = formatVisibilityScore(75);
      expect(result.text).toBe('75%');
      expect(result.colorClass).toBe('text-green-600');
      expect(result.badge).toBe('Excellent');
    });

    it('should format good score (>= 40)', () => {
      const result = formatVisibilityScore(50);
      expect(result.text).toBe('50%');
      expect(result.colorClass).toBe('text-amber-600');
      expect(result.badge).toBe('Good');
    });

    it('should format needs improvement score (< 40)', () => {
      const result = formatVisibilityScore(30);
      expect(result.text).toBe('30%');
      expect(result.colorClass).toBe('text-red-600');
      expect(result.badge).toBe('Needs Improvement');
    });

    it('should round score values', () => {
      const result = formatVisibilityScore(75.7);
      expect(result.text).toBe('76%');
    });

    it('should handle boundary values', () => {
      expect(formatVisibilityScore(70).badge).toBe('Excellent');
      expect(formatVisibilityScore(69.9).badge).toBe('Good');
      expect(formatVisibilityScore(40).badge).toBe('Good');
      expect(formatVisibilityScore(39.9).badge).toBe('Needs Improvement');
    });
  });

  describe('formatMarketPosition', () => {
    it('should format leading position', () => {
      const result = formatMarketPosition('leading');
      expect(result.label).toBe('Leading');
      expect(result.colorClass).toBe('text-green-700');
      expect(result.bgClass).toBe('bg-green-100');
      expect(result.icon).toBe('🏆');
    });

    it('should format competitive position', () => {
      const result = formatMarketPosition('competitive');
      expect(result.label).toBe('Competitive');
      expect(result.colorClass).toBe('text-amber-700');
      expect(result.bgClass).toBe('bg-amber-100');
      expect(result.icon).toBe('⚔️');
    });

    it('should format emerging position', () => {
      const result = formatMarketPosition('emerging');
      expect(result.label).toBe('Emerging');
      expect(result.colorClass).toBe('text-blue-700');
      expect(result.bgClass).toBe('bg-blue-100');
      expect(result.icon).toBe('🌱');
    });

    it('should format unknown position', () => {
      const result = formatMarketPosition('unknown');
      expect(result.label).toBe('Unknown');
      expect(result.colorClass).toBe('text-gray-700');
      expect(result.bgClass).toBe('bg-gray-100');
      expect(result.icon).toBe('❓');
    });
  });

  describe('formatModelName', () => {
    it('should format OpenAI model names', () => {
      expect(formatModelName('openai/gpt-4-turbo')).toBe('GPT-4 Turbo');
      expect(formatModelName('openai/gpt-3.5-turbo')).toBe('GPT-3.5 Turbo');
    });

    it('should format Anthropic model names', () => {
      expect(formatModelName('anthropic/claude-3-opus')).toBe('Claude 3 Opus');
      expect(formatModelName('anthropic/claude-3-sonnet')).toBe('Claude 3 Sonnet');
    });

    it('should handle models without provider prefix', () => {
      expect(formatModelName('gpt-4')).toBe('gpt-4');
      expect(formatModelName('claude-3')).toBe('claude-3');
    });

    it('should handle models with multiple slashes', () => {
      expect(formatModelName('openai/gpt-4/turbo')).toBe('openai/gpt-4/turbo');
    });

    it('should capitalize words correctly', () => {
      expect(formatModelName('test/model-name')).toBe('Model Name');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format Date object', () => {
      const date = new Date(Date.now() - 60000); // 1 minute ago
      const result = formatRelativeTime(date);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date string', () => {
      const dateString = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      const result = formatRelativeTime(dateString);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should use date-fns formatDistanceToNow', async () => {
      const { formatDistanceToNow } = await import('date-fns/formatDistanceToNow');
      const date = new Date();
      formatRelativeTime(date);
      expect(formatDistanceToNow).toHaveBeenCalledWith(date, { addSuffix: true });
    });
  });

  describe('formatSentiment', () => {
    it('should format positive sentiment', () => {
      const result = formatSentiment('positive');
      expect(result.emoji).toBe('😊');
      expect(result.label).toBe('Positive');
      expect(result.colorClass).toBe('text-green-600');
    });

    it('should format neutral sentiment', () => {
      const result = formatSentiment('neutral');
      expect(result.emoji).toBe('😐');
      expect(result.label).toBe('Neutral');
      expect(result.colorClass).toBe('text-gray-600');
    });

    it('should format negative sentiment', () => {
      const result = formatSentiment('negative');
      expect(result.emoji).toBe('😞');
      expect(result.label).toBe('Negative');
      expect(result.colorClass).toBe('text-red-600');
    });
  });

  describe('formatTrend', () => {
    it('should format up trend', () => {
      const result = formatTrend('up');
      expect(result.icon).toBe('↑');
      expect(result.label).toBe('Improving');
      expect(result.colorClass).toBe('text-green-600');
    });

    it('should format down trend', () => {
      const result = formatTrend('down');
      expect(result.icon).toBe('↓');
      expect(result.label).toBe('Declining');
      expect(result.colorClass).toBe('text-red-600');
    });

    it('should format neutral trend', () => {
      const result = formatTrend('neutral');
      expect(result.icon).toBe('→');
      expect(result.label).toBe('Stable');
      expect(result.colorClass).toBe('text-gray-600');
    });
  });

  describe('formatRank', () => {
    it('should format first place with gold medal', () => {
      const result = formatRank(1);
      expect(result.medal).toBe('🥇');
      expect(result.label).toBe('#1');
    });

    it('should format second place with silver medal', () => {
      const result = formatRank(2);
      expect(result.medal).toBe('🥈');
      expect(result.label).toBe('#2');
    });

    it('should format third place with bronze medal', () => {
      const result = formatRank(3);
      expect(result.medal).toBe('🥉');
      expect(result.label).toBe('#3');
    });

    it('should format ranks beyond third without medal', () => {
      const result = formatRank(4);
      expect(result.medal).toBe('');
      expect(result.label).toBe('#4');
    });

    it('should handle high ranks', () => {
      const result = formatRank(100);
      expect(result.medal).toBe('');
      expect(result.label).toBe('#100');
    });
  });
});

