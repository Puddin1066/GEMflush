/**
 * Competitive Analysis Card Component
 * High-value component showing competitive analysis and market position
 * 
 * SOLID: Single Responsibility - displays competitive analysis only
 * DRY: Reuses existing UI components and utilities
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarketPositionBadge } from './market-position-badge';
import { Trophy, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

interface CompetitiveAnalysisCardProps {
  leaderboard: CompetitiveLeaderboardDTO | null;
  businessName: string;
  businessId: number;
  loading?: boolean;
}

export function CompetitiveAnalysisCard({
  leaderboard,
  businessName,
  businessId,
  loading = false,
}: CompetitiveAnalysisCardProps) {
  // Loading state
  if (loading) {
    return (
      <Card className="gem-card" data-testid="competitive-analysis-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Competitive Analysis
          </CardTitle>
          <CardDescription>Loading competitive data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!leaderboard) {
    return (
      <Card className="gem-card" data-testid="competitive-analysis-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Competitive Analysis
          </CardTitle>
          <CardDescription>Your position in the market</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="gem-text-shimmer text-4xl mb-3">🏆</div>
            <p className="text-sm text-gray-600 mb-4">
              No competitive data yet. Run analysis to see your market position.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { targetBusiness, competitors, insights } = leaderboard;
  const topCompetitor = competitors?.[0];
  const top3Competitors = competitors?.slice(0, 3) || [];
  const position = insights?.marketPosition || targetBusiness?.marketPosition || 'unknown';
  const positionDescription = getPositionDescription(position);

  // Calculate market share
  const calculatedMarketShare = calculateMarketShare(
    targetBusiness?.mentionCount || 0,
    [targetBusiness, ...(competitors || [])].filter(Boolean) as Array<{ mentionCount: number }>
  );

  return (
    <Card className="gem-card" data-testid="competitive-analysis-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Competitive Analysis
        </CardTitle>
        <CardDescription>
          Your position in the market
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Position Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Market Position</span>
          <MarketPositionBadge position={position} />
        </div>

        {/* Target Business Performance */}
        <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-primary/20">
          <div className="text-sm font-medium text-gray-700 mb-2">{businessName}</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600">Mentions</div>
              <div className="text-lg font-bold">{targetBusiness?.mentionCount || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Rank</div>
              <div className="text-lg font-bold">
                #{targetBusiness?.rank || 'N/A'}
              </div>
            </div>
          </div>
          {calculatedMarketShare?.target && (
            <div className="mt-2 text-xs text-gray-600">
              Market Share: {calculatedMarketShare.target}%
            </div>
          )}
        </div>

        {/* Top 3 Competitors */}
        {top3Competitors.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Top Competitors</div>
            <div className="space-y-2">
              {top3Competitors.map((competitor, idx) => {
                // Calculate market share for this competitor
                // Include target business and all competitors in the calculation
                const allParticipants = [
                  ...(targetBusiness ? [{ mentionCount: targetBusiness.mentionCount }] : []),
                  ...top3Competitors.map(c => ({ mentionCount: c.mentionCount }))
                ];
                const competitorShare = calculateMarketShare(
                  competitor.mentionCount,
                  allParticipants
                );
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{competitor.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{competitor.mentionCount} mentions</span>
                      {competitorShare && (
                        <span>{competitorShare.target}% share</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Competitive Gap Alert */}
        {topCompetitor && topCompetitor.mentionCount > (targetBusiness?.mentionCount || 0) && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-900 mb-1">
                  Competitive Gap
                </div>
                <div className="text-xs text-amber-700">
                  {topCompetitor.name} leads with {topCompetitor.mentionCount} mentions. 
                  You have {targetBusiness?.mentionCount || 0} mentions.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Recommendation */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-900 mb-1">
                Recommendation
              </div>
              <div className="text-xs text-blue-700">
                {positionDescription.recommendation}
              </div>
            </div>
          </div>
        </div>

        {/* Link to Detailed Page */}
        <Link href={`/dashboard/businesses/${businessId}/competitive`}>
          <Button variant="outline" className="w-full">
            View Full Analysis
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function getPositionDescription(position: 'leading' | 'competitive' | 'emerging' | 'unknown') {
  const descriptions = {
    leading: {
      recommendation: 'You\'re leading the market! Maintain your position by continuing to publish quality content and maintain your Wikidata presence.',
    },
    competitive: {
      recommendation: 'You\'re in a competitive position. Focus on improving your visibility score and Wikidata presence to gain an edge.',
    },
    emerging: {
      recommendation: 'You\'re emerging in the market. Consider publishing to Wikidata and improving your online presence to increase visibility.',
    },
    unknown: {
      recommendation: 'Market position data is limited. Run more analyses to get better competitive insights.',
    },
  };

  return descriptions[position] || descriptions.unknown;
}

function calculateMarketShare(
  mentionCount: number,
  allCompetitors: Array<{ mentionCount: number }>
): { target: number; topCompetitor: number } | null {
  const totalMentions = allCompetitors.reduce((sum, c) => sum + c.mentionCount, 0);
  
  if (totalMentions === 0) {
    return null;
  }

  const targetShare = Math.round((mentionCount / totalMentions) * 100);
  const topCompetitor = allCompetitors[0];
  const topShare = topCompetitor 
    ? Math.round((topCompetitor.mentionCount / totalMentions) * 100)
    : 0;

  return {
    target: targetShare,
    topCompetitor: topShare,
  };
}

