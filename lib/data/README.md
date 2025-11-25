# Data Transfer Objects (DTOs) Module (`lib/data/`)

**Purpose**: Stable interfaces for API responses and UI consumption  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `data/` module provides Data Transfer Objects (DTOs) that transform database models into stable, UI-friendly interfaces. DTOs follow the Next.js Data Access Layer pattern, ensuring consistent API responses and frontend data structures.

### Architecture Principles

1. **Stable Interfaces**: DTOs don't change when database schema changes
2. **UI-Optimized**: Data formatted for frontend consumption
3. **Type Safety**: Full TypeScript coverage
4. **Separation of Concerns**: Database models separate from API contracts

---

## 🏗️ Module Structure

```
lib/data/
├── types.ts              # DTO type definitions
├── dashboard-dto.ts      # Dashboard data transformation
├── business-dto.ts       # Business data transformation
├── business-list-dto.ts  # Business list transformation
├── activity-dto.ts       # Activity feed transformation
├── analytics-dto.ts      # Analytics data transformation
├── crawl-dto.ts         # Crawl data transformation
├── fingerprint-dto.ts   # Fingerprint data transformation
├── status-dto.ts        # Status data transformation
├── wikidata-dto.ts      # Wikidata data transformation
└── __tests__/           # TDD test specifications
```

---

## 🔑 Core DTOs

### 1. Dashboard DTO (`dashboard-dto.ts`)

**Purpose**: Dashboard overview data with aggregated statistics

**Key Functions:**

```typescript
export async function getDashboardDTO(
  teamId: number
): Promise<DashboardDTO>
```

**DTO Structure:**

```typescript
interface DashboardDTO {
  totalBusinesses: number;
  wikidataEntities: number;
  avgVisibilityScore: number;
  businesses: DashboardBusinessDTO[];
  totalCrawled?: number;      // Count of crawled/published businesses
  totalPublished?: number;   // Count of published businesses
  recentActivity?: ActivityDTO[];
}

interface DashboardBusinessDTO {
  id: string;                        // Converted from number
  name: string;
  location: string;                   // "San Francisco, CA"
  visibilityScore: number | null;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
  wikidataQid: string | null;
  lastFingerprint: string;           // "2 days ago"
  status: BusinessStatus;
  automationEnabled?: boolean;
}
```

**Usage:**

```typescript
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

const dashboardData = await getDashboardDTO(teamId);
console.log(dashboardData.totalBusinesses);
console.log(dashboardData.avgVisibilityScore);
```

---

### 2. Business DTO (`business-dto.ts`)

**Purpose**: Business detail data transformation

**Key Functions:**

```typescript
export function transformBusinessToDTO(
  business: Business,
  fingerprint?: LLMFingerprint,
  wikidataEntity?: WikidataEntity
): BusinessDTO
```

**Usage:**

```typescript
import { transformBusinessToDTO } from '@/lib/data/business-dto';

const business = await getBusinessById(id);
const fingerprint = await getFingerprintByBusinessId(id);
const dto = transformBusinessToDTO(business, fingerprint);
```

---

### 3. Activity DTO (`activity-dto.ts`)

**Purpose**: Activity feed data transformation

**Key Functions:**

```typescript
export async function getActivityFeedDTO(
  teamId: number,
  limit?: number
): Promise<{ activities: ActivityDTO[]; total: number }>
```

**DTO Structure:**

```typescript
interface ActivityDTO {
  id: number;
  type: 'business_created' | 'crawl_completed' | 'fingerprint_completed' | 'published';
  businessId: number;
  businessName: string;
  message: string;                   // Human-readable message
  timestamp: string;                  // ISO date string
  metadata?: Record<string, any>;
}
```

**Usage:**

```typescript
import { getActivityFeedDTO } from '@/lib/data/activity-dto';

const { activities, total } = await getActivityFeedDTO(teamId, 10);
activities.forEach(activity => {
  console.log(`${activity.message} - ${activity.timestamp}`);
});
```

---

### 4. Analytics DTO (`analytics-dto.ts`)

**Purpose**: Analytics and metrics data transformation

**Key Functions:**

```typescript
export async function getAnalyticsDTO(
  teamId: number
): Promise<AnalyticsDTO>
```

**DTO Structure:**

