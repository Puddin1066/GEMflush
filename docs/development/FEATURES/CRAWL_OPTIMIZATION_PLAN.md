# Crawl & Processing Optimization Plan

## Current Architecture Analysis

### Dependencies

1. **Fingerprinting** (`lib/llm/fingerprinter.ts`):
   - ✅ **Independent of crawl** - Uses only: `business.name`, `business.url`, `business.category`, `business.location`
   - Does NOT need `crawlData`
   - Makes 9 LLM API calls (3 models × 3 prompts) in parallel (~3-5s)
   - Can run immediately on business creation

2. **Crawling** (`lib/crawler/index.ts`):
   - Fetches HTML from URL
   - Extracts structured data (JSON-LD, meta tags)
   - Makes 1 LLM API call to enhance extraction (~1-2s)
   - Produces `crawlData` with enriched info (phone, email, description, social links, etc.)

3. **Entity Assembly** (`lib/wikidata/entity-builder.ts`):
   - Uses `business` + `crawlData` (optional but enriches entity)
   - `buildEntity(business, crawledData?)` - crawlData is optional!
   - Works without crawlData but produces less rich entities
   - Currently requires `status === 'crawled'` (too strict - should be lazy)

## Optimization Strategy

### 1. ✅ Parallel Execution (Crawl + Fingerprint)

**Current**: Sequential - User clicks "Crawl" → waits → clicks "Fingerprint" → waits

**Optimized**: Parallel - Both start automatically on business creation

```typescript
// On business creation (POST /api/business)
async function createBusinessWithAutoProcessing(businessData) {
  // 1. Create business
  const business = await createBusiness(businessData);
  
  // 2. Start crawl and fingerprint IN PARALLEL (they're independent!)
  Promise.all([
    executeCrawlJob(null, business.id),  // Crawl (1 LLM call)
    llmFingerprinter.fingerprint(business)  // Fingerprint (9 LLM calls)
  ]).catch(error => {
    console.error('Auto-processing error:', error);
  });
  
  return business;
}
```

**Benefits**:
- User sees fingerprint results immediately (~5s) while crawl completes in background (~2s)
- Total time: ~5s (parallel) vs ~7s (sequential)
- Better UX: No waiting for crawl to finish before fingerprinting

### 2. ✅ Lazy Entity Assembly

**Current**: Entity loads when `status === 'crawled'` (required for entity preview)

**Optimized**: Entity only generated when user wants to publish

```typescript
// Entity assembly is LAZY - only when needed
// GET /api/wikidata/entity/[businessId] - only called when:
// 1. User clicks "Preview Entity" 
// 2. User clicks "Publish to Wikidata"
// 3. Business detail page loads AND user is Pro AND entity card is visible
```

**Benefits**:
- No unnecessary entity building (expensive LLM calls for property suggestions)
- Entity preview card can show "Loading..." until user wants to see it
- CrawlData is optional - entity works without it (just less rich)

### 3. ✅ Auto-Start Crawl on Creation

**Current**: User must click "Crawl Website" button

**Optimized**: Crawl starts automatically in background on business creation

```typescript
// POST /api/business - After creating business
const business = await createBusiness(businessData);

// Auto-start crawl in background (no user action needed)
executeCrawlJob(null, business.id).catch(console.error);

return NextResponse.json({ business, message: 'Business created successfully' });
```

**Benefits**:
- Better UX: No manual step required
- Data ready faster: Crawl completes while user is still on the page
- Status updates: User sees "Crawling..." → "Crawled" automatically

### 4. ✅ Cache Crawl Results

**Current**: Re-crawls every time user clicks "Crawl Website"

**Optimized**: Only re-crawl if URL changed or after TTL

```typescript
// Check if crawl is needed
async function shouldCrawl(business: Business): Promise<boolean> {
  // Don't re-crawl if:
  // 1. URL hasn't changed since last crawl
  // 2. Last crawl was < 24 hours ago (for same URL)
  if (business.lastCrawledAt && business.url === business.originalUrl) {
    const hoursSinceCrawl = (Date.now() - business.lastCrawledAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCrawl < 24) {
      return false; // Skip - cache hit
    }
  }
  return true; // Crawl needed
}
```

**Benefits**:
- Reduces expensive LLM calls
- Faster page loads (reuse existing data)
- Lower costs (especially for OpenRouter API)

### 5. ✅ Minimize Fingerprint Frequency

**Current**: User can run fingerprint anytime (potentially expensive)

**Optimized**: Respect plan limits + smart scheduling

