# Component Library (`components/`)

**Purpose**: Reusable React components for the SaaS platform UI  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement components to satisfy them  
**Status**: 🟢 Active Development

---

## 📚 Overview

The `components/` directory contains reusable React components that enable the UX flows detailed in `docs/features/USER_EXPERIENCE_FLOWS.md`. All components integrate with `lib/` modules through hooks, DTOs, and services, following **Test-Driven Development (TDD)** principles.

### Architecture Principles

1. **Tests ARE Specifications**: Write component tests first to define behavior
2. **Integration with lib/**: Components use hooks, DTOs, and services from `lib/`
3. **Single Responsibility**: Each component has one clear purpose
4. **Type Safety**: Full TypeScript coverage with DTO types
5. **DRY**: Reusable patterns across the application
6. **SOLID**: Clear separation of concerns

---

## 🏗️ Component Organization

Components are organized by functional area:

- **`onboarding/`** - New user onboarding and welcome flows
- **`loading/`** - Loading states, skeletons, and progress indicators
- **`error/`** - Error handling and recovery components
- **`navigation/`** - Navigation and flow continuity components
- **`business/`** - Business management components
- **`subscription/`** - Subscription and tier management components
- **`feedback/`** - Success messages and user feedback
- **`fingerprint/`** - Visibility analysis and fingerprinting components
- **`competitive/`** - Competitive analysis components
- **`wikidata/`** - Wikidata publishing components
- **`activity/`** - Activity feed components
- **`ui/`** - Base UI components (shadcn/ui)

## Component Catalog

### Onboarding Components

#### `WelcomeMessage`
Displays welcome message for new users on dashboard.

**Features:**
- Personalized greeting
- Business count display
- Clear CTAs for getting started
- Links to pricing page

**Usage:**
```tsx
<WelcomeMessage
  userName="John"
  businessCount={0}
  onGetStarted={() => navigate('/businesses/new')}
/>
```

#### `EmptyState`
Displays helpful empty states with clear CTAs.

**Features:**
- Customizable icon
- Title and description
- Primary and secondary actions
- Gem-themed styling

**Usage:**
```tsx
<EmptyState
  icon={GemIcon}
  title="No businesses yet"
  description="Get started by adding your first business"
  action={{
    label: "Add Business",
    href: "/dashboard/businesses/new"
  }}
/>
```

#### `UrlOnlyForm`
Frictionless onboarding form - only requires URL.

**Features:**
- URL validation
- Auto-formatting (adds https:// if missing)
- Loading states
- Error handling
- Clear instructions

**Usage:**
```tsx
<UrlOnlyForm
  onSubmit={async (url) => {
    await createBusinessFromUrl(url);
  }}
  loading={isCreating}
  error={error}
/>
```

### Loading Components

#### `LoadingSkeleton` & Variants
Loading skeletons for various content types.

**Variants:**
- `CardSkeleton` - Generic card skeleton
- `BusinessListSkeleton` - Business list loading
- `BusinessDetailSkeleton` - Business detail page loading
- `FormSkeleton` - Form loading state

**Usage:**
```tsx
{loading ? (
  <BusinessListSkeleton count={3} />
) : (
  <BusinessList businesses={businesses} />
)}
```

#### `StatusBadge`
Displays business/operation status with appropriate styling.

**Status Types:**
- `pending`, `crawling`, `crawled`, `generating`, `published`, `error`, `analyzing`, `completed`

**Usage:**
```tsx
<StatusBadge status="crawling" showIcon />
```

#### `ActionButton`
Button with loading state for async operations.

**Features:**
- Loading spinner
- Custom loading text
- Icon support
- Disabled state during loading

**Usage:**
```tsx
<ActionButton
  loading={isCrawling}
  loadingText="Crawling..."
  icon={Globe}
  onClick={handleCrawl}
>
  Crawl Website
</ActionButton>
```

#### `ProgressIndicator`
Shows progress for async operations.

**Usage:**
```tsx
<ProgressIndicator
  label="Crawling Website"
  status="in-progress"
  progress={45}
  message="Extracting business data..."
/>
```

### Error Components

#### `ErrorCard`
Displays user-friendly error messages with recovery options.

**Features:**
- Clear error messaging
- Retry functionality
- Back navigation
- Gem-themed styling

**Usage:**
```tsx
<ErrorCard
  title="Failed to Load Business"
  message="Unable to fetch business data. Please try again."
  onRetry={handleRetry}
  backHref="/dashboard/businesses"
/>
```

#### `BusinessLimitError`
Displays business limit reached error with upgrade CTA.

**Usage:**
```tsx
<BusinessLimitError
  currentCount={1}
  maxCount={1}
  tier="free"
/>
```

### Navigation Components

#### `BackButton`
Consistent back navigation button.

**Features:**
- Supports href or onClick
- Router integration
- Customizable label

**Usage:**
```tsx
<BackButton
  href="/dashboard/businesses"
  label="Back to Businesses"
/>
```

#### `FlowProgress`
Shows progress through multi-step flows.

**Usage:**
```tsx
<FlowProgress
  currentStep="crawl"
  completedSteps={['create']}
/>
```

### Business Components

#### `BusinessListCard`
Displays business in list view with key information.

**Features:**
- Business name and location
- Status badge
- Wikidata QID display
- Clickable card
- Relative time display

**Usage:**
```tsx
<BusinessListCard business={business} />
```

#### `BusinessStatusIndicator`
Comprehensive status display for business operations.

**Usage:**
```tsx
<BusinessStatusIndicator
  status="crawling"
  progress={{
    label: "Crawling Website",
    percentage: 65,
    message: "Extracting business data..."
  }}
/>
```

### Subscription Components

#### `TierBadge`
Displays user's current subscription tier.

**Usage:**
```tsx
<TierBadge tier="pro" showIcon />
```

#### `BusinessLimitDisplay`
Shows current business count vs. limit for tier.

**Features:**
- Progress bar
- Color-coded warnings
- Tier label

**Usage:**
```tsx
<BusinessLimitDisplay
  currentCount={3}
  maxCount={5}
  tier="pro"
/>
```

### Feedback Components

#### `SuccessMessage`
Displays success feedback for completed actions.

**Usage:**
```tsx
<SuccessMessage
  title="Business Created!"
  message="Your business has been added successfully."
  onDismiss={() => setShowSuccess(false)}
/>
```

## Design Principles

All components follow these principles:

1. **SOLID**: Single Responsibility - each component has one clear purpose
2. **DRY**: Reusable patterns across the application
3. **Gem-Themed**: Consistent gem-inspired styling
4. **Accessible**: Proper ARIA labels and keyboard navigation
5. **Responsive**: Works on mobile and desktop
6. **Type-Safe**: Full TypeScript support

## Integration with UX Flows

These components directly enable the UX flows:

### New User Onboarding
- `WelcomeMessage` → Dashboard welcome
- `EmptyState` → Empty business list
- `UrlOnlyForm` → Frictionless onboarding

### Business Management
- `BusinessListCard` → Business list view
- `BusinessStatusIndicator` → Status display
- `ActionButton` → Action buttons with loading

### Visibility Analysis
- `ProgressIndicator` → Crawl/fingerprint progress
- `StatusBadge` → Operation status
- `LoadingSkeleton` → Loading states

### Wikidata Publishing
- `StatusBadge` → Publication status
- `ProgressIndicator` → Publishing progress
- `SuccessMessage` → Publication success

### Error Handling
- `ErrorCard` → Error display
- `BusinessLimitError` → Limit reached
- `ActionButton` → Retry functionality

### Loading States
- `LoadingSkeleton` → Data fetching
- `ActionButton` → Form submission
- `ProgressIndicator` → Async operations

### Navigation
- `BackButton` → Navigation
- `FlowProgress` → Multi-step flows

## Usage Examples

### Complete Business Creation Flow

```tsx
import { UrlOnlyForm } from '@/components/onboarding';
import { ActionButton } from '@/components/loading';
import { SuccessMessage } from '@/components/feedback';
import { ErrorCard } from '@/components/error';

function BusinessCreationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      await createBusiness(url);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <SuccessMessage message="Business created successfully!" />;
  }

  return (
    <>
      {error && <ErrorCard message={error} onRetry={() => setError(null)} />}
      <UrlOnlyForm onSubmit={handleSubmit} loading={loading} error={error} />
    </>
  );
}
```

### Business List with Loading States

```tsx
import { BusinessListSkeleton } from '@/components/loading';
import { BusinessListCard } from '@/components/business';
import { EmptyState } from '@/components/onboarding';

function BusinessListPage() {
  const { businesses, loading } = useBusinesses();

  if (loading) {
    return <BusinessListSkeleton count={3} />;
  }

  if (businesses.length === 0) {
    return (
      <EmptyState
        title="No businesses yet"
        description="Get started by adding your first business"
        action={{ label: "Add Business", href: "/businesses/new" }}
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

## Styling

All components use the gem-themed design system:
- `gem-card` - Card styling
- `gem-gradient` - Button gradients
- `gem-text-shimmer` - Text effects
- Gem icons from `@/components/ui/gem-icon`

## Type Safety

All components are fully typed with TypeScript:
- Props interfaces exported
- Type-safe status enums
- Proper event handlers

## 🔄 Integration with `lib/` Modules

### Using Hooks (`lib/hooks/`)

Components fetch data using custom hooks:

```typescript
// components/business/business-list-card.tsx
import { useBusinesses } from '@/lib/hooks/use-businesses';
import { useDashboard } from '@/lib/hooks/use-dashboard';

function BusinessList() {
  const { businesses, loading, error } = useBusinesses();
  const { stats } = useDashboard();
  
  // Use data from hooks
}
```

**Available Hooks:**
- `useDashboard()` - Dashboard statistics (`lib/hooks/use-dashboard.ts`)
- `useBusinesses()` - Business list (`lib/hooks/use-businesses.ts`)
- `useBusinessDetail(id)` - Single business (`lib/hooks/use-business-detail.ts`)
- `useTeam()` - Team data (`lib/hooks/use-team.ts`)
- `useUser()` - User data (`lib/hooks/use-user.ts`)
- `useCompetitiveData(id)` - Competitive analysis (`lib/hooks/use-competitive-data.ts`)

### Using DTOs (`lib/data/`)

Components receive data in DTO format:

```typescript
// components/fingerprint/visibility-intel-card.tsx
import type { FingerprintDetailDTO } from '@/lib/data/types';

interface VisibilityIntelCardProps {
  fingerprint: FingerprintDetailDTO | null;
}
```

**Common DTOs:**
- `DashboardDTO` - Dashboard data (`lib/data/dashboard-dto.ts`)
- `BusinessDTO` - Business data (`lib/data/business-dto.ts`)
- `FingerprintDetailDTO` - Fingerprint analysis (`lib/data/fingerprint-dto.ts`)
- `ActivityDTO` - Activity feed items (`lib/data/activity-dto.ts`)
- `WikidataEntityDetailDTO` - Wikidata entity data (`lib/data/wikidata-dto.ts`)

### Using Services (`lib/services/`)

Components trigger business logic through API routes (which use services):

```typescript
// components/business/business-processing-status.tsx
async function handleProcess() {
  const response = await fetch(`/api/business/${businessId}/process`, {
    method: 'POST',
  });
  // API route uses lib/services/business-execution.ts
}
```

### Using Validation (`lib/validation/`)

Form components use validation schemas:

```typescript
// components/onboarding/url-only-form.tsx
import { createBusinessFromUrlSchema } from '@/lib/validation/business';

// Validation happens in server action or API route
```

---

## 🧪 TDD Development for Components

### Step 1: Write Specification (Test FIRST)

**Before writing any component**, write a test that defines the component's behavior:

```typescript
/**
 * SPECIFICATION: Business List Card Component
 * 
 * As a user
 * I want to see business information in a card
 * So that I can quickly identify and navigate to businesses
 * 
 * Acceptance Criteria:
 * - Displays business name
 * - Displays business status
 * - Displays location if available
 * - Links to business detail page
 * - Shows Wikidata QID if published
 */