```typescript
interface AnalyticsDTO {
  visibilityTrends: {
    date: string;
    avgScore: number;
    businessCount: number;
  }[];
  statusDistribution: {
    status: BusinessStatus;
    count: number;
  }[];
  publishingStats: {
    totalPublished: number;
    totalPending: number;
    successRate: number;
  };
}
```

---

### 5. Business List DTO (`business-list-dto.ts`)

**Purpose**: Business list data transformation

**Key Functions:**

```typescript
export async function getBusinessListDTO(
  teamId: number,
  filters?: BusinessListFilters
): Promise<BusinessListDTO>
```

---

## 🔄 Data Transformation Flow

```
Database Models (lib/db/schema.ts)
    ↓
DTO Transformers (lib/data/*-dto.ts)
    ↓
Stable DTO Interfaces (lib/data/types.ts)
    ↓
API Routes (app/api/**/route.ts)
    ↓
Frontend Components
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Dashboard DTO
 * 
 * As a frontend developer
 * I want dashboard data in a consistent format
 * So that I can display it reliably
 * 
 * Acceptance Criteria:
 * - Dashboard DTO includes total businesses count
 * - Dashboard DTO includes average visibility score
 * - Dashboard DTO includes business list with formatted data
 */
describe('Dashboard DTO - Specification', () => {
  it('transforms database businesses to dashboard format', async () => {
    // SPECIFICATION: Given database businesses
    const businesses = [
      createTestBusiness({ id: 1, name: 'Test Business' }),
    ];
    
    // SPECIFICATION: When DTO is generated
    const dto = await getDashboardDTO(teamId);
    
    // SPECIFICATION: Then DTO should have correct structure
    expect(dto.totalBusinesses).toBe(1);
    expect(dto.businesses).toHaveLength(1);
    expect(dto.businesses[0].id).toBe('1'); // Converted to string
    expect(dto.businesses[0].name).toBe('Test Business');
  });
  
  it('calculates aggregated statistics', async () => {
    const businesses = [
      createTestBusiness({ status: 'crawled' }),
      createTestBusiness({ status: 'published' }),
      createTestBusiness({ status: 'published' }),
    ];
    
    const dto = await getDashboardDTO(teamId);
    
    expect(dto.totalCrawled).toBe(3); // crawled + published
    expect(dto.totalPublished).toBe(2); // published only
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/data/__tests__/dashboard-dto.tdd.test.ts

# With coverage
pnpm test:coverage lib/data/
```

---

## 📋 DTO Design Patterns

### 1. ID Conversion

**Database**: `id: number`  
**DTO**: `id: string`

```typescript
// Transformation
id: business.id.toString()
```

### 2. Date Formatting

**Database**: `createdAt: Date`  
**DTO**: `createdAt: string` (ISO format or "2 days ago")

```typescript
// Transformation
createdAt: formatDistanceToNow(business.createdAt, { addSuffix: true })
```

### 3. Status Aggregation

**Database**: Multiple businesses with various statuses  
**DTO**: Aggregated counts

```typescript
// Transformation
totalCrawled: businesses.filter(b => 
  b.status === 'crawled' || b.status === 'published'
).length
```

### 4. Nested Data Flattening

**Database**: Related tables (fingerprints, wikidata entities)  
**DTO**: Flattened structure

```typescript
// Transformation
visibilityScore: fingerprint?.visibilityScore ?? null
wikidataQid: wikidataEntity?.qid ?? null
```

---

## 🔗 Integration with API Routes

### Usage in API Routes

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

### Usage in Server Components

```typescript
// app/(dashboard)/dashboard/page.tsx
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { getSession } from '@/lib/auth/session';

export default async function DashboardPage() {
  const session = await getSession();
  const dashboardData = await getDashboardDTO(session.user.teamId);
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Businesses: {dashboardData.totalBusinesses}</p>
      {/* ... */}
    </div>
  );
}
```

---

## 🎯 Key Principles

1. **Stable Interfaces**: DTOs don't change when database changes
2. **UI-Optimized**: Data formatted for frontend consumption
3. **Type Safety**: Full TypeScript coverage
4. **Separation of Concerns**: Database models separate from API contracts
5. **TDD Development**: Write tests first as specifications
6. **DRY**: Reusable transformation functions

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Database Schema**: `lib/db/schema.ts`
- **API Routes**: `app/api/`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

**Remember**: DTOs are the contract between backend and frontend. Keep them stable, well-tested, and UI-optimized.


