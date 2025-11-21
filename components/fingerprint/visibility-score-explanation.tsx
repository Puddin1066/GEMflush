"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface VisibilityScoreExplanationProps {
  score: number;
  mentionRate: number;
  sentimentScore?: number; // Optional - will calculate from results if not provided
  accuracyScore?: number; // Optional - will use default if not provided
  avgRankPosition: number | null;
  results?: Array<{ sentiment: 'positive' | 'neutral' | 'negative'; mentioned: boolean }>; // For calculating sentiment if needed
}

export function VisibilityScoreExplanation({
  score,
  mentionRate,
  sentimentScore: providedSentimentScore,
  accuracyScore: providedAccuracyScore,
  avgRankPosition,
  results,
}: VisibilityScoreExplanationProps) {
  // Calculate sentiment score from results if not provided
  const sentimentScore = providedSentimentScore ?? (() => {
    if (!results) return 0.5; // Default neutral
    const sentimentScores = {
      positive: 1,
      neutral: 0.5,
      negative: 0,
    };
    const mentionedResults = results.filter(r => r.mentioned);
    if (mentionedResults.length === 0) return 0.5;
    const avg = mentionedResults.reduce((sum, r) => sum + sentimentScores[r.sentiment], 0) / mentionedResults.length;
    return avg;
  })();

  // Use provided accuracy or default to 0.7 (typical for mentioned businesses)
  const accuracyScore = providedAccuracyScore ?? 0.7;

  // Calculate component scores for display
  const mentionScore = (mentionRate / 100) * 40;
  const sentimentScoreComponent = sentimentScore * 30;
  const accuracyScoreComponent = accuracyScore * 20;
  const rankingScore = avgRankPosition 
    ? Math.max(0, (6 - avgRankPosition) / 5 * 10) 
    : 5;
  const rankingScoreComponent = rankingScore * 0.1;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Visibility Score is Calculated</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Overview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Overview</h3>
            <p className="text-sm text-blue-800">
              Your visibility score (0-100) measures how well-known your business is across major AI models 
              (GPT-4 Turbo, Claude 3 Opus, Gemini Pro). The score combines 4 key metrics from 9 LLM queries 
              (3 models × 3 prompt types).
            </p>
          </div>

          {/* Formula */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Score Formula</h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <div className="space-y-2">
                  <div>visibilityScore =</div>
                  <div className="pl-4">(mentionRate × 40%) +</div>
                  <div className="pl-4">(avgSentiment × 30%) +</div>
                  <div className="pl-4">(avgAccuracy × 20%) +</div>
                  <div className="pl-4">(rankingScore × 10%)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Component Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold">Your Score Breakdown</h3>
            
            {/* Mention Rate */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Mention Rate (40% weight)</div>
                    <div className="text-sm text-gray-600">
                      Percentage of queries where your business was mentioned
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{mentionRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{mentionScore.toFixed(1)} pts</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${mentionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sentiment */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Sentiment (30% weight)</div>
                    <div className="text-sm text-gray-600">
                      Average sentiment: Positive (1.0), Neutral (0.5), Negative (0.0)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{(sentimentScore * 100).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">{sentimentScoreComponent.toFixed(1)} pts</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${sentimentScore * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Accuracy */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Accuracy (20% weight)</div>
                    <div className="text-sm text-gray-600">
                      How accurate the LLM information is about your business
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{(accuracyScore * 100).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">{accuracyScoreComponent.toFixed(1)} pts</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${accuracyScore * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ranking */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Ranking (10% weight)</div>
                    <div className="text-sm text-gray-600">
                      Average position in recommendation lists (1 = best, 5 = worst)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {avgRankPosition ? `#${avgRankPosition.toFixed(1)}` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">{rankingScoreComponent.toFixed(1)} pts</div>
                  </div>
                </div>
                {avgRankPosition && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-amber-600 h-2 rounded-full" 
                      style={{ width: `${(6 - avgRankPosition) / 5 * 100}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Total Score */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">Total Visibility Score</div>
                  <div className="text-sm text-gray-600">Sum of all weighted components</div>
                </div>
                <div className="text-4xl font-bold text-blue-700">{score}</div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">How It Works</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>We query 3 LLM models (GPT-4 Turbo, Claude 3 Opus, Gemini Pro) with 3 types of prompts</li>
              <li>Each response is analyzed for mentions, sentiment, accuracy, and ranking position</li>
              <li>The scores are weighted: Mention Rate (40%) is most important, followed by Sentiment (30%), Accuracy (20%), and Ranking (10%)</li>
              <li>Higher scores indicate better visibility across AI models</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