```typescript
// Fingerprint frequency based on plan (already implemented):
// - Free: monthly (1 per month)
// - Pro: weekly (1 per week)  
// - Agency: weekly (1 per week)

// Add smart scheduling:
async function canRunFingerprint(business: Business, team: Team): Promise<boolean> {
  const frequency = getFingerprintFrequency(team);
  const lastFingerprint = await getLatestFingerprint(business.id);
  
  if (!lastFingerprint) {
    return true; // First fingerprint - allow
  }
  
  const daysSinceLast = (Date.now() - lastFingerprint.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  if (frequency === 'monthly' && daysSinceLast < 30) {
    return false; // Too soon
  }
  
  if (frequency === 'weekly' && daysSinceLast < 7) {
    return false; // Too soon
  }
  
  return true; // OK to run
}
```

**Benefits**:
- Prevents expensive duplicate analysis
- Respects plan limits (DRY: reuse existing frequency logic)
- Better cost control

## Implementation Priority

### Phase 1: Quick Wins (High Impact, Low Effort)
1. ✅ **Auto-start crawl on creation** - Better UX, no manual step
2. ✅ **Parallel crawl + fingerprint** - Faster overall processing
3. ✅ **Cache crawl results** - Reduces redundant API calls

### Phase 2: Architecture Improvements
4. ✅ **Lazy entity assembly** - Only build when needed (save LLM costs)
5. ✅ **Smart fingerprint scheduling** - Respect plan limits
6. ✅ **Incremental crawl** - Only re-crawl if URL changed or TTL expired

## Value Proposition Balance

### What Users Actually Need:
- **Immediate**: Fingerprint results (to see LLM visibility score) - **Can start immediately, no crawl needed**
- **Soon**: Crawl data (for richer entity) - **Can run in background**
- **When Publishing**: Entity data - **Can be lazy-loaded**

### Optimal Flow:
1. User creates business → **Status: 'pending'**
2. Auto-start: **Crawl + Fingerprint in parallel** (background)
3. User sees fingerprint results first (~5s) - **Status: 'fingerprinted'** (new status)
4. Crawl completes (~2s) - **Status: 'crawled'**
5. Entity preview loads **lazily** when user clicks "Preview Entity" or "Publish"

**Result**: User sees value faster (fingerprint in 5s vs waiting for crawl first)

## Implementation Notes

- **Entity builder already handles missing crawlData**: `buildEntity(business, crawledData?)`
- **Fingerprinting is independent**: Only uses basic business fields
- **Current status flow is too strict**: Requires 'crawled' before entity - should be optional
- **Plan frequencies already defined**: Free=monthly, Pro/Agency=weekly

## ✅ Implementation Status

### Completed Optimizations

1. **✅ Auto-Start Crawl on Creation**
   - Implemented in `app/api/business/route.ts`
   - Uses `lib/services/business-processing.ts` for centralized logic
   - Fire-and-forget (doesn't block response)

2. **✅ Parallel Crawl + Fingerprint**
   - Implemented in `lib/services/business-processing.ts`
   - Runs both operations in parallel using `Promise.all()`
   - Independent operations (fingerprinting doesn't need crawlData)

3. **✅ Crawl Caching**
   - Implemented in `lib/services/business-processing.ts` → `shouldCrawl()`
   - Skips crawl if recent crawl exists (< 24 hours)
   - Integrated into `POST /api/crawl` route

4. **✅ Lazy Entity Assembly**
   - Updated `app/api/wikidata/entity/[businessId]/route.ts`
   - Entity only builds when requested (lazy loading)
   - Can work without crawlData (just less rich)
   - No longer requires status === 'crawled'

5. **✅ Fingerprint Frequency Enforcement**
   - Implemented in `lib/services/business-processing.ts` → `canRunFingerprint()`
   - Respects plan limits: Free=monthly, Pro/Agency=weekly
   - Integrated into `POST /api/fingerprint` route

### Architecture Changes

- **New Service**: `lib/services/business-processing.ts`
  - Centralizes auto-processing logic (SOLID: Single Responsibility)
  - Reusable functions for cache and frequency checks (DRY)
  - Parallel execution orchestration

- **Manual Endpoints Still Active**: 
  - `POST /api/crawl` - Useful for re-crawls, force refresh
  - `POST /api/fingerprint` - Useful for re-fingerprinting, testing
  - Both now include caching/frequency logic

### Next Steps

- [ ] Update E2E tests to account for auto-start behavior
- [ ] Add integration tests for cache and frequency logic
- [ ] Monitor performance improvements (processing time, cost reduction)

