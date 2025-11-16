/**
 * Billing Settings Page
 * SOLID: Single Responsibility - only handles billing/subscription management
 * DRY: Uses existing payment actions and hooks
 */

import { redirect } from 'next/navigation';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { customerPortalAction } from '@/lib/payments/actions';
import { getPlanById } from '@/lib/gemflush/plans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Sparkles, ExternalLink } from 'lucide-react';
import { WikidataRubyIcon, GemIcon } from '@/components/ui/gem-icon';
import Link from 'next/link';
import { ManageSubscriptionForm } from '@/components/subscription/manage-subscription-form';

export default async function BillingPage() {
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
  const isPro = planTier === 'pro' || planTier === 'agency';

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and billing information</p>
        </div>

        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription plan and features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {planTier === 'free' && <GemIcon size={32} variant="outline" />}
                {planTier === 'pro' && <WikidataRubyIcon size={32} />}
                {planTier === 'agency' && <Users className="h-8 w-8 text-primary" />}
                <div>
                  <h3 className="text-xl font-semibold">{plan?.name || 'Free Plan'}</h3>
                  <p className="text-sm text-gray-600">
                    ${plan?.price || 0}/month
                  </p>
                </div>
              </div>
              <Badge variant={planTier === 'free' ? 'outline' : 'default'}>
                {planTier.toUpperCase()}
              </Badge>
            </div>

            {/* Plan Features */}
            {plan && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Plan Features</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Up to {plan.features.maxBusinesses} businesses</li>
                  <li>• {plan.features.fingerprintFrequency} fingerprints</li>
                  {plan.features.wikidataPublishing && (
                    <li>• Wikidata publishing enabled</li>
                  )}
                  {plan.features.historicalData && (
                    <li>• Historical data access</li>
                  )}
                  {plan.features.apiAccess && (
                    <li>• API access</li>
                  )}
                </ul>
              </div>
            )}

            {/* Upgrade CTA for Free Users */}
            {planTier === 'free' && (
              <div className="pt-4 border-t">
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

        {/* Subscription Management */}
        {isPro && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Subscription</CardTitle>
              <CardDescription>
                Update your payment method, view invoices, or cancel your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManageSubscriptionForm team={team} />
            </CardContent>
          </Card>
        )}

        {/* Upgrade Options */}
        {planTier !== 'agency' && (
          <Card>
            <CardHeader>
              <CardTitle>Upgrade Options</CardTitle>
              <CardDescription>
                Unlock more features with a higher tier plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/pricing">
                <Button variant="outline" className="w-full">
                  View All Plans
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

