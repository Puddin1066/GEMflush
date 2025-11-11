/**
 * Fingerprint Analysis Page
 * Shows detailed LLM visibility analysis with per-model breakdown
 */

import { redirect } from 'next/navigation';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { businesses, llmFingerprints } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';
import { VisibilityScoreDisplay } from '@/components/fingerprint/visibility-score-display';
import { ModelBreakdownList } from '@/components/fingerprint/model-breakdown-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCcw, Eye, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { formatSentiment } from '@/lib/utils/format';

interface FingerprintPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FingerprintPage({ params }: FingerprintPageProps) {
  const { id } = await params;
  // Authentication
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/sign-in');
  }

  const businessId = parseInt(id);
  if (isNaN(businessId)) {
    redirect('/dashboard');
  }

  // Get business
  const [business] = await db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.id, businessId),
        eq(businesses.teamId, team.id)
      )
    )
    .limit(1);

  if (!business) {
    redirect('/dashboard');
  }

  // Get latest fingerprints for trend calculation
  const latestFingerprints = await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, businessId))
    .orderBy(desc(llmFingerprints.createdAt))
    .limit(2);

  const [currentFingerprint, previousFingerprint] = latestFingerprints;

  if (!currentFingerprint) {
    // No fingerprint yet - show CTA
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
              Run an LLM fingerprint analysis to discover how visible your business
              is across major AI models.
            </p>
            <Button className="gem-gradient text-white">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Run Analysis Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Transform to DTO
  const dto = toFingerprintDetailDTO(
    currentFingerprint as any,
    previousFingerprint as any
  );

  const sentiment = formatSentiment(dto.summary.sentiment);

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
              LLM Fingerprint Analysis
            </h1>
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
                  score={dto.visibilityScore}
                  trend={dto.trend}
                  size="lg"
                  showBadge
                />
              </div>
              <p className="text-sm text-gray-500">
                Last analyzed {dto.createdAt}
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
                {dto.summary.mentionRate}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mentioned in {dto.summary.mentionRate}% of queries
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
                {dto.results.filter(r => r.mentioned).length}/{dto.results.length}
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
                {dto.summary.averageRank ? `#${dto.summary.averageRank}` : 'N/A'}
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
            <ModelBreakdownList results={dto.results} />
          </CardContent>
        </Card>

        {/* Competitive Link */}
        {dto.competitiveLeaderboard && (
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

