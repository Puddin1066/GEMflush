# DTO → Component → Dashboard Mapping

**Date**: January 2025  
**Approach**: Bottom-Up Architecture  
**Status**: ✅ **YES - This is the recommended approach**

---

## 🎯 **Architecture Overview**

**YES, this should be done from a bottom-up approach:**

```
┌─────────────────────────────────────────────────────────────┐
│         DASHBOARD PAGES (app/(dashboard)/dashboard/)        │
│  • Compose components                                        │
│  • Use hooks that return DTOs                               │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses
┌─────────────────────────────────────────────────────────────┐
│         COMPONENTS (components/**/)                         │
│  • Accept DTOs as props                                     │
│  • Display relevant, informative, valuable data            │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses
┌─────────────────────────────────────────────────────────────┐
│         DTOs (lib/data/**-dto.ts)                          │
│  • Stable data contracts                                    │
│  • UI-friendly format                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **Current Status**

### **API Routes Using DTOs** ✅

| Route | DTO Used | Status |
|-------|----------|--------|
| `GET /api/dashboard` | `DashboardDTO` via `getDashboardDTO()` | ✅ **Connected** |
| `GET /api/business` | `DashboardBusinessDTO[]` via `getDashboardDTO()` | ✅ **Connected** |
| `GET /api/business/[id]` | `BusinessDetailDTO` via `toBusinessDetailDTO()` | ✅ **Connected** |
| `GET /api/fingerprint/business/[businessId]` | `FingerprintDetailDTO` via `toFingerprintDetailDTO()` | ✅ **Connected** |
| `GET /api/wikidata/entity/[businessId]` | `WikidataEntityDetailDTO` via `toWikidataEntityDetailDTO()` | ✅ **Connected** |

**Good News**: ✅ API routes are already using DTOs!

---

## 📊 **DTO → Component Mapping**

### ✅ **Components Already Using DTOs**

| Component | Location | DTO Used | Status |
|-----------|----------|----------|--------|
| `VisibilityIntelCard` | `components/fingerprint/` | `FingerprintDetailDTO` | ✅ **Connected** |
| `ModelBreakdownList` | `components/fingerprint/` | `FingerprintResultDTO[]` | ✅ **Connected** |
| `CompetitiveLeaderboard` | `components/competitive/` | `CompetitiveLeaderboardDTO` | ✅ **Connected** |
| `CompetitorRow` | `components/competitive/` | `CompetitorDTO` | ✅ **Connected** |
| `EntityPreviewCard` | `components/wikidata/` | `WikidataEntityDetailDTO` | ✅ **Connected** |
| `JsonPreviewModal` | `components/wikidata/` | `WikidataEntityDetailDTO` | ✅ **Connected** |
| `VisibilityScoreChart` | `components/fingerprint/` | `FingerprintHistoryDTO[]` | ✅ **Connected** |

### ❌ **Components NOT Using DTOs (Need Updates)**

| Component | Location | Currently Accepts | Should Accept | Priority |
|-----------|----------|-------------------|---------------|----------|
| `GemOverviewCard` | `components/business/` | Raw business object | `BusinessDetailDTO` | 🔴 **HIGH** |
| `BusinessListCard` | `components/business/` | Raw business object | `DashboardBusinessDTO` | 🔴 **HIGH** |
| `BusinessProcessingStatus` | `components/business/` | Status string | `BusinessStatusDTO` (create) | 🟡 **MEDIUM** |
| `AutomatedCFPStatus` | `components/business/` | Status string | `CFPProgressDTO` (create) | 🟡 **MEDIUM** |

---

## 🎯 **Implementation Plan**

### **Phase 1: Update Business Components to Use DTOs** 🔴 **HIGH PRIORITY**

#### 1.1 Update `GemOverviewCard` to Accept `BusinessDetailDTO`

**Current**:
```tsx
// components/business/gem-overview-card.tsx
interface GemOverviewCardProps {
  business: {
    name: string;
    url: string;
    status: string;
    // ... raw fields
  };
}
```

**Should Be**:
```tsx
// components/business/gem-overview-card.tsx
import type { BusinessDetailDTO } from '@/lib/data/types';

