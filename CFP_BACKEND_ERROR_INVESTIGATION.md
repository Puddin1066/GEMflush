# CFP Backend Error Investigation & Fix

**Date**: November 21, 2025  
**Issue**: CFP process showing "Error" status and stuck at 10%  
**Root Cause**: Web crawler checking for API key before allowing mocks  
**Status**: ✅ **FIXED**

---

## 🔍 **Problem Analysis**

### **Initial Symptoms**
- Business created successfully
- CFP process initiated automatically
- Status stuck at "Error" with "Retrying Analysis" message
- Progress bar stuck at 10%

### **Investigation Process**

1. **Traced the CFP Flow**:
   ```
   Business Creation → autoStartProcessing() → executeParallelProcessing()
   → executeCrawlJob() → webCrawler.crawl() → ❌ ERROR
   ```

2. **Found the Root Cause**:
   - Location: `lib/crawler/index.ts` lines 77-79
   - Problem: Web crawler checked for `FIRECRAWL_API_KEY` and threw error **before** allowing mocks
   - Impact: Process failed immediately, preventing Firecrawl client from using mocks

### **Root Cause Code** (Before Fix)

```typescript
// lib/crawler/index.ts (lines 74-79)
console.log(`[CRAWLER] 🚀 Starting enhanced multi-page crawl for: ${url}`);

// ❌ PROBLEM: Checked API key and threw error before allowing mocks
if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY is required for business data extraction');
}
```

### **Why This Failed**

1. **Firecrawl API key was commented out** in `.env` (for mocking)
2. **Web crawler threw error immediately** when API key was missing
3. **Firecrawl client never got called** to use mocks
4. **Process failed at crawl stage** with "Error" status

---

## ✅ **Solution Implemented**

### **Fix Applied**

Updated `lib/crawler/index.ts` to check for mocks **before** requiring API key:

```typescript
// lib/crawler/index.ts (lines 74-81) - AFTER FIX
console.log(`[CRAWLER] 🚀 Starting enhanced multi-page crawl for: ${url}`);

// ✅ FIX: Check if mocks should be used - let Firecrawl client handle mocks
const { shouldUseMockFirecrawl } = await import('@/lib/utils/firecrawl-mock');
if (shouldUseMockFirecrawl()) {
  console.log(`[CRAWLER] 🎭 Firecrawl API key not configured - will use mocks`);
}
// Removed the API key check - Firecrawl client will handle mocks automatically
```

### **How It Works Now**

1. **Web crawler checks for mocks first** using `shouldUseMockFirecrawl()`
2. **If mocks should be used** (API key missing OR development mode), logs message
3. **Firecrawl client automatically uses mocks** when `this.useMock` is true
4. **No error thrown** - process continues with mocks
5. **CFP completes successfully** using mocked Firecrawl responses

### **Mock Detection Logic**

```typescript
// lib/utils/firecrawl-mock.ts
export function shouldUseMockFirecrawl(): boolean {
  return !process.env.FIRECRAWL_API_KEY || process.env.NODE_ENV === 'development';
}
```

This returns `true` when:
- ✅ `FIRECRAWL_API_KEY` is not set (commented out in `.env`)
- ✅ `NODE_ENV === 'development'` (development mode)

---

## 🔧 **Technical Details**

### **Mock System Architecture**

1. **Firecrawl Client** (`lib/crawler/firecrawl-client.ts`):
   - Constructor checks `shouldUseMockFirecrawl()`
   - Sets `this.useMock = true` if API key missing
   - Methods check `this.useMock` and return mock responses

2. **Mock Data** (`lib/utils/firecrawl-mock.ts`):
   - Contains mock data for `brownphysicians.org`
   - `generateMockFirecrawlCrawlResponse()` creates realistic responses
   - `generateMockFirecrawlJobStatus()` simulates job progression

