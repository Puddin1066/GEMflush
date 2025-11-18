/**
 * Success Message Component
 * Displays success feedback for completed actions
 * 
 * SOLID: Single Responsibility - displays success messages
 * DRY: Reusable success feedback
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessMessageProps {
  title?: string;
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function SuccessMessage({
  title = 'Success!',
  message,
  className,
  onDismiss,
}: SuccessMessageProps) {
  return (
    <Card className={cn('gem-card border-l-4 border-l-green-500', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-green-100 rounded-full flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-green-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-700">{message}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              ×
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

