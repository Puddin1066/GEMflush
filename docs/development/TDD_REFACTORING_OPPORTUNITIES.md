# TDD Refactoring Opportunities

**Date**: January 2025  
**Status**: 🔵 **REFACTOR Phase** - Tests passing, ready to improve code quality  
**Principle**: Improve code while keeping all tests green

---

## 🎯 TDD Refactor Phase

After achieving **GREEN** (all tests passing), the **REFACTOR** phase focuses on:
- Improving code quality
- Removing duplication (DRY)
- Enhancing readability
- Optimizing performance
- **Without changing behavior** (tests must stay green)

---

## 📋 Refactoring Opportunities

### 1. **Dashboard DTO - Status Aggregation** 🔵

**File**: `lib/data/dashboard-dto.ts`

**Current Implementation** (Lines 42-47):
```typescript
// Calculate aggregated stats
const totalCrawled = businesses.filter(b => 
  b.status === 'crawled' || b.status === 'published'
).length;
const totalPublished = businesses.filter(b => 
  b.status === 'published'
).length;
```

**Refactoring Opportunities**:

1. **Extract Status Aggregation Function** (DRY)
   - Create reusable function for status counting
   - Can be used by other DTOs that need status aggregation
   ```typescript
   function aggregateBusinessStatuses(businesses: Business[]): {
     totalCrawled: number;
     totalPublished: number;
     totalPending: number;
   } {
     return {
       totalCrawled: businesses.filter(b => 
         b.status === 'crawled' || b.status === 'published'
       ).length,
       totalPublished: businesses.filter(b => 
         b.status === 'published'
       ).length,
       totalPending: businesses.filter(b => 
         b.status === 'pending'
       ).length,
     };
   }
   ```

2. **Single Pass Through Businesses** (Performance)
   - Currently iterates through businesses array twice
   - Could use `reduce()` to calculate all stats in one pass
   ```typescript
   const stats = businesses.reduce((acc, b) => {
     if (b.status === 'crawled' || b.status === 'published') acc.totalCrawled++;
     if (b.status === 'published') acc.totalPublished++;
     return acc;
   }, { totalCrawled: 0, totalPublished: 0 });
   ```

3. **Type Safety** (SOLID)
   - Replace `any` types with proper TypeScript types
   - Lines 66-68: `business: any, fingerprint: any, fingerprintHistory: any[]`

---

### 2. **Activity DTO - Type Detection Logic** 🔵

**File**: `lib/data/activity-dto.ts`

**Current Implementation** (Lines 22-49):
```typescript
export async function toActivityDTO(
  item: CrawlJob | any,
  business: Business,
  type?: 'fingerprint' | 'publish'
): Promise<ActivityDTO> {
  // Handle crawl jobs (no type parameter, has status and progress)
  if (!type && item && typeof item === 'object' && 'status' in item && 'progress' in item) {
    return transformCrawlJobToActivity(item as CrawlJob, business);
  }
  
  // Handle fingerprints
  if (type === 'fingerprint' || (item && typeof item === 'object' && 'visibilityScore' in item && !('status' in item))) {
    return transformFingerprintToActivity(item, business);
  }
  
  // Handle publishes
  if (type === 'publish' || (item && typeof item === 'object' && ('qid' in item || 'publishedAt' in item))) {
    return transformPublishToActivity(item, business);
  }
  
  // Fallback: treat as crawl job if it has status
  if (item && typeof item === 'object' && 'status' in item) {
    return transformCrawlJobToActivity(item as CrawlJob, business);
  }
  
  // Fallback (shouldn't happen)
  throw new Error(`Unknown activity type: ${type || 'unknown'}`);
}
```

**Refactoring Opportunities**:

