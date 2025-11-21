/**
 * Progress Indicator Component
 * Shows progress for async operations (crawl, fingerprint, publish)
 * 
 * SOLID: Single Responsibility - displays operation progress
 * DRY: Reusable progress display
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ProgressIndicatorProps {
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress?: number; // 0-100
  message?: string;
  className?: string;
}

export function ProgressIndicator({
  label,
  status,
  progress,
  message,
  className,
}: ProgressIndicatorProps) {
  const isInProgress = status === 'in-progress';
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  // Don't show progress bar or percentage for error state or when progress is 0
  const shouldShowProgress = progress !== undefined && progress > 0 && !isError;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isInProgress && (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          )}
          {isCompleted && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          {isError && (
            <span className="h-4 w-4 text-red-600">⚠</span>
          )}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        {shouldShowProgress && (
          <span className="text-xs text-gray-500">{progress}%</span>
        )}
      </div>
      {shouldShowProgress && (
        <Progress
          value={progress}
          className={cn(
            'h-2',
            isCompleted && 'bg-green-100',
            isInProgress && 'bg-primary/20'
          )}
        />
      )}
      {message && (
        <p
          className={cn(
            'text-xs',
            isError && 'text-red-600',
            isCompleted && 'text-green-600',
            isInProgress && 'text-gray-600'
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}

