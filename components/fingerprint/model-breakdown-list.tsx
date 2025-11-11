/**
 * Model Breakdown List Component
 * Single Responsibility: Display per-model fingerprint results
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatSentiment } from '@/lib/utils/format';
import { CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import type { FingerprintResultDTO } from '@/lib/data/types';

interface ModelBreakdownListProps {
  results: FingerprintResultDTO[];
}

export function ModelBreakdownList({ results }: ModelBreakdownListProps) {
  return (
    <div className="space-y-4">
      {results.map((result, idx) => {
        const sentiment = formatSentiment(result.sentiment);

        return (
          <Card key={idx} className={result.mentioned ? 'border-green-200' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {result.mentioned ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {result.model}
                    </h3>
                    {result.mentioned && (
                      <Badge variant="success" className="text-xs">
                        Mentioned
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Result Details */}
              {result.mentioned ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-gray-700">
                    <span className="flex items-center gap-1">
                      {sentiment.emoji} <strong>Sentiment:</strong> {sentiment.label}
                    </span>
                    <span>
                      <strong>Confidence:</strong> {result.confidence}%
                    </span>
                    {result.rankPosition && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <strong>Rank:</strong> #{result.rankPosition}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  This business was not mentioned in this model's responses.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

