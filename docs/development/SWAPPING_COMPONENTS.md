# Swapping Components: Migration Guide

This guide shows how to replace existing inline components in `app/` with the new reusable components using hooks.

## Overview

**Current State:**
- Pages use server components with direct database queries
- Inline components mixed with page logic
- No loading/error states

**Target State:**
- Pages use client components with hooks
- Reusable components from `@/components/`
- Proper loading/error/empty states

## Migration Pattern

### Pattern: Server Component → Client Component with Hook

```tsx
// BEFORE: Server Component
export default async function Page() {
  const data = await getDataFromDB();
  return <div>{/* inline JSX */}</div>;
}

// AFTER: Client Component with Hook
'use client';

import { useData } from '@/lib/hooks/use-data';

export default function Page() {
  const { data, loading, error } = useData();
  
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return <EmptyState />;
  
  return <YourComponent data={data} />;
}
```

## Step-by-Step Migrations

### 1. Dashboard Page (`app/(dashboard)/dashboard/page.tsx`)

#### BEFORE (Current):
```tsx
export default async function DashboardPage() {
  const stats = await getDashboardDTO(team.id);
  
  if (!hasBusinesses) {
    return (
      <section>
        <div className="text-center">
          <h1>Welcome to GEMflush!</h1>
          {/* Inline empty state */}
        </div>
      </section>
    );
  }
  
  return (
    <section>
      {/* Inline business cards */}
    </section>
  );
}
```

#### AFTER (With New Components):
```tsx
'use client';

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { useUser } from '@/lib/hooks/use-user';
import { useTeam } from '@/lib/hooks/use-team';
import { WelcomeMessage } from '@/components/onboarding';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { EmptyState } from '@/components/onboarding';
import { ErrorCard } from '@/components/error';
import { TierBadge } from '@/components/subscription/tier-badge';
import { BusinessLimitDisplay } from '@/components/subscription/business-limit-display';

export default function DashboardPage() {
  const { user } = useUser();
  const { planTier, maxBusinesses } = useTeam();
  const { stats, loading, error } = useDashboard();

  if (loading) {
    return <BusinessListSkeleton count={3} />;
  }

  if (error) {
    return <ErrorCard message={error.message} />;
  }

  // Empty state for new users
  if (stats.totalBusinesses === 0) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <WelcomeMessage
            userName={user?.email?.split('@')[0]}
            businessCount={0}
          />
          {/* Rest of onboarding content */}
        </div>
      </section>
    );
  }

  // Main dashboard
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

      {/* Business Limit Display */}
      <BusinessLimitDisplay
        currentCount={stats.totalBusinesses}
        maxCount={maxBusinesses}
        tier={planTier}
        className="mb-6"
      />

      {/* Businesses Grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Businesses</h2>
        <TierBadge tier={planTier} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {stats.businesses.map((business) => (
          <BusinessListCard key={business.id} business={business} />
        ))}
      </div>
    </section>
  );
}
```

**Create Hook:**
```tsx
// lib/hooks/use-dashboard.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboard() {
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher);
  
  return {
    stats: data || {
      totalBusinesses: 0,
      businesses: [],
      wikidataEntities: 0,
      avgVisibilityScore: null,
    },
    loading: isLoading,
    error,
  };
}
```

**Create API Route:**
```tsx
// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

export async function GET() {
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
}
```

---

### 2. Businesses List Page (`app/(dashboard)/dashboard/businesses/page.tsx`)

#### BEFORE (Current):
```tsx
export default async function BusinessesPage() {
  const businesses = await getBusinessesByTeam(team.id);
  
  return (
    <div>
      {businesses.length === 0 ? (
        <Card>
          <CardTitle>No businesses yet</CardTitle>
          {/* Inline empty state */}
        </Card>
      ) : (
        <div className="grid gap-4">
          {businesses.map((business) => (
            <Card key={business.id}>
              {/* Inline business card */}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### AFTER (With New Components):
```tsx
'use client';

