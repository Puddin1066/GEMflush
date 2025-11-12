/**
 * Formatting utilities
 * Single source of truth for all formatting operations
 */

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

/**
 * Format a number as a percentage
 * @param value - Decimal value (0-1) or percentage (0-100)
 * @param decimals - Number of decimal places (default: 0)
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  const percentage = value > 1 ? value : value * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a visibility score with color class
 * @param score - Score from 0-100
 * @returns Object with formatted text and color class
 */
export function formatVisibilityScore(score: number): {
  text: string;
  colorClass: string;
  badge: string;
} {
  const text = `${Math.round(score)}%`;
  
  if (score >= 70) {
    return { text, colorClass: 'text-green-600', badge: 'Excellent' };
  } else if (score >= 40) {
    return { text, colorClass: 'text-amber-600', badge: 'Good' };
  } else {
    return { text, colorClass: 'text-red-600', badge: 'Needs Improvement' };
  }
}

/**
 * Format market position with color and icon
 */
export function formatMarketPosition(
  position: 'leading' | 'competitive' | 'emerging' | 'unknown'
): {
  label: string;
  colorClass: string;
  bgClass: string;
  icon: string;
} {
  const positions = {
    leading: {
      label: 'Leading',
      colorClass: 'text-green-700',
      bgClass: 'bg-green-100',
      icon: '🏆',
    },
    competitive: {
      label: 'Competitive',
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-100',
      icon: '⚔️',
    },
    emerging: {
      label: 'Emerging',
      colorClass: 'text-blue-700',
      bgClass: 'bg-blue-100',
      icon: '🌱',
    },
    unknown: {
      label: 'Unknown',
      colorClass: 'text-gray-700',
      bgClass: 'bg-gray-100',
      icon: '❓',
    },
  };

  return positions[position];
}

/**
 * Format LLM model name for display
 * openai/gpt-4-turbo → GPT-4 Turbo
 */
export function formatModelName(model: string): string {
  const parts = model.split('/');
  if (parts.length !== 2) return model;

  const [, name] = parts;

  // Split by hyphens, but preserve version numbers for short model names (e.g., "gpt")
  // e.g., "gpt-4-turbo" → "GPT-4 Turbo" (keep hyphen for short names like "gpt")
  // e.g., "claude-3-opus" → "Claude 3 Opus" (space for longer names)
  const segments = name.split('-');
  const formatted: string[] = [];
  const firstSegment = segments[0];
  const isShortModelName = firstSegment.length <= 4; // "gpt", "llm", etc.
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isVersionNumber = /^\d+(\.\d+)?$/.test(segment);
    const nextIsWord = i + 1 < segments.length && !/^\d+(\.\d+)?$/.test(segments[i + 1]);
    const capitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
    
    if (i === 0) {
      formatted.push(capitalized);
    } else if (isVersionNumber && nextIsWord && isShortModelName) {
      // Version number followed by word, and model name is short: keep hyphen
      formatted[formatted.length - 1] += `-${capitalized}`;
    } else {
      // Regular word or longer model name: add as new segment with space
      formatted.push(capitalized);
    }
  }

  const result = formatted.join(' ');

  // Replace "Gpt" with "GPT" at the start
  if (result.startsWith('Gpt')) {
    return result.replace('Gpt', 'GPT');
  }

  return result;
}

/**
 * Format relative time
 * Uses date-fns for consistent formatting
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format sentiment with emoji
 */
export function formatSentiment(sentiment: 'positive' | 'neutral' | 'negative'): {
  emoji: string;
  label: string;
  colorClass: string;
} {
  const sentiments = {
    positive: {
      emoji: '😊',
      label: 'Positive',
      colorClass: 'text-green-600',
    },
    neutral: {
      emoji: '😐',
      label: 'Neutral',
      colorClass: 'text-gray-600',
    },
    negative: {
      emoji: '😞',
      label: 'Negative',
      colorClass: 'text-red-600',
    },
  };

  return sentiments[sentiment];
}

/**
 * Format trend with arrow
 */
export function formatTrend(trend: 'up' | 'down' | 'neutral'): {
  icon: string;
  label: string;
  colorClass: string;
} {
  const trends = {
    up: {
      icon: '↑',
      label: 'Improving',
      colorClass: 'text-green-600',
    },
    down: {
      icon: '↓',
      label: 'Declining',
      colorClass: 'text-red-600',
    },
    neutral: {
      icon: '→',
      label: 'Stable',
      colorClass: 'text-gray-600',
    },
  };

  return trends[trend];
}

/**
 * Format competitor rank with medal
 */
export function formatRank(rank: number): {
  medal: string;
  label: string;
} {
  const medals: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };

  return {
    medal: medals[rank] || '',
    label: `#${rank}`,
  };
}

