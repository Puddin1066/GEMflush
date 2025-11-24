# Business Data Population Issues

## Problem

Components for "Mother Earth" business do not populate correctly, but "Brown Physicians Inc" components populate correctly.

**ROOT CAUSE IDENTIFIED**: Businesses are getting stuck in `"error"` status during crawl, preventing data population.

## Terminal Log Analysis (Latest Test Run)

### Test Results Summary
- **Most Recent Run**: 10 passed, 2 failed (out of 12 tests)
- **Older Run**: 3 passed, 9 failed (out of 12 tests)
- **Build Status**: ✅ Successful (no build errors)

### Primary Issue: Crawl Failures
Multiple businesses are failing to crawl, resulting in `"error"` status:
```
Business 329 status: error (waiting for: crawled)
Business 332 status: error (waiting for: crawled)
Business 334 status: error (waiting for: crawled)
```

### Specific Test Failures

1. **"pro tier user can create up to 5 businesses"** (Timeout after 3 minutes)
   - Expected: ≥1 business created
   - Received: 0 businesses created
   - Root cause: Business creation/crawl failing, leaving no businesses

2. **"agency tier user has all features including API access"** 
   - Publish button not visible when it should be
   - Likely related to missing crawl data (business stuck in error status)

## Root Cause Analysis

### Crawler Implementation Issues

1. **10-Second Timeout Too Short** (`lib/crawler/index.ts:66`)
   ```typescript
   signal: AbortSignal.timeout(10000), // 10 seconds may be too short
   ```
   - Real websites can take longer to respond
   - Network latency varies
   - Test URLs (`example.com`, `example.org`) may be slow/unreliable

2. **No Retry Logic**
   - Single attempt on crawl failure
   - No exponential backoff
   - Network hiccups cause permanent failures

3. **Immediate Error Status** (`lib/services/business-processing.ts:169-176`)
   - Any crawl failure sets status to `"error"`
   - No graceful degradation
   - No option to retry manually

4. **Silent Background Failures** (`app/api/crawl/route.ts:124-132`)
   - Background crawl errors only logged to console
   - No error reporting mechanism
   - Tests can't see why crawl failed

### Test URL Issues

Tests use real URLs that may fail:
- `https://example.com?test=...` - Reserved for documentation, may not respond
- `https://example.org?test=...` - Similar issues
- `https://jsonplaceholder.typicode.com?pro=...` - API endpoint, not a website

## Solutions

### Immediate Fixes

1. **Increase Crawl Timeout**
   - Change from 10s to 30s for real-world reliability
   - Location: `lib/crawler/index.ts:66`

2. **Add Retry Logic**
   - Retry failed crawls 2-3 times with exponential backoff
   - Only set to `"error"` after all retries fail
   - Location: `lib/services/business-processing.ts:executeCrawlJob()`

3. **Better Error Messages**
   - Store error details in database (not just status)
   - Log specific failure reasons (timeout, HTTP error, network error)
   - Make errors visible in UI

4. **Handle Test URLs Better**
   - Use mock responses for test URLs that don't exist
   - Or use reliable test websites
   - Add retry logic specifically for `example.com`/`example.org`

### Long-term Improvements

1. **Job Queue System**
   - Move to proper job queue (BullMQ) instead of fire-and-forget
   - Better error handling and retry mechanisms
   - Job status tracking

2. **Fallback Strategies**
   - Allow business creation even if crawl fails
   - Use user-provided data as fallback
   - Option to manually retry crawl

3. **Monitoring & Alerting**
   - Track crawl success/failure rates
   - Alert on high failure rates
   - Dashboard for crawl status

## Investigation Needed

### 1. Check API Response Structure
- Verify `/api/business/[id]` returns same structure for both businesses
- Check if Mother Earth has missing/null fields that Brown Physicians has

### 2. Check Component Data Requirements
- Verify `useBusinessDetail` hook handles both businesses correctly
- Check if components gracefully handle missing data

### 3. Check Database Data
- Compare database records for both businesses
- Look for differences in:
  - `status` field (likely "error" for Mother Earth)
  - `crawlData` field (likely null/empty)
  - `location` structure
  - `wikidataQID` field

### 4. Check Error Handling
- Look for console errors when loading Mother Earth
- Check if API calls are failing silently
- Check server logs for `[CRAWLER]` and `[PROCESSING]` error messages

## Test Cases to Add

1. Test with business that has null location
2. Test with business that has no crawlData
3. Test with business that has no fingerprint
4. Test with business that has no entity
5. **Test with business stuck in "error" status (NEW)**
6. **Test crawl retry logic (NEW)**
7. **Test timeout scenarios (NEW)**

## Automation Frequency

✅ **Confirmed**: Automation is correctly set to MONTHLY for:
- Fingerprint frequency (Pro/Agency tiers)
- Auto-publish is enabled (Pro/Agency tiers)

No changes needed to automation service.

