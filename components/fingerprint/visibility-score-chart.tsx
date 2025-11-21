"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { usePolling } from '@/lib/hooks/use-polling';

interface FingerprintHistoryPoint {
  id: number;
  date: string;
  visibilityScore: number;
  mentionRate: number | null;
  sentimentScore: number | null;
  accuracyScore: number | null;
  avgRankPosition: number | null;
}

interface VisibilityScoreChartProps {
  businessId: number;
  /**
   * Business status - used to determine if we should poll for updates
   */
  businessStatus?: string;
  /**
   * Whether automation is enabled - affects polling behavior
   */
  automationEnabled?: boolean;
}

export function VisibilityScoreChart({ 
  businessId, 
  businessStatus,
  automationEnabled = false,
}: VisibilityScoreChartProps) {
  const [history, setHistory] = useState<FingerprintHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/business/${businessId}/fingerprint/history`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch fingerprint history');
      }

      const data = await response.json();
      setHistory(data.history || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    void fetchHistory();
  }, [businessId]);

  // Poll for updates when CFP is processing
  // CRITICAL: Chart should update when new fingerprint is created during CFP
  const isProcessing = businessStatus === 'crawling' || 
                       businessStatus === 'generating' || 
                       (businessStatus === 'crawled' && automationEnabled);
  
  usePolling({
    enabled: isProcessing,
    interval: 5000, // Poll every 5 seconds
    maxPolls: 60, // Stop after 5 minutes
    onPoll: () => {
      // Only fetch if not currently loading to avoid race conditions
      if (!loading) {
        void fetchHistory();
      }
    },
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Visibility Score Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Visibility Score Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Error loading chart: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Visibility Score Over Time
          </CardTitle>
          <CardDescription>
            Track your visibility score changes over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No historical data available yet.</p>
            <p className="text-xs mt-1">Run multiple analyses to see trends over time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart (reverse to show oldest to newest)
  const chartData = [...history].reverse().map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(history.length > 7 ? { year: '2-digit' } : {})
    }),
    fullDate: new Date(point.date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    visibilityScore: point.visibilityScore,
    mentionRate: point.mentionRate,
    sentimentScore: point.sentimentScore,
    accuracyScore: point.accuracyScore,
    avgRankPosition: point.avgRankPosition,
  }));

  // Calculate trend
  const firstScore = history[history.length - 1]?.visibilityScore || 0;
  const lastScore = history[0]?.visibilityScore || 0;
  const trend = lastScore - firstScore;
  const trendPercent = firstScore > 0 ? ((trend / firstScore) * 100).toFixed(1) : '0';

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-2">{data.fullDate}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Visibility Score:</span>
              <span className="font-semibold">{data.visibilityScore}</span>
            </div>
            {data.mentionRate !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Mention Rate:</span>
                <span>{data.mentionRate}%</span>
              </div>
            )}
            {data.sentimentScore !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Sentiment:</span>
                <span>{data.sentimentScore}%</span>
              </div>
            )}
            {data.avgRankPosition !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Avg Rank:</span>
                <span>#{data.avgRankPosition}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Visibility Score Over Time
            </CardTitle>
            <CardDescription>
              {history.length} analysis{history.length !== 1 ? 'es' : ''} tracked
              {trend !== 0 && (
                <span className={`ml-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({trend > 0 ? '+' : ''}{trend} points, {trendPercent}%)
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full min-w-0 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={256}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="#666"
                fontSize={12}
                tickLine={false}
                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="visibilityScore" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Visibility Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Additional metrics chart if we have enough data */}
        {history.length >= 2 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Component Metrics</h4>
            <div className="h-48 w-full min-w-0 min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke="#666"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="line"
                  />
                  {chartData.some(d => d.mentionRate !== null) && (
                    <Line 
                      type="monotone" 
                      dataKey="mentionRate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                      name="Mention Rate (%)"
                    />
                  )}
                  {chartData.some(d => d.sentimentScore !== null) && (
                    <Line 
                      type="monotone" 
                      dataKey="sentimentScore" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 3 }}
                      name="Sentiment (%)"
                    />
                  )}
                  {chartData.some(d => d.accuracyScore !== null) && (
                    <Line 
                      type="monotone" 
                      dataKey="accuracyScore" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 3 }}
                      name="Accuracy (%)"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