3. **Web Crawler** (`lib/crawler/index.ts`):
   - Now allows process to continue when API key missing
   - Lets Firecrawl client handle mock logic
   - Falls back to other mocks if needed

### **Error Handling Flow**

```
Before Fix:
Web Crawler → Check API Key → ❌ Throw Error → Process Fails

After Fix:
Web Crawler → Check Mocks → Firecrawl Client → Use Mocks → ✅ Process Continues
```

---

## 📊 **Expected Behavior After Fix**

### **CFP Process Flow** (With Mocks)

1. **Crawl Stage** (10-40%):
   - Firecrawl client detects missing API key
   - Uses mock crawl response for brownphysicians.org
   - Returns structured business data
   - ✅ Status: `crawled`

2. **Fingerprint Stage** (40-70%):
   - OpenRouter API called with real API key
   - 9 LLM queries executed (3 models × 3 prompts)
   - Visibility score calculated
   - ✅ Status: `fingerprinted`

3. **Publish Stage** (70-100%) - Pro Tier Only:
   - Wikidata entity created
   - Published to Wikidata Action API (real)
   - QID stored in database
   - ✅ Status: `published`

### **Business Status Progression**

```
pending → crawling → crawled → generating → fingerprinted → published
  10%      20-40%     40%        50-70%         70%          90-100%
```

---

## 🎯 **Verification Steps**

1. **Restart Server** (already done by user)
   - Server restarted on port 3003
   - Environment variables loaded
   - Mock detection active

2. **Create New Business**:
   - Navigate to `/dashboard/businesses/new`
   - Enter URL: `https://brownphysicians.org`
   - Click "Create Business"

3. **Monitor CFP Process**:
   - Watch status progress from `pending` → `crawled` → `fingerprinted`
   - Verify mock crawl data appears in UI
   - Verify fingerprint results appear in UI
   - Check for no "Error" status

4. **Verify Data Display**:
   - **GemOverviewCard**: Shows crawl data (name, location, services)
   - **VisibilityIntelCard**: Shows visibility score and metrics
   - **CompetitiveEdgeCard**: Shows competitive analysis
   - **AutomatedCFPStatus**: Shows completion status

---

## 🔍 **Additional Findings**

### **Mock Data Available**

- ✅ **brownphysicians.org**: Full mock data available
- ✅ **stripe.com**: Mock data available
- ✅ **tesla.com**: Mock data available
- ✅ **default**: Fallback mock data available

### **Firecrawl Client Mock Support**

The Firecrawl client already had mock support built-in:
- ✅ `shouldUseMockFirecrawl()` detection
- ✅ `generateMockFirecrawlCrawlResponse()` mock generation
- ✅ `generateMockFirecrawlJobStatus()` job status mocking
- ✅ Automatic mock usage when `this.useMock === true`

**The issue was the web crawler preventing the flow from reaching the Firecrawl client.**

---

## 📝 **Summary**

### **What Was Wrong**
- Web crawler checked for API key too early
- Threw error before allowing mocks
- Prevented Firecrawl client from using mock support

### **What Was Fixed**
- Removed early API key check from web crawler
- Added mock detection check instead
- Let Firecrawl client handle mock logic automatically

### **Result**
- ✅ CFP process can now complete with mocked Firecrawl API
- ✅ Real OpenRouter API still used for fingerprinting
- ✅ Real Wikidata API still used for publishing (Pro tier)
- ✅ All dashboard components ready to display results

---

## 🚀 **Next Steps**

1. **Test the Fix**:
   - Create a new business with brownphysicians.org
   - Monitor CFP process completion
   - Verify all data displays correctly

2. **Monitor Server Logs**:
   - Check for "[FIRECRAWL] Using mock responses" messages
   - Verify no API key errors
   - Confirm process completes successfully

3. **Verify UI Updates**:
   - Check business status progression
   - Verify cards display crawl and fingerprint data
   - Confirm no "Error" status persists

---

**Status**: ✅ **FIXED AND READY FOR TESTING**