interface GemOverviewCardProps {
  business: BusinessDetailDTO; // ✅ Use DTO
}
```

**Benefits**:
- ✅ Type safety with stable interface
- ✅ Consistent data format
- ✅ Easy to refactor if DTO changes
- ✅ Clear separation of concerns

#### 1.2 Update `BusinessListCard` to Accept `DashboardBusinessDTO`

**Current**:
```tsx
// components/business/business-list-card.tsx
interface BusinessListCardProps {
  business: {
    id: string;
    name: string;
    // ... raw fields
  };
}
```

**Should Be**:
```tsx
// components/business/business-list-card.tsx
import type { DashboardBusinessDTO } from '@/lib/data/types';

interface BusinessListCardProps {
  business: DashboardBusinessDTO; // ✅ Use DTO
}
```

**Benefits**:
- ✅ Uses DTO that's already returned by API
- ✅ Consistent with dashboard data structure
- ✅ Type-safe business list rendering

---

### **Phase 2: Create Missing DTOs** 🟡 **MEDIUM PRIORITY**

#### 2.1 Create `BusinessStatusDTO`

**File**: `lib/data/status-dto.ts`

```typescript
/**
 * Business Status DTO
 * Used by: BusinessProcessingStatus, AutomatedCFPStatus components
 */
export interface BusinessStatusDTO {
  status: 'pending' | 'crawling' | 'crawled' | 'generating' | 'published' | 'error';
  progress: number; // 0-100
  message: string; // Human-readable status message
  stage?: 'crawl' | 'fingerprint' | 'publish' | 'complete';
  lastUpdated: string; // Formatted timestamp
  automationEnabled: boolean;
}

export function toBusinessStatusDTO(
  business: { status: string; automationEnabled?: boolean; updatedAt?: Date }
): BusinessStatusDTO {
  return {
    status: business.status as BusinessStatusDTO['status'],
    progress: calculateProgress(business.status),
    message: getStatusMessage(business.status),
    stage: getStage(business.status),
    lastUpdated: formatTimestamp(business.updatedAt),
    automationEnabled: business.automationEnabled ?? true,
  };
}
```

**Used By**:
- `BusinessProcessingStatus`
- `AutomatedCFPStatus`

#### 2.2 Create `CFPProgressDTO`

**File**: `lib/data/status-dto.ts` (add to existing file)

```typescript
/**
 * CFP Progress DTO
 * Used by: CFPProcessingLogs component
 */
export interface CFPProgressDTO {
  stage: 'crawling' | 'fingerprinting' | 'creating_entity' | 'publishing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  timestamp: string; // Formatted timestamp
  logs: Array<{
    timestamp: string;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    step: string;
  }>;
}

export function toCFPProgressDTO(
  status: string,
  progress?: number,
  logs?: any[]
): CFPProgressDTO {
  return {
    stage: mapStatusToStage(status),
    progress: progress ?? calculateCFPProgress(status),
    message: getCFPStatusMessage(status),
    timestamp: new Date().toISOString(),
    logs: logs?.map(formatLog) ?? [],
  };
}
```

**Used By**:
- `CFPProcessingLogs`

---

### **Phase 3: Dashboard Pages → Components** ✅ **ALREADY GOOD**

#### Current Dashboard Page Structure:

```tsx
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useDashboard } from '@/lib/hooks/use-dashboard';
import { BusinessListCard } from '@/components/business/business-list-card';

export default function DashboardPage() {
  const { stats, loading, error } = useDashboard();
  
  // ✅ Hook returns DashboardDTO (contains DashboardBusinessDTO[])
  return (
    <div>
      {stats.businesses.map(business => (
        <BusinessListCard 
          key={business.id} 
          business={business} // ✅ Already DTO from API
        />
      ))}
    </div>
  );
}
```

**Status**: ✅ Already correct - pages use hooks that return DTOs

---

## 🔍 **Component Prop Analysis**

### **Components That Need DTO Updates**

#### 1. `GemOverviewCard`

**Current Props**:
```tsx
interface GemOverviewCardProps {
  business: {
    name: string;
    url: string;
    category?: string | null;
    location?: { city: string; state: string; country: string } | null;
    wikidataQID?: string | null;
    status: string;
    createdAt: Date | string;
  };
  // ... other props
}
```

**Should Be**:
```tsx
import type { BusinessDetailDTO } from '@/lib/data/types';

