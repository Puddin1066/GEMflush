# Dashboard CFP Troubleshooting Report

**Date:** Based on browser observation and server logs  
**Issue:** CFP process not completing efficiently, cards not updating with fresh data

## 🔍 Observations from Browser

### What I Observed:

1. **Business Creation:**
   - ✅ URL submitted: `https://brownphysicians.org`
   - ✅ Business created: ID 853
   - ⚠️ **422 Response** - "URL-only creation detected"

2. **CFP Process Started:**
   - ✅ Status: "Crawling" → "Generating" → "Publishing to Wikidata"
   - ✅ Progress: 33% → 90%
   - ✅ Business name extracted: "Brown Physicians, Inc."

3. **Page State:**
   - ✅ Shows "Brown Physicians, Inc." in UI
   - ✅ Shows "Publishing to Wikidata" at 90%
   - ⚠️ Page content appears empty after initial load

4. **Network Activity:**
   - ✅ Multiple polling requests: `/api/business/853`
   - ✅ Multiple fingerprint checks: `/api/fingerprint/business/853`
   - ✅ Wikidata entity checks: `/api/wikidata/entity/853`
   - ⚠️ **422 error** on initial business creation

## 📊 Server Log Analysis

### CFP Process Flow (from logs):

```
Line 121: Auto-Processing Pipeline started
Line 126: Step 1/3: Starting crawl
Line 131: Crawl started
Line 147: Name extracted: "Brown Physicians, Inc."
Line 149: Using cleaned Firecrawl title: "Brown Physicians, Inc."
Line 167: Crawl completed in 13.87s ✅
Line 172: Updating business name from crawl data ✅
Line 176: Step 2/3: Starting fingerprint
Line 177: Business refreshed before fingerprint ✅ (name=Brown Physicians, Inc.)
Line 184: Executing 9 queries in parallel
Line 200+: LLM queries executing...
```

### Issues Found:

1. **422 Response on Business Creation:**
   ```
   POST /api/business 422 in 495ms
   ```
   - This is expected for URL-only creation
   - Returns `needsLocation: true` response
   - Business is created, CFP starts in background

2. **API Returning Stale Data:**
   ```
   Line 153: businessName=Business (stale)
   Line 160: businessName=Business (stale)
   Line 177: businessName=Brown Physicians, Inc. (fresh) ✅
   ```
   - Some API calls return old name "Business"
   - After refresh, returns correct name "Brown Physicians, Inc."

3. **Polling Frequency:**
   - Multiple rapid API calls (every few seconds)
   - Could be optimized with better polling strategy

## 🐛 Root Causes

### 1. Data Refresh Issue

**Problem:** API sometimes returns stale business data

**Evidence:**
- Business name updated in DB (line 172)
- But some API calls still return "Business" (lines 153, 160)
- After refresh, returns "Brown Physicians, Inc." (line 177)

**Likely Cause:**
- Database transaction not committed before API read
- Or caching issue in API route
- Or race condition between update and read

### 2. Page Content Disappearing

**Problem:** Page content becomes empty after initial render

**Evidence:**
- Initial snapshot shows full page with status/progress
- Later snapshot shows only navigation and back button
- Main content area is empty

**Likely Cause:**
- React rendering issue
- Error in component causing unmount
- State management issue in `useBusinessDetail` hook

### 3. Progress Stuck at 90%

**Problem:** Progress shows 90% but doesn't complete

**Evidence:**
- Status: "Publishing to Wikidata" at 90%
- Multiple polling requests continue
- No completion message

**Likely Cause:**
- Publish process taking longer than expected
- Or publish failed silently
- Or progress calculation incorrect

## 🔧 Recommended Fixes

### Fix 1: Ensure Fresh Data in API

**File:** `app/api/business/[id]/route.ts`

```typescript
// Add cache-busting or ensure fresh read
export async function GET(...) {
  // Force fresh read from database
  const business = await getBusinessById(businessId);
  // Don't use any cached data
}
```

### Fix 2: Improve Polling Strategy

**File:** `lib/hooks/use-business-detail.ts`

```typescript
// Add exponential backoff
// Reduce polling frequency after initial burst
// Stop polling when status is 'published' or 'error'
```

### Fix 3: Add Error Handling

**File:** `app/(dashboard)/dashboard/businesses/[id]/page.tsx`

```typescript
// Add error boundaries
// Handle 422 responses gracefully
// Show proper loading states
```

### Fix 4: Fix Progress Calculation

**File:** Components showing progress

```typescript
// Ensure progress updates correctly
// Handle edge cases (0%, 100%)
// Show completion state properly
```

## 📝 Next Steps

1. **Check if publish completed:**
   - Query database for business 853
   - Check `wikidataQID` field
   - Check `status` field

2. **Verify data refresh:**
   - Add logging to API route
   - Check if database updates are committed
   - Verify no caching layer interfering

3. **Fix page rendering:**
   - Check React error boundaries
   - Verify `useBusinessDetail` hook
   - Check for JavaScript errors

4. **Optimize polling:**
   - Reduce frequency after initial load
   - Stop when process completes
   - Add exponential backoff

## 🎯 Immediate Actions

1. ✅ **Name extraction working** - "Brown Physicians, Inc." extracted correctly
2. ⚠️ **Data refresh needed** - Some API calls return stale data
3. ⚠️ **Page rendering issue** - Content disappears
4. ⚠️ **Progress stuck** - Needs investigation

