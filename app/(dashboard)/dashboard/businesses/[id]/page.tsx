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
import { BusinessStatusIndicator } from '@/components/business/business-status-indicator';
import { ActionButton } from '@/components/loading/action-button';
import { GemOverviewCard } from '@/components/business/gem-overview-card';
import { VisibilityIntelCard } from '@/components/fingerprint/visibility-intel-card';
import { CompetitiveEdgeCard } from '@/components/competitive/competitive-edge-card';
import { EntityPreviewCard } from '@/components/wikidata/entity-preview-card';
import { JsonPreviewModal } from '@/components/wikidata/json-preview-modal';
import { PublishingOnboarding } from '@/components/subscription/publishing-onboarding';
import { FeatureGate } from '@/components/subscription/feature-gate';
import { UpgradeCTA } from '@/components/subscription/upgrade-cta';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Sparkles } from 'lucide-react';

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = parseInt(params.id as string);
  const { canPublish, isPro } = useTeam();
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

  const hasCrawlData = business.status === 'crawled' || business.status === 'published';
  const hasFingerprint = fingerprint !== null;
  const isPublished = business.wikidataQID !== null;

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation - Use new component */}
        <BackButton href="/dashboard/businesses" />

        {/* Status Indicator - NEW */}
        <BusinessStatusIndicator
          status={business.status}
          progress={
            isAutoProcessing
              ? {
                  label: 
                    business.status === 'pending' ? 'Starting Automatic Processing' :
                    business.status === 'crawling' ? 'Crawling Website' :
                    business.status === 'crawled' && !fingerprint ? 'Analyzing Visibility' :
                    business.status === 'crawled' && fingerprint && !isPublished ? 'Publishing to Wikidata' :
                    business.status === 'generating' ? 'Publishing to Wikidata' :
                    'Processing',
                  percentage: 
                    business.status === 'pending' ? 10 :
                    business.status === 'crawling' ? 33 :
                    business.status === 'crawled' && !fingerprint ? 66 :
                    business.status === 'crawled' && fingerprint && !isPublished ? 90 :
                    business.status === 'generating' ? 90 :
                    0,
                  message: 
                    business.status === 'pending' ? 'Initializing automatic processing...' :
                    business.status === 'crawling' ? 'Extracting business data from website...' :
                    business.status === 'crawled' && !fingerprint ? 'Running AI visibility analysis...' :
                    business.status === 'crawled' && fingerprint && !isPublished ? 'Publishing entity to Wikidata...' :
                    business.status === 'generating' ? 'Publishing entity to Wikidata...' :
                    'Processing automatically...',
                }
              : business.status === 'crawling'
              ? {
                  label: 'Crawling Website',
                  percentage: 50,
                  message: 'Extracting business data...',
                }
              : undefined
          }
        />

        {/* Publishing Onboarding Journey - Only show for Free tier */}
        {!isPublished && !isAutoProcessing && (
          <PublishingOnboarding
            businessId={businessId}
            hasCrawlData={hasCrawlData}
            hasFingerprint={hasFingerprint}
            isPublished={isPublished}
          />
        )}
        
        {/* Auto-processing status for Pro tier */}
        {isAutoProcessing && !isPublished && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <div>
                  <p className="font-semibold">Automatic Processing in Progress</p>
                  <p className="text-sm text-gray-600">
                    {business.status === 'pending' && 'Starting crawl...'}
                    {business.status === 'crawling' && 'Crawling website to extract business data...'}
                    {business.status === 'crawled' && !fingerprint && 'Analyzing AI visibility...'}
                    {business.status === 'crawled' && fingerprint && !isPublished && 'Publishing to Wikidata...'}
                    {business.status === 'generating' && 'Publishing to Wikidata...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GemOverviewCard
            business={business}
            onCrawl={isAutoProcessing ? undefined : handleCrawl}
            crawling={isAutoProcessing ? (business.status === 'crawling' || business.status === 'pending') : false}
            showAutoProgress={isAutoProcessing}
          />
          <VisibilityIntelCard
            fingerprint={fingerprint}
            loading={isAutoProcessing ? (business.status === 'crawling' || business.status === 'crawled') && !fingerprint : false}
            onAnalyze={isAutoProcessing ? undefined : handleAnalyze}
            isPublished={isPublished}
            showAutoProgress={isAutoProcessing}
            businessId={businessId}
          />
          <CompetitiveEdgeCard
            leaderboard={fingerprint?.competitiveLeaderboard || null}
            businessId={businessId}
            businessName={business.name}
          />
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
