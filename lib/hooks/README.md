# React Hooks Module (`lib/hooks/`)

**Purpose**: Custom React hooks for frontend data fetching and state management  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `hooks/` module provides custom React hooks that encapsulate data fetching logic, polling, and state management for the frontend. All hooks use SWR for data fetching with automatic caching and revalidation.

### Architecture Principles

1. **SWR Integration**: All data fetching uses SWR for caching and revalidation
2. **Type Safety**: Full TypeScript coverage
3. **Reusability**: Hooks can be used across multiple components
4. **Error Handling**: Consistent error handling patterns
5. **Polling Support**: Automatic polling for real-time updates

---

## 🏗️ Module Structure

```
lib/hooks/
├── use-dashboard.ts          # Dashboard data fetching
├── use-businesses.ts         # Business list fetching
├── use-business-detail.ts    # Single business detail fetching
├── use-competitive-data.ts   # Competitive analysis data
├── use-create-business.ts   # Business creation hook
├── use-team.ts              # Team data fetching
├── use-user.ts             # User data fetching
├── use-polling.ts          # Polling utility hook
└── __tests__/              # TDD test specifications
```

---

## 🔑 Core Hooks

### 1. Dashboard Hook (`use-dashboard.ts`)

**Purpose**: Fetches dashboard statistics and business list

**Usage:**

```typescript
import { useDashboard } from '@/lib/hooks/use-dashboard';

function DashboardComponent() {
  const { stats, loading, error, refresh } = useDashboard();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Businesses: {stats.totalBusinesses}</p>
      <p>Average Visibility: {stats.avgVisibilityScore}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

**Return Type:**

```typescript
interface UseDashboardReturn {
  stats: DashboardDTO;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}
```

**Features:**
- Automatic polling when businesses are processing
- SWR caching and revalidation
- Error handling

---

### 2. Businesses Hook (`use-businesses.ts`)

**Purpose**: Fetches list of businesses for a team

**Usage:**

```typescript
import { useBusinesses } from '@/lib/hooks/use-businesses';

function BusinessListComponent() {
  const { businesses, loading, error } = useBusinesses();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {businesses.map(business => (
        <li key={business.id}>{business.name}</li>
      ))}
    </ul>
  );
}
```

---

### 3. Business Detail Hook (`use-business-detail.ts`)

**Purpose**: Fetches detailed information for a single business

**Usage:**

```typescript
import { useBusinessDetail } from '@/lib/hooks/use-business-detail';

function BusinessDetailComponent({ businessId }: { businessId: number }) {
  const { business, loading, error } = useBusinessDetail(businessId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{business.name}</h1>
      <p>Status: {business.status}</p>
      <p>Visibility Score: {business.visibilityScore}</p>
    </div>
  );
}
```

---

### 4. Competitive Data Hook (`use-competitive-data.ts`)

**Purpose**: Fetches competitive analysis data

**Usage:**

```typescript
import { useCompetitiveData } from '@/lib/hooks/use-competitive-data';

function CompetitiveAnalysisComponent({ businessId }: { businessId: number }) {
  const { data, loading, error } = useCompetitiveData(businessId);
  
  // ... render competitive data
}
```

---

### 5. Create Business Hook (`use-create-business.ts`)

**Purpose**: Handles business creation with optimistic updates

**Usage:**

```typescript
import { useCreateBusiness } from '@/lib/hooks/use-create-business';

