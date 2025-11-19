# Complete Component Migration Plan

This document provides a comprehensive plan to swap all existing components with the new reusable components while maintaining the exact structure of `app/`.

## Migration Strategy

### Principles
1. **Maintain Structure** - Keep all routes and file locations identical
2. **Server → Client** - Convert server components to client components with hooks
3. **Incremental** - Migrate one page at a time, test, then continue
4. **Backward Compatible** - Ensure API routes continue to work

## Directory Structure (Maintained)

```
app/
├── (dashboard)/
│   ├── layout.tsx                    # Keep as-is (server component)
│   ├── page.tsx                      # Landing page - keep as-is
│   ├── error.tsx                     # Keep as-is
│   ├── dashboard/
│   │   ├── layout.tsx                # Keep as-is (uses hooks)
│   │   ├── page.tsx                  # ⚠️ MIGRATE
│   │   ├── businesses/
│   │   │   ├── page.tsx              # ✅ DONE
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # ✅ DONE
│   │   │   └── [id]/
│   │   │       └── page.tsx          # ⚠️ MIGRATE
│   │   ├── settings/
│   │   │   └── page.tsx              # ⚠️ REVIEW
│   │   └── activity/
│   │       └── page.tsx              # ⚠️ REVIEW
│   └── pricing/
│       └── page.tsx                  # ⚠️ PARTIAL MIGRATION
└── api/                              # Keep as-is
```

## Required Hooks

### Already Created ✅
- `useBusinesses()` - Business list
- `useCreateBusiness()` - Business creation
- `useBusinessDetail()` - Business detail
- `useTeam()` - Team/subscription data
- `useUser()` - User data

### Need to Create ⚠️
- `useDashboard()` - Dashboard stats
- `useActivity()` - Activity feed (if needed)

## Migration Steps by Page

### 1. Dashboard Page (`app/(dashboard)/dashboard/page.tsx`)

**Current:** Server component with inline JSX  
**Target:** Client component with hooks and new components

#### Step 1: Create Dashboard Hook

```tsx
// lib/hooks/use-dashboard.ts
import useSWR from 'swr';
import type { DashboardDTO } from '@/lib/data/types';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  return res.json();
});

export function useDashboard() {
  const { data, error, isLoading } = useSWR<DashboardDTO>('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    stats: data || {
      totalBusinesses: 0,
      businesses: [],
      wikidataEntities: 0,
      avgVisibilityScore: null,
    },
    loading: isLoading,
    error: error ? new Error(error.message || 'Failed to load dashboard') : null,
  };
}
```

#### Step 2: Create Dashboard API Route

