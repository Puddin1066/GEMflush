# Dashboard Route Group (`app/(dashboard)/`) - TDD Development Guide

**Purpose**: Protected dashboard pages and routes for authenticated users  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement pages to satisfy them  
**Status**: 🟢 Active Development

---

## 📚 Overview

The `(dashboard)` route group contains all protected dashboard pages that require user authentication. This route group uses Next.js route groups (parentheses don't affect URL structure) to organize protected routes separately from public routes. All pages should be developed using **Test-Driven Development (TDD)**, where tests serve as executable specifications.

### Architecture Principles

1. **Tests ARE Specifications**: Write tests first to define page behavior
2. **Protected Routes**: All pages require authentication (handled by middleware)
3. **Server + Client Components**: Mix server components (data fetching) with client components (interactivity)
4. **Integration with lib/**: Use hooks, DTOs, and services from `lib/`
5. **Type Safety**: Full TypeScript coverage
6. **Error Handling**: Graceful error states and loading states

---

## 🏗️ Directory Structure

```
app/(dashboard)/
├── layout.tsx              # Dashboard layout with header and navigation
├── page.tsx                # Root dashboard route (redirects to /dashboard)
├── error.tsx               # Error boundary for dashboard routes
├── terminal.tsx            # Terminal/command interface (if applicable)
├── pricing/                # Pricing page (public access, but in dashboard group)
│   ├── page.tsx           # Pricing tiers and subscription options
│   └── submit-button.tsx  # Checkout button component
└── dashboard/              # Main dashboard pages
    ├── layout.tsx          # Dashboard-specific layout with sidebar
    ├── page.tsx           # Main dashboard overview
    ├── dashboard-client.tsx # Client component for interactive dashboard
    ├── businesses/        # Business management pages
    │   ├── page.tsx       # Business list page
    │   ├── [id]/          # Individual business pages
    │   │   ├── page.tsx   # Business detail page
    │   │   ├── fingerprint/ # Fingerprint analysis page
    │   │   └── competitive/  # Competitive analysis page
    │   └── new/           # New business creation flow
    ├── activity/          # Activity feed page
    │   └── page.tsx
    ├── settings/          # Settings pages
    │   ├── page.tsx       # General settings
    │   ├── billing/       # Billing and subscription management
    │   │   └── page.tsx
    │   └── security/      # Security settings
    │       └── page.tsx
    ├── general/           # General dashboard settings
    │   └── page.tsx
    └── security/          # Security settings
        └── page.tsx
```

---

## 🎯 Module Responsibilities

### 1. Dashboard Layout (`layout.tsx`)

**Responsibility**: Provides shared layout for all dashboard routes
- Header with navigation and user menu
- Authentication state management
- Responsive design (mobile/desktop)
- Error boundary integration

**TDD Strategy**:
- Test layout renders correctly for authenticated users
- Test redirects unauthenticated users
- Test navigation menu functionality
- Test responsive behavior

### 2. Main Dashboard (`dashboard/page.tsx`)

**Responsibility**: Main dashboard overview page
- Displays business statistics and summaries
- Shows recent activity
- Provides quick actions
- Empty state for new users

**TDD Strategy**:
- Test server component fetches dashboard data
- Test displays statistics correctly
- Test empty state for new users
- Test error handling when data fetch fails
- Test loading states

### 3. Business Management (`dashboard/businesses/`)

**Responsibility**: Business CRUD operations and management
- List all businesses for the team
- Create new businesses
- View business details
- Manage business settings
- View fingerprint analysis
- Competitive benchmarking

**TDD Strategy**:
- Test business list displays correctly
- Test business creation flow
- Test business detail page
- Test fingerprint page displays analysis
- Test competitive analysis page
- Test business limit enforcement based on plan tier

### 4. Activity Feed (`dashboard/activity/`)

**Responsibility**: Display team activity and audit logs
- Show recent actions
- Filter by activity type
- Display activity timeline

**TDD Strategy**:
- Test activity feed displays recent activities
- Test filtering functionality
- Test pagination
- Test empty state

### 5. Settings Pages (`dashboard/settings/`)

**Responsibility**: User and team settings management
- General settings (profile, preferences)
- Billing and subscription management
- Security settings (password, 2FA)

**TDD Strategy**:
- Test settings pages render correctly
- Test form submissions
- Test subscription management
- Test security settings updates
- Test validation errors

### 6. Pricing Page (`pricing/`)

**Responsibility**: Display pricing tiers and handle subscriptions
- Show pricing plans (Free, Pro, Agency)
- Display current plan status
- Handle checkout flow
- Show plan features and limits

**TDD Strategy**:
- Test pricing page displays all tiers
- Test current plan badge displays correctly
- Test checkout button functionality
- Test plan comparison
- Test Stripe integration (mocked in tests)

---

## 🎯 TDD Workflow for Dashboard Pages

### Step 1: Write Specification (Test FIRST)

**Before writing any page code**, write a test that defines the page behavior:

```typescript
/**
 * SPECIFICATION: Dashboard Page
 * 
 * As an authenticated user
 * I want to see my dashboard with business statistics
 * So that I can monitor my businesses
 * 
 * Acceptance Criteria:
 * - Displays dashboard statistics (total businesses, visibility score)
 * - Shows business list
 * - Shows loading state while fetching
 * - Shows error state on failure
 * - Redirects to login if not authenticated
 */
describe('Dashboard Page - Specification', () => {
  it('displays dashboard statistics for authenticated user', async () => {
    // SPECIFICATION: Given an authenticated user
    mockGetUser.mockResolvedValue(createTestUser());
    
    // SPECIFICATION: And dashboard data
    mockGetDashboardDTO.mockResolvedValue({
      totalBusinesses: 5,
      avgVisibilityScore: 75,
      wikidataEntities: 3,
      businesses: [],
    });
    
    // SPECIFICATION: When page is rendered
    const { container } = render(await DashboardPage());
    
    // SPECIFICATION: Then should display statistics
    expect(screen.getByText('5')).toBeInTheDocument(); // Total businesses
    expect(screen.getByText('75')).toBeInTheDocument(); // Avg visibility
    expect(screen.getByText('3')).toBeInTheDocument(); // Wikidata entities
  });
  
  it('shows empty state for new users', async () => {
    // SPECIFICATION: Given a new user with no businesses
    mockGetUser.mockResolvedValue(createTestUser());
    mockGetDashboardDTO.mockResolvedValue({
      totalBusinesses: 0,
      avgVisibilityScore: 0,
      wikidataEntities: 0,
      businesses: [],
    });
    
    // SPECIFICATION: When page is rendered
    render(await DashboardPage());
    
    // SPECIFICATION: Then should show empty state
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
    expect(screen.getByText(/add your first business/i)).toBeInTheDocument();
  });
  
  it('redirects unauthenticated users', async () => {
    // SPECIFICATION: Given no authenticated user
    mockGetUser.mockResolvedValue(null);
    
    // SPECIFICATION: When page is accessed
    // SPECIFICATION: Then should redirect to login
    // (Tested via middleware or page redirect logic)
  });
});
```

### Step 2: Run Test (RED - Expected Failure)

```bash
# Start TDD watch mode
pnpm tdd

# Or run specific test file
pnpm test app/\(dashboard\)/dashboard/__tests__/page.test.tsx
```

**Expected**: Test fails (RED) ✅  
**Why**: Page doesn't exist yet or doesn't satisfy the specification.

### Step 3: Implement Page to Satisfy Specification (GREEN)

Write minimal page code to make the test pass:

```typescript
// app/(dashboard)/dashboard/page.tsx
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { DashboardClient } from './dashboard-client';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // SPECIFICATION: Authenticate user
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/sign-in');
  }

  // SPECIFICATION: Fetch dashboard data
  const dashboardData = await getDashboardDTO(team.id);

  // SPECIFICATION: Pass data to client component
  return (
    <DashboardClient
      dashboardData={dashboardData}
      user={user}
      team={team}
    />
  );
}
```

**Expected**: Test passes (GREEN) ✅

### Step 4: Refactor (Keep Specification Valid)

Improve page code while keeping tests passing:

```typescript
// Refactored page with better error handling
export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/sign-in');
  }

  try {
    const dashboardData = await getDashboardDTO(team.id);
    return (
      <DashboardClient
        dashboardData={dashboardData}
        user={user}
        team={team}
      />
    );
  } catch (error) {
    // Handle error gracefully
    return <ErrorBoundary error={error} />;
  }
}
```

**Expected**: Test still passes ✅

---

## 📋 Page Patterns

### Pattern 1: Server Component with Data Fetching

**For pages that fetch data server-side:**

```typescript
// app/(dashboard)/dashboard/page.tsx
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { DashboardClient } from './dashboard-client';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const team = await getTeamForUser();
  if (!team) redirect('/sign-in');

  const dashboardData = await getDashboardDTO(team.id);
  
  return (
    <DashboardClient
      dashboardData={dashboardData}
      user={user}
      team={team}
    />
  );
}
```

**TDD Strategy**:
- Test server component fetches data correctly
- Test authentication check
- Test redirect behavior
- Test data passed to client component

### Pattern 2: Client Component with Hooks

**For interactive pages that need client-side state:**

```typescript
// app/(dashboard)/dashboard/businesses/page.tsx
'use client';