1. **Type Guards** (Type Safety)
   - Replace complex `if` checks with proper TypeScript type guards
   - Makes code more readable and type-safe
   ```typescript
   function isCrawlJob(item: unknown): item is CrawlJob {
     return item !== null && 
            typeof item === 'object' && 
            'status' in item && 
            'progress' in item;
   }
   
   function isFingerprint(item: unknown): item is Fingerprint {
     return item !== null && 
            typeof item === 'object' && 
            'visibilityScore' in item && 
            !('status' in item);
   }
   
   function isPublish(item: unknown): item is Publish {
     return item !== null && 
            typeof item === 'object' && 
            ('qid' in item || 'publishedAt' in item);
   }
   ```

2. **Remove `any` Types** (Type Safety)
   - Line 23: `item: CrawlJob | any` should be `item: CrawlJob | Fingerprint | Publish`
   - Create proper union types

3. **Simplify Logic** (Readability)
   - The type detection logic is complex and hard to follow
   - Use early returns and clearer structure

---

### 3. **Activity DTO - getActivityFeedDTO** 🔵

**File**: `lib/data/activity-dto.ts`

**Current Implementation** (Lines 140-193):
```typescript
export async function getActivityFeedDTO(teamId: number): Promise<{ activities: ActivityDTO[]; total: number }> {
  // Import queries
  const queries = await import('@/lib/db/queries');
  const { getBusinessById } = queries;
  
  // TDD: These query functions may not exist yet - create stubs that return empty arrays
  // Tests will mock these, but we need fallbacks for when they don't exist
  const getCrawlJobsByTeam = (queries as any).getCrawlJobsByTeam || (() => Promise.resolve([]));
  const getFingerprintsByTeam = (queries as any).getFingerprintsByTeam || (() => Promise.resolve([]));
  const getWikidataPublishesByTeam = (queries as any).getWikidataPublishesByTeam || (() => Promise.resolve([]));

  // Fetch all activity types
  const [crawlJobs, fingerprints, publishes] = await Promise.all([
    getCrawlJobsByTeam(teamId).catch(() => []),
    getFingerprintsByTeam(teamId).catch(() => []),
    getWikidataPublishesByTeam(teamId).catch(() => []),
  ]);

  // Transform to activities
  const activities: ActivityDTO[] = [];

  // Transform crawl jobs
  for (const crawlJob of crawlJobs) {
    const business = await getBusinessById(crawlJob.businessId);
    if (business) {
      activities.push(await toActivityDTO(crawlJob, business));
    }
  }

  // Transform fingerprints
  for (const fingerprint of fingerprints) {
    const business = await getBusinessById(fingerprint.businessId);
    if (business) {
      activities.push(await toActivityDTO(fingerprint, business, 'fingerprint'));
    }
  }

  // Transform publishes
  for (const publish of publishes) {
    const business = await getBusinessById(publish.businessId);
    if (business) {
      activities.push(await toActivityDTO(publish, business, 'publish'));
    }
  }

  // Sort by most recent first
  activities.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Most recent first
  });

  return {
    activities,
    total: activities.length,
  };
}
```

**Refactoring Opportunities**:

1. **Remove `any` Types** (Type Safety)
   - Lines 147-149: `(queries as any)` should use proper types
   - Import types from queries module

2. **Extract Transformation Logic** (DRY)
   - The three transformation loops are nearly identical
   - Create a helper function:
   ```typescript
   async function transformActivities<T>(
     items: T[],
     getBusiness: (item: T) => Promise<Business | null>,
     transform: (item: T, business: Business) => Promise<ActivityDTO>
   ): Promise<ActivityDTO[]> {
     const activities: ActivityDTO[] = [];
     for (const item of items) {
       const business = await getBusiness(item);
       if (business) {
         activities.push(await transform(item, business));
       }
     }
     return activities;
   }
   ```

3. **Batch Business Lookups** (Performance)
   - Currently makes individual `getBusinessById` calls for each activity
   - Could batch fetch all businesses at once
   ```typescript
   const businessIds = new Set([
     ...crawlJobs.map(j => j.businessId),
     ...fingerprints.map(f => f.businessId),
     ...publishes.map(p => p.businessId),
   ]);
   const businesses = await getBusinessesByIds(Array.from(businessIds));
   const businessMap = new Map(businesses.map(b => [b.id, b]));
   ```

