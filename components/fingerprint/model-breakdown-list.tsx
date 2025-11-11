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
  // Group results by model
  const resultsByModel = results.reduce((acc, result) => {
    if (!acc[result.model]) {
      acc[result.model] = [];
    }
    acc[result.model].push(result);
    return acc;
  }, {} as Record<string, FingerprintResultDTO[]>);

  return (
    <div className="space-y-4">
      {Object.entries(resultsByModel).map(([model, modelResults]) => {
        const mentionCount = modelResults.filter(r => r.mentioned).length;
        const totalCount = modelResults.length;
        const mentionRate = (mentionCount / totalCount) * 100;
        const allMentioned = mentionCount === totalCount;

        return (
          <Card key={model} className={allMentioned ? 'border-green-200' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {allMentioned ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : mentionCount > 0 ? (
                      <div className="h-5 w-5 rounded-full border-2 border-amber-500 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      </div>
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {model}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    <strong>{mentionCount}/{totalCount}</strong> prompts mentioned your business 
                    ({mentionRate.toFixed(0)}%)
                  </p>
                </div>
              </div>

              {/* Prompt Results */}
              <div className="space-y-3">
                {modelResults.map((result, idx) => {
                  const sentiment = formatSentiment(result.sentiment);
                  
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {result.mentioned ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {result.promptType}
                            </span>
                            {result.mentioned && (
                              <Badge variant="success" className="text-xs">
                                Mentioned
                              </Badge>
                            )}
                          </div>
                          {result.mentioned && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                {sentiment.emoji} {sentiment.label}
                              </span>
                              <span>
                                Confidence: {result.confidence}%
                              </span>
                              {result.rankPosition && (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  Ranked #{result.rankPosition}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