interface GemOverviewCardProps {
  business: BusinessDetailDTO; // ✅ Use DTO
  // ... other props
}
```

**Why**: 
- ✅ `BusinessDetailDTO` already matches this structure
- ✅ API route already returns `BusinessDetailDTO`
- ✅ Type-safe and maintainable

#### 2. `BusinessListCard`

**Current Props**:
```tsx
interface BusinessListCardProps {
  business: {
    id: string;
    name: string;
    location?: string;
    visibilityScore?: number | null;
    trend?: 'up' | 'down' | 'neutral';
    wikidataQid?: string | null;
    lastFingerprint?: string;
    status: string;
  };
}
```

**Should Be**:
```tsx
import type { DashboardBusinessDTO } from '@/lib/data/types';

interface BusinessListCardProps {
  business: DashboardBusinessDTO; // ✅ Use DTO
}
```

**Why**:
- ✅ `DashboardBusinessDTO` already has all these fields
- ✅ API route returns `DashboardBusinessDTO[]`
- ✅ Perfect match

---

## 📋 **Complete DTO → Component → Dashboard Flow**

### **Example 1: Business Detail Page**

```
1. DATABASE
   lib/db/queries.ts
   ↓ getBusinessById(id) → Business domain object

2. DTO LAYER
   lib/data/business-dto.ts
   ↓ toBusinessDetailDTO(business) → BusinessDetailDTO

3. API ROUTE
   app/api/business/[id]/route.ts
   ↓ GET /api/business/[id] → { business: BusinessDetailDTO }

4. HOOK
   lib/hooks/use-business-detail.ts
   ↓ useBusinessDetail(id) → { business: BusinessDetailDTO }

5. COMPONENT (should use DTO)
   components/business/gem-overview-card.tsx
   ↓ <GemOverviewCard business={business} /> (business is BusinessDetailDTO)

6. DASHBOARD PAGE
   app/(dashboard)/dashboard/businesses/[id]/page.tsx
   ↓ Composes components with DTO props
