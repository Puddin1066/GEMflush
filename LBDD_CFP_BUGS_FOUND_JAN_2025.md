# LBDD CFP Flow - Bugs Found (January 2025)

**Date**: January 2025  
**Methodology**: Live Browser-Driven Development (LBDD)  
**Account**: test@test.com (Pro tier)  
**Business Created**: Example (ID: 45)  
**URL**: https://www.example.com  
**Status**: 🔴 **CRITICAL BUGS FOUND**

---

## 🐛 **Critical Bugs**

### Bug 1: Wikidata Login Failed - Auto-Publish Not Working ❌

**Severity**: 🔴 **CRITICAL**

**Observation**:
- CFP flow completed crawl and fingerprint successfully
- Auto-publish attempted for Pro tier user
- **Wikidata login failed**, preventing publication

**Terminal Logs**:
```
ℹ️  [SCHEDULER] Publishing entity to Wikidata | business=45, hasExistingQID=false
[DEBUG] handleAutoPublish: Calling createAndPublishEntity, WIKIDATA_PUBLISH_MODE=real
❌ [SCHEDULER] Publication failed | business=45, duration=501ms, error=Login failed: Failed
ℹ️  [SCHEDULER] 🔄 Status: generating → error | business=45
❌ [SCHEDULER] Auto-publish error | business=45, error=Login failed: Failed
```

**Root Cause**:
- Wikidata bot credentials (`WIKIDATA_BOT_USERNAME` / `WIKIDATA_BOT_PASSWORD`) are either:
  - Missing from environment variables
  - Invalid/expired
  - Not properly configured

**Impact**:
- Pro tier users cannot publish to Wikidata
- Business status remains in "error" state after CFP
- Core feature (auto-publish) is broken

**Expected Behavior**:
- Pro tier businesses should automatically publish to Wikidata after crawl + fingerprint
- Status should update to "published" with wikidataQID assigned

---

### Bug 2: Wrong UI Message for Pro Tier Users ❌

**Severity**: 🟡 **HIGH**

**Observation**:
- Business detail page shows: "✅ AI analysis complete - upgrade to publish to Wikidata"
- **BUT** account is Pro tier (Wikidata Publisher plan)
- Publishing is actually in progress (status: "generating")

**Location**: Business detail page (`/dashboard/businesses/[id]`)

**Root Cause**:
- UI component showing upgrade message regardless of tier
- Not checking `isPro` or `canPublish` before showing message
- Should show "Publishing to Wikidata..." or progress indicator for Pro tier

**Expected Behavior**:
- Pro tier: Show "Publishing to Wikidata..." or progress indicator
- Free tier: Show upgrade message

---

### Bug 3: Entity API Request Timeout ⚠️

**Severity**: 🟡 **MEDIUM**

**Console Warning**:
```
[WARNING] Entity API request timed out after 15s
```

**Observation**:
- Entity preview card tries to fetch entity data
- Request times out after 15 seconds
- May be related to Wikidata API latency or entity not existing yet

**Impact**:
- Entity preview card may not load
- User may see loading state indefinitely

**Expected Behavior**:
- Entity data should load within timeout
- Better error handling for timeout scenarios

---

## 🟡 **Frontend Bugs**

### Bug 4: React Key Prop Warning ⚠️

**Severity**: 🟢 **LOW**

**Console Error**:
```
[ERROR] Each child in a list should have a unique "key" prop.
Check the render method of `Layout`.
```

**Location**: `app/(dashboard)/layout.tsx` or child component

**Impact**: Development warning only, doesn't affect functionality

**Fix Required**: Add unique `key` props to list items in Layout component

---

### Bug 5: ReferenceError in SWR Hook ⚠️

**Severity**: 🟡 **MEDIUM**

**Console Error**:
```
ReferenceError: Cannot access 'returnedData' before initialization
    at isEqual (http://localhost:3000/_next/static/chunks/node_modules__pnpm_5684049f._.js:15498:34)
    at useSWRHandler.useSyncExternalStore[cached]
```

**Root Cause**:
- SWR hook accessing variable before initialization
- Likely a closure/hoisting issue in data fetching logic

**Impact**:
- May cause incorrect data updates
- Potential race condition in data fetching

---

### Bug 6: Business Creation Page - NaN Business ID Error ❌

**Severity**: 🟡 **MEDIUM**

**Observation**:
- Navigating to `/dashboard/businesses/new` causes error
- API request: `GET /api/business/NaN 400`

**Terminal Logs**:
```
GET /dashboard/businesses/new 200 in 5786ms
GET /api/business/NaN 400 in 802ms
```

