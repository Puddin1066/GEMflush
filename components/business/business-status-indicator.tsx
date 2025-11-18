/**
 * Business Status Indicator Component
 * Comprehensive status display for business operations
 * 
 * SOLID: Single Responsibility - displays business status
 * DRY: Reusable status indicator
 */

'use client';

import { StatusBadge } from '@/components/loading/status-badge';
import { ProgressIndicator } from '@/components/loading/progress-indicator';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BusinessStatusIndicatorProps {
  status: string;
  progress?: {
    label: string;
    percentage?: number;
    message?: string;
  };
  className?: string;
}

export function BusinessStatusIndicator({
  status,
  progress,
  className,
}: BusinessStatusIndicatorProps) {
  const statusType = status as any;

  return (
    <Card className={cn('gem-card', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <StatusBadge status={statusType} />
          </div>
          {progress && (
            <ProgressIndicator
              label={progress.label}
              status={
                statusType === 'crawling' || statusType === 'analyzing'
                  ? 'in-progress'
                  : statusType === 'error'
                  ? 'error'
                  : statusType === 'crawled' || statusType === 'published'
                  ? 'completed'
                  : 'pending'
              }
              progress={progress.percentage}
              message={progress.message}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

