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
import { SuccessMessage } from '@/components/feedback/success-message';
import { BackButton } from '@/components/navigation/back-button';

export default function NewBusinessPage() {
  const { createBusiness, loading, error } = useCreateBusiness();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (url: string) => {
    try {
      await createBusiness(url);
      setSuccess(true);
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
