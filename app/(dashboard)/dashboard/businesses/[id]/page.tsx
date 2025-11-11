/**
 * Business Detail Page
 * Shows comprehensive business overview with fingerprint, competitive, and Wikidata panels
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GemOverviewCard } from '@/components/business/gem-overview-card';
import { VisibilityIntelCard } from '@/components/fingerprint/visibility-intel-card';
import { CompetitiveEdgeCard } from '@/components/competitive/competitive-edge-card';
import { EntityPreviewCard } from '@/components/wikidata/entity-preview-card';
import { ArrowLeft } from 'lucide-react';
import type { FingerprintDetailDTO, CompetitiveLeaderboardDTO, WikidataEntityDetailDTO } from '@/lib/data/types';

interface Business {
  id: number;
  name: string;
  url: string;
  category?: string | null;
  location?: {
    city: string;
    state: string;
    country: string;
  } | null;
  wikidataQID?: string | null;
  status: string;
  createdAt: string;
  lastCrawledAt?: string | null;
}

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = parseInt(params.id as string);
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [fingerprint, setFingerprint] = useState<FingerprintDetailDTO | null>(null);
  const [entity, setEntity] = useState<WikidataEntityDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [fingerprinting, setFingerprinting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, [businessId]);

  const loadData = async () => {
    try {
      // Load business data
      const response = await fetch('/api/business');
      const data = await response.json();
      const businessData = data.businesses.find((b: Business) => b.id === businessId);
      
      if (businessData) {
        setBusiness(businessData);
        
        // Load fingerprint data if available
        // TODO: Create GET endpoint for latest fingerprint by businessId
        // For now, we'll leave this empty
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

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

      // Poll for completion
      setTimeout(() => {
        loadData();
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Reload data to get new fingerprint
      setTimeout(() => {
        loadData();
        setFingerprinting(false);
      }, 1000);
    } catch (error) {
      console.error('Fingerprint error:', error);
      alert(error instanceof Error ? error.message : 'Analysis failed');
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

      alert(`Published successfully! QID: ${result.qid}`);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handlePreviewJSON = () => {
    // TODO: Show JSON preview modal
    alert('JSON preview coming soon!');
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

  if (!business) {
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
        {entity && (
          <EntityPreviewCard
            entity={entity}
            onPublish={handlePublish}
            onPreview={handlePreviewJSON}
            publishing={publishing}
          />
        )}
      </div>
    </div>
  );
}
