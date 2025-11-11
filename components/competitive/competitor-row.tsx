/**
 * Competitor Row Component
 * Single Responsibility: Display individual competitor in leaderboard
 */

import { cn } from '@/lib/utils';
import { formatRank, formatPercentage } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CompetitorDTO } from '@/lib/data/types';

interface CompetitorRowProps {
  competitor: CompetitorDTO;
  isTarget?: boolean;
  totalQueries: number;
}

export function CompetitorRow({ 
  competitor, 
  isTarget = false,
  totalQueries 
}: CompetitorRowProps) {
  const { medal, label } = formatRank(competitor.rank);
  const mentionRate = (competitor.mentionCount / totalQueries) * 100;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all',
        isTarget
          ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-primary shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{medal}</span>
            <span className="text-lg font-semibold text-gray-900">
              {label}
            </span>
            <span className="text-gray-900 font-medium">
              {competitor.name}
            </span>
            {isTarget && (
              <Badge variant="info" className="ml-2">
                You
              </Badge>
            )}
            {competitor.badge === 'top' && !isTarget && (
              <Badge variant="warning">
                Top Competitor
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              <strong className="text-gray-900">{competitor.mentionCount}</strong> mentions
            </span>
            <span>
              Avg position: <strong className="text-gray-900">#{competitor.avgPosition.toFixed(1)}</strong>
            </span>
            <span>
              Market share: <strong className="text-gray-900">{formatPercentage(competitor.marketShare)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Market Share Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Mention rate</span>
          <span>{mentionRate.toFixed(1)}%</span>
        </div>
        <Progress 
          value={mentionRate} 
          className={cn(
            'h-2',
            isTarget ? 'bg-purple-100' : 'bg-gray-100'
          )}
        />
      </div>
    </div>
  );
}

