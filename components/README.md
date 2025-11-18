# Component Library

This directory contains reusable, compelling components that enable the UX flows detailed in `docs/features/USER_EXPERIENCE_FLOWS.md`.

## Component Organization

Components are organized by functional area:

- **`onboarding/`** - New user onboarding and welcome flows
- **`loading/`** - Loading states, skeletons, and progress indicators
- **`error/`** - Error handling and recovery components
- **`navigation/`** - Navigation and flow continuity components
- **`business/`** - Business management components
- **`subscription/`** - Subscription and tier management components
- **`feedback/`** - Success messages and user feedback

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

## Testing

Components are designed to be testable:
- Clear prop interfaces
- No hidden dependencies
- Predictable behavior
- Accessible selectors

---

*For detailed UX flow documentation, see `docs/features/USER_EXPERIENCE_FLOWS.md`*

