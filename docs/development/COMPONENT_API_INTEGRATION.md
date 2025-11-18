# Component API Integration Guide

This document explains **when** and **how** components connect to backend APIs during the development process.

## Development Workflow: When API Integration Happens

### Phase 1: Component Creation (✅ Completed)
**Status:** Components are created as **presentational components**

The components we just created are **dumb/presentational components**:
- They accept props (data, callbacks, state)
- They display UI based on props
- They **do NOT** fetch data themselves
- They **do NOT** know about APIs

**Example:**
```tsx
// ✅ Presentational Component (what we created)
<BusinessListCard 
  business={business}  // Data passed as prop
/>
```

### Phase 2: API Integration (Current Phase)
**Status:** Connect components to APIs through hooks and pages

API integration happens at **three levels**:

1. **Custom Hooks** - Data fetching logic
2. **Page Components** - Orchestrate hooks + components
3. **Server Components** (Next.js) - Server-side data fetching

## Integration Patterns

### Pattern 1: Custom Hooks (Recommended)

**Location:** `lib/hooks/`

Create hooks that fetch data and return it to components:

```tsx
// lib/hooks/use-businesses.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBusinesses() {
  const { data, error, isLoading, mutate } = useSWR('/api/business', fetcher);
  
  return {
    businesses: data?.businesses || [],
    loading: isLoading,
    error,
    refresh: () => mutate(),
  };
}
```

**Usage in Page:**
```tsx
// app/(dashboard)/dashboard/businesses/page.tsx
'use client';

import { useBusinesses } from '@/lib/hooks/use-businesses';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { EmptyState } from '@/components/onboarding';

export default function BusinessesPage() {
  const { businesses, loading, error } = useBusinesses();

  if (loading) {
    return <BusinessListSkeleton count={3} />;
  }

  if (error) {
    return <ErrorCard message="Failed to load businesses" />;
  }

  if (businesses.length === 0) {
    return (
      <EmptyState
        title="No businesses yet"
        description="Get started by adding your first business"
        action={{ label: "Add Business", href: "/dashboard/businesses/new" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {businesses.map(business => (
        <BusinessListCard key={business.id} business={business} />
      ))}
    </div>
  );
}
```

### Pattern 2: Direct API Calls in Pages

For simple cases, call APIs directly in page components:

```tsx
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { WelcomeMessage } from '@/components/onboarding';
import { useUser } from '@/lib/hooks/use-user';
import { useTeam } from '@/lib/hooks/use-team';

export default function DashboardPage() {
  const { user } = useUser();
  const { team, planTier } = useTeam();
  const [businessCount, setBusinessCount] = useState(0);

  useEffect(() => {
    // Fetch business count
    fetch('/api/business')
      .then(res => res.json())
      .then(data => setBusinessCount(data.businesses?.length || 0))
      .catch(err => console.error('Failed to fetch businesses:', err));
  }, []);

  return (
    <div className="space-y-6">
      <WelcomeMessage
        userName={user?.email?.split('@')[0]}
        businessCount={businessCount}
      />
      {/* ... rest of dashboard */}
    </div>
  );
}
```

### Pattern 3: Server Components (Next.js 13+)

For server-side rendering, fetch data in Server Components:

```tsx
// app/(dashboard)/dashboard/businesses/page.tsx (Server Component)
import { getServerSession } from '@/lib/auth/session';
import { getBusinessesByTeamId } from '@/lib/db/queries';
import { BusinessListCard } from '@/components/business/business-list-card';
import { EmptyState } from '@/components/onboarding';

export default async function BusinessesPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/sign-in');
  }

  const businesses = await getBusinessesByTeamId(session.teamId);

  if (businesses.length === 0) {
    return (
      <EmptyState
        title="No businesses yet"
        description="Get started by adding your first business"
        action={{ label: "Add Business", href: "/dashboard/businesses/new" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {businesses.map(business => (
        <BusinessListCard key={business.id} business={business} />
      ))}
    </div>
  );
}
```

## Existing Integration Examples

### Example 1: Dashboard Layout (Already Integrated)

**File:** `app/(dashboard)/dashboard/layout.tsx`

```tsx
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardLayout({ children }) {
  const { data: team } = useSWR('/api/team', fetcher);
  const planTier = team?.planName || 'free';
  
  // Uses team data for navigation
  return (
    <div>
      {/* Sidebar with plan badge */}
      {planTier === 'free' && <UpgradeCTA />}
      {children}
    </div>
  );
}
```

### Example 2: Business Detail Page (Already Integrated)

**File:** `app/(dashboard)/dashboard/businesses/[id]/page.tsx`

