# DTO Coverage Analysis

**Date**: November 22, 2025  
**Question**: Are all associated components and processes connected via `@data` DTOs?

---

## 📊 **Summary**

**Answer**: ❌ **No, not all components and processes are connected via `@data` DTOs.**

Some API routes return raw database objects directly, while others properly use DTOs from `lib/data`.

---

## ✅ **Routes Using DTOs (Connected via @data)**

### 1. **Dashboard**
- **Route**: `app/api/dashboard/route.ts`
- **DTO**: `getDashboardDTO()` from `lib/data/dashboard-dto.ts`
- **Status**: ✅ **Connected**

### 2. **Fingerprint Detail**
- **Route**: `app/api/fingerprint/business/[businessId]/route.ts`
- **DTO**: `toFingerprintDetailDTO()` from `lib/data/fingerprint-dto.ts`
- **Status**: ✅ **Connected**

- **Route**: `app/api/fingerprint/[id]/route.ts`
- **DTO**: `toFingerprintDetailDTO()` from `lib/data/fingerprint-dto.ts`
- **Status**: ✅ **Connected**

### 3. **Wikidata Entity**
- **Route**: `app/api/wikidata/entity/[businessId]/route.ts`
- **DTO**: `getWikidataPublishDTO()` and `toWikidataEntityDetailDTO()` from `lib/data/wikidata-dto.ts`
- **Status**: ✅ **Connected**

### 4. **Wikidata Publish**
- **Route**: `app/api/wikidata/publish/route.ts`
- **DTO**: `getWikidataPublishDTO()` from `lib/data/wikidata-dto.ts`
- **Status**: ✅ **Connected**

### 5. **Competitive Leaderboard**
- **Route**: `app/(dashboard)/dashboard/businesses/[id]/competitive/page.tsx`
- **DTO**: `toCompetitiveLeaderboardDTO()` from `lib/data/fingerprint-dto.ts`
- **Status**: ✅ **Connected**

---

## ❌ **Routes NOT Using DTOs (Returning Raw Database Objects)**

### 1. **Business List**
- **Route**: `app/api/business/route.ts` (GET)
- **Current**: Returns raw `Business[]` from database
- **Should Use**: `BusinessDetailDTO[]` or `DashboardBusinessDTO[]`
- **Status**: ❌ **Not Connected**

```typescript
// Current (raw database object)
const businesses = await getBusinessesByTeam(team.id);
return NextResponse.json({ businesses });

// Should be (DTO)
const dto = await getBusinessesDTO(team.id);
return NextResponse.json(dto);
```

### 2. **Business Detail**
- **Route**: `app/api/business/[id]/route.ts` (GET)
- **Current**: Returns raw `Business` object (only serializes dates)
- **Should Use**: `BusinessDetailDTO` from `lib/data/types.ts`
- **Status**: ❌ **Not Connected**

```typescript
// Current (raw database object with date serialization)
const business = await getBusinessById(businessId);
return NextResponse.json({
  business: {
    ...business,
    createdAt: business.createdAt.toISOString(),
    // ... other date serializations
  }
});

// Should be (DTO)
const dto = await getBusinessDetailDTO(businessId);
return NextResponse.json(dto);
```

### 3. **Business Status**
- **Route**: `app/api/business/[id]/status/route.ts`
- **Current**: Returns raw status object
- **Should Use**: `BusinessStatusDTO` (needs to be created)
- **Status**: ❌ **Not Connected**

### 4. **Fingerprint History**
- **Route**: `app/api/business/[id]/fingerprint/history/route.ts`
- **Current**: Returns raw `LLMFingerprint[]` array
- **Should Use**: `FingerprintHistoryDTO[]` (needs to be created or use `FingerprintDetailDTO[]`)
- **Status**: ❌ **Not Connected**

### 5. **Business Process**
- **Route**: `app/api/business/[id]/process/route.ts`
- **Current**: Returns raw response object
- **Status**: ⚠️ **Partial** (may not need DTO if just returning success/error)

### 6. **Crawl Job**
- **Route**: `app/api/job/[jobId]/route.ts`
- **Current**: Returns raw crawl job object
- **Should Use**: `CrawlJobDTO` (needs to be created)
- **Status**: ❌ **Not Connected**

