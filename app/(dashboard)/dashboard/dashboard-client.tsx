/**
 * Dashboard Client Component
 * Interactive parts of the dashboard that require client-side features
 */

'use client';

import { WelcomeMessage } from '@/components/onboarding';
import { BusinessListCard } from '@/components/business/business-list-card';
import { ErrorCard } from '@/components/error';
import { BusinessLimitDisplay } from '@/components/subscription/business-limit-display';
import { TierBadge } from '@/components/subscription/tier-badge';
import { UpgradeCTA } from '@/components/subscription/upgrade-cta';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Plus, 
  Building2, 
  CheckCircle, 
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { WikidataRubyIcon } from '@/components/ui/gem-icon';
import { BusinessProcessingStatus } from '@/components/business/business-processing-status';
import { useDashboard } from '@/lib/hooks/use-dashboard';
import type { DashboardDTO } from '@/lib/data/types';
import type { User, Team } from '@/lib/db/schema';

interface DashboardClientProps {
  data: DashboardDTO;
  user: User;
  team: Team;
}

export function DashboardClient({ dashboardData: initialData, user, team }: DashboardClientProps) {
  // Use polling hook for real-time updates (TEST DRIVES IMPLEMENTATION)
  // This allows dashboard to update automatically when businesses are processing
  const { stats: polledData, loading } = useDashboard();
  // Use hook data if available, otherwise fallback to initial SSR data
  const dashboardData = !loading && polledData.totalBusinesses >= 0 ? polledData : initialData;
  // Calculate plan info from team
  const planTier = team.planName || 'free';
  const isPro = planTier === 'pro' || planTier === 'agency';
  const maxBusinesses = team.planName === 'pro' ? 5 : team.planName === 'agency' ? 25 : 1;

  const hasBusinesses = dashboardData.totalBusinesses > 0;

  // Empty state for new users
  if (!hasBusinesses) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <WelcomeMessage
            userName={user.email?.split('@')[0] || 'User'}
            businessCount={0}
          />

          {/* Getting Started Checklist */}
          <Card className="gem-card mb-8">
            <CardHeader>
              <CardTitle>Getting Started Checklist</CardTitle>
              <CardDescription>Follow these steps to boost your AI visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-primary">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full gem-gradient flex items-center justify-center text-white font-bold">1</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Add Your First Business</h3>
                    <p className="text-sm text-gray-600 mb-3">Tell us about your business - it takes just 2 minutes</p>
                    <Link href="/dashboard/businesses">
                      <Button className="gem-gradient text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Business
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg opacity-60">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Crawl Your Website</h3>
                    <p className="text-sm text-gray-500">We'll extract key information automatically</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg opacity-60">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Run LLM Fingerprint</h3>
                    <p className="text-sm text-gray-500">See your current AI visibility score</p>
                  </div>
                </div>

                {!isPro && (
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-primary/20">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Unlock Wikidata Publishing (Pro)</h3>
                      <p className="text-sm text-gray-600 mb-3">Upgrade to publish your entity and boost AI visibility</p>
                      <Link href="/pricing">
                        <Button size="sm" variant="outline">
                          View Plans
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <Building2 className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Track Businesses</h3>
                <p className="text-sm text-gray-600">Monitor AI visibility across multiple locations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <WikidataRubyIcon size={32} className="mb-3" />
                <h3 className="font-semibold mb-2">Wikidata Publishing</h3>
                <p className="text-sm text-gray-600">Get into the knowledge base behind ChatGPT</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Track Progress</h3>
                <p className="text-sm text-gray-600">Watch your visibility improve over time</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  // Main dashboard with businesses
  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Get Found by AI. Not Just Google.
        </h1>
        <p className="text-gray-600 text-lg">
          When customers ask ChatGPT, Claude, or Perplexity about businesses like yours, 
          will they find you? We make sure they do.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Businesses</span>
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardData.totalBusinesses}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Visible in LLMs</span>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold gem-text">
              {dashboardData.wikidataEntities}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Published to Wikidata • Discoverable by AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Visibility Score</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardData.avgVisibilityScore || '--'}
              <span className="text-lg text-gray-500">/100</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Explanation Banner */}
      <Card className="mb-6 bg-gradient-to-r from-primary/5 to-purple-50 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <WikidataRubyIcon size={32} className="text-primary flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                How Wikidata Publishing Makes You Visible to AI
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                When you publish to Wikidata, your business becomes part of the knowledge base 
                that powers ChatGPT, Claude, Perplexity, and other AI systems. 
                <strong> This is the only automated service that does this.</strong>
              </p>
              <div className="flex gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Automated entity creation</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Notability validation</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>One-click publishing</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Limit Display */}
      <BusinessLimitDisplay
        currentCount={dashboardData.totalBusinesses}
        maxCount={maxBusinesses}
        tier={planTier}
        className="mb-6"
      />

      {/* Businesses Grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Businesses</h2>
        <div className="flex items-center gap-3">
          <TierBadge tier={planTier} />
          <Link href="/dashboard/businesses">
            <Button className="gem-gradient text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Business
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {dashboardData.businesses.map((business) => {
          // Parse location string (format: "City, State")
          const locationParts = business.location?.split(', ') || [];
          const city = locationParts[0] || '';
          const state = locationParts[1] || '';
          
          // Check if business is processing
          const isProcessing = business.status === 'pending' || 
                               business.status === 'crawling' || 
                               business.status === 'generating';
          
          return (
            <Link key={business.id} href={`/dashboard/businesses/${business.id}`}>
              <Card className="gem-card hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-1">{business.name}</CardTitle>
                      <CardDescription>{business.location}</CardDescription>
                      {/* Show processing status */}
                      {isProcessing && (
                        <div className="mt-2">
                          <BusinessProcessingStatus
                            status={business.status}
                            automationEnabled={business.automationEnabled}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                    {business.wikidataQid ? (
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="default" className="text-xs">
                          <Sparkles className="mr-1 h-3 w-3" />
                          In LLMs
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Discoverable by AI
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not in LLMs yet
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">AI Visibility Score</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold gem-text">{business.visibilityScore || '--'}</span>
                        {business.trend === 'up' && (
                          <div className="flex items-center text-sm text-green-500">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            {Math.abs(business.trendValue)}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Last fingerprint</span>
                      <span className="text-gray-900">{business.lastFingerprint}</span>
                    </div>
                    {business.wikidataQid && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <WikidataRubyIcon size={16} />
                        <span className="text-xs wikidata-accent font-medium">{business.wikidataQid}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Upgrade CTA for Free Users */}
      {!isPro && (
        <UpgradeCTA feature="wikidata" variant="card" />
      )}
    </section>
  );
}

