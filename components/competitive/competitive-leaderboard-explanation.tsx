"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface CompetitiveLeaderboardExplanationProps {
  totalQueries: number;
}

export function CompetitiveLeaderboardExplanation({
  totalQueries,
}: CompetitiveLeaderboardExplanationProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Competitive Leaderboard Works</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Overview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Overview</h3>
            <p className="text-sm text-blue-800">
              The competitive leaderboard shows which businesses are mentioned most often alongside yours 
              in LLM recommendation queries. It's built from <strong>{totalQueries} recommendation query{totalQueries !== 1 ? 'ies' : ''}</strong> 
              that ask "What are the best [industry] in [location]?"
            </p>
          </div>

          {/* How It's Built */}
          <div className="space-y-3">
            <h3 className="font-semibold">How It's Built</h3>
            
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium mb-1">1. Recommendation Queries</div>
                <p className="text-sm text-gray-600">
                  We query each LLM model with: "What are the best [industry] in [location]? List the top 5 and rank them 1-5."
                  Only these recommendation queries are used (not factual or opinion queries).
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="font-medium mb-1">2. Competitor Extraction</div>
                <p className="text-sm text-gray-600">
                  From each response, we extract business names from numbered lists (e.g., "1. Business Name").
                  We filter out placeholder names, generic terms, and your own business name.
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <div className="font-medium mb-1">3. Counting & Ranking</div>
                <p className="text-sm text-gray-600">
                  For each competitor, we count:
                  <ul className="list-disc list-inside mt-1 space-y-0.5 ml-2">
                    <li><strong>Mention Count:</strong> How many times they appear in recommendation lists</li>
                    <li><strong>Average Position:</strong> Their average rank position (1-5)</li>
                    <li><strong>Appears With Target:</strong> How many times mentioned alongside your business</li>
                    <li><strong>Market Share:</strong> Percentage of all mentions (you + competitors) that belong to them</li>
                    <li><strong>Mention Rate:</strong> Percentage of queries where they're mentioned</li>
                  </ul>
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-4">
                <div className="font-medium mb-1">4. Sorting</div>
                <p className="text-sm text-gray-600">
                  Competitors are sorted by mention count (descending), then by average position (ascending).
                  Businesses mentioned more often and in higher positions appear first.
                </p>
              </div>
            </div>
          </div>

          {/* What It Means */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Understanding the Metrics</h3>
            <ul className="text-sm text-gray-700 space-y-2 list-none">
              <li>
                <strong>Mention Count:</strong> Total times a business appears in recommendation queries. Higher = more visibility.
              </li>
              <li>
                <strong>Average Position:</strong> Average ranking when mentioned (1-5). Lower is better - #1 is top position.
              </li>
              <li>
                <strong>Market Share:</strong> Percentage of all mentions (you + competitors) that belong to each business. 
                Shows relative visibility. Example: If you have 50 mentions and Competitor A has 30 out of 100 total, 
                Competitor A has 30% market share.
              </li>
              <li>
                <strong>Mention Rate:</strong> Percentage of queries where business is mentioned. Shows consistency of visibility.
              </li>
              <li>
                <strong>Appears With Target:</strong> How many times mentioned alongside your business. High co-occurrence = direct competitor.
              </li>
              <li>
                <strong>Your Position:</strong> Shows where you rank when mentioned in recommendation queries. 
                Helps understand your competitive standing.
              </li>
            </ul>
          </div>

          {/* Why Recommendation Queries Only */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Why Recommendation Queries Only?</h3>
            <p className="text-sm text-amber-800">
              Recommendation queries naturally produce competitive lists ("best [industry] in [location]"), 
              making them ideal for competitive analysis. Factual and opinion queries focus on individual businesses, 
              not competitive comparisons.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


