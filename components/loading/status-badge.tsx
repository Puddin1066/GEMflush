/**
 * Status Badge Component
 * Displays business/operation status with appropriate styling
 * 
 * SOLID: Single Responsibility - only displays status
 * DRY: Reusable status display across the app
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type StatusType =
  | 'pending'
  | 'crawling'
  | 'crawled'
  | 'generating'
  | 'published'
  | 'error'
  | 'analyzing'
  | 'completed';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    className: string;
    icon?: React.ComponentType<{ className?: string }>;
  }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: Clock,
  },
  crawling: {
    label: 'Crawling',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Loader2,
  },
  crawled: {
    label: 'Crawled',
    className: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle2,
  },
  generating: {
    label: 'Generating',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: Sparkles,
  },
  published: {
    label: 'Published',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: CheckCircle2,
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle,
  },
  analyzing: {
    label: 'Analyzing',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle2,
  },
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  const isAnimated = status === 'crawling' || status === 'analyzing' || status === 'generating';

  return (
    <Badge
      className={cn(
        'border',
        config.className,
        isAnimated && Icon && 'flex items-center gap-1.5',
        className
      )}
    >
      {showIcon && Icon && (
        <Icon
          className={cn(
            'h-3 w-3',
            isAnimated && 'animate-spin'
          )}
        />
      )}
      {config.label}
    </Badge>
  );
}

