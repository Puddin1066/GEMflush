/**
 * Fingerprint Analysis Page
 * Shows detailed LLM visibility analysis with per-model breakdown
 * 
 * Client Component with automatic polling for real-time updates
 */

'use client';

import { useParams } from 'next/navigation';
import { useBusinessDetail } from '@/lib/hooks/use-business-detail';
import { VisibilityScoreDisplay } from '@/components/fingerprint/visibility-score-display';
import { ModelBreakdownList } from '@/components/fingerprint/model-breakdown-list';
import { CFPProcessExplanation } from '@/components/fingerprint/cfp-process-explanation';
import { VisibilityScoreChart } from '@/components/fingerprint/visibility-score-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCcw, Eye, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { formatSentiment } from '@/lib/utils/format';
import { BusinessDetailSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';

export default function FingerprintPage() {
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

  // Get business and fingerprint data (hook handles polling automatically)
  const { business, fingerprint, loading, error, refresh } = useBusinessDetail(businessId);

  if (loading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <BusinessDetailSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <ErrorCard
            message={error}
            onRetry={refresh}
            backHref="/dashboard/businesses"
          />
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

  // No fingerprint yet - show CTA
  if (!fingerprint) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Link href={`/dashboard/businesses/${businessId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Business
            </Button>
          </Link>

          <div className="text-center py-12">
            <div className="gem-text-shimmer text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Fingerprint Analysis Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {business.status === 'crawling' || business.status === 'generating'
                ? 'Fingerprint analysis is being generated. This page will update automatically when complete.'
                : 'Run an LLM fingerprint analysis to discover how visible your business is across major AI models.'}
            </p>
            {(business.status === 'crawling' || business.status === 'generating') && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            )}
            <Link href={`/dashboard/businesses/${businessId}`}>
              <Button className="gem-gradient text-white">
                <RefreshCcw className="mr-2 h-4 w-4" />
                {business.status === 'crawling' || business.status === 'generating' ? 'Processing...' : 'Run Analysis Now'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sentiment = formatSentiment(fingerprint.summary.sentiment);
  
  // FingerprintDetailDTO already has createdAt formatted as "2 days ago" etc.

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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                LLM Fingerprint Analysis
              </h1>
              <CFPProcessExplanation />
            </div>
            <p className="text-gray-600 mt-1">
              {business.name}
            </p>
          </div>

          <Button className="gem-gradient text-white">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Run New Analysis
          </Button>
        </div>

        {/* Visibility Score Hero */}
        <Card className="gem-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Overall Visibility Score</p>
              <div className="flex justify-center mb-4">
                <VisibilityScoreDisplay
                  score={fingerprint.visibilityScore}
                  trend={fingerprint.trend}
                  size="lg"
                  showBadge
                />
              </div>
              <p className="text-sm text-gray-500">
                Last analyzed {fingerprint.createdAt}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Mention Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {fingerprint.summary.mentionRate}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mentioned in {fingerprint.summary.mentionRate}% of queries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {sentiment.emoji}
              </div>
              <p className={`text-sm font-medium mt-1 ${sentiment.colorClass}`}>
                {sentiment.label}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Models Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {fingerprint.results.filter(r => r.mentioned).length}/{fingerprint.results.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Models mentioned you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {fingerprint.summary.averageRank ? `#${fingerprint.summary.averageRank}` : 'N/A'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                In recommendation queries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Per-Model Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Per-Model Breakdown
            </CardTitle>
            <CardDescription>
              Detailed results from each LLM tested
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelBreakdownList results={fingerprint.results} />
          </CardContent>
        </Card>

        {/* Visibility Score History Chart */}
        <VisibilityScoreChart 
          businessId={businessId}
          businessStatus={business.status}
          automationEnabled={business.automationEnabled}
        />

        {/* Competitive Link */}
        {fingerprint.competitiveLeaderboard && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Competitive Analysis
              </CardTitle>
              <CardDescription>
                See how you rank against competitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/businesses/${businessId}/competitive`}>
                <Button variant="outline" className="w-full">
                  View Competitive Leaderboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

