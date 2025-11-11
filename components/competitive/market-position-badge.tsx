/**
 * Market Position Badge Component
 * Single Responsibility: Display market position indicator
 */

import { Badge } from '@/components/ui/badge';
import { formatMarketPosition } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface MarketPositionBadgeProps {
  position: 'leading' | 'competitive' | 'emerging' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
}

export function MarketPositionBadge({ position, size = 'md' }: MarketPositionBadgeProps) {
  const { label, colorClass, bgClass, icon } = formatMarketPosition(position);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        bgClass,
        colorClass,
        sizeClasses[size]
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

