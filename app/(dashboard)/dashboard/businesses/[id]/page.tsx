/**
 * Business Detail Page
 * Shows comprehensive business overview with fingerprint, competitive, and Wikidata panels
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GemOverviewCard } from '@/components/business/gem-overview-card';
import { VisibilityIntelCard } from '@/components/fingerprint/visibility-intel-card';
import { CompetitiveEdgeCard } from '@/components/competitive/competitive-edge-card';
import { EntityPreviewCard } from '@/components/wikidata/entity-preview-card';
import { JsonPreviewModal } from '@/components/wikidata/json-preview-modal';
import { PublishingOnboarding } from '@/components/subscription/publishing-onboarding';
import { FeatureGate } from '@/components/subscription/feature-gate';
import { UpgradeCTA } from '@/components/subscription/upgrade-cta';
import { ArrowLeft } from 'lucide-react';
import type { FingerprintDetailDTO } from '@/lib/data/types';
import { useBusinessDetail } from '@/lib/hooks/use-business-detail';

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = parseInt(params.id as string);

  const {
    business,
    fingerprint,
    entity,
    loading,
    error,
    refresh,
  } = useBusinessDetail(businessId);

  const [crawling, setCrawling] = useState(false);
  const [fingerprinting, setFingerprinting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false);

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error('Crawl failed');
      }

      // Poll for completion - reload data to get updated business status
      // After crawl completes, business status should be 'crawled' and entity will load
      setTimeout(() => {
        refresh(); // Reload business data (triggers entity load if status is 'crawled')
        setCrawling(false);
      }, 3000);
    } catch (error) {
      console.error('Crawl error:', error);
      setCrawling(false);
    }
  };

  const handleAnalyze = async () => {
    setFingerprinting(true);
    try {
      const response = await fetch('/api/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Analysis failed');
      }

      const result = await response.json();

      // Reload data to get new fingerprint (SOLID: single responsibility)
      if (result.fingerprintId) {
        // Wait a bit for fingerprint to be saved, then reload
        setTimeout(() => {
          refresh();
          setFingerprinting(false);
        }, 2000);
      } else {
        setFingerprinting(false);
      }
    } catch (error) {
      console.error('Fingerprint error:', error);
      // Show error to user (SOLID: single responsibility - error handling)
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      alert(errorMessage); // Simple error display for MVP
      setFingerprinting(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/wikidata/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessId,
          publishToProduction: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Publish failed');
      }

      // DRY: Wait a bit for database to update before refreshing
      // SOLID: Single Responsibility - ensure data consistency before refresh
      // Pragmatic: Give database time to commit the publish transaction
      alert(`Published successfully! QID: ${result.qid}`);
      
      // Refresh after a short delay to ensure database is updated
      setTimeout(() => {
        refresh();
      }, 1000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handlePreviewJSON = () => {
    if (entity) {
      setJsonPreviewOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if error exists
  if (error && !loading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Link href="/dashboard/businesses">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Businesses
            </Button>
          </Link>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Error Loading Business
                </h2>
                <p className="text-red-600 mb-6">{error}</p>
                <Button onClick={() => refresh()}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show not found state if business is null after loading
  if (!business && !loading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Business Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The business you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/dashboard/businesses">
            <Button>Back to Businesses</Button>
          </Link>
        </div>
      </div>
    );
  }

  // TypeScript guard: business should not be null at this point
  if (!business) {
    return null; // Should not reach here, but satisfy TypeScript
  }

  const hasCrawlData = business.status === 'crawled' || business.status === 'published';
  const hasFingerprint = fingerprint !== null;
  const isPublished = business.wikidataQID !== null;

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/dashboard/businesses">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Businesses
            </Button>
          </Link>
        </div>

        {/* Publishing Onboarding Journey */}
        {!isPublished && (
          <PublishingOnboarding
            businessId={businessId}
            hasCrawlData={hasCrawlData}
            hasFingerprint={hasFingerprint}
            isPublished={isPublished}
          />
        )}

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Business Overview */}
          <div>
            <GemOverviewCard
              business={business}
              onCrawl={handleCrawl}
              crawling={crawling}
            />
          </div>

          {/* Column 2: Visibility Intel */}
          <div>
            <VisibilityIntelCard
              fingerprint={fingerprint}
              loading={fingerprinting}
              onAnalyze={handleAnalyze}
              isPublished={isPublished}
            />
          </div>

          {/* Column 3: Competitive Edge */}
          <div>
            <CompetitiveEdgeCard
              leaderboard={fingerprint?.competitiveLeaderboard || null}
              businessId={businessId}
              businessName={business.name}
            />
          </div>
        </div>

        {/* Wikidata Entity Section (Full Width) */}
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
                    onPreview={handlePreviewJSON}
                    publishing={publishing}
                  />
                </div>
              </div>
            }
          >
            <EntityPreviewCard
              entity={entity}
              onPublish={handlePublish}
              onPreview={handlePreviewJSON}
              publishing={publishing}
            />
          </FeatureGate>
        ) : (
          !hasCrawlData && (
            <UpgradeCTA feature="wikidata" />
          )
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
