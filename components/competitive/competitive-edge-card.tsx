/**
 * Competitive Edge Card Component
 * Single Responsibility: Display quick competitive summary with leaderboard preview
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarketPositionBadge } from './market-position-badge';
import { MetricExplanation } from './metric-explanation';
import { formatRank } from '@/lib/utils/format';
import { Trophy, ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

interface CompetitiveEdgeCardProps {
  leaderboard: CompetitiveLeaderboardDTO | null;
  businessId: number;
  businessName: string;
}

export function CompetitiveEdgeCard({
  leaderboard,
  businessId,
  businessName,
}: CompetitiveEdgeCardProps) {
  // Empty state
  if (!leaderboard) {
    return (
      <Card className="gem-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Competitive Edge
          </CardTitle>
          <CardDescription>
            See how you rank against competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="gem-text-shimmer text-4xl mb-3">🏆</div>
            <p className="text-sm text-gray-600 mb-4">
              Run a fingerprint to see competitive intel
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { targetBusiness, competitors, insights } = leaderboard;
  const topCompetitor = competitors[0];
  
  // Check if we have meaningful data
  const hasNoData = leaderboard.totalQueries === 0 || 
    (targetBusiness.mentionCount === 0 && competitors.length === 0);
  
  // Check if competitors are placeholder data
  const hasPlaceholderCompetitors = competitors.some(c => 
    c.name.toLowerCase().includes('example') ||
    c.name.toLowerCase().includes('sample') ||
    c.name.toLowerCase().includes('local business')
  );

  return (
    <Card className="gem-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Competitive Edge
        </CardTitle>
        <CardDescription>
          Based on {leaderboard.totalQueries} recommendation queries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Position */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            Market Position:
            <MetricExplanation metric="marketPosition">
              <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </MetricExplanation>
          </span>
          <MarketPositionBadge position={insights.marketPosition} />
        </div>

        {/* Your Position */}
        <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Your Position:</span>
            <span className="text-lg font-bold">
              {targetBusiness.rank ? formatRank(targetBusiness.rank).label : 'Not Ranked'}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            Mentioned: {targetBusiness.mentionCount}/{leaderboard.totalQueries} times ({targetBusiness.mentionRate}%)
          </div>
        </div>

        {/* Top Competitor */}
        {topCompetitor && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Top Competitor:</p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 flex items-center gap-1">
                    {formatRank(1).medal} {topCompetitor.name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {topCompetitor.mentionCount} mentions • Avg position: #{topCompetitor.avgPosition.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Competitive Gap */}
        {insights.competitiveGap !== null && insights.competitiveGap > 0 && (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <span className="font-medium">Gap to Close:</span> {insights.competitiveGap} {insights.competitiveGap === 1 ? 'mention' : 'mentions'} to reach next position
          </div>
        )}

        {/* Strategic Tip */}
        {hasNoData ? (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <span className="font-medium">⚠️ Limited Data:</span> The business was not mentioned in recommendation queries. 
            This may indicate low LLM visibility. Consider publishing to Wikidata to improve discoverability.
          </div>
        ) : hasPlaceholderCompetitors ? (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <span className="font-medium">⚠️ Placeholder Data Detected:</span> The competitive analysis found generic/placeholder competitor names. 
            This suggests the LLM responses may not contain real competitor data. Consider re-running the fingerprint analysis.
          </div>
        ) : (
          <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <span className="font-medium">💡 Tip:</span> {insights.recommendation}
          </div>
        )}

        {/* CTA */}
        <Link href={`/dashboard/businesses/${businessId}/competitive`}>
          <Button variant="outline" className="w-full">
            View Full Leaderboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