**Root Cause**:
- Business detail page component trying to parse `NaN` as business ID
- Route `/dashboard/businesses/new` was supposed to be removed (per docs)
- Component still exists or routing is incorrect

**Impact**:
- User sees error page when trying to access removed route
- Confusing UX

**Note**: According to `BUSINESS_CREATION_ROUTE_REMOVED.md`, this route should not exist. Bug may be:
1. Route still exists but shouldn't
2. Route removed but component still tries to handle it
3. Incorrect routing configuration

---

## ✅ **What's Working**

### CFP Flow Execution
- ✅ Business creation successful (Pro tier)
- ✅ Auto-processing triggered immediately (`autoStartProcessing`)
- ✅ Crawl phase completed successfully
- ✅ Fingerprint phase completed successfully
- ✅ Status updates working: `pending` → `crawling` → `crawled` → `generating` → `error`
- ✅ Progress tracking visible in UI

### Data Processing
- ✅ Crawl data extracted and saved
- ✅ Fingerprint analysis completed (9 LLM queries)
- ✅ Visibility score calculated
- ✅ Competitive data generated

---

## 📊 **CFP Progress Observation**

### Expected Flow:
1. **Pending** → Business created, waiting to start
2. **Crawling** → Crawl and fingerprint in progress
3. **Crawled** → Crawl and fingerprint completed
4. **Generating** → Publishing to Wikidata
5. **Published** → Successfully published with QID

### Actual Flow Observed:
1. ✅ **Pending** → Business created
2. ✅ **Crawling** → Processing started (status update visible in UI)
3. ✅ **Crawled** → Processing completed (~32 seconds)
4. ✅ **Generating** → Publishing started
5. ❌ **Error** → Publication failed (Wikidata login error)

**Total Duration**: ~32 seconds (crawl + fingerprint + failed publish attempt)

---

## 🔍 **Console Logs Summary**

### Errors Found:
1. React key prop warning (Layout component)
2. ReferenceError in SWR hook (returnedData initialization)
3. 422 Unprocessable Entity (expected - location needed)
4. Entity API timeout warning (15s timeout)

### Processing Logs:
- ✅ Auto-start processing triggered
- ✅ Parallel crawl and fingerprint completed
- ✅ Status updates logged correctly
- ❌ Publication failed due to login error

---

## 🎯 **Recommended Fixes**

### Priority 1: Critical (Block Pro Tier Feature)
1. **Fix Wikidata Login**:
   - Verify `WIKIDATA_BOT_USERNAME` and `WIKIDATA_BOT_PASSWORD` in environment
   - Test Wikidata API connection
   - Add better error messages for authentication failures

2. **Fix Pro Tier UI Message**:
   - Update business detail page to check tier before showing upgrade message
   - Show progress indicator for Pro tier during publishing
   - Hide upgrade message for Pro tier users

### Priority 2: Medium (UX Issues)
3. **Fix Entity API Timeout**:
   - Increase timeout or add retry logic
   - Better error handling for timeout scenarios
   - Show fallback UI when entity fetch fails

4. **Fix Business Creation Route**:
   - Verify route removal is complete
   - Remove or fix component handling `/new` route
   - Update any links pointing to removed route

5. **Fix SWR ReferenceError**:
   - Investigate data fetching hooks
   - Fix variable initialization order
   - Add proper null checks

### Priority 3: Low (Code Quality)
6. **Fix React Key Prop Warning**:
   - Add unique keys to Layout component children
   - Review all list rendering in Layout

---

## 📝 **Files to Investigate**

1. `lib/services/scheduler-service-decision.ts` - Auto-publish logic
2. `lib/wikidata/service.ts` - Wikidata login/authentication
3. `app/(dashboard)/dashboard/businesses/[id]/page.tsx` - Business detail page (UI message bug)
4. `app/(dashboard)/layout.tsx` - React key warning
5. `lib/hooks/use-business-detail.ts` - Entity fetching and SWR usage
6. `app/(dashboard)/dashboard/businesses/new/page.tsx` - Check if route exists

---

## 🧪 **Test Results**

### CFP Flow Test (Business ID: 45)
- **Crawl**: ✅ Success (~10-15 seconds)
- **Fingerprint**: ✅ Success (~20-25 seconds)
- **Publish**: ❌ Failed (Login error)
- **Status Updates**: ✅ Working correctly
- **Progress Tracking**: ✅ Visible in UI

### Account Details
- **Tier**: Pro (Wikidata Publisher)
- **Business Limit**: 3/5 businesses
- **Auto-Processing**: ✅ Enabled

---

**Status**: 🔴 **CRITICAL** - Wikidata auto-publish is broken for Pro tier users  
**Next Steps**: Fix Wikidata login configuration and Pro tier UI messaging