function CreateBusinessForm() {
  const { createBusiness, loading, error } = useCreateBusiness();
  
  const handleSubmit = async (data: FormData) => {
    await createBusiness({
      name: data.get('name') as string,
      url: data.get('url') as string,
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

---

### 6. Team Hook (`use-team.ts`)

**Purpose**: Fetches team data and subscription information

**Usage:**

```typescript
import { useTeam } from '@/lib/hooks/use-team';

function TeamSettingsComponent() {
  const { team, loading, error } = useTeam();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{team.name}</h1>
      <p>Plan: {team.planName}</p>
    </div>
  );
}
```

---

### 7. User Hook (`use-user.ts`)

**Purpose**: Fetches current user data

**Usage:**

```typescript
import { useUser } from '@/lib/hooks/use-user';

function UserProfileComponent() {
  const { user, loading, error } = useUser();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{user.email}</h1>
      <p>Team: {user.teamId}</p>
    </div>
  );
}
```

---

### 8. Polling Hook (`use-polling.ts`)

**Purpose**: Utility hook for automatic polling

**Usage:**

```typescript
import { usePolling } from '@/lib/hooks/use-polling';

function PollingComponent() {
  const { data, loading } = usePolling(
    '/api/status',
    { interval: 5000 } // Poll every 5 seconds
  );
  
  return <div>Status: {data?.status}</div>;
}
```

---

## 🔄 Data Fetching Flow

```
Component
    ↓
Custom Hook (use-*)
    ↓
SWR (caching, revalidation)
    ↓
API Route (/api/*)
    ↓
Database/Service Layer
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Dashboard Hook
 * 
 * As a frontend developer
 * I want to fetch dashboard data with a hook
 * So that I can display dashboard statistics
 * 
 * Acceptance Criteria:
 * - Hook returns dashboard data
 * - Hook handles loading state
 * - Hook handles error state
 * - Hook provides refresh function
 */
describe('useDashboard Hook - Specification', () => {
  it('fetches dashboard data', async () => {
    // SPECIFICATION: Given dashboard API returns data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalBusinesses: 10,
        avgVisibilityScore: 75,
        businesses: [],
      }),
    });
    
    // SPECIFICATION: When hook is used
    const { result } = renderHook(() => useDashboard());
    
    // SPECIFICATION: Then data should be available
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.stats.totalBusinesses).toBe(10);
    });
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/hooks/__tests__/use-dashboard.test.ts

# With coverage
pnpm test:coverage lib/hooks/
```

---

## 📋 Hook Patterns

### 1. SWR Integration

All hooks use SWR for data fetching:

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useCustomHook() {
  const { data, error, isLoading, mutate } = useSWR('/api/endpoint', fetcher);
  
  return {
    data: data || defaultValue,
    loading: isLoading,
    error: error,
    refresh: () => mutate(),
  };
}
```

### 2. Error Handling

Consistent error handling pattern:

```typescript
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
};
```

### 3. Polling

Automatic polling for real-time updates:

```typescript
const { data } = useSWR('/api/endpoint', fetcher, {
  refreshInterval: isProcessing ? 5000 : 0, // Poll every 5s when processing
});
```

### 4. Optimistic Updates

Optimistic updates for mutations:

```typescript
const mutate = useSWRConfig().mutate;

const createBusiness = async (data: CreateBusinessInput) => {
  // Optimistically update cache
  mutate('/api/businesses', [...businesses, newBusiness], false);
  
  // Make API call
  await fetch('/api/businesses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  // Revalidate
  mutate('/api/businesses');
};
```

---

## 🔗 Integration with Components

### Usage in Server Components

Hooks are client-side only. For server components, use direct data fetching:

```typescript
// app/(dashboard)/dashboard/page.tsx (Server Component)
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

export default async function DashboardPage() {
  const dashboardData = await getDashboardDTO(teamId);
  return <DashboardClient data={dashboardData} />;
}
```

### Usage in Client Components

```typescript
// app/(dashboard)/dashboard/client.tsx ('use client')
import { useDashboard } from '@/lib/hooks/use-dashboard';

export function DashboardClient() {
  const { stats, loading, error } = useDashboard();
  // ... render
}
```

---

## 🎯 Key Principles

1. **SWR Integration**: All data fetching uses SWR
2. **Type Safety**: Full TypeScript coverage
3. **Reusability**: Hooks can be used across components
4. **Error Handling**: Consistent error handling
5. **Polling Support**: Automatic polling for real-time updates
6. **TDD Development**: Write tests first as specifications
7. **SOLID Principles**: Single responsibility per hook

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **SWR Documentation**: https://swr.vercel.app
- **API Routes**: `app/api/`
- **Data DTOs**: `lib/data/`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## ⚠️ Important Notes

### Client-Side Only

- Hooks can only be used in client components (`'use client'`)
- For server components, use direct data fetching functions

### SWR Configuration

- SWR automatically caches and revalidates data
- Use `mutate` for manual cache updates
- Configure `refreshInterval` for polling

### Error Boundaries

- Wrap components using hooks in error boundaries
- Handle errors gracefully in UI

---

**Remember**: Hooks encapsulate data fetching logic. Keep them focused, reusable, and well-tested.


