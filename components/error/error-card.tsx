/**
 * Error Card Component
 * Displays user-friendly error messages with recovery options
 * 
 * SOLID: Single Responsibility - only displays errors
 * DRY: Reusable error display pattern
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function ErrorCard({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  backHref,
  backLabel = 'Go Back',
  className,
}: ErrorCardProps) {
  return (
    <Card className={`gem-card border-l-4 border-l-red-500 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-900">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="default"
              className="gem-gradient text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
          )}
          {backHref && (
            <Link href={backHref}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

