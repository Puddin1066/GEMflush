# Application Layer (`app/`) - TDD Development Guide

**Purpose**: Next.js App Router pages and API routes for the SaaS platform  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement pages/routes to satisfy them  
**Status**: 🟢 Active Development

---

## 📚 Overview

The `app/` directory contains Next.js App Router pages and API routes. Pages render UI using components from `components/`, while API routes handle backend logic using services from `lib/`. All code should be developed using **Test-Driven Development (TDD)**, where tests serve as executable specifications.

### Architecture Principles

1. **Tests ARE Specifications**: Write tests first to define behavior
2. **Separation of Concerns**: Pages (UI) separate from API routes (backend)
3. **Integration with lib/**: Use services, DTOs, and hooks from `lib/`
4. **Type Safety**: Full TypeScript coverage
5. **Authentication**: All protected routes verify user session
6. **Validation**: All inputs validated with Zod schemas

---

## 🏗️ Directory Structure

```
app/
├── (dashboard)/          # Dashboard route group (protected)
│   ├── dashboard/        # Dashboard pages
│   │   ├── page.tsx      # Main dashboard
│   │   ├── businesses/   # Business management pages
│   │   ├── activity/     # Activity feed page
│   │   └── settings/     # Settings pages
│   ├── pricing/          # Pricing page
│   └── layout.tsx        # Dashboard layout
├── (login)/              # Login route group (public)
│   ├── sign-in/          # Sign in page
│   └── sign-up/          # Sign up page
├── api/                  # API routes (backend)
│   ├── business/         # Business CRUD operations
│   ├── crawl/           # Web crawling endpoints
│   ├── fingerprint/     # Fingerprint analysis endpoints
│   ├── wikidata/        # Wikidata publishing endpoints
│   ├── dashboard/       # Dashboard data aggregation
│   ├── stripe/          # Payment processing
│   └── cron/            # Scheduled job endpoints
├── layout.tsx           # Root layout
└── globals.css          # Global styles
```

---

## 🎯 TDD Workflow for App Development

### For Pages (UI Components)

#### Step 1: Write Specification (Test FIRST)

```typescript
/**
 * SPECIFICATION: Dashboard Page
 * 
 * As a user
 * I want to see my dashboard with business statistics
 * So that I can monitor my businesses
 * 
 * Acceptance Criteria:
 * - Displays dashboard statistics
 * - Shows business list
 * - Shows loading state while fetching
 * - Shows error state on failure
 * - Redirects to login if not authenticated
 */
describe('Dashboard Page - Specification', () => {
  it('displays dashboard statistics', async () => {
    // SPECIFICATION: Given an authenticated user
    mockGetUser.mockResolvedValue(createTestUser());
    
    // SPECIFICATION: And dashboard data
    mockUseDashboard.mockReturnValue({
      stats: {
        totalBusinesses: 5,
        avgVisibilityScore: 75,
        businesses: [],
      },
      loading: false,
      error: null,
    });
    
    // SPECIFICATION: When page is rendered
    render(<DashboardPage />);
    
    // SPECIFICATION: Then should display statistics
    expect(screen.getByText('5')).toBeInTheDocument(); // Total businesses
    expect(screen.getByText('75')).toBeInTheDocument(); // Avg visibility
  });
});
```

#### Step 2: Implement Page (GREEN)

```typescript
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { BusinessListSkeleton } from '@/components/loading';

export default function DashboardPage() {
  const { stats, loading, error } = useDashboard();
  
  if (loading) return <BusinessListSkeleton />;
  if (error) return <ErrorCard error={error} />;
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Businesses: {stats.totalBusinesses}</p>
      <p>Avg Visibility: {stats.avgVisibilityScore}</p>
    </div>
  );
}
```

### For API Routes (Backend)

#### Step 1: Write Specification (Test FIRST)

```typescript
/**
 * SPECIFICATION: Business Creation API
 * 
 * As a user
 * I want to create a business via API
 * So that I can add businesses to my account
 * 
 * Acceptance Criteria:
 * - POST /api/business creates a business
 * - Returns 201 with business data on success
 * - Returns 401 if not authenticated
 * - Returns 400 if validation fails
 */
