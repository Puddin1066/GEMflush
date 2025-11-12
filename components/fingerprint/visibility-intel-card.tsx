/**
 * Visibility Intelligence Card Component
 * Single Responsibility: Display fingerprint summary with CTA
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VisibilityScoreDisplay } from './visibility-score-display';
import { formatSentiment, formatModelName } from '@/lib/utils/format';
import { Eye, Sparkles } from 'lucide-react';
import type { FingerprintDetailDTO } from '@/lib/data/types';

interface VisibilityIntelCardProps {
  fingerprint: FingerprintDetailDTO | null;
  loading?: boolean;
  onAnalyze: () => void;
}

export function VisibilityIntelCard({
  fingerprint,
  loading = false,
  onAnalyze,
}: VisibilityIntelCardProps) {
  // Empty state
  if (!fingerprint && !loading) {
    return (
      <Card className="gem-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibility Intel
          </CardTitle>
          <CardDescription>
            Discover your AI visibility across major LLMs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="gem-text-shimmer text-4xl mb-3">?</div>
            <p className="text-sm text-gray-600 mb-4">
              No fingerprint data yet
            </p>
            <Button onClick={onAnalyze} disabled={loading} className="gem-gradient text-white">
              <Sparkles className="mr-2 h-4 w-4" />
              {loading ? 'Analyzing...' : 'Analyze Now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className="gem-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibility Intel
          </CardTitle>
          <CardDescription>Running analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Null check already done above, but TypeScript needs explicit check
  if (!fingerprint) {
    return null;
  }

  const sentiment = formatSentiment(fingerprint.summary.sentiment);

  return (
    <Card className="gem-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visibility Intel
        </CardTitle>
        <CardDescription>
          Last analyzed {fingerprint.createdAt}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big Score Display */}
        <div className="flex justify-center py-4">
          <VisibilityScoreDisplay
            score={fingerprint.visibilityScore}
            trend={fingerprint.trend}
            size="lg"
          />
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {fingerprint.summary.mentionRate}%
            </div>
            <div className="text-xs text-gray-600">Mention Rate</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">
              {sentiment.emoji} {sentiment.label}
            </div>
            <div className="text-xs text-gray-600">Sentiment</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {fingerprint.results.filter(r => r.mentioned).length}/{fingerprint.results.length}
            </div>
            <div className="text-xs text-gray-600">Models</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {fingerprint.summary.averageRank ? `#${fingerprint.summary.averageRank}` : 'N/A'}
            </div>
            <div className="text-xs text-gray-600">Avg Rank</div>
          </div>
        </div>

        {/* Top Models */}
        {fingerprint.summary.topModels.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Top Performing Models:</p>
            <div className="flex gap-2 flex-wrap">
              {fingerprint.summary.topModels.map((model) => (
                <Badge key={model} variant="secondary">
                  {model}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Button onClick={onAnalyze} disabled={loading} variant="outline" className="w-full">
          {loading ? 'Analyzing...' : 'Run New Analysis'}
        </Button>
      </CardContent>
    </Card>
  );
}

