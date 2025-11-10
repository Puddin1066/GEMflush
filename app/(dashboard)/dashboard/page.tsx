import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { GemIcon, GemClusterIcon, WikidataRubyIcon, GemBadge } from '@/components/ui/gem-icon';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import type { DashboardDTO } from '@/lib/data/types';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Building2, 
  CheckCircle, 
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default async function DashboardPage() {
  // Get authenticated user and team
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/sign-in');
  }

  // Fetch dashboard data via DTO layer
  const stats: DashboardDTO = await getDashboardDTO(team.id);

  const hasBusinesses = stats.totalBusinesses > 0;
  const planTier = team.planName || 'free';
  const isPro = planTier === 'pro' || planTier === 'agency';

  // Empty state for new users
  if (!hasBusinesses) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <GemClusterIcon size={64} className="mx-auto mb-6" />
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Welcome to <span className="gem-text-shimmer">GEMflush</span>!
            </h1>
            <p className="text-lg text-gray-600">
              Let's get your first business into the AI knowledge graph
            </p>
          </div>

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
                    <Link href="/dashboard/businesses/new">
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
          AI Visibility Command Center
        </h1>
        <p className="text-gray-600">
          Track your business performance across major AI systems
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
              {stats.totalBusinesses}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Wikidata Entities</span>
              <WikidataRubyIcon size={20} />
            </div>
            <div className="text-3xl font-bold gem-text">
              {stats.wikidataEntities}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Visibility Score</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.avgVisibilityScore || '--'}
              <span className="text-lg text-gray-500">/100</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Businesses Grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Businesses</h2>
        <Link href="/dashboard/businesses/new">
          <Button className="gem-gradient text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Business
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {stats.businesses.map((business) => (
          <Link key={business.id} href={`/dashboard/businesses/${business.id}`}>
            <Card className="gem-card hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-1">{business.name}</CardTitle>
                    <CardDescription>{business.location}</CardDescription>
                  </div>
                  {business.wikidataQid ? (
                    <GemBadge variant="ruby" className="text-xs">
                      Published
                    </GemBadge>
                  ) : (
                    <GemBadge variant="outline" className="text-xs">
                      Pending
                    </GemBadge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">AI Visibility Score</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold gem-text">{business.visibilityScore}</span>
                      <div className={`flex items-center text-sm ${
                        business.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {business.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(business.trendValue)}%
                      </div>
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
        ))}
      </div>

      {/* Upgrade CTA for Free Users */}
      {!isPro && (
        <Card className="gem-card border-2 border-primary">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Unlock Wikidata Publishing
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Upgrade to Pro and publish your businesses to Wikidata. Increase your AI visibility by up to 340%.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Publish to Wikidata knowledge base</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Weekly fingerprints instead of monthly</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Track up to 5 businesses</span>
                    </li>
                  </ul>
                </div>
              </div>
              <Link href="/pricing">
                <Button size="lg" className="gem-gradient text-white whitespace-nowrap">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Upgrade to Pro
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
