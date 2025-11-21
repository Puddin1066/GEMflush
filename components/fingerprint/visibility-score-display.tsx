/**
 * Visibility Score Display Component
 * Single Responsibility: Display visibility score with trend indicator
 */

import { cn } from '@/lib/utils/cn';
import { formatVisibilityScore, formatTrend } from '@/lib/utils/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VisibilityScoreDisplayProps {
  score: number;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export function VisibilityScoreDisplay({
  score,
  trend,
  size = 'md',
  showBadge = false,
}: VisibilityScoreDisplayProps) {
  const { text, colorClass, badge } = formatVisibilityScore(score);
  const trendInfo = trend ? formatTrend(trend) : null;

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-3">
      <div className={cn('font-bold', sizeClasses[size], colorClass)}>
        {text}
      </div>
      
      {trendInfo && (
        <div className="flex items-center gap-1">
          <TrendIcon className={cn('h-5 w-5', trendInfo.colorClass)} />
          {size !== 'sm' && (
            <span className={cn('text-sm font-medium', trendInfo.colorClass)}>
              {trendInfo.label}
            </span>
          )}
        </div>
      )}
      
      {showBadge && (
        <span className={cn(
          'text-sm font-medium px-2 py-1 rounded-full',
          score >= 70 && 'bg-green-100 text-green-700',
          score >= 40 && score < 70 && 'bg-amber-100 text-amber-700',
          score < 40 && 'bg-red-100 text-red-700'
        )}>
          {badge}
        </span>
      )}
    </div>
  );
}

