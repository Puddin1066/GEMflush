/**
 * Competitive Leaderboard Component
 * Single Responsibility: Display full competitive rankings with insights
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitorRow } from './competitor-row';
import { MarketPositionBadge } from './market-position-badge';
import { Trophy, TrendingUp, Lightbulb } from 'lucide-react';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

interface CompetitiveLeaderboardProps {
  data: CompetitiveLeaderboardDTO;
  businessId: number;
}

export function CompetitiveLeaderboard({ 
  data,
  businessId 
}: CompetitiveLeaderboardProps) {
  const { targetBusiness, competitors, insights, totalQueries } = data;

  // Merge target business into sorted list
  const allCompetitors = [...competitors];
  const targetAsCompetitor = {
    rank: targetBusiness.rank || competitors.length + 1,
    name: targetBusiness.name,
    mentionCount: targetBusiness.mentionCount,
    avgPosition: targetBusiness.avgPosition || 0,
    appearsWithTarget: targetBusiness.mentionCount,
    marketShare: totalQueries > 0 ? (targetBusiness.mentionCount / totalQueries) * 100 : 0,
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
              </CardTitle>
              <CardDescription>
                Based on {totalQueries} LLM recommendation {totalQueries === 1 ? 'query' : 'queries'}
              </CardDescription>
            </div>
            <MarketPositionBadge position={insights.marketPosition} size="lg" />
          </div>
        </CardHeader>
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
                  Market Position: {insights.marketPosition.charAt(0).toUpperCase() + insights.marketPosition.slice(1)}
                </h4>
                <p className="text-sm text-blue-800">
                  {insights.marketPosition === 'leading' && 
                    'You have the strongest LLM visibility in your market. Focus on maintaining quality and expanding your knowledge graph presence.'
                  }
                  {insights.marketPosition === 'competitive' && 
                    'You have solid visibility alongside other competitors. Strategic improvements can boost your ranking.'
                  }
                  {insights.marketPosition === 'emerging' && 
                    'You have limited visibility compared to competitors. There\'s significant opportunity for improvement.'
                  }
                  {insights.marketPosition === 'unknown' && 
                    'Insufficient data to determine market position. Run more analyses with recommendation prompts.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Top Competitor Alert */}
          {insights.topCompetitor && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <h4 className="font-medium text-amber-900 mb-1">
                🥇 Top Competitor: {insights.topCompetitor}
              </h4>
              <p className="text-sm text-amber-800">
                {insights.competitiveGap && insights.competitiveGap > 0 ? (
                  <>
                    They have <strong>{insights.competitiveGap}</strong> more {insights.competitiveGap === 1 ? 'mention' : 'mentions'} than you. 
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
              {insights.recommendation}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

