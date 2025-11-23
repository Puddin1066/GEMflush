/**
 * Business Detail Page
 * Shows comprehensive business overview with fingerprint, competitive, and Wikidata panels
 * 
 * Uses new reusable components with hooks
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useBusinessDetail } from '@/lib/hooks/use-business-detail';
import { useTeam } from '@/lib/hooks/use-team';
import { BackButton } from '@/components/navigation/back-button';
import { BusinessDetailSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';
import { GemOverviewCard } from '@/components/business/gem-overview-card';
import { VisibilityIntelCard } from '@/components/fingerprint/visibility-intel-card';
import { CompetitiveEdgeCard } from '@/components/competitive/competitive-edge-card';
import { EntityPreviewCard } from '@/components/wikidata/entity-preview-card';
import { JsonPreviewModal } from '@/components/wikidata/json-preview-modal';
import { FeatureGate } from '@/components/subscription/feature-gate';
import { UpgradeCTA } from '@/components/subscription/upgrade-cta';

export default function BusinessDetailPage() {
  const params = useParams();
  // SOLID: Validate business ID before use - prevent NaN errors
  // DRY: Single validation point for ID parsing
  const rawId = params.id as string;
  const businessId = parseInt(rawId, 10);
  
  // Validate ID: redirect if invalid (e.g., "new" route was removed)
  const { canPublish, isPro } = useTeam();
  
  // Early validation - show error for invalid IDs
  if (isNaN(businessId) || businessId <= 0) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackButton href="/dashboard/businesses" />
          <ErrorCard
            title="Invalid Business ID"
            message={`"${rawId}" is not a valid business ID. Please navigate from the businesses list.`}
            backHref="/dashboard/businesses"
          />
        </div>
      </div>
    );
  }

  const {
    business,
    fingerprint,
    entity,
    loading,
    error,
    refresh,
  } = useBusinessDetail(businessId);

  const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false);
  
  // For Pro tier: processing is automatic, no manual buttons needed
  const isAutoProcessing = isPro && business?.automationEnabled;

  // Loading state - Use new component
  if (loading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackButton href="/dashboard/businesses" />
          <BusinessDetailSkeleton />
        </div>
      </div>
    );
  }

  // Error state - Use new component
  if (error) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackButton href="/dashboard/businesses" />
          <ErrorCard
            message={error}
            onRetry={refresh}
            backHref="/dashboard/businesses"
          />
        </div>
      </div>
    );
  }

  // Not found state - Use new component
  if (!business) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackButton href="/dashboard/businesses" />
          <ErrorCard
            title="Business Not Found"
            message="The business you're looking for doesn't exist or you don't have access to it."
            backHref="/dashboard/businesses"
          />
        </div>
      </div>
    );
  }

  // For Pro tier: processing is automatic, no manual handlers needed
  // These are kept for Free tier fallback but won't be called for Pro tier
  const handleCrawl = async () => {
    if (isAutoProcessing) return; // Pro tier: automatic
    // Free tier manual crawl (if needed)
  };

  const handleAnalyze = async () => {
    if (isAutoProcessing) return; // Pro tier: automatic
    // Free tier manual fingerprint (if needed)
  };

  const handlePublish = async () => {
    if (isAutoProcessing) return; // Pro tier: automatic
    // Free tier manual publish (if needed)
  };

  // Progress calculation for Automated AI Visibility Processing
  // CFP is only complete when published to Wikidata, but we track progress through each step
  const hasCrawlData = (business.status === 'crawled' || business.status === 'published' || business.status === 'generating') && !!business.crawlData;
  const hasFingerprint = fingerprint !== null;
  const isPublished = business.wikidataQID !== null; // CFP complete when published to Wikidata

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation - Use new component */}
        <BackButton href="/dashboard/businesses" />

        {/* 3-Column Layout - Only show components with DTO data or actively processing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GemOverviewCard
            business={business}
            onCrawl={isAutoProcessing ? undefined : handleCrawl}
            crawling={isAutoProcessing ? (business.status === 'crawling' || business.status === 'pending') : false}
            showAutoProgress={isAutoProcessing}
            isPro={isPro}
          />
          {/* VisibilityIntelCard - Only show when fingerprint exists or actively processing */}
          {(fingerprint || (isAutoProcessing && (business.status === 'crawling' || business.status === 'crawled' || business.status === 'generating'))) && (
            <VisibilityIntelCard
              fingerprint={fingerprint}
              loading={isAutoProcessing ? (business.status === 'crawling' || business.status === 'crawled') && !fingerprint : false}
              onAnalyze={isAutoProcessing ? undefined : handleAnalyze}
              isPublished={isPublished}
              showAutoProgress={isAutoProcessing}
              businessId={businessId}
              businessStatus={business.status}
              automationEnabled={business.automationEnabled}
            />
          )}
          {/* CompetitiveEdgeCard - Only show when leaderboard exists or fingerprint exists */}
          {(fingerprint?.competitiveLeaderboard || fingerprint) && (
            <CompetitiveEdgeCard
              leaderboard={fingerprint?.competitiveLeaderboard || null}
              businessId={businessId}
              businessName={business.name}
            />
          )}
        </div>

        {/* Wikidata Entity Section */}
        {entity ? (
          <FeatureGate
            feature="wikidata"
            fallback={
              <div className="space-y-4">
                <UpgradeCTA feature="wikidata" variant="banner" />
                <div className="opacity-50 pointer-events-none">
                  <EntityPreviewCard
                    entity={entity}
                    onPublish={handlePublish}
                    onPreview={() => setJsonPreviewOpen(true)}
                    publishing={false}
                  />
                </div>
              </div>
            }
          >
            <EntityPreviewCard
              entity={entity}
              onPublish={isAutoProcessing ? () => {} : handlePublish}
              onPreview={() => setJsonPreviewOpen(true)}
              publishing={isAutoProcessing ? ((business.status === 'crawled' || business.status === 'generating') && !isPublished) : false}
              showAutoProgress={isAutoProcessing}
            />
          </FeatureGate>
        ) : (
          !hasCrawlData && <UpgradeCTA feature="wikidata" />
        )}

        {/* JSON Preview Modal */}
        {entity && (
          <JsonPreviewModal
            open={jsonPreviewOpen}
            onOpenChange={setJsonPreviewOpen}
            entity={entity}
          />
        )}
      </div>
    </div>
  );
}
