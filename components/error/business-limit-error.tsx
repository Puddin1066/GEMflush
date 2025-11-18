/**
 * Business Limit Error Component
 * Displays business limit reached error with upgrade CTA
 * 
 * SOLID: Single Responsibility - handles business limit errors
 * DRY: Reusable limit error display
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UpgradeCTA } from '@/components/subscription/upgrade-cta';
import { AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface BusinessLimitErrorProps {
  currentCount: number;
  maxCount: number;
  tier: 'free' | 'pro' | 'agency';
  className?: string;
}

export function BusinessLimitError({
  currentCount,
  maxCount,
  tier,
  className,
}: BusinessLimitErrorProps) {
  return (
    <Card className={`gem-card border-l-4 border-l-amber-500 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-full flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Business Limit Reached
            </h3>
            <p className="text-gray-600 mb-4">
              You've reached your limit of {maxCount} {maxCount === 1 ? 'business' : 'businesses'} on the{' '}
              <span className="font-medium capitalize">{tier}</span> plan. Upgrade to add more businesses
              and unlock additional features.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Current usage:</span>
              <span className="font-semibold text-gray-900">
                {currentCount} / {maxCount}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/pricing">
                <Button className="gem-gradient text-white">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </Button>
              </Link>
              <Link href="/dashboard/businesses">
                <Button variant="outline">Manage Businesses</Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