import { useBusinesses } from '@/lib/hooks/use-businesses';
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';

export default function BusinessesPage() {
  const { businesses, loading, error } = useBusinesses();
  
  if (loading) return <BusinessListSkeleton />;
  if (error) return <ErrorCard error={error} />;
  
  return (
    <div>
      <h1>Businesses</h1>
      {businesses.map(business => (
        <BusinessListCard key={business.id} business={business} />
      ))}
    </div>
  );
}
```

**TDD Strategy**:
- Test hook integration
- Test loading state
- Test error state
- Test data rendering
- Test user interactions

### Pattern 3: Hybrid (Server + Client)

**For pages that need both server data and client interactivity:**

```typescript
// Server component (page.tsx)
import { getBusinessById } from '@/lib/db/queries';
import { BusinessDetailClient } from './business-detail-client';

export default async function BusinessDetailPage({ params }: { params: { id: string } }) {
  const business = await getBusinessById(Number(params.id));
  if (!business) return <NotFound />;
  
  return <BusinessDetailClient business={business} />;
}

// Client component (business-detail-client.tsx)
'use client';

export function BusinessDetailClient({ business }: { business: Business }) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Client-side interactivity
  const handleProcess = async () => {
    setIsProcessing(true);
    await fetch(`/api/business/${business.id}/process`, { method: 'POST' });
    setIsProcessing(false);
  };
  
  return (
    <div>
      <h1>{business.name}</h1>
      <Button onClick={handleProcess} disabled={isProcessing}>
        Process Business
      </Button>
    </div>
  );
}
```

**TDD Strategy**:
- Test server component data fetching
- Test client component interactivity
- Test data flow between server and client
- Test error handling at both levels

---

## 🧪 TDD Testing Patterns

### Testing Server Components

```typescript
// app/(dashboard)/dashboard/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import DashboardPage from '../page';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