describe('POST /api/business - Specification', () => {
  it('creates business and returns 201', async () => {
    // SPECIFICATION: Given an authenticated user
    mockGetUser.mockResolvedValue(createTestUser());
    
    // SPECIFICATION: And valid business data
    const requestBody = {
      name: 'Test Business',
      url: 'https://example.com',
    };
    
    // SPECIFICATION: When POST request is made
    const response = await POST(
      new Request('http://localhost/api/business', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
    );
    
    // SPECIFICATION: Then response should be 201
    expect(response.status).toBe(201);
    
    // SPECIFICATION: And response should contain business data
    const data = await response.json();
    expect(data.business.name).toBe('Test Business');
  });
});
```

#### Step 2: Implement Route (GREEN)

```typescript
// app/api/business/route.ts
import { getSession } from '@/lib/auth/session';
import { createBusinessSchema } from '@/lib/validation/business';
import { createBusiness } from '@/lib/db/queries';
import { transformBusinessToDTO } from '@/lib/data/business-dto';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const result = createBusinessSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({ error: result.error.errors }, { status: 400 });
  }
  
  const business = await createBusiness({
    ...result.data,
    teamId: session.user.teamId,
  });
  
  const dto = transformBusinessToDTO(business);
  return Response.json({ business: dto }, { status: 201 });
}
```

---

## 🔄 Integration with `lib/` Modules

### Pages Integration

#### Using Hooks (`lib/hooks/`)

```typescript
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { useUser } from '@/lib/hooks/use-user';
import { useTeam } from '@/lib/hooks/use-team';

export default function DashboardPage() {
  const { user } = useUser();
  const { team } = useTeam();
  const { stats, loading, error } = useDashboard();
  
  // Use data from hooks
}
```

#### Using Components (`components/`)

```typescript
// app/(dashboard)/dashboard/page.tsx
import { BusinessListCard } from '@/components/business/business-list-card';
import { BusinessListSkeleton } from '@/components/loading';
import { ErrorCard } from '@/components/error';

export default function DashboardPage() {
  // Render using components
  return (
    <div>
      {businesses.map(business => (
        <BusinessListCard key={business.id} business={business} />
      ))}
    </div>
  );
}
```

### API Routes Integration

#### Using Services (`lib/services/`)

```typescript
// app/api/business/[id]/process/route.ts
import { executeBusinessFlow } from '@/lib/services/business-execution';
import { getSession } from '@/lib/auth/session';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  await executeBusinessFlow(Number(params.id));
  return Response.json({ success: true });
}
```

#### Using DTOs (`lib/data/`)

```typescript
// app/api/dashboard/route.ts
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const dashboardData = await getDashboardDTO(session.user.teamId);
  return Response.json(dashboardData);
}
```

#### Using Validation (`lib/validation/`)

```typescript
// app/api/business/route.ts
import { createBusinessSchema } from '@/lib/validation/business';

export async function POST(request: Request) {
  const body = await request.json();
  const result = createBusinessSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json(
      { error: result.error.errors },
      { status: 400 }
    );
  }
  
  // Use validated data
  const business = await createBusiness(result.data);
}
```

#### Using Database (`lib/db/`)

```typescript
// app/api/business/route.ts
import { 
  getBusinessById,
  createBusiness,
  getBusinessesByTeam,
} from '@/lib/db/queries';

export async function GET() {
  const session = await getSession();
  const businesses = await getBusinessesByTeam(session.user.teamId);
  return Response.json({ businesses });
}
```

---

## 📋 Page Patterns

### Pattern 1: Client Component with Hooks

**For interactive pages that need client-side state:**

```typescript
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { BusinessListSkeleton } from '@/components/loading';

export default function DashboardPage() {
  const { stats, loading, error } = useDashboard();
  
  if (loading) return <BusinessListSkeleton />;
  if (error) return <ErrorCard error={error} />;
  
  return <div>{/* Render dashboard */}</div>;
}
```

### Pattern 2: Server Component with Direct Data Fetching

**For pages that can fetch data server-side:**

```typescript
// app/(dashboard)/dashboard/page.tsx
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in');
  }
  
  const dashboardData = await getDashboardDTO(session.user.teamId);
  return <DashboardClient data={dashboardData} />;
}
```

### Pattern 3: Server Actions

**For form submissions:**

```typescript
// app/actions/business.ts
'use server';

import { getSession } from '@/lib/auth/session';
import { createBusinessSchema } from '@/lib/validation/business';
import { createBusiness } from '@/lib/db/queries';

