# CFP Flow Errors Fixed - January 2025

## 🔴 **Critical Errors Fixed**

### 1. **Gemini Model ID Invalid** ✅ FIXED

**Error**:
```
❌ [API] LLM query failed | model=google/gemini-1.5-pro
error=OpenRouter API error: 400 Bad Request - {"error":{"message":"google/gemini-1.5-pro is not a valid model ID"
```

**Root Cause**:
- `google/gemini-1.5-pro` is not a valid OpenRouter model ID
- OpenRouter uses different model identifiers

**Fix Applied**:
- Updated `lib/llm/types.ts` to use `google/gemini-2.5-flash`
- Valid OpenRouter Gemini models: `google/gemini-2.5-flash`, `google/gemini-2.5-pro`

**Status**: ✅ **FIXED** - Model ID updated to valid OpenRouter identifier

---

### 2. **422 Error on Business Creation** ✅ EXPECTED BEHAVIOR

**Error**:
```
POST /api/business 422 in 475ms
```

**Root Cause**:
- This is **NOT an error** - it's expected behavior
- When business is created with URL only and location is missing, API returns 422 with `needsLocation: true`
- This allows the UI to show the location form immediately

**Evidence from Code**:
```typescript
// app/api/business/route.ts:199-223
if (needsLocationAfterCrawl) {
  const response = {
    business: { ... },
    needsLocation: true,
    crawledData: crawledDataForLocation,
    message: 'Business created. Location required.',
  };
  // ... returns 422 with needsLocation flag
  // CFP processing still starts in background
  autoStartProcessing(business.id).catch(...);
}
```

**Status**: ✅ **EXPECTED** - This is intentional design for location collection flow

---

## 🟡 **Frontend Improvements**

### 3. **Entity Status Not Refreshing After Publication** ✅ FIXED

**Issue**:
- Entity data not fetched when status is `fingerprinted` (after auto-publish)
- Publication status and Wikidata link not shown immediately after publish

**Fix Applied**:
- Updated `useBusinessDetail` hook to fetch entity when:
  - Status is `fingerprinted` (auto-publish may have occurred)
  - `wikidataQID` is present (entity was published)
- Entity preview card already shows Wikidata link when `entity.qid` is present

**Status**: ✅ **FIXED** - Entity data now fetched for all relevant statuses

---

## 📊 **Business Creation Flow Analysis**

### Should `/dashboard/businesses/new` be removed?

**Analysis**:
- **NO** - The route is still needed because:
  1. **Location Collection**: When crawl doesn't detect location, user must provide it
  2. **User Feedback**: Provides clear UI for business creation process
  3. **Error Handling**: Shows validation errors and success messages
  4. **Progressive Enhancement**: Allows URL-only creation with optional location step

**Recommendation**:
- **Keep the route** but consider:
  - Adding inline URL input on businesses list page (quick add)
  - Making location form appear as modal instead of separate page
  - Auto-redirecting to business detail page immediately after creation

**Status**: ✅ **KEEP** - Route is necessary for location collection flow

---

## ✅ **Publication Status & Link Display**

### Current Implementation

**Entity Preview Card** (`components/wikidata/entity-preview-card.tsx`):
- ✅ Shows QID when published: `entity.qid`
- ✅ Shows Wikidata link: `entity.wikidataUrl`
- ✅ Displays "Published to Wikidata Knowledge Graph" badge
- ✅ "View on Wikidata" button when published

**Business Detail Hook** (`lib/hooks/use-business-detail.ts`):
- ✅ Fetches entity when status is `published`, `generating`, `fingerprinted`, or `wikidataQID` present
- ✅ Refreshes entity data after status changes

**Status**: ✅ **WORKING** - Publication status and link are properly displayed

---

## 🎯 **Summary**

### Fixed Issues
1. ✅ Gemini model ID updated to `google/gemini-2.5-flash` (valid OpenRouter model)
2. ✅ Entity fetching expanded to include `fingerprinted` status and `wikidataQID` check
3. ✅ 422 error documented as expected behavior (location collection)

### Verified Working
1. ✅ Publication status display (QID, link, badge)
2. ✅ Entity preview card shows Wikidata link when published
3. ✅ Business creation flow handles location collection properly

### Recommendations
1. Consider adding quick-add URL input on businesses list page
2. Consider making location form a modal instead of separate page
3. Auto-refresh entity data after publication completes

---

**All Critical Errors**: ✅ **FIXED**  
**Frontend Updates**: ✅ **IMPROVED**  
**Publication Status**: ✅ **WORKING**

