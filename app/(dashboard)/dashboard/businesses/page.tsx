/**
 * Businesses List Page
 * Displays all businesses for the current team
 * 
 * Uses new reusable components with hooks
 */

'use client';

import { useState } from 'react';
import { useBusinesses } from '@/lib/hooks/use-businesses';
import { useTeam } from '@/lib/hooks/use-team';
import { useCreateBusiness } from '@/lib/hooks/use-create-business';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { EmptyState } from '@/components/onboarding';
import { ErrorCard } from '@/components/error';
import { BusinessLimitDisplay } from '@/components/subscription/business-limit-display';
import { TierBadge } from '@/components/subscription/tier-badge';
import { BusinessLimitError } from '@/components/error/business-limit-error';
import { UrlOnlyForm } from '@/components/onboarding/url-only-form';
import { LocationForm } from '@/components/onboarding/location-form';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function BusinessesPage() {
  const { businesses, maxBusinesses, loading, error, refresh } = useBusinesses();
  const { planTier } = useTeam();
  const { createBusiness, createBusinessWithLocation, loading: creating, error: createError, needsLocation, crawledData } = useCreateBusiness();
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [url, setUrl] = useState('');

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

  const handleUrlSubmit = async (submittedUrl: string) => {
    setUrl(submittedUrl);
    try {
      await createBusiness(submittedUrl);
      // If needsLocation is true, modal will show automatically
      // Otherwise, redirect happens in hook
      if (!needsLocation) {
        setShowUrlForm(false);
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleLocationSubmit = async (location: { city: string; state: string; country: string; address?: string }) => {
    try {
      await createBusinessWithLocation(url, location);
      setShowUrlForm(false);
      setUrl('');
    } catch (err) {
      // Error handled by hook
    }
  };

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
            <Button onClick={() => setShowUrlForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Business
            </Button>
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
            onClick: () => setShowUrlForm(true)
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

      {/* URL Form Dialog */}
      <Dialog open={showUrlForm} onOpenChange={setShowUrlForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Business</DialogTitle>
            <DialogDescription>
              Enter your website URL and we'll automatically extract all business information
            </DialogDescription>
          </DialogHeader>
          {needsLocation ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Location Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We couldn't automatically detect your business location from your website. Please provide it below.
                </p>
              </div>
              <LocationForm
                onSubmit={handleLocationSubmit}
                loading={creating}
                error={createError}
                crawledData={crawledData || undefined}
              />
            </div>
          ) : (
            <UrlOnlyForm
              onSubmit={handleUrlSubmit}
              loading={creating}
              error={createError}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