```tsx
// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    const stats = await getDashboardDTO(team.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Migrate Dashboard Page

```tsx
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { useUser } from '@/lib/hooks/use-user';
import { useTeam } from '@/lib/hooks/use-team';
import { WelcomeMessage } from '@/components/onboarding';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';
import { BusinessLimitDisplay } from '@/components/subscription/business-limit-display';
import { TierBadge } from '@/components/subscription/tier-badge';
import { UpgradeCTA } from '@/components/subscription/upgrade-cta';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Building2, Sparkles, CheckCircle, TrendingUp, WikidataRubyIcon, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useUser();
  const { planTier, maxBusinesses, isPro } = useTeam();
  const { stats, loading, error } = useDashboard();

  if (loading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <BusinessListSkeleton count={3} />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorCard message={error.message} />
        </div>
      </section>
    );
  }

  const hasBusinesses = stats.totalBusinesses > 0;

  // Empty state for new users
  if (!hasBusinesses) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <WelcomeMessage
            userName={user?.email?.split('@')[0]}
            businessCount={0}
          />

          {/* Getting Started Checklist - Keep existing design */}
          <Card className="gem-card mb-8">
            {/* ... existing checklist JSX ... */}
          </Card>

          {/* Feature Cards - Keep existing design */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* ... existing feature cards ... */}
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

      {/* Quick Stats - Keep existing design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* ... existing stats cards ... */}
      </div>

      {/* Value Explanation Banner - Keep existing design */}
      <Card className="mb-6 bg-gradient-to-r from-primary/5 to-purple-50 border-primary/20">
        {/* ... existing banner content ... */}
      </Card>

      {/* Business Limit Display - NEW */}
      <BusinessLimitDisplay
        currentCount={stats.totalBusinesses}
        maxCount={maxBusinesses}
        tier={planTier}
        className="mb-6"
      />

      {/* Businesses Grid - Use new component */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Businesses</h2>
        <div className="flex items-center gap-3">
          <TierBadge tier={planTier} />
          <Link href="/dashboard/businesses/new">
            <Button className="gem-gradient text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Business
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {stats.businesses.map((business) => (
          <BusinessListCard
            key={business.id}
            business={{
              id: business.id,
              name: business.name,
              url: business.url || '',
              status: business.status || 'pending',
              location: business.location ? {
                city: business.location.city || '',
                state: business.location.state || '',
                country: business.location.country || 'US',
              } : null,
              wikidataQID: business.wikidataQid || null,
              createdAt: business.createdAt || new Date(),
            }}
          />
        ))}
      </div>

      {/* Upgrade CTA - Use new component */}
      {!isPro && (
        <UpgradeCTA feature="wikidata" variant="card" />
      )}
    </section>
  );
}
```

---

### 2. Business Detail Page (`app/(dashboard)/dashboard/businesses/[id]/page.tsx`)

**Current:** Client component with inline loading/error states  
**Target:** Use new components for loading/error/navigation

#### Migration:

```tsx
// app/(dashboard)/dashboard/businesses/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useBusinessDetail } from '@/lib/hooks/use-business-detail';
import { useTeam } from '@/lib/hooks/use-team';
import { BackButton } from '@/components/navigation/back-button';
import { BusinessDetailSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';
import { BusinessStatusIndicator } from '@/components/business/business-status-indicator';
import { ActionButton } from '@/components/loading/action-button';
import { GemOverviewCard } from '@/components/business/gem-overview-card';
import { VisibilityIntelCard } from '@/components/fingerprint/visibility-intel-card';
import { CompetitiveEdgeCard } from '@/components/competitive/competitive-edge-card';
import { EntityPreviewCard } from '@/components/wikidata/entity-preview-card';
import { JsonPreviewModal } from '@/components/wikidata/json-preview-modal';
import { PublishingOnboarding } from '@/components/subscription/publishing-onboarding';
import { FeatureGate } from '@/components/subscription/feature-gate';
import { UpgradeCTA } from '@/components/subscription/upgrade-cta';
import { Globe, Sparkles } from 'lucide-react';

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = parseInt(params.id as string);
  const { canPublish } = useTeam();
  const {
    business,
    fingerprint,
    entity,
    loading,
    error,
    refresh,
  } = useBusinessDetail(businessId);

  const [crawling, setCrawling] = useState(false);
  const [fingerprinting, setFingerprinting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false);

  // Loading state - Use new component
  if (loading) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackButton href="/dashboard/businesses" />
          <BusinessDetailSkeleton />
        </div>
      </div>
    );
  }

  // Error state - Use new component
  if (error) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackButton href="/dashboard/businesses" />
          <ErrorCard
            message={error}
            onRetry={refresh}
            backHref="/dashboard/businesses"
          />
        </div>
      </div>
    );
  }

  // Not found state - Use new component
  if (!business) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackButton href="/dashboard/businesses" />
          <ErrorCard
            title="Business Not Found"
            message="The business you're looking for doesn't exist or you don't have access to it."
            backHref="/dashboard/businesses"
          />
        </div>
      </div>
    );
  }

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      if (response.ok) {
        setTimeout(() => refresh(), 3000);
      }
    } finally {
      setCrawling(false);
    }
  };

  const handleAnalyze = async () => {
    setFingerprinting(true);
    try {
      const response = await fetch('/api/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      if (response.ok) {
        setTimeout(() => refresh(), 2000);
      }
    } finally {
      setFingerprinting(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/wikidata/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, publishToProduction: false }),
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Published successfully! QID: ${result.qid}`);
        setTimeout(() => refresh(), 1000);
      }
    } finally {
      setPublishing(false);
    }
  };

  const hasCrawlData = business.status === 'crawled' || business.status === 'published';
  const hasFingerprint = fingerprint !== null;
  const isPublished = business.wikidataQID !== null;

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation - Use new component */}
        <BackButton href="/dashboard/businesses" />

        {/* Status Indicator - NEW */}
        <BusinessStatusIndicator
          status={business.status}
          progress={
            business.status === 'crawling'
              ? {
                  label: 'Crawling Website',
                  percentage: 50,
                  message: 'Extracting business data...',
                }
              : undefined
          }
        />

        {/* Publishing Onboarding Journey */}
        {!isPublished && (
          <PublishingOnboarding
            businessId={businessId}
            hasCrawlData={hasCrawlData}
            hasFingerprint={hasFingerprint}
            isPublished={isPublished}
          />
        )}

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GemOverviewCard
            business={business}
            onCrawl={handleCrawl}
            crawling={crawling}
          />
          <VisibilityIntelCard
            fingerprint={fingerprint}
            loading={fingerprinting}
            onAnalyze={handleAnalyze}
            isPublished={isPublished}
          />
          <CompetitiveEdgeCard
            leaderboard={fingerprint?.competitiveLeaderboard || null}
            businessId={businessId}
            businessName={business.name}
          />
        </div>

        {/* Wikidata Entity Section */}
        {entity ? (
          <FeatureGate
            feature="wikidata"
            fallback={
              <div className="space-y-4">
                <UpgradeCTA feature="wikidata" variant="banner" />
                <div className="opacity-50 pointer-events-none">
                  <EntityPreviewCard
                    entity={entity}
                    onPublish={handlePublish}
                    onPreview={() => setJsonPreviewOpen(true)}
                    publishing={publishing}
                  />
                </div>
              </div>
            }
          >
            <EntityPreviewCard
              entity={entity}
              onPublish={handlePublish}
              onPreview={() => setJsonPreviewOpen(true)}
              publishing={publishing}
            />
          </FeatureGate>
        ) : (
          !hasCrawlData && <UpgradeCTA feature="wikidata" />
        )}

        {/* JSON Preview Modal */}
        {entity && (
          <JsonPreviewModal
            open={jsonPreviewOpen}
            onOpenChange={setJsonPreviewOpen}
            entity={entity}
          />
        )}
      </div>
    </div>
  );
}
```

---

### 3. Pricing Page (`app/(dashboard)/pricing/page.tsx`)

**Current:** Server component with inline pricing cards  
**Target:** Keep server component, add new components where appropriate

#### Migration:

```tsx
// app/(dashboard)/pricing/page.tsx
import { checkoutAction } from '@/lib/payments/actions';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';
import { TierBadge } from '@/components/subscription/tier-badge';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { Check, X, Sparkles, Users } from 'lucide-react';
import { GemIcon, WikidataRubyIcon } from '@/components/ui/gem-icon';

export const revalidate = 3600;

export default async function PricingPage() {
  const user = await getUser();
  const team = await getTeamForUser();
  
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  // ... existing product matching logic ...

  const currentPlan = team?.planName || 'free';
  const isPro = currentPlan === 'pro' || currentPlan === 'agency';
  const hasPrices = proPrice || agencyPrice;
  const missingPrices = !hasPrices && process.env.NODE_ENV === 'development';

  return (
    <main className="py-12">
      {/* Current Plan Banner - Use TierBadge */}
      {isPro && user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="gem-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-semibold">
                  {currentPlan === 'pro' ? 'Pro Plan' : 'Agency Plan'}
                </p>
                <TierBadge tier={currentPlan as 'pro' | 'agency'} />
              </div>
            </div>
            <Link href="/dashboard/settings/billing">
              <Button variant="outline">Manage Subscription</Button>
            </Link>
          </div>
        </section>
      )}

      {/* Header - Keep as-is */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
        {/* ... existing header ... */}
      </section>

      {/* Pricing Cards - Keep structure, enhance with TierBadge */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className={`border-2 rounded-lg p-8 bg-white hover:shadow-lg transition-shadow ${
            currentPlan === 'free' ? 'border-primary' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GemIcon size={24} variant="outline" />
                <h2 className="text-2xl font-bold text-gray-900">Free</h2>
              </div>
              {currentPlan === 'free' && (
                <TierBadge tier="free" />
              )}
            </div>
            {/* ... rest of free tier ... */}
          </div>

          {/* Pro Tier */}
          <div className={`border-2 rounded-lg p-8 bg-white relative hover:shadow-xl transition-shadow gem-card ${
            currentPlan === 'pro' ? 'border-primary ring-2 ring-primary/20' : 'border-primary'
          }`}>
            {/* ... existing pro tier content ... */}
            {currentPlan === 'pro' && (
              <TierBadge tier="pro" />
            )}
          </div>

          {/* Agency Tier */}
          <div className={`border-2 rounded-lg p-8 bg-white hover:shadow-lg transition-shadow ${
            currentPlan === 'agency' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
          }`}>
            {/* ... existing agency tier content ... */}
            {currentPlan === 'agency' && (
              <TierBadge tier="agency" />
            )}
          </div>
        </div>
      </section>

      {/* FAQ and Bottom CTA - Keep as-is */}
      {/* ... */}
    </main>
  );
}
```

---

### 4. Activity Page (`app/(dashboard)/dashboard/activity/page.tsx`)

**Review:** Check if needs migration or can stay as-is

---

### 5. Settings Pages (`app/(dashboard)/dashboard/settings/*`)

**Review:** Check if needs migration or can stay as-is

---

## API Routes to Create

### 1. Dashboard API Route

```tsx
// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    const stats = await getDashboardDTO(team.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Migration Checklist

### Phase 1: Hooks & API Routes ✅
- [x] `useBusinesses()` - Created
- [x] `useCreateBusiness()` - Created
- [ ] `useDashboard()` - Create
- [ ] `/api/dashboard` - Create

### Phase 2: Core Pages
- [x] `dashboard/businesses/page.tsx` - ✅ Done
- [x] `dashboard/businesses/new/page.tsx` - ✅ Done
- [ ] `dashboard/page.tsx` - Migrate
- [ ] `dashboard/businesses/[id]/page.tsx` - Migrate

### Phase 3: Supporting Pages
- [ ] `pricing/page.tsx` - Partial migration
- [ ] `dashboard/activity/page.tsx` - Review
- [ ] `dashboard/settings/page.tsx` - Review

### Phase 4: Testing
- [ ] Test all migrated pages
- [ ] Test loading states
- [ ] Test error states
- [ ] Test empty states
- [ ] E2E test complete flows

---

## Component Mapping

| Current Pattern | New Component | Location |
|----------------|---------------|----------|
| Inline empty state | `<EmptyState />` | `dashboard/page.tsx` |
| Inline loading | `<BusinessListSkeleton />` | All pages |
| Inline error | `<ErrorCard />` | All pages |
| Inline business card | `<BusinessListCard />` | `dashboard/page.tsx` |
| Manual back button | `<BackButton />` | `businesses/[id]/page.tsx` |
| Inline status badge | `<StatusBadge />` | `businesses/[id]/page.tsx` |
| Inline action button | `<ActionButton />` | `businesses/[id]/page.tsx` |
| Inline limit display | `<BusinessLimitDisplay />` | `dashboard/page.tsx` |
| Inline tier badge | `<TierBadge />` | `pricing/page.tsx` |

---

## Testing Strategy

### After Each Migration:
1. **Manual Testing**
   - Load page
   - Test loading state
   - Test error state (simulate API error)
   - Test empty state
   - Test data display

2. **E2E Testing**
   - Run existing E2E tests
   - Verify no regressions

3. **Visual Testing**
   - Compare before/after screenshots
   - Verify gem-themed styling

---

## Rollback Plan

If issues arise:
1. Keep old files as `.backup` during migration
2. Git commit after each successful migration
3. Can revert individual pages if needed

---

*This plan maintains the exact structure of `app/` while upgrading to reusable components.*