describe('BusinessListCard - Specification', () => {
  it('displays business information correctly', () => {
    // SPECIFICATION: Given a business with data
    const business = {
      id: 1,
      name: 'Test Business',
      status: 'published',
      location: 'Seattle, WA',
      wikidataQid: 'Q123456',
    };
    
    // SPECIFICATION: When component is rendered
    render(<BusinessListCard business={business} />);
    
    // SPECIFICATION: Then should display business name
    expect(screen.getByText('Test Business')).toBeInTheDocument();
    
    // SPECIFICATION: And should display status
    expect(screen.getByText('published')).toBeInTheDocument();
    
    // SPECIFICATION: And should link to detail page
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/businesses/1');
  });
});
```

### Step 2: Implement Component (GREEN)

Write minimal component to satisfy the test:

```typescript
// components/business/business-list-card.tsx
export function BusinessListCard({ business }: BusinessListCardProps) {
  return (
    <Link href={`/dashboard/businesses/${business.id}`}>
      <Card>
        <CardContent>
          <h3>{business.name}</h3>
          <StatusBadge status={business.status} />
          {business.location && <p>{business.location}</p>}
          {business.wikidataQid && <span>QID: {business.wikidataQid}</span>}
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Step 3: Refactor (Keep Tests Passing)

Improve component while keeping tests green:

```typescript
// Refactored with better structure
export function BusinessListCard({ business }: BusinessListCardProps) {
  return (
    <Link href={`/dashboard/businesses/${business.id}`}>
      <Card className="gem-card hover:shadow-lg">
        <CardContent className="p-6">
          <BusinessHeader business={business} />
          <BusinessStatus business={business} />
          <BusinessMetadata business={business} />
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Running Component Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test components/__tests__/business-list-card.test.tsx

# With coverage
pnpm test:coverage components/
```

---

## 📋 Component Integration Patterns

### Pattern 1: Hook-Based Data Fetching

**Components use hooks to fetch data:**

```typescript
'use client';

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { BusinessListSkeleton } from '@/components/loading';

export function DashboardContent() {
  const { stats, loading, error } = useDashboard();
  
  if (loading) return <BusinessListSkeleton />;
  if (error) return <ErrorCard error={error} />;
  
  return <div>{/* Render stats */}</div>;
}
```

### Pattern 2: DTO Props

**Components receive DTOs as props:**

```typescript
import type { FingerprintDetailDTO } from '@/lib/data/types';

interface VisibilityIntelCardProps {
  fingerprint: FingerprintDetailDTO | null;
}

export function VisibilityIntelCard({ fingerprint }: VisibilityIntelCardProps) {
  if (!fingerprint) return <EmptyState />;
  
  return (
    <Card>
      <VisibilityScoreDisplay score={fingerprint.visibilityScore} />
      {/* ... */}
    </Card>
  );
}
```

### Pattern 3: Server Actions

**Form components use server actions:**

```typescript
'use client';

import { createBusiness } from '@/app/actions/business';
import { useFormState } from 'react-dom';

export function BusinessForm() {
  const [state, formAction] = useFormState(createBusiness, null);
  
  return (
    <form action={formAction}>
      {/* Form fields */}
    </form>
  );
}
```

### Pattern 4: API Route Integration

**Components trigger API calls:**

```typescript
'use client';

export function ProcessButton({ businessId }: { businessId: number }) {
  const [loading, setLoading] = useState(false);
  
  const handleProcess = async () => {
    setLoading(true);
    try {
      await fetch(`/api/business/${businessId}/process`, {
        method: 'POST',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ActionButton loading={loading} onClick={handleProcess}>
      Process Business
    </ActionButton>
  );
}
```

---

## 🎯 Component Testing Best Practices

### 1. Test Behavior, Not Implementation

**✅ GOOD:**
```typescript
it('displays business name', () => {
  render(<BusinessListCard business={business} />);
  expect(screen.getByText('Test Business')).toBeInTheDocument();
});
```

**❌ BAD:**
```typescript
it('renders h3 element', () => {
  const { container } = render(<BusinessListCard business={business} />);
  expect(container.querySelector('h3')).toBeDefined();
});
```

### 2. Mock Hooks

**✅ GOOD:**
```typescript
vi.mock('@/lib/hooks/use-dashboard', () => ({
  useDashboard: () => ({
    stats: mockDashboardData,
    loading: false,
    error: null,
  }),
}));
```

### 3. Test User Interactions

**✅ GOOD:**
```typescript
it('navigates to business detail on click', async () => {
  render(<BusinessListCard business={business} />);
  const link = screen.getByRole('link');
  await userEvent.click(link);
  expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/businesses/1');
});
```

### 4. Test Loading States

**✅ GOOD:**
```typescript
it('shows loading skeleton when data is loading', () => {
  vi.mock('@/lib/hooks/use-dashboard', () => ({
    useDashboard: () => ({ loading: true }),
  }));
  
  render(<DashboardContent />);
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
});
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Hooks Module**: `lib/hooks/README.md`
- **Data DTOs**: `lib/data/README.md`
- **API Routes**: `app/api/README.md`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`
- **UX Flows**: `docs/features/USER_EXPERIENCE_FLOWS.md`

---

## 🎓 Key Principles

1. **Tests ARE Specifications**: Write component tests first
2. **Integration with lib/**: Use hooks, DTOs, and services
3. **Single Responsibility**: Each component has one clear purpose
4. **Type Safety**: Full TypeScript coverage with DTO types
5. **DRY**: Reusable patterns across the application
6. **SOLID**: Clear separation of concerns
7. **Accessible**: Proper ARIA labels and keyboard navigation
8. **Responsive**: Works on mobile and desktop

---

## ⚠️ Important Notes

### Client vs Server Components

- **Client Components** (`'use client'`): Use hooks, handle interactions
- **Server Components**: Fetch data directly, pass to client components

### Data Flow

```
Server Component
  ↓ (fetches data)
lib/data/*-dto.ts
  ↓ (passes DTOs)
Client Component
  ↓ (uses hooks)
lib/hooks/use-*.ts
  ↓ (calls API)
app/api/**/route.ts
  ↓ (uses services)
lib/services/*.ts
```

### Testing

- Test components in isolation
- Mock hooks and API calls
- Test user interactions
- Test loading and error states

---

**Remember**: Components are the UI layer. Write tests first, integrate with lib/ modules, and keep components focused and reusable.

---

*For detailed UX flow documentation, see `docs/features/USER_EXPERIENCE_FLOWS.md`*