```

**Current Status**:
- ✅ Steps 1-4: Already using DTOs
- ❌ Step 5: Component not accepting DTO (needs update)
- ✅ Step 6: Page correctly uses hook

---

## 🎯 **Recommended Actions**

### **Action 1: Update `GemOverviewCard` to Accept `BusinessDetailDTO`**

**File**: `components/business/gem-overview-card.tsx`

**Change**: Replace inline business type with `BusinessDetailDTO`

**Benefits**:
- ✅ Type safety
- ✅ Consistent with API response
- ✅ Easier to maintain

### **Action 2: Update `BusinessListCard` to Accept `DashboardBusinessDTO`**

**File**: `components/business/business-list-card.tsx`

**Change**: Replace inline business type with `DashboardBusinessDTO`

**Benefits**:
- ✅ Matches API response structure
- ✅ Type-safe business list rendering
- ✅ Consistent with dashboard data

### **Action 3: Create Missing DTOs**

**File**: `lib/data/status-dto.ts`

**Create**:
- `BusinessStatusDTO` interface
- `CFPProgressDTO` interface
- Transformation functions

**Used By**:
- `BusinessProcessingStatus`
- `AutomatedCFPStatus`
- `CFPProcessingLogs`

---

## ✅ **Benefits of Bottom-Up Approach**

### **1. Type Safety**
- ✅ Components receive typed DTOs (not raw objects)
- ✅ TypeScript catches mismatches at compile time
- ✅ Auto-completion in IDEs

### **2. Maintainability**
- ✅ Change database schema → Update DTO → Components auto-update
- ✅ DTO changes propagate through all components
- ✅ Clear separation of concerns

### **3. Testability**
- ✅ Test DTO transformation independently
- ✅ Test components with mock DTOs
- ✅ Test pages with mock components

### **4. DRY (Don't Repeat Yourself)**
- ✅ Data formatting happens once in DTO layer
- ✅ Components reuse DTO types
- ✅ No duplicate formatting logic

### **5. SOLID Principles**
- ✅ **Single Responsibility**: DTOs transform, components display
- ✅ **Open/Closed**: Add new DTOs/components without modifying existing
- ✅ **Liskov Substitution**: Components work with any matching DTO

---

## 📊 **Coverage Matrix**

### **DTO Coverage by Component Type**

| Component Category | Total | Using DTOs | Not Using | Coverage |
|-------------------|-------|------------|-----------|----------|
| **Fingerprint** | 5 | 4 | 1 | ✅ 80% |
| **Wikidata** | 2 | 2 | 0 | ✅ 100% |
| **Competitive** | 4 | 4 | 0 | ✅ 100% |
| **Business** | 6 | 0 | 6 | ❌ 0% |
| **Activity** | 1 | 0 | 1 | ❌ 0% |

### **DTO Coverage by Dashboard Page**

| Dashboard Page | Components | Using DTOs | Not Using | Coverage |
|----------------|-----------|------------|-----------|----------|
| **Overview** (`/dashboard`) | 3 | 1 | 2 | ⚠️ 33% |
| **Business Detail** (`/businesses/[id]`) | 4 | 3 | 1 | ✅ 75% |
| **Fingerprint** (`/businesses/[id]/fingerprint`) | 2 | 2 | 0 | ✅ 100% |
| **Competitive** (`/businesses/[id]/competitive`) | 1 | 1 | 0 | ✅ 100% |

---

## 🎯 **Priority Actions**

### **Priority 1: Business Components (HIGH)**
1. ✅ Update `GemOverviewCard` → Accept `BusinessDetailDTO`
2. ✅ Update `BusinessListCard` → Accept `DashboardBusinessDTO`

**Impact**: 
- ✅ Complete business data flow uses DTOs
- ✅ Type-safe business components
- ✅ Consistent with API responses

### **Priority 2: Status DTOs (MEDIUM)**
3. ✅ Create `BusinessStatusDTO` in `lib/data/status-dto.ts`
4. ✅ Create `CFPProgressDTO` in `lib/data/status-dto.ts`
5. ✅ Update `BusinessProcessingStatus` → Accept `BusinessStatusDTO`
6. ✅ Update `AutomatedCFPStatus` → Accept `BusinessStatusDTO`
7. ✅ Update `CFPProcessingLogs` → Accept `CFPProgressDTO`

**Impact**:
- ✅ Status components use DTOs
- ✅ Consistent status display
- ✅ Type-safe status handling

### **Priority 3: Activity Components (LOW)**
8. ✅ Create `ActivityDTO` transformation (already defined in types.ts)
9. ✅ Update activity components to use `ActivityDTO`

**Impact**:
- ✅ Activity feed uses DTOs
- ✅ Consistent activity display

---

## ✅ **Conclusion**

**YES, this should be done from a bottom-up approach:**

1. ✅ **DTOs** (`lib/data/`) define stable data contracts - **Already done**
2. ⚠️ **Components** (`components/`) should consume DTOs - **Partially done**
   - ✅ Fingerprint components: Using DTOs
   - ✅ Wikidata components: Using DTOs
   - ✅ Competitive components: Using DTOs
   - ❌ Business components: NOT using DTOs (needs update)
3. ✅ **Dashboard Pages** (`app/(dashboard)/`) compose components - **Already done**

**Next Steps**:
1. Update `GemOverviewCard` to accept `BusinessDetailDTO`
2. Update `BusinessListCard` to accept `DashboardBusinessDTO`
3. Create missing status DTOs
4. Update status components to use DTOs

---

**Status**: ✅ **RECOMMENDED APPROACH** - Complete business component updates to finish implementation

