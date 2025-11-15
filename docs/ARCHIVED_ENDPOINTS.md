# Archived/Deprecated API Endpoints

## Purpose
This document tracks API endpoints that have been deprecated or archived due to optimizations and architectural improvements.

## Auto-Start Processing Migration

### Background
As of the crawl optimization implementation, business processing (crawl + fingerprint) now happens automatically on business creation. This improves UX by removing manual steps and enabling parallel processing.

### Endpoints Status

#### ✅ Active Endpoints (Still Needed)

1. **POST /api/crawl** - **KEPT ACTIVE**
   - **Reason**: Manual crawl trigger still needed for:
     - Re-crawling failed businesses
     - Force re-crawl when URL changes
     - User-initiated re-crawls (refresh data)
   - **Optimizations**: Added cache logic (skips if recent crawl exists or URL unchanged < 24h)
   - **Status**: Active with caching optimizations

2. **POST /api/fingerprint** - **KEPT ACTIVE**
   - **Reason**: Manual fingerprint trigger still needed for:
     - Re-fingerprinting when needed
     - Testing/debugging
     - Force refresh of visibility scores
   - **Optimizations**: Added frequency enforcement (respects plan limits: monthly/weekly)
   - **Status**: Active with frequency enforcement

3. **GET /api/business** - **KEPT ACTIVE**
   - **Reason**: List all businesses for team
   - **Status**: Active, unchanged

4. **GET /api/business/[id]** - **KEPT ACTIVE**
   - **Reason**: Fetch single business by ID
   - **Status**: Active, unchanged

5. **GET /api/wikidata/entity/[businessId]** - **KEPT ACTIVE**
   - **Reason**: Lazy entity loading - only builds when requested
   - **Optimizations**: Now truly lazy (can work without crawlData, builds on-demand)
   - **Status**: Active with lazy loading optimizations

#### 📝 Architecture Changes

1. **Auto-Start Processing** (`lib/services/business-processing.ts`)
   - **New Service**: Centralized auto-processing logic
   - **Function**: `autoStartProcessing(business)` - starts crawl + fingerprint in parallel
   - **Benefits**:
     - Parallel execution (~5s vs ~7s sequential)
     - Automatic on business creation
     - Fire-and-forget (doesn't block response)
   - **Cache Logic**: `shouldCrawl()` - skips if recent crawl exists (< 24h)
   - **Frequency Enforcement**: `canRunFingerprint()` - respects plan limits

2. **Business Creation** (`POST /api/business`)
   - **Change**: Now auto-starts crawl + fingerprint after creation
   - **Behavior**: Fire-and-forget (doesn't block response)
   - **Status**: Active with auto-start

## Migration Notes

### For Existing Code
- Manual crawl/fingerprint buttons still work (useful for re-crawls)
- Auto-start happens in background, doesn't block UI
- Cache logic prevents duplicate processing
- Frequency enforcement prevents excessive fingerprinting

### For Tests
- Tests should account for auto-start behavior
- Manual crawl/fingerprint endpoints still testable
- Cache and frequency logic should be tested
- See: `tests/e2e/` for updated E2E tests

## Future Considerations

### Potential Further Optimizations
1. **Queue System**: Replace fire-and-forget with proper job queue (BullMQ)
2. **Incremental Crawl**: Only crawl changed content (diff-based)
3. **Smart Fingerprint Scheduling**: Schedule fingerprints based on plan limits automatically
4. **Entity Caching**: Cache built entities to avoid rebuilding

### Deprecation Candidates (Future)
- None currently identified - all endpoints serve valid use cases

## Summary

**No endpoints archived** - all endpoints remain active with optimizations:
- Auto-start processing for new businesses (parallel crawl + fingerprint)
- Cache logic to prevent duplicate crawls
- Frequency enforcement to respect plan limits
- Lazy entity loading (only builds when requested)

Manual endpoints remain for re-crawls, testing, and user-initiated actions.

