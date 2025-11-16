/**
 * Subscription Status Component
 * SOLID: Single Responsibility - displays subscription status only
 * DRY: Uses useTeam hook for data
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import Link from 'next/link';
import { useTeam } from '@/lib/hooks/use-team';
import { Skeleton } from '@/components/ui/skeleton';

export function SubscriptionStatus() {
  const { team, isLoading, planTier, planName, maxBusinesses } = useTeam();
  const [businessCount, setBusinessCount] = useState<number | null>(null);

  // Fetch business count separately (DRY: use existing query)
  useEffect(() => {
    if (team?.id) {
      fetch('/api/business')
        .then((res) => res.json())
        .then((data) => {
          if (data?.businesses && Array.isArray(data.businesses)) {
            setBusinessCount(data.businesses.length);
          } else {
            setBusinessCount(0);
          }
        })
        .catch(() => setBusinessCount(0));
    }
  }, [team?.id]);

  if (isLoading) {
    return (
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const isPro = planTier === 'pro' || planTier === 'agency';

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Current Plan</span>
        <Badge variant={planTier === 'free' ? 'outline' : 'default'}>
          {planName}
        </Badge>
      </div>

      {planTier === 'free' && (
        <div className="mt-3 space-y-2">
          {businessCount !== null && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              {businessCount}/{maxBusinesses} businesses
            </div>
          )}
          <Link href="/pricing">
            <Button size="sm" className="w-full gem-gradient text-white text-xs">
              <Sparkles className="mr-1 h-3 w-3" />
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      )}

      {isPro && (
        <Link href="/dashboard/settings/billing">
          <Button size="sm" variant="ghost" className="w-full text-xs">
            Manage Subscription
          </Button>
        </Link>
      )}
    </div>
  );
}