---

## 🔍 **Component Usage**

### ✅ **Components Using DTOs**

1. **VisibilityIntelCard**
   - Uses: `FingerprintDetailDTO` from `lib/data/types.ts`
   - Status: ✅ **Connected**

2. **CompetitiveEdgeCard**
   - Uses: `CompetitiveLeaderboardDTO` from `lib/data/types.ts`
   - Status: ✅ **Connected**

3. **EntityPreviewCard**
   - Uses: `WikidataEntityDetailDTO` from `lib/data/types.ts`
   - Status: ✅ **Connected**

4. **useBusinessDetail Hook**
   - Receives: Raw `Business` object (not DTO)
   - Receives: `FingerprintDetailDTO` (DTO)
   - Receives: `WikidataEntityDetailDTO` (DTO)
   - Status: ⚠️ **Partial** (business not using DTO)

---

## 📋 **Missing DTOs**

The following DTOs need to be created in `lib/data/`:

1. **BusinessDetailDTO** - Already defined in `lib/data/types.ts` but not used
2. **BusinessStatusDTO** - For business status API
3. **FingerprintHistoryDTO** - For fingerprint history API
4. **CrawlJobDTO** - For crawl job API
5. **BusinessListDTO** - For business list API (or reuse `DashboardBusinessDTO[]`)

---

## 🎯 **Recommendations**

### High Priority
1. ✅ Create `toBusinessDetailDTO()` in `lib/data/business-dto.ts`
2. ✅ Update `app/api/business/[id]/route.ts` to use DTO
3. ✅ Update `app/api/business/route.ts` (GET) to use `DashboardBusinessDTO[]`

### Medium Priority
4. ✅ Create `toFingerprintHistoryDTO()` in `lib/data/fingerprint-dto.ts`
5. ✅ Update `app/api/business/[id]/fingerprint/history/route.ts` to use DTO
6. ✅ Create `toCrawlJobDTO()` in `lib/data/crawl-dto.ts`
7. ✅ Update `app/api/job/[jobId]/route.ts` to use DTO

### Low Priority
8. ✅ Create `BusinessStatusDTO` for status endpoint
9. ✅ Standardize all API responses to use DTOs

---

## 📊 **Coverage Statistics**

| Category | Total | Using DTOs | Not Using DTOs | Coverage |
|----------|-------|------------|----------------|----------|
| **API Routes** | 15+ | 5 | 6+ | ~45% |
| **Components** | 10+ | 4 | 6+ | ~40% |
| **Hooks** | 5+ | 2 | 3+ | ~40% |

---

## 🔄 **Data Flow Patterns**

### ✅ **Correct Pattern (Using DTOs)**
```
Database → Domain Object → DTO (lib/data) → API Route → Hook → Component
```

### ❌ **Incorrect Pattern (Bypassing DTOs)**
```
Database → Raw Object → API Route → Hook → Component
```

---

## 📝 **Example: Business Detail Route**

### Current (Not Using DTO)
```typescript
// app/api/business/[id]/route.ts
const business = await getBusinessById(businessId);
return NextResponse.json({
  business: {
    ...business,
    createdAt: business.createdAt.toISOString(),
    // Manual date serialization
  }
});
```

### Recommended (Using DTO)
```typescript
// app/api/business/[id]/route.ts
import { toBusinessDetailDTO } from '@/lib/data/business-dto';

const business = await getBusinessById(businessId);
const dto = toBusinessDetailDTO(business);
return NextResponse.json(dto);
```

---

## ✅ **Conclusion**

**Not all components and processes are connected via `@data` DTOs.**

- ✅ **Fingerprint data**: Fully connected via DTOs
- ✅ **Wikidata data**: Fully connected via DTOs
- ✅ **Dashboard data**: Fully connected via DTOs
- ❌ **Business data**: Partially connected (detail route not using DTO)
- ❌ **Crawl job data**: Not connected via DTOs
- ❌ **Fingerprint history**: Not connected via DTOs

**Recommendation**: Complete the DTO layer by creating missing DTOs and updating all API routes to use them.

---

**Status**: ⚠️ **PARTIAL COVERAGE** - Some routes bypass DTOs