```tsx
'use client';

import { useBusinessDetail } from '@/lib/hooks/use-business-detail';
import { GemOverviewCard } from '@/components/business/gem-overview-card';
import { VisibilityIntelCard } from '@/components/fingerprint/visibility-intel-card';
import { EntityPreviewCard } from '@/components/wikidata/entity-preview-card';
import { LoadingSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';

export default function BusinessDetailPage({ params }) {
  const { business, fingerprint, entity, loading, error } = useBusinessDetail(params.id);

  if (loading) {
    return <BusinessDetailSkeleton />;
  }

  if (error) {
    return <ErrorCard message={error} />;
  }

  return (
    <div>
      <GemOverviewCard business={business} />
      <VisibilityIntelCard fingerprint={fingerprint} />
      <EntityPreviewCard entity={entity} />
    </div>
  );
}
```

## Integration Checklist

### For Each Component Integration:

1. **Create/Use Hook** (if needed)
   ```tsx
   // lib/hooks/use-[resource].ts
   export function use[Resource]() {
     const { data, error, isLoading } = useSWR('/api/[resource]', fetcher);
     return { data, error, loading: isLoading };
   }
   ```

2. **Use Hook in Page**
   ```tsx
   // app/(dashboard)/[page]/page.tsx
   const { data, error, loading } = use[Resource]();
   ```

3. **Pass Data to Components**
   ```tsx
   <YourComponent 
     data={data}
     loading={loading}
     error={error}
   />
   ```

4. **Handle Loading/Error States**
   ```tsx
   if (loading) return <LoadingSkeleton />;
   if (error) return <ErrorCard message={error} />;
   if (!data) return <EmptyState />;
   ```

## Action-Based Components

For components that **trigger actions** (like forms, buttons):

### Pattern: Callback Props

```tsx
// Component accepts callback
<UrlOnlyForm
  onSubmit={async (url) => {
    // API call happens in page/hook
    const response = await fetch('/api/business', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    router.push(`/dashboard/businesses/${data.business.id}`);
  }}
  loading={isSubmitting}
  error={submitError}
/>
```

### Pattern: Custom Hook for Actions

```tsx
// lib/hooks/use-create-business.ts
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
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        throw new Error('Failed to create business');
      }
      const data = await response.json();
      router.push(`/dashboard/businesses/${data.business.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { createBusiness, loading, error };
}

// Usage in page
const { createBusiness, loading, error } = useCreateBusiness();

<UrlOnlyForm
  onSubmit={createBusiness}
  loading={loading}
  error={error}
/>
```

## Integration Timeline

### ✅ Phase 1: Component Creation (Done)
- Created presentational components
- Components accept props
- No API integration yet

### 🔄 Phase 2: API Integration (Current)
- Create/use custom hooks
- Connect hooks to pages
- Pass data to components
- Handle loading/error states

### 📋 Phase 3: Testing
- Test API integration
- Test error handling
- Test loading states
- E2E testing

## Best Practices

### 1. Separation of Concerns
- **Components** = Presentation (UI only)
- **Hooks** = Data fetching logic
- **Pages** = Orchestration

### 2. Error Handling
Always handle errors at the page level:
```tsx
const { data, error } = useBusinesses();

if (error) {
  return <ErrorCard message={error.message} onRetry={refresh} />;
}
```

### 3. Loading States
Always show loading states:
```tsx
if (loading) {
  return <BusinessListSkeleton count={3} />;
}
```

### 4. Empty States
Handle empty data:
```tsx
if (data.length === 0) {
  return <EmptyState title="No data" />;
}
```

### 5. Type Safety
Use TypeScript for all hooks and components:
```tsx
interface UseBusinessesReturn {
  businesses: Business[];
  loading: boolean;
  error: Error | null;
}
```

## Example: Complete Integration

Here's a complete example integrating multiple components:

```tsx
// app/(dashboard)/dashboard/businesses/page.tsx
'use client';

import { useBusinesses } from '@/lib/hooks/use-businesses';
import { useTeam } from '@/lib/hooks/use-team';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { EmptyState } from '@/components/onboarding';
import { ErrorCard } from '@/components/error';
import { BusinessLimitDisplay } from '@/components/subscription/business-limit-display';
import { TierBadge } from '@/components/subscription/tier-badge';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Businesses</h1>
        <TierBadge tier={planTier} />
      </div>

      {/* Business Limit */}
      <BusinessLimitDisplay
        currentCount={businesses.length}
        maxCount={maxBusinesses}
        tier={planTier}
      />

      {/* Business List */}
      {businesses.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          description="Get started by adding your first business"
          action={{
            label: "Add Business",
            href: "/dashboard/businesses/new"
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map(business => (
            <BusinessListCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Summary

**When do components connect to APIs?**

1. **After component creation** - Components are created first as presentational
2. **During page development** - Pages use hooks to fetch data
3. **Through custom hooks** - Hooks encapsulate API logic
4. **Via callback props** - Action components receive callbacks from pages

**Key Principle:** Components are **dumb** (presentational), pages/hooks are **smart** (data fetching).

This separation makes components:
- ✅ Reusable
- ✅ Testable
- ✅ Maintainable
- ✅ Easy to mock for testing