import { useBusinesses } from '@/lib/hooks/use-businesses';
import { useTeam } from '@/lib/hooks/use-team';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { EmptyState } from '@/components/onboarding';
import { ErrorCard } from '@/components/error';
import { BusinessLimitDisplay } from '@/components/subscription/business-limit-display';
import { TierBadge } from '@/components/subscription/tier-badge';
import { BusinessLimitError } from '@/components/error/business-limit-error';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function BusinessesPage() {
  const { businesses, loading, error, refresh } = useBusinesses();
  const { planTier, maxBusinesses } = useTeam();

  if (loading) {
    return <BusinessListSkeleton count={3} />;
  }

  if (error) {
    return (
      <ErrorCard
        message="Failed to load businesses"
        onRetry={refresh}
        backHref="/dashboard"
      />
    );
  }

  const canAddMore = businesses.length < maxBusinesses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">
            Manage your businesses and track their LLM visibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TierBadge tier={planTier} />
          {canAddMore ? (
            <Link href="/dashboard/businesses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Business
              </Button>
            </Link>
          ) : (
            <Button disabled>
              Limit Reached ({businesses.length}/{maxBusinesses})
            </Button>
          )}
        </div>
      </div>

      {/* Business Limit Display */}
      <BusinessLimitDisplay
        currentCount={businesses.length}
        maxCount={maxBusinesses}
        tier={planTier}
      />

      {/* Business List */}
      {businesses.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          description="Get started by adding your first business to track its visibility across AI systems"
          action={{
            label: "Add Your First Business",
            href: "/dashboard/businesses/new"
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessListCard key={business.id} business={business} />
          ))}
        </div>
      )}

      {/* Business Limit Error */}
      {!canAddMore && (
        <BusinessLimitError
          currentCount={businesses.length}
          maxCount={maxBusinesses}
          tier={planTier}
        />
      )}
    </div>
  );
}
```

**Create Hook:**
```tsx
// lib/hooks/use-businesses.ts
import useSWR from 'swr';
import { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBusinesses() {
  const { data, error, isLoading } = useSWR('/api/business', fetcher);
  
  return {
    businesses: data?.businesses || [],
    maxBusinesses: data?.maxBusinesses || 1,
    loading: isLoading,
    error: error ? new Error(error.message || 'Failed to load businesses') : null,
    refresh: () => mutate('/api/business'),
  };
}
```

---

### 3. Business Creation Page (`app/(dashboard)/dashboard/businesses/new/page.tsx`)

#### BEFORE (Current):
```tsx
export default async function NewBusinessPage() {
  return (
    <form>
      {/* Inline form */}
    </form>
  );
}
```

#### AFTER (With New Components):
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UrlOnlyForm } from '@/components/onboarding/url-only-form';
import { SuccessMessage } from '@/components/feedback/success-message';
import { ErrorCard } from '@/components/error/error-card';
import { BackButton } from '@/components/navigation/back-button';
import { useCreateBusiness } from '@/lib/hooks/use-create-business';

export default function NewBusinessPage() {
  const router = useRouter();
  const { createBusiness, loading, error } = useCreateBusiness();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (url: string) => {
    try {
      await createBusiness(url);
      setSuccess(true);
      // Redirect happens in hook
    } catch (err) {
      // Error handled by hook
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <BackButton href="/dashboard/businesses" />
        <SuccessMessage
          title="Business Created!"
          message="Your business has been added successfully. We're now crawling your website."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton href="/dashboard/businesses" />
      
      {error && (
        <ErrorCard
          message={error}
          onRetry={() => {/* clear error */}}
        />
      )}

      <UrlOnlyForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
}
```

**Create Hook:**
```tsx
// lib/hooks/use-create-business.ts
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function useCreateBusiness() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createBusiness = async (url: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create business');
      }

      const data = await response.json();
      router.push(`/dashboard/businesses/${data.business.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBusiness, loading, error };
}
```

---

### 4. Business Detail Page (`app/(dashboard)/dashboard/businesses/[id]/page.tsx`)

#### BEFORE (Current):
```tsx
export default function BusinessDetailPage() {
  const { business, loading, error } = useBusinessDetail(businessId);
  
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div>
      {/* Inline components */}
    </div>
  );
}
```

#### AFTER (With New Components):
```tsx
'use client';

