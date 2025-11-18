/**
 * Businesses List Page
 * Displays all businesses for the current team
 * 
 * Uses new reusable components with hooks
 */

'use client';

import { useBusinesses } from '@/lib/hooks/use-businesses';
import { useTeam } from '@/lib/hooks/use-team';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { EmptyState } from '@/components/onboarding';
import { ErrorCard } from '@/components/error';
import { BusinessLimitDisplay } from '@/components/subscription/business-limit-display';
import { TierBadge } from '@/components/subscription/tier-badge';
import { BusinessLimitError } from '@/components/error/business-limit-error';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function BusinessesPage() {
  const { businesses, maxBusinesses, loading, error, refresh } = useBusinesses();
  const { planTier } = useTeam();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
            <p className="text-muted-foreground">
              Manage your businesses and track their LLM visibility
            </p>
          </div>
        </div>
        <BusinessListSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
            <p className="text-muted-foreground">
              Manage your businesses and track their LLM visibility
            </p>
          </div>
        </div>
        <ErrorCard
          message={error.message}
          onRetry={refresh}
          backHref="/dashboard"
        />
      </div>
    );
  }

  const canAddMore = businesses.length < maxBusinesses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">
            Manage your businesses and track their LLM visibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TierBadge tier={planTier} />
          {canAddMore ? (
            <Link href="/dashboard/businesses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Business
              </Button>
            </Link>
          ) : (
            <Button disabled>
              Limit Reached ({businesses.length}/{maxBusinesses})
            </Button>
          )}
        </div>
      </div>

      {/* Business Limit Display */}
      <BusinessLimitDisplay
        currentCount={businesses.length}
        maxCount={maxBusinesses}
        tier={planTier}
      />

      {/* Business List */}
      {businesses.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          description="Get started by adding your first business to track its visibility across AI systems"
          action={{
            label: "Add Your First Business",
            href: "/dashboard/businesses/new"
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessListCard key={business.id} business={business} />
          ))}
        </div>
      )}

      {/* Business Limit Error */}
      {!canAddMore && (
        <BusinessLimitError
          currentCount={businesses.length}
          maxCount={maxBusinesses}
          tier={planTier}
        />
      )}
    </div>
  );
}
