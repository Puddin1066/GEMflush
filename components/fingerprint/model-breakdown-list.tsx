/**
 * Model Breakdown List Component
 * Single Responsibility: Display per-model fingerprint results
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatSentiment } from '@/lib/utils/format';
import { CheckCircle, XCircle, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Code } from 'lucide-react';
import type { FingerprintResultDTO } from '@/lib/data/types';

interface ModelBreakdownListProps {
  results: FingerprintResultDTO[];
}

export function ModelBreakdownList({ results }: ModelBreakdownListProps) {
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {results.map((result, idx) => {
        const sentiment = formatSentiment(result.sentiment);
        const isExpanded = expandedResult === idx;
        const promptTypeLabel = result.promptType === 'factual' ? 'Factual Query' 
          : result.promptType === 'opinion' ? 'Opinion Query' 
          : result.promptType === 'recommendation' ? 'Recommendation Query' 
          : result.promptType;

        return (
          <Card 
            key={idx} 
            className={result.hasError 
              ? 'border-red-200 bg-red-50' 
              : result.mentioned 
                ? 'border-green-200' 
                : 'border-yellow-200'
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {result.hasError ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : result.mentioned ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {result.model}
                    </h3>
                    <Badge variant={result.promptType === 'recommendation' ? 'default' : 'secondary'} className="text-xs">
                      {promptTypeLabel}
                    </Badge>
                    {result.mentioned && !result.hasError && (
                      <Badge variant="success" className="text-xs">
                        Mentioned
                      </Badge>
                    )}
                    {result.hasError && (
                      <Badge variant="destructive" className="text-xs">
                        API Error
                      </Badge>
                    )}
                    {result.tokensUsed && (
                      <Badge variant="outline" className="text-xs">
                        {result.tokensUsed} tokens
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedResult(isExpanded ? null : idx)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
              </div>

              {/* Result Details */}
              <div className="space-y-2">
                {result.mentioned && !result.hasError ? (
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
                ) : result.hasError ? (
                  <div className="text-sm text-red-700 bg-red-100 border border-red-200 rounded p-3">
                    <strong>⚠️ API Call Failed:</strong> The LLM API request encountered an error.
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    This business was not mentioned in this model's responses.
                  </p>
                )}

                {/* Expanded Details - Show Prompts and Raw Responses */}
                {isExpanded && (
                  <div className="space-y-4 pt-4 border-t mt-4">
                    {/* Prompt Used */}
                    {result.prompt && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="h-4 w-4 text-gray-500" />
                          <strong className="text-sm text-gray-700">Prompt Used:</strong>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-800 font-mono whitespace-pre-wrap">
                          {result.prompt}
                        </div>
                      </div>
                    )}

                    {/* Raw LLM Response */}
                    {result.rawResponse && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="h-4 w-4 text-gray-500" />
                          <strong className="text-sm text-gray-700">Raw LLM Response:</strong>
                          {result.hasError && (
                            <Badge variant="destructive" className="text-xs ml-2">
                              Error Response
                            </Badge>
                          )}
                        </div>
                        <div className={`border rounded p-3 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto ${
                          result.hasError 
                            ? 'bg-red-50 border-red-200 text-red-900' 
                            : 'bg-blue-50 border-blue-200 text-gray-800'
                        }`}>
                          {result.rawResponse}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 space-y-1">
                      {result.promptType && <div>Prompt Type: <strong>{result.promptType}</strong></div>}
                      {result.tokensUsed && <div>Tokens Used: <strong>{result.tokensUsed}</strong></div>}
                      {result.confidence !== undefined && <div>Confidence: <strong>{result.confidence}%</strong></div>}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