4. **Extract Sorting Logic** (Readability)
   - Move sorting to a separate function with clear name

---

### 4. **Dashboard DTO - Type Safety** 🔵

**File**: `lib/data/dashboard-dto.ts`

**Current Issues**:

1. **`any` Types** (Lines 66-68)
   ```typescript
   function transformBusinessToDTO(
     business: any,
     fingerprint: any,
     fingerprintHistory: any[] = []
   ): DashboardBusinessDTO {
   ```
   **Refactor**: Use proper types from schema
   ```typescript
   function transformBusinessToDTO(
     business: Business,
     fingerprint: LLMFingerprint | null,
     fingerprintHistory: LLMFingerprint[] = []
   ): DashboardBusinessDTO {
   ```

2. **Hardcoded Default** (Line 83)
   ```typescript
   automationEnabled: business.automationEnabled ?? true, // Use database value, not hardcoded
   ```
   **Refactor**: Remove hardcoded `true` - should be `false` or use actual database value
   ```typescript
   automationEnabled: business.automationEnabled ?? false,
   ```

3. **Location Formatting** (Line 102)
   ```typescript
   function formatLocation(location: any): string {
   ```
   **Refactor**: Use proper type
   ```typescript
   function formatLocation(location: Business['location']): string {
   ```

---

### 5. **Activity DTO - Details Object Construction** 🔵

**File**: `lib/data/activity-dto.ts`

**Current Implementation** (Lines 71-75):
```typescript
details: {
  ...(crawlJob.progress != null ? { progress: crawlJob.progress as number } : {}),
  ...(crawlJob.errorMessage ? { error: crawlJob.errorMessage } : {}),
  ...(status === 'completed' ? { result: 'Crawl completed successfully' } : {}),
},
```

**Refactoring Opportunities**:

1. **Extract Details Builder** (DRY)
   - This pattern is repeated in multiple transform functions
   - Create helper:
   ```typescript
   function buildActivityDetails(options: {
     progress?: number | null;
     error?: string | null;
     result?: string;
   }): ActivityDTO['details'] {
     const details: ActivityDTO['details'] = {};
     if (options.progress != null) details.progress = options.progress;
     if (options.error) details.error = options.error;
     if (options.result) details.result = options.result;
     return Object.keys(details).length > 0 ? details : undefined;
   }
   ```

2. **Fix Type Assertion** (Type Safety)
   - Line 72: `as number` assertion is needed because of null/undefined handling
   - Better to fix the type conversion properly

---

## 🎯 Refactoring Priority

### High Priority (Type Safety)
1. ✅ Remove all `any` types
2. ✅ Add proper TypeScript types
3. ✅ Fix hardcoded defaults

### Medium Priority (DRY)
1. ✅ Extract repeated patterns
2. ✅ Create reusable helper functions
3. ✅ Consolidate similar logic

### Low Priority (Performance)
1. ✅ Optimize database queries (batch fetching)
2. ✅ Reduce array iterations
3. ✅ Cache calculations

---

## ✅ Refactoring Checklist

Before refactoring:
- [x] All tests passing (GREEN phase complete)
- [ ] Identify refactoring opportunities
- [ ] Prioritize by impact

During refactoring:
- [ ] Make one change at a time
- [ ] Run tests after each change
- [ ] Ensure tests stay green
- [ ] Commit after each successful refactor

After refactoring:
- [ ] All tests still passing
- [ ] Code quality improved
- [ ] No behavior changes
- [ ] Documentation updated

---

## 📝 Notes

**TDD Refactoring Rules**:
1. **Tests must stay green** - If tests fail, revert and try different approach
2. **One change at a time** - Don't refactor multiple things simultaneously
3. **Behavior unchanged** - Refactoring improves code, not functionality
4. **Run tests frequently** - After each small change

**When NOT to Refactor**:
- Tests are failing (fix tests first)
- Under time pressure (functionality > perfection)
- Code is already clear and maintainable
- Refactoring would break existing functionality

---

**Status**: 🔵 **Ready for Refactoring** - All tests passing, code improvements identified