vi.mock('@/lib/db/queries');
vi.mock('@/lib/data/dashboard-dto');

describe('Dashboard Page', () => {
  it('displays dashboard statistics', async () => {
    // Mock authenticated user
    vi.mocked(getUser).mockResolvedValue(createTestUser());
    vi.mocked(getTeamForUser).mockResolvedValue(createTestTeam());
    
    // Mock dashboard data
    vi.mocked(getDashboardDTO).mockResolvedValue({
      totalBusinesses: 5,
      avgVisibilityScore: 75,
      wikidataEntities: 3,
      businesses: [],
    });
    
    // Render page
    const page = await DashboardPage();
    render(page);
    
    // Verify statistics displayed
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });
});
```

### Testing Client Components

```typescript
// app/(dashboard)/dashboard/businesses/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import BusinessesPage from '../page';
import { useBusinesses } from '@/lib/hooks/use-businesses';

vi.mock('@/lib/hooks/use-businesses');

describe('Businesses Page', () => {
  it('displays business list', async () => {
    vi.mocked(useBusinesses).mockReturnValue({
      businesses: [
        { id: 1, name: 'Business 1', url: 'https://example.com' },
        { id: 2, name: 'Business 2', url: 'https://example2.com' },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      maxBusinesses: 5,
    });
    
    render(<BusinessesPage />);
    
    expect(screen.getByText('Business 1')).toBeInTheDocument();
    expect(screen.getByText('Business 2')).toBeInTheDocument();
  });
  
  it('shows loading state', () => {
    vi.mocked(useBusinesses).mockReturnValue({
      businesses: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
      maxBusinesses: 5,
    });
    
    render(<BusinessesPage />);
    expect(screen.getByTestId('business-list-skeleton')).toBeInTheDocument();
  });
});
```

### Testing Form Submissions

```typescript
// app/(dashboard)/dashboard/settings/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../page';

describe('Settings Page', () => {
  it('updates user settings on form submit', async () => {
    render(<SettingsPage />);
    
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument();
    });
  });
});
```

---

## 🔄 Integration with `lib/` Modules

### Using Hooks (`lib/hooks/`)

```typescript
// app/(dashboard)/dashboard/businesses/page.tsx
'use client';

