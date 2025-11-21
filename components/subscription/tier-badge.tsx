/**
 * Tier Badge Component
 * Displays user's current subscription tier
 * 
 * SOLID: Single Responsibility - displays tier badge
 * DRY: Reusable tier display
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { GemIcon, WikidataRubyIcon } from '@/components/ui/gem-icon';
import { cn } from '@/lib/utils/cn';

export type TierType = 'free' | 'pro' | 'agency';

interface TierBadgeProps {
  tier: TierType;
  className?: string;
  showIcon?: boolean;
}

const tierConfig: Record<
  TierType,
  {
    label: string;
    className: string;
    icon?: React.ComponentType<{ className?: string; size?: number }>;
  }
> = {
  free: {
    label: 'Free',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: GemIcon,
  },
  pro: {
    label: 'Pro',
    className: 'bg-primary/10 text-primary border-primary/30',
    icon: WikidataRubyIcon,
  },
  agency: {
    label: 'Agency',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: GemIcon,
  },
};

export function TierBadge({
  tier,
  className,
  showIcon = true,
}: TierBadgeProps) {
  const config = tierConfig[tier] || tierConfig.free;
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        'border flex items-center gap-1.5',
        config.className,
        className
      )}
    >
      {showIcon && Icon && <Icon size={14} />}
      {config.label}
    </Badge>
  );
}

