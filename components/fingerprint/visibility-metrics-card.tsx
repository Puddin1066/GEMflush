/**
 * Visibility Metrics Card Component
 * High-value component showing comprehensive LLM visibility metrics and trends
 * 
 * SOLID: Single Responsibility - displays visibility metrics only
 * DRY: Reuses existing UI components and utilities
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { formatModelName } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import type { FingerprintDetailDTO, FingerprintHistoryDTO } from '@/lib/data/types';

interface VisibilityMetricsCardProps {
  fingerprint: FingerprintDetailDTO | null;
  history: FingerprintHistoryDTO[] | null;
  businessName: string;
  loading?: boolean;
}

export function VisibilityMetricsCard({
  fingerprint,
  history,
  businessName,
  loading = false,
}: VisibilityMetricsCardProps) {
  // Calculate trend from history
  const trendData = calculateTrendFromHistory(history || [], fingerprint);

  // Loading state
  if (loading) {
    return (
      <Card className="gem-card" data-testid="visibility-metrics-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            LLM Visibility Metrics
          </CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!fingerprint) {
    return (
      <Card className="gem-card" data-testid="visibility-metrics-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            LLM Visibility Metrics
          </CardTitle>
          <CardDescription>Your AI visibility across major LLMs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="gem-text-shimmer text-4xl mb-3">?</div>
            <p className="text-sm text-gray-600 mb-4">
              No visibility data yet. Run analysis to see your metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { visibilityScore, summary, results } = fingerprint;
  const topResults = results?.slice(0, 5) || [];
  const topModels = summary?.topModels || [];

  return (
    <Card className="gem-card" data-testid="visibility-metrics-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          LLM Visibility Metrics
        </CardTitle>
        <CardDescription>
          Your AI visibility across ChatGPT, Claude, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visibility Score with Trend */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">Visibility Score</div>
            {trendData && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                trendData.direction === 'up' ? 'text-green-600' :
                trendData.direction === 'down' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {trendData.direction === 'up' && <TrendingUp className="h-4 w-4" />}
                {trendData.direction === 'down' && <TrendingDown className="h-4 w-4" />}
                {trendData.direction === 'neutral' && <Minus className="h-4 w-4" />}
                {trendData.value !== 0 && (
                  <span>
                    {trendData.direction === 'up' ? '+' : ''}{trendData.value}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-4xl font-bold text-blue-900 mb-2">
            {visibilityScore}
          </div>
          <Progress value={visibilityScore} className="h-2" />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricBox
            label="Mention Rate"
            value={`${summary?.mentionRate || 0}%`}
            description="Models mentioning your business"
          />
          <MetricBox
            label="Avg Rank"
            value={`#${summary?.averageRank?.toFixed(1) || 'N/A'}`}
            description="Average ranking position"
          />
        </div>

        {/* Top Performing Models */}
        {topModels.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              Top Performing Models
            </div>
            <div className="flex flex-wrap gap-2">
              {topModels.map((model, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {formatModelName(model)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top 5 Model Results */}
        {topResults.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              Model Performance
            </div>
            <div className="space-y-2">
              {topResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatModelName(result.model)}
                    </span>
                    {result.mentioned && (
                      <Badge variant="success" className="text-xs">
                        Mentioned
                      </Badge>
                    )}
                  </div>
                  {result.rankPosition && (
                    <span className="text-gray-600">
                      Rank #{result.rankPosition}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {description && (
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      )}
    </div>
  );
}

function calculateTrendFromHistory(
  history: FingerprintHistoryDTO[],
  current: FingerprintDetailDTO | null
): { direction: 'up' | 'down' | 'neutral'; value: number } | null {
  if (!current || history.length < 2) {
    return null;
  }

  // Sort history by date (oldest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get oldest and newest scores
  const oldestScore = sortedHistory[0]?.visibilityScore;
  const newestScore = current.visibilityScore;

  if (oldestScore === null || newestScore === null) {
    return null;
  }

  const difference = newestScore - oldestScore;
  const threshold = 5; // Minimum change to show trend

  if (Math.abs(difference) < threshold) {
    return { direction: 'neutral', value: 0 };
  }

  return {
    direction: difference > 0 ? 'up' : 'down',
    value: Math.round(Math.abs(difference)),
  };
}

