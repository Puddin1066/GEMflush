/**
 * Competitive Leaderboard Component
 * Single Responsibility: Display full competitive rankings with insights
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitorRow } from './competitor-row';
import { MarketPositionBadge } from './market-position-badge';
import { CompetitiveLeaderboardExplanation } from './competitive-leaderboard-explanation';
import { MetricExplanation } from './metric-explanation';
import { Trophy, TrendingUp, Lightbulb, Info, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

interface CompetitiveLeaderboardProps {
  data: CompetitiveLeaderboardDTO;
  businessId: number;
}

export function CompetitiveLeaderboard({ 
  data,
  businessId 
}: CompetitiveLeaderboardProps) {
  // Defensive: Provide default values for missing data
  const { 
    targetBusiness, 
    competitors = [], 
    insights, 
    totalQueries = 0 
  } = data;

  // Defensive: Provide default insights if missing
  const safeInsights = insights || {
    marketPosition: 'unknown' as const,
    topCompetitor: null,
    competitiveGap: null,
    recommendation: 'Run more analyses with recommendation prompts to get competitive insights.',
  };

  // Calculate total mentions for market share (must match calculation in fingerprint-dto.ts)
  const totalMentions =
    targetBusiness.mentionCount +
    competitors.reduce((sum, comp) => sum + comp.mentionCount, 0);

  // Merge target business into sorted list
  const allCompetitors = [...competitors];
  const targetAsCompetitor = {
    rank: targetBusiness.rank || competitors.length + 1,
    name: targetBusiness.name,
    mentionCount: targetBusiness.mentionCount,
    avgPosition: targetBusiness.rank || 0, // Use rank as avgPosition
    appearsWithTarget: targetBusiness.mentionCount,
    // CRITICAL: Use totalMentions (not totalQueries) to match competitor calculation
    // This ensures all market shares add up to 100%
    marketShare: totalMentions > 0 ? (targetBusiness.mentionCount / totalMentions) * 100 : 0,
  };

  // Insert target in correct position
  const sortedList = [...allCompetitors, targetAsCompetitor].sort(
    (a, b) => a.rank - b.rank
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Competitive Leaderboard
                <CompetitiveLeaderboardExplanation totalQueries={totalQueries} />
              </CardTitle>
              <CardDescription>
                Based on {totalQueries} LLM recommendation {totalQueries === 1 ? 'query' : 'queries'}
              </CardDescription>
            </div>
            <MarketPositionBadge position={safeInsights.marketPosition} size="lg" />
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Understanding the Metrics
              </CardTitle>
              <CardDescription>
                Click the info icons next to each metric to learn more
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <strong className="text-sm text-blue-900">Query Mention Share</strong>
                <MetricExplanation metric="marketShare">
                  <Info className="h-3 w-3 text-blue-600 cursor-help" />
                </MetricExplanation>
              </div>
              <p className="text-xs text-blue-800">
                Percentage of all mentions (you + competitors) that belong to each business. Higher = more relative visibility.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 mb-1">
                <strong className="text-sm text-green-900">Mention Count</strong>
                <MetricExplanation metric="mentionCount">
                  <Info className="h-3 w-3 text-green-600 cursor-help" />
                </MetricExplanation>
              </div>
              <p className="text-xs text-green-800">
                Total times a business appears in recommendation queries. More mentions = higher visibility.
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <strong className="text-sm text-purple-900">Average Position</strong>
                <MetricExplanation metric="avgPosition">
                  <Info className="h-3 w-3 text-purple-600 cursor-help" />
                </MetricExplanation>
              </div>
              <p className="text-xs text-purple-800">
                Average ranking when mentioned (1-5). Lower is better - #1 is top position.
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <strong className="text-sm text-amber-900">Mention Rate</strong>
                <MetricExplanation metric="mentionRate">
                  <Info className="h-3 w-3 text-amber-600 cursor-help" />
                </MetricExplanation>
              </div>
              <p className="text-xs text-amber-800">
                Percentage of queries where business is mentioned. Shows consistency of visibility.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rankings</CardTitle>
          <CardDescription>
            Competitors mentioned alongside your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedList.map((competitor) => (
            <CompetitorRow
              key={competitor.name}
              competitor={competitor}
              isTarget={competitor.name === targetBusiness.name}
              totalQueries={totalQueries}
            />
          ))}

          {competitors.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">
                No competitors detected in recommendation queries yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Market Position Explanation */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Market Position: {safeInsights.marketPosition.charAt(0).toUpperCase() + safeInsights.marketPosition.slice(1)}
                </h4>
                <p className="text-sm text-blue-800">
                  {safeInsights.marketPosition === 'leading' && 
                    'You have the strongest LLM visibility in your market. Focus on maintaining quality and expanding your knowledge graph presence.'
                  }
                  {safeInsights.marketPosition === 'competitive' && 
                    'You have solid visibility alongside other competitors. Strategic improvements can boost your ranking.'
                  }
                  {safeInsights.marketPosition === 'emerging' && 
                    'You have limited visibility compared to competitors. There\'s significant opportunity for improvement.'
                  }
                  {safeInsights.marketPosition === 'unknown' && 
                    'Insufficient data to determine market position. Run more analyses with recommendation prompts.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Top Competitor Alert */}
          {safeInsights.topCompetitor && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <h4 className="font-medium text-amber-900 mb-1">
                🥇 Top Competitor: {safeInsights.topCompetitor}
              </h4>
              <p className="text-sm text-amber-800">
                {safeInsights.competitiveGap && safeInsights.competitiveGap > 0 ? (
                  <>
                    They have <strong>{safeInsights.competitiveGap}</strong> more {safeInsights.competitiveGap === 1 ? 'mention' : 'mentions'} than you. 
                    Closing this gap would significantly improve your market position.
                  </>
                ) : (
                  <>They are currently the most visible business in LLM recommendations.</>
                )}
              </p>
            </div>
          )}

          {/* Recommendation */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <h4 className="font-medium text-green-900 mb-1">
              💡 Recommendation
            </h4>
            <p className="text-sm text-green-800">
              {safeInsights.recommendation}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

