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
import { CFPProcessingLogs } from '@/components/business/cfp-processing-logs';
import { AutomatedCFPStatus } from '@/components/business/automated-cfp-status';
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
import { Button } from '@/components/ui/button';
import { Globe, Sparkles, RefreshCw } from 'lucide-react';

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
  const [isProcessing, setIsProcessing] = useState(false);
  
  // AUTOMATED CFP: Processing happens automatically upon business creation
  // No manual buttons needed - GEMflush delivers value automatically
  // Pro tier users always get automated processing regardless of automationEnabled flag
  const isAutoProcessing = isPro;

  // Development helper: Reset fingerprint data and re-run CFP
  // Only available in development mode (server will enforce this)
  const handleResetAndRerun = async () => {
    if (!confirm('This will delete all fingerprint data and re-run CFP. Continue?')) {
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(`/api/business/${businessId}/reset-fingerprint`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset fingerprint data');
      }

      // Refresh business data to show updated status
      refresh();
    } catch (error) {
      console.error('Error resetting fingerprint:', error);
      alert(error instanceof Error ? error.message : 'Failed to reset fingerprint data');
    } finally {
      setIsProcessing(false);
    }
  };

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

        {/* Processing Status - Only show when actively processing or has actionable error */}
        {((business.status === 'pending' || business.status === 'crawling' || business.status === 'generating') && 
          (isAutoProcessing || isProcessing)) && (
          <BusinessStatusIndicator
            status={business.status}
            progress={{
              label: 
                business.status === 'pending' ? 'Starting CFP Process' :
                business.status === 'crawling' ? 'Crawling Website' :
                business.status === 'generating' ? 'Publishing to Wikidata' :
                'Processing',
              percentage: 
                business.status === 'pending' ? 10 :
                business.status === 'crawling' ? 33 :
                business.status === 'generating' ? 90 :
                0,
              message: 
                business.status === 'pending' ? 'Extracting business data from your website...' :
                business.status === 'crawling' ? 'Analyzing AI visibility and competitive positioning...' :
                business.status === 'generating' ? 'Publishing your business to knowledge graphs...' :
                'Processing your business data...',
            }}
          />
        )}

        {/* Automated CFP Status - No Manual Buttons Needed */}
        <AutomatedCFPStatus 
          status={business.status} 
          businessName={business.name}
        />

          {/* Development Only: Reset & Re-run - Hidden in production-like UI */}
          {process.env.NODE_ENV === 'development' && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-xs mb-1 text-amber-700">
                      🛠️ Development: Reset & Re-run
                    </h4>
                    <p className="text-xs text-gray-600">
                      Clear all fingerprint data and start fresh (dev only)
                    </p>
                  </div>
                  <Button
                    onClick={handleResetAndRerun}
                    disabled={isProcessing}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset & Re-run
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Processing Logs - Show when processing */}
          {(isProcessing || business.status === 'crawling' || business.status === 'generating') && (
            <CFPProcessingLogs
              businessId={businessId}
              isProcessing={isProcessing || business.status === 'crawling' || business.status === 'generating'}
              status={business.status}
            />
          )}

        {/* Publishing Onboarding Journey - Only show for Free tier */}
        {!isPublished && !isAutoProcessing && (
          <PublishingOnboarding
            businessId={businessId}
            hasCrawlData={hasCrawlData}
            hasFingerprint={hasFingerprint}
            isPublished={isPublished}
          />
        )}
        
        {/* Auto-processing status for Pro tier - Only show when actively processing */}
        {/* REMOVED: This card was showing infinite spinner even when not processing */}
        {/* Status is now shown in BusinessStatusIndicator above */}

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
            loading={isAutoProcessing || isProcessing ? (business.status === 'crawling' || business.status === 'crawled') && !fingerprint : false}
            onAnalyze={isAutoProcessing ? undefined : handleAnalyze}
            isPublished={isPublished}
            showAutoProgress={isAutoProcessing || isProcessing}
            businessId={businessId}
            businessStatus={business.status}
            automationEnabled={business.automationEnabled}
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
