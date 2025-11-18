/**
 * Business Limit Display Component
 * Shows current business count vs. limit for tier
 * 
 * SOLID: Single Responsibility - displays business limit info
 * DRY: Reusable limit display
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GemIcon } from '@/components/ui/gem-icon';
import { cn } from '@/lib/utils';

interface BusinessLimitDisplayProps {
  currentCount: number;
  maxCount: number;
  tier: 'free' | 'pro' | 'agency';
  className?: string;
}

const tierConfig = {
  free: { label: 'Free', color: 'text-gray-600' },
  pro: { label: 'Pro', color: 'text-primary' },
  agency: { label: 'Agency', color: 'text-purple-600' },
};

export function BusinessLimitDisplay({
  currentCount,
  maxCount,
  tier,
  className,
}: BusinessLimitDisplayProps) {
  const percentage = (currentCount / maxCount) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = currentCount >= maxCount;

  return (
    <Card className={cn('gem-card', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GemIcon size={20} />
            <span className="text-sm font-medium text-gray-700">
              Business Limit
            </span>
          </div>
          <span
            className={cn(
              'text-sm font-semibold',
              isAtLimit && 'text-red-600',
              isNearLimit && !isAtLimit && 'text-amber-600',
              !isNearLimit && 'text-gray-600'
            )}
          >
            {currentCount} / {maxCount}
          </span>
        </div>
        <Progress
          value={percentage}
          className={cn(
            'h-2',
            isAtLimit && 'bg-red-100',
            isNearLimit && !isAtLimit && 'bg-amber-100',
            !isNearLimit && 'bg-gray-100'
          )}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 capitalize">
            {tierConfig[tier].label} Plan
          </span>
          {isAtLimit && (
            <span className="text-xs text-red-600 font-medium">
              Limit Reached
            </span>
          )}
          {isNearLimit && !isAtLimit && (
            <span className="text-xs text-amber-600 font-medium">
              Near Limit
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