export async function createBusinessAction(
  prevState: any,
  formData: FormData
) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }
  
  const data = Object.fromEntries(formData);
  const result = createBusinessSchema.safeParse(data);
  
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }
  
  const business = await createBusiness({
    ...result.data,
    teamId: session.user.teamId,
  });
  
  return { success: true, business };
}
```

---

## 📋 API Route Patterns

### Pattern 1: GET Route

```typescript
// app/api/business/route.ts
import { getSession } from '@/lib/auth/session';
import { getBusinessesByTeam } from '@/lib/db/queries';
import { transformBusinessToDTO } from '@/lib/data/business-dto';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const businesses = await getBusinessesByTeam(session.user.teamId);
  const dtos = businesses.map(transformBusinessToDTO);
  
  return Response.json({ businesses: dtos });
}
```

### Pattern 2: POST Route with Validation

```typescript
// app/api/business/route.ts
import { getSession } from '@/lib/auth/session';
import { createBusinessSchema } from '@/lib/validation/business';
import { createBusiness } from '@/lib/db/queries';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const result = createBusinessSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json(
      { error: result.error.errors },
      { status: 400 }
    );
  }
  
  const business = await createBusiness({
    ...result.data,
    teamId: session.user.teamId,
  });
  
  return Response.json({ business }, { status: 201 });
}
```

### Pattern 3: Route with Service Integration

```typescript
// app/api/business/[id]/process/route.ts
import { getSession } from '@/lib/auth/session';
import { executeBusinessFlow } from '@/lib/services/business-execution';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await executeBusinessFlow(Number(params.id));
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🧪 TDD Testing Patterns

### Testing Pages

```typescript
// app/(dashboard)/dashboard/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import DashboardPage from '../page';
import { useDashboard } from '@/lib/hooks/use-dashboard';

vi.mock('@/lib/hooks/use-dashboard');

describe('Dashboard Page', () => {
  it('displays dashboard statistics', () => {
    vi.mocked(useDashboard).mockReturnValue({
      stats: {
        totalBusinesses: 5,
        avgVisibilityScore: 75,
        businesses: [],
      },
      loading: false,
      error: null,
    });
    
    render(<DashboardPage />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
```

### Testing API Routes

```typescript
// app/api/business/__tests__/route.test.ts
import { POST } from '../route';
import { getSession } from '@/lib/auth/session';
import { createBusiness } from '@/lib/db/queries';

vi.mock('@/lib/auth/session');
vi.mock('@/lib/db/queries');

describe('POST /api/business', () => {
  it('creates business and returns 201', async () => {
    vi.mocked(getSession).mockResolvedValue(createTestUser());
    vi.mocked(createBusiness).mockResolvedValue(createTestBusiness());
    
    const request = new Request('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Business',
        url: 'https://example.com',
      }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Components README**: `components/README.md`
- **API Routes Guide**: `app/api/README.md`
- **Hooks Module**: `lib/hooks/README.md`
- **Services Module**: `lib/services/README.md`
- **Data DTOs**: `lib/data/README.md`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Tests ARE Specifications**: Write tests first to define behavior
2. **Separation of Concerns**: Pages (UI) separate from API routes (backend)
3. **Integration with lib/**: Use services, DTOs, and hooks
4. **Type Safety**: Full TypeScript coverage
5. **Authentication**: All protected routes verify user session
6. **Validation**: All inputs validated with Zod schemas
7. **Error Handling**: Proper error responses and user feedback

---

## ⚠️ Important Notes

### Route Groups

- `(dashboard)` - Protected dashboard routes
- `(login)` - Public authentication routes
- Route groups don't affect URL structure

### Server vs Client Components

- **Server Components**: Default, can fetch data directly
- **Client Components**: Use `'use client'` for interactivity
- Pages can mix server and client components

### Data Flow

```
Page (Server Component)
  ↓ (fetches data)
lib/data/*-dto.ts
  ↓ (passes to client)
Client Component
  ↓ (uses hooks)
lib/hooks/use-*.ts
  ↓ (calls API)
app/api/**/route.ts
  ↓ (uses services)
lib/services/*.ts
  ↓ (uses database)
lib/db/queries.ts
```

### Authentication

- All protected routes check session
- Use `getSession()` from `lib/auth/session`
- Redirect to login if not authenticated

---

**Remember**: The app layer connects UI (components) with business logic (lib/). Write tests first, use lib/ modules, and keep pages and routes focused.