import { useParams } from 'next/navigation';
import { useBusinessDetail } from '@/lib/hooks/use-business-detail';
import { BackButton } from '@/components/navigation/back-button';
import { BusinessDetailSkeleton } from '@/components/loading/loading-skeleton';
import { ErrorCard } from '@/components/error/error-card';
import { BusinessStatusIndicator } from '@/components/business/business-status-indicator';
import { ActionButton } from '@/components/loading/action-button';
import { StatusBadge } from '@/components/loading/status-badge';
import { GemOverviewCard } from '@/components/business/gem-overview-card';
import { VisibilityIntelCard } from '@/components/fingerprint/visibility-intel-card';
import { EntityPreviewCard } from '@/components/wikidata/entity-preview-card';

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = parseInt(params.id as string);
  const { business, fingerprint, entity, loading, error, refresh } = useBusinessDetail(businessId);
  const [crawling, setCrawling] = useState(false);
  const [fingerprinting, setFingerprinting] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <BackButton />
        <BusinessDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BackButton />
        <ErrorCard
          message={error}
          onRetry={refresh}
          backHref="/dashboard/businesses"
        />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="space-y-6">
        <BackButton />
        <ErrorCard
          message="Business not found"
          backHref="/dashboard/businesses"
        />
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

  return (
    <div className="space-y-6">
      <BackButton href="/dashboard/businesses" />
      
      {/* Status Indicator */}
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

      {/* Business Overview */}
      <GemOverviewCard
        business={business}
        onCrawl={handleCrawl}
        crawling={crawling}
      />

      {/* Visibility Intel */}
      <VisibilityIntelCard
        fingerprint={fingerprint}
        loading={fingerprinting}
        onAnalyze={async () => {
          setFingerprinting(true);
          try {
            await fetch('/api/fingerprint', {
              method: 'POST',
              body: JSON.stringify({ businessId }),
            });
            setTimeout(() => refresh(), 2000);
          } finally {
            setFingerprinting(false);
          }
        }}
      />

      {/* Entity Preview */}
      {entity && (
        <EntityPreviewCard
          entity={entity}
          businessId={businessId}
        />
      )}
    </div>
  );
}
```

---

## Complete Hook Examples

### useBusinesses Hook
```tsx
// lib/hooks/use-businesses.ts
import useSWR from 'swr';
import { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
});

export interface Business {
  id: number;
  name: string;
  url: string;
  status: string;
  location?: {
    city: string;
    state: string;
    country: string;
  } | null;
  wikidataQID?: string | null;
  createdAt: Date | string;
}

export function useBusinesses() {
  const { data, error, isLoading, mutate } = useSWR<{
    businesses: Business[];
    maxBusinesses: number;
  }>('/api/business', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    businesses: data?.businesses || [],
    maxBusinesses: data?.maxBusinesses || 1,
    loading: isLoading,
    error: error ? new Error(error.message || 'Failed to load businesses') : null,
    refresh: () => mutate(),
  };
}
```

### useDashboard Hook
```tsx
// lib/hooks/use-dashboard.ts
import useSWR from 'swr';
import type { DashboardDTO } from '@/lib/data/types';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
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

## Migration Checklist

For each page:

- [ ] Convert from `async function` to `'use client'` component
- [ ] Create or use existing hook for data fetching
- [ ] Replace inline loading states with `<LoadingSkeleton />`
- [ ] Replace inline error states with `<ErrorCard />`
- [ ] Replace inline empty states with `<EmptyState />`
- [ ] Replace inline business cards with `<BusinessListCard />`
- [ ] Replace inline status badges with `<StatusBadge />`
- [ ] Replace inline buttons with `<ActionButton />`
- [ ] Add `<BackButton />` for navigation
- [ ] Add `<BusinessLimitDisplay />` where appropriate
- [ ] Add `<TierBadge />` for subscription display
- [ ] Test loading states
- [ ] Test error states
- [ ] Test empty states
- [ ] Test data refresh

## Benefits of Migration

1. **Consistency** - All pages use same components
2. **Maintainability** - Update once, applies everywhere
3. **Better UX** - Proper loading/error/empty states
4. **Type Safety** - Full TypeScript support
5. **Testability** - Components can be tested independently
6. **Reusability** - Components work across pages

## Quick Reference

| Old Pattern | New Component |
|------------|--------------|
| Inline empty state | `<EmptyState />` |
| Inline loading | `<LoadingSkeleton />` |
| Inline error | `<ErrorCard />` |
| Inline business card | `<BusinessListCard />` |
| Inline status badge | `<StatusBadge />` |
| Inline button with loading | `<ActionButton />` |
| Manual back link | `<BackButton />` |
| Inline limit display | `<BusinessLimitDisplay />` |
| Inline tier badge | `<TierBadge />` |

---

*For component API, see `components/README.md`*