import { useBusinesses } from '@/lib/hooks/use-businesses';
import { useTeam } from '@/lib/hooks/use-team';
import { useCreateBusiness } from '@/lib/hooks/use-create-business';

export default function BusinessesPage() {
  const { businesses, loading, error } = useBusinesses();
  const { team } = useTeam();
  const { createBusiness } = useCreateBusiness();
  
  // Use hooks for data and actions
}
```

### Using DTOs (`lib/data/`)

```typescript
// app/(dashboard)/dashboard/page.tsx
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

export default async function DashboardPage() {
  const dashboardData = await getDashboardDTO(teamId);
  // Use DTO for type-safe data
}
```

### Using Components (`components/`)

```typescript
// app/(dashboard)/dashboard/page.tsx
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';

export default function DashboardPage() {
  // Use reusable components
}
```

---

## 🚀 Running Tests

### Watch Mode (Recommended for TDD)

```bash
# Start Vitest watch mode
pnpm tdd

# Or explicit watch command
pnpm test:watch
```

**Watch mode automatically re-runs tests when files change** - perfect for RED → GREEN → REFACTOR cycle.

### Single Run

```bash
# Run all tests once
pnpm test:run

# Run specific file
pnpm test app/\(dashboard\)/dashboard/__tests__/page.test.tsx

# Run with pattern
pnpm test --grep "dashboard page"
```

### E2E Tests

```bash
# Run E2E tests for dashboard flows
pnpm test:e2e dashboard
```

---

## 📋 TDD Checklist for Dashboard Pages

When developing a new dashboard page:

- [ ] **Write test FIRST** (page behavior before page code)
- [ ] **Test defines behavior** (what page should do, not how)
- [ ] **Test authentication** (redirects unauthenticated users)
- [ ] **Test data fetching** (server components fetch correctly)
- [ ] **Test loading states** (skeleton/loading UI)
- [ ] **Test error states** (error messages display)
- [ ] **Test empty states** (no data scenarios)
- [ ] **Test user interactions** (client component behavior)
- [ ] **Mock dependencies** (hooks, services, database)
- [ ] **Run test** (verify it fails - RED)
- [ ] **Write minimal page** (satisfy specification)
- [ ] **Run test** (verify it passes - GREEN)
- [ ] **Refactor page** (improve while keeping test passing)
- [ ] **Test still passes** (specification still satisfied)

---

## 🔗 Related Documentation

- **Main App README**: `app/README.md`
- **API Routes Guide**: `app/api/README.md`
- **Hooks Module**: `lib/hooks/README.md`
- **Services Module**: `lib/services/README.md`
- **Data DTOs**: `lib/data/README.md`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Tests ARE Specifications**: Tests define page behavior, pages satisfy them
2. **Write Tests First**: Before any page implementation
3. **Test User Experience**: What users see and do, not implementation details
4. **Mock Dependencies**: Don't make real database/API calls in tests
5. **Authentication First**: All pages check authentication
6. **Error Handling**: Graceful error states and loading states
7. **Type Safety**: Full TypeScript coverage
8. **DRY**: Reuse components, hooks, and utilities

---

**Remember**: In TDD, tests are not verification—they are the specification that drives development. Write page behavior tests first, then implement pages to satisfy them.



