/**
 * Visibility Intelligence Card Component
 * Single Responsibility: Display fingerprint summary with CTA
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VisibilityScoreDisplay } from './visibility-score-display';
import { formatSentiment, formatModelName } from '@/lib/utils/format';
import { Eye, Sparkles, Info, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { FingerprintDetailDTO } from '@/lib/data/types';

interface VisibilityIntelCardProps {
  fingerprint: FingerprintDetailDTO | null;
  loading?: boolean;
  onAnalyze?: () => void;
  isPublished?: boolean;
  showAutoProgress?: boolean;
  businessId?: number;
}

export function VisibilityIntelCard({
  fingerprint,
  loading = false,
  onAnalyze,
  isPublished = false,
  showAutoProgress = false,
  businessId,
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
            {!showAutoProgress && onAnalyze && (
              <Button onClick={onAnalyze} disabled={loading} className="gem-gradient text-white">
                <Sparkles className="mr-2 h-4 w-4" />
                {loading ? 'Analyzing...' : 'Analyze Now'}
              </Button>
            )}
            {showAutoProgress && (
              <div className="text-center text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span>Automatic analysis in progress...</span>
                </div>
              </div>
            )}
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

  // Defensive check: ensure summary exists (may be missing if DTO transformation failed)
  if (!fingerprint.summary) {
    console.error('Fingerprint missing summary property:', fingerprint);
    return (
      <Card className="gem-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibility Intel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Fingerprint data is incomplete. Please run analysis again.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Check if we have meaningful data (low scores might indicate issues)
  const hasLowScore = fingerprint.visibilityScore < 10;
  const hasNoMentions = fingerprint.summary.mentionRate === 0;
  const hasErrors = fingerprint.results.some(r => r.hasError);

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

        {/* Data Quality Warnings */}
        {hasErrors && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-900 mb-1">
                  ⚠️ API Errors Detected
                </p>
                <p className="text-xs text-red-700">
                  Some LLM queries failed. This may affect the accuracy of your visibility score. 
                  Check the detailed analysis for more information.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {hasNoMentions && !hasErrors && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-900 mb-1">
                  ⚠️ No Mentions Detected
                </p>
                <p className="text-xs text-amber-700">
                  The business name was not found in any LLM responses. This may indicate:
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>The business is not well-known in LLM training data</li>
                    <li>LLM responses are generic/placeholder data</li>
                    <li>Business name matching needs improvement</li>
                  </ul>
                  Publishing to Wikidata can significantly improve visibility.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Publishing Impact Note */}
        {!isPublished && !hasNoMentions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900 mb-1">
                  Boost Your Visibility Score
                </p>
                <p className="text-xs text-blue-700">
                  Publishing to Wikidata can increase your LLM visibility by up to 340%. 
                  Complete the publishing journey to unlock this boost.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-2">
          {!showAutoProgress && onAnalyze && (
            <Button onClick={onAnalyze} disabled={loading} variant="outline" className="w-full">
              {loading ? 'Analyzing...' : 'Run New Analysis'}
            </Button>
          )}
          
          {/* Link to detailed fingerprint page with LLM prompts and metrics */}
          {fingerprint && businessId && (
            <Link href={`/dashboard/businesses/${businessId}/fingerprint`}>
              <Button variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                View Detailed LLM Analysis
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

