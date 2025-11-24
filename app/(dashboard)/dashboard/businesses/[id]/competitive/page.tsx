/**
 * Competitive Intelligence Page
 * Shows full competitive leaderboard and strategic insights
 * 
 * Client Component with automatic polling for real-time updates
 */

'use client';

import { useParams } from 'next/navigation';
import { useBusinessDetail } from '@/lib/hooks/use-business-detail';
import { useCompetitiveData } from '@/lib/hooks/use-competitive-data';
import { CompetitiveLeaderboard } from '@/components/competitive/competitive-leaderboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { BusinessDetailSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';

export default function CompetitivePage() {
  const params = useParams();
  const businessId = parseInt(params.id as string, 10);
  
  // Validate business ID
  if (isNaN(businessId) || businessId <= 0) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <ErrorCard
            title="Invalid Business ID"
            message={`"${params.id}" is not a valid business ID.`}
            backHref="/dashboard/businesses"
          />
        </div>
      </div>
    );
  }

  // Get business data (for name and status)
  const { business, loading: businessLoading } = useBusinessDetail(businessId);
  
  // Get competitive data with polling
  const { leaderboard, loading: leaderboardLoading, refresh, error } = useCompetitiveData(
    businessId,
    business?.status
  );

  if (businessLoading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <BusinessDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <ErrorCard
            title="Business Not Found"
            message="The business you're looking for doesn't exist or you don't have access to it."
            backHref="/dashboard/businesses"
          />
        </div>
      </div>
    );
  }

  const loading = leaderboardLoading && !leaderboard;

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/dashboard/businesses/${businessId}`}>
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Business
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Competitive Intelligence
            </h1>
            <p className="text-gray-600 mt-1">
              {business.name}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refresh()}
              disabled={loading}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href={`/dashboard/businesses/${businessId}/fingerprint`}>
              <Button className="gem-gradient text-white">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Run New Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">
              {business.status === 'crawling' || business.status === 'generating'
                ? 'Generating competitive analysis...'
                : 'Loading competitive data...'}
            </p>
            {(business.status === 'crawling' || business.status === 'generating') && (
              <p className="text-sm text-gray-500 mt-2">
                This page will update automatically when the analysis completes.
              </p>
            )}
          </div>
        ) : leaderboard ? (
          <CompetitiveLeaderboard
            data={leaderboard}
            businessId={businessId}
          />
        ) : (
          <div className="text-center py-12">
            <div className="gem-text-shimmer text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Competitive Data Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {business.status === 'crawling' || business.status === 'generating'
                ? 'Competitive analysis is being generated. This page will update automatically when complete.'
                : 'Run an LLM fingerprint analysis to discover your competitive position and see how you rank against other businesses in your market.'}
            </p>
            <Link href={`/dashboard/businesses/${businessId}/fingerprint`}>
              <Button className="gem-gradient text-white">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Analyze Now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

