/**
 * New Business Page
 * Frictionless URL-only onboarding
 * 
 * Uses new reusable components with hooks
 */

'use client';

import { useState } from 'react';
import { useCreateBusiness } from '@/lib/hooks/use-create-business';
import { UrlOnlyForm } from '@/components/onboarding/url-only-form';
import { LocationForm } from '@/components/onboarding/location-form';
import { SuccessMessage } from '@/components/feedback/success-message';
import { BackButton } from '@/components/navigation/back-button';

export default function NewBusinessPage() {
  const { createBusiness, createBusinessWithLocation, loading, error, needsLocation, crawledData } = useCreateBusiness();
  const [success, setSuccess] = useState(false);
  const [url, setUrl] = useState('');

  const handleSubmit = async (url: string) => {
    setUrl(url);
    try {
      await createBusiness(url);
      // If needsLocation is true, the hook will set it and we'll show the location form
      // Otherwise, success will be set to true (if not, redirect happens)
    } catch (err) {
      // Error handled by hook and displayed in form
    }
  };

  const handleLocationSubmit = async (location: { city: string; state: string; country: string; address?: string }) => {
    try {
      await createBusinessWithLocation(url, location);
      // Redirect happens in hook on success
    } catch (err) {
      // Error handled by hook and displayed in form
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton href="/dashboard/businesses" />
        <SuccessMessage
          title="Business Created!"
          message="Your business has been added successfully. We're now crawling your website to extract business information."
        />
      </div>
    );
  }

  // Show location form if location is needed
  if (needsLocation) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton href="/dashboard/businesses" />
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Location Required</h1>
          <p className="text-muted-foreground mt-2">
            We couldn't automatically detect your business location from your website. Please provide it below.
          </p>
        </div>

        <LocationForm
          onSubmit={handleLocationSubmit}
          loading={loading}
          error={error}
          crawledData={crawledData || undefined}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton href="/dashboard/businesses" />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Business</h1>
        <p className="text-muted-foreground mt-2">
          Enter your website URL and we'll automatically extract all business information
        </p>
      </div>

      <UrlOnlyForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
}
