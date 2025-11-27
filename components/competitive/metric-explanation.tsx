/**
 * Metric Explanation Component
 * Provides tooltips and explanations for competitive intelligence metrics
 * 
 * SOLID: Single Responsibility - only handles metric explanations
 * DRY: Reusable across competitive components
 */

"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface MetricExplanationProps {
  metric: 'marketShare' | 'mentionCount' | 'avgPosition' | 'mentionRate' | 'appearsWithTarget' | 'marketPosition';
  children?: React.ReactNode;
}

const metricExplanations = {
  marketShare: {
    title: 'Query Mention Share',
    description: 'The percentage of total competitor mentions across all LLM recommendation queries that belong to this business.',
    calculation: 'Query Mention Share = (Business Mentions / Total Competitor Mentions) × 100',
    example: 'If there are 20 total competitor mentions across 3 LLM queries, and Competitor A appears 2 times, they have 10% query mention share.',
    whyItMatters: 'Shows relative visibility compared to other businesses mentioned alongside yours in LLM recommendations. Higher share means more frequent mentions across different AI models.',
  },
  mentionCount: {
    title: 'Mention Count',
    description: 'The total number of times this business appears in LLM recommendation queries.',
    calculation: 'Counted from all recommendation queries asking "What are the best [industry] in [location]?"',
    example: 'If a competitor appears in 25 out of 100 recommendation queries, their mention count is 25.',
    whyItMatters: 'More mentions indicate higher visibility and recognition by AI models. This is the primary metric for competitive ranking.',
  },
  avgPosition: {
    title: 'Average Position',
    description: 'The average ranking position when this business appears in recommendation lists (1-5).',
    calculation: 'Average Position = Sum of all positions / Number of appearances',
    example: 'If a competitor appears at positions #1, #2, and #3 across different queries, their average position is 2.0.',
    whyItMatters: 'Lower average position (closer to 1) means the business is ranked higher in recommendations. Position #1 is best, #5 is lowest.',
  },
  mentionRate: {
    title: 'Mention Rate',
    description: 'The percentage of recommendation queries where this business is mentioned.',
    calculation: 'Mention Rate = (Mention Count / Total Queries) × 100',
    example: 'If mentioned in 40 out of 100 queries, the mention rate is 40%.',
    whyItMatters: 'Shows how consistently the business appears in recommendations. Higher rates indicate more reliable visibility.',
  },
  appearsWithTarget: {
    title: 'Appears With Target',
    description: 'How many times this competitor appears in the same recommendation list as your business.',
    calculation: 'Counted when both businesses appear in the same LLM recommendation response.',
    example: 'If Competitor A appears with you in 15 out of 100 queries, they appear with you 15 times.',
    whyItMatters: 'High co-occurrence means you\'re direct competitors in the same market. These are the businesses you compete with most directly.',
  },
  marketPosition: {
    title: 'Market Position',
    description: 'Your overall competitive standing based on mention count and visibility.',
    calculation: 'Determined by comparing your mention rate and count to competitors.',
    example: 'If you appear in 45 out of 100 recommendation queries (45% mention rate), you\'re in the competitive tier. If you appear in 70+ queries, you\'re leading.',
    levels: {
      leading: 'You have 60%+ mention rate or are the most mentioned business. You dominate the competitive landscape.',
      competitive: 'You have 30-60% mention rate. You\'re visible alongside competitors with room for improvement.',
      emerging: 'You have less than 30% mention rate. You have significant opportunity to improve visibility.',
      unknown: 'Insufficient data to determine position. Run more analyses with recommendation prompts.',
    },
    whyItMatters: 'Understanding your market position helps prioritize competitive strategy and identify improvement opportunities.',
  },
};

export function MetricExplanation({ metric, children }: MetricExplanationProps) {
  const explanation = metricExplanations[metric];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 inline-flex items-center justify-center">
            <Info className="h-3 w-3 text-gray-400 hover:text-gray-600" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{explanation.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What It Means</h3>
            <p className="text-sm text-blue-800">{explanation.description}</p>
          </div>

          {/* Calculation */}
          {explanation.calculation && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">How It's Calculated</h3>
              <p className="text-sm text-gray-700 font-mono bg-white p-2 rounded border">
                {explanation.calculation}
              </p>
            </div>
          )}

          {/* Example */}
          {explanation.example && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Example</h3>
              <p className="text-sm text-green-800">{explanation.example}</p>
            </div>
          )}

          {/* Levels (for market position) */}
          {'levels' in explanation && explanation.levels && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Position Levels</h3>
              <div className="space-y-2 text-sm text-purple-800">
                {Object.entries(explanation.levels).map(([level, description]) => (
                  <div key={level} className="flex items-start gap-2">
                    <span className="font-medium capitalize">{level}:</span>
                    <span>{description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why It Matters */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Why It Matters</h3>
            <p className="text-sm text-amber-800">{explanation.whyItMatters}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

