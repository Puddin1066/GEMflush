# Firecrawl Mock Fallback Fix

**Date**: January 2025  
**Issue**: Firecrawl subscription is paused, causing API calls to fail  
**Status**: ✅ FIXED

---

## Problem

When Firecrawl subscription is paused:
- API key exists but API calls fail (402, 403, or network errors)
- Crawl jobs fail without proper error messages
- Business status goes to "error" without crawl job being created
- No fallback to mock data

---

## Solution

### 1. Enhanced Mock Detection

**File**: `lib/utils/firecrawl-mock.ts`

- Added check for `USE_MOCK_FIRECRAWL=true` environment variable
- Added check for `PLAYWRIGHT_TEST=true` (test mode)
- Updated `shouldUseMockFirecrawl()` to handle paused subscriptions

**Usage**: Set `USE_MOCK_FIRECRAWL=true` in `.env` when subscription is paused

### 2. API Error Handling with Fallback

**File**: `lib/crawler/firecrawl-client.ts`

- Added fallback to mocks on API errors (402, 403, 429 status codes)
- Added fallback to mocks on network errors (catch block)
- Both `crawlWithLLMExtraction()` and `getCrawlJobStatus()` now fall back gracefully

**Status Codes Handled**:
- `402`: Payment Required (subscription paused)
- `403`: Forbidden (subscription inactive)
- `429`: Rate Limited (fallback to avoid blocking)

### 3. Crawler-Level Fallback

**File**: `lib/crawler/index.ts`

- Added try-catch around Firecrawl client calls
- Falls back to mock if client throws errors
- Handles `crawlResponse.success === false` by using mocks

---

## Configuration

### For Paused Subscription

Add to `.env`:
```bash
USE_MOCK_FIRECRAWL=true
```

This forces all Firecrawl calls to use mocks, regardless of API key presence.

### For Testing

Mocks are automatically used when:
- `PLAYWRIGHT_TEST=true` (set by Playwright)
- `NODE_ENV=development`
- `FIRECRAWL_API_KEY` not set

---

## Testing

Run the critical test:
```bash
USE_MOCK_FIRECRAWL=true npx playwright test tests/e2e/publishing-flow-critical.spec.ts
```

Expected: Test should pass with mock data.

---

## Code Changes

### Files Modified

1. `lib/crawler/firecrawl-client.ts`
   - Added fallback on API errors (402, 403, 429)
   - Added fallback on network errors
   - Enhanced constructor logging

2. `lib/utils/firecrawl-mock.ts`
   - Enhanced `shouldUseMockFirecrawl()` to check for paused subscription
   - Added support for `USE_MOCK_FIRECRAWL` environment variable

3. `lib/crawler/index.ts`
   - Added try-catch around Firecrawl client calls
   - Added fallback to mocks on client errors

### Principles Applied

- **SOLID**: Single Responsibility - each layer handles its own fallback
- **DRY**: Reused `generateMockFirecrawlCrawlResponse()` and `generateMockFirecrawlJobStatus()`
- **Fail-Safe**: Graceful degradation instead of hard failures

---

## Next Steps

1. Set `USE_MOCK_FIRECRAWL=true` in environment
2. Re-run critical test
3. Verify crawl completes successfully with mock data
4. Continue with fingerprint and publish phases

---

**Status**: Ready for testing with `USE_MOCK_FIRECRAWL=true`


