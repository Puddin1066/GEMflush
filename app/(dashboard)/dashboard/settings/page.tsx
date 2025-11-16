/**
 * Settings Hub Page
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays settings overview and navigation
 * - Open/Closed: Extensible for new settings sections
 * - Dependency Inversion: Uses query functions, not direct DB access
 * 
 * DRY Principles:
 * - Reuses existing UI components (Card, Button, Badge)
 * - Reuses existing query functions (getUser, getTeamForUser)
 * - Reuses existing plan configuration (getPlanById)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getTeamForUser, getBusinessesByTeam } from '@/lib/db/queries';
import { getPlanById } from '@/lib/gemflush/plans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Lock, 
  CreditCard, 
  Building2, 
  Database, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Settings as SettingsIcon
} from 'lucide-react';
import { GemIcon, WikidataRubyIcon } from '@/components/ui/gem-icon';
import { db } from '@/lib/db/drizzle';
import { count, eq } from 'drizzle-orm';
import { businesses, wikidataEntities, llmFingerprints } from '@/lib/db/schema';

/**
 * Get KGaaS statistics for the team
 * DRY: Centralized stats query, reusable pattern
 * SOLID: Single Responsibility - only fetches stats data
 */
async function getTeamStats(teamId: number) {
  // Get business count
  const [businessCount] = await db
    .select({ count: count() })
    .from(businesses)
    .where(eq(businesses.teamId, teamId));

  // Get published entities count (using join for efficiency)
  // DRY: Reuses same pattern as other queries in codebase
  const allPublished = await db
    .select()
    .from(wikidataEntities)
    .leftJoin(businesses, eq(wikidataEntities.businessId, businesses.id))
    .where(eq(businesses.teamId, teamId));

  // Get fingerprint count (using join for efficiency)
  const allFingerprints = await db
    .select()
    .from(llmFingerprints)
    .leftJoin(businesses, eq(llmFingerprints.businessId, businesses.id))
    .where(eq(businesses.teamId, teamId));

  return {
    businesses: businessCount?.count || 0,
    published: allPublished.length,
    fingerprints: allFingerprints.length,
  };
}

interface SettingsSection {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
}

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/sign-in');
  }

  const planTier = team.planName || 'free';
  const plan = getPlanById(planTier);
  const stats = await getTeamStats(team.id);

  // SOLID: Single Responsibility - Each section is a separate concern
  const settingsSections: SettingsSection[] = [
    {
      title: 'General Settings',
      description: 'Update your account information, name, and email',
      href: '/dashboard/general',
      icon: User,
    },
    {
      title: 'Security',
      description: 'Change password and manage account security',
      href: '/dashboard/security',
      icon: Lock,
    },
    {
      title: 'Billing & Subscription',
      description: 'Manage your subscription, payment method, and plan',
      href: '/dashboard/settings/billing',
      icon: CreditCard,
      badge: planTier.toUpperCase(),
      badgeVariant: planTier === 'free' ? 'outline' : 'default',
    },
  ];

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Account Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Overview</CardTitle>
            <CardDescription>Your account information and current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Account</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.name || 'No name set'}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>

              {/* Plan Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {planTier === 'free' && <GemIcon size={16} variant="outline" />}
                  {planTier === 'pro' && <WikidataRubyIcon size={16} />}
                  {planTier === 'agency' && <Sparkles className="h-4 w-4" />}
                  <span>Plan</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{plan?.name || 'Free Plan'}</p>
                  <p className="text-sm text-gray-600">
                    ${plan?.price || 0}/month
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KGaaS Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Graph Activity</CardTitle>
            <CardDescription>Your Wikidata publishing and LLM fingerprinting statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Building2 className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.businesses}</p>
                  <p className="text-sm text-gray-600">Businesses</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                  <p className="text-sm text-gray-600">Published to Wikidata</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.fingerprints}</p>
                  <p className="text-sm text-gray-600">LLM Fingerprints</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Sections */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <Link key={section.href} href={section.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Icon className="h-5 w-5 text-gray-700" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                          </div>
                        </div>
                        {section.badge && (
                          <Badge variant={section.badgeVariant || 'default'}>
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4">
                        {section.description}
                      </CardDescription>
                      <div className="flex items-center text-sm text-gray-600">
                        <span>Manage</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Plan Features Summary */}
        {plan && (
          <Card>
            <CardHeader>
              <CardTitle>Current Plan Features</CardTitle>
              <CardDescription>What's included in your {plan.name} plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    Up to {plan.features.maxBusinesses} businesses
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    {plan.features.fingerprintFrequency} fingerprints
                  </span>
                </div>
                {plan.features.wikidataPublishing && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Wikidata publishing enabled
                    </span>
                  </div>
                )}
                {plan.features.historicalData && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Historical data access
                    </span>
                  </div>
                )}
                {plan.features.competitiveBenchmark && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Competitive benchmarking
                    </span>
                  </div>
                )}
                {plan.features.apiAccess && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      API access
                    </span>
                  </div>
                )}
              </div>
              {planTier === 'free' && (
                <div className="mt-6 pt-6 border-t">
                  <Link href="/pricing">
                    <Button className="w-full gem-gradient text-white">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

