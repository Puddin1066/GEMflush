# API Status Summary for frogandtoad-real-flow.spec.ts

## Timestamp Source
**Location**: `tests/e2e/frogandtoad-real-flow.spec.ts:39-40`
```typescript
const timestamp = Date.now();
const businessName = `Alpha Dental Center ${timestamp}`;
```

**Purpose**: Ensures unique business names per test run to avoid database conflicts.

**Flow**:
1. Test creates name with timestamp
2. Form submits to `/api/business` POST → stored in database
3. `getWikidataPublishDTO()` retrieves `business.name` from DB (includes timestamp)
4. `checkNotability()` should normalize via `normalizeBusinessName()` to remove timestamp

## API Mocking Status

### ✅ REAL (Using Actual Endpoints):

#### Internal APIs (All Real):
- `/api/business` - Real database operations
- `/api/crawl` - Real web crawling (HTTP requests to external sites)
- `/api/fingerprint` - Real fingerprinting logic
- `/api/wikidata/publish` - Real Wikidata publishing to test.wikidata.org
- `/api/wikidata/entity/[businessId]` - Real entity building
- `/api/team` - Real database queries
- `/api/stripe/webhook` - Real webhook processing (test mode)

#### External APIs (Real):
- **Web Crawling** - Real HTTP requests to `alphadentalcenter.com`
- **Wikidata test.wikidata.org** - Real Action API calls (`WIKIDATA_PUBLISH_MODE='real'`)

### 🔄 MOCKED (Via Environment Variables):

#### OpenRouter API:
- **Status**: Mocked via `OPENROUTER_API_KEY=''` in `playwright.config.ts`
- **How**: `OpenRouterClient.getApiKey()` returns empty string → `if (!apiKey)` → uses `getMockResponse()`
- **Location**: `lib/llm/openrouter.ts:41-64`
- **Reason**: Paid API, mocked to save costs while testing real logic flow

#### Google Search API:
- **Status**: Should be mocked via `GOOGLE_SEARCH_API_KEY=''` and `USE_MOCK_GOOGLE_SEARCH='true'`
- **How**: `NotabilityChecker.findReferences()` checks test mode indicators
- **Location**: `lib/wikidata/notability-checker.ts:173-200`
- **Issue**: ⚠️ Test mode detection may be failing, causing real API calls or timeouts
- **Reason**: Paid API, should be mocked to save costs

## Current Issues

1. **Publish API Timeout** (10s → needs 120s for real operations)
   - Fixed: Increased timeout to 120s in test

2. **Google Search Test Mode Detection**
   - May not be detecting test environment correctly
   - Fallback logic should catch this, but needs verification

3. **Timestamp Normalization**
   - Should work via `normalizeBusinessName()` but needs verification in logs

## Test Requirements Met

✅ **Real internal endpoints** - All internal APIs use real database/processing  
✅ **Real external free APIs** - Web crawling uses real HTTP requests  
✅ **Mocked paid APIs** - OpenRouter and Google Search are mocked (paid services)  
✅ **Real Wikidata** - Uses real test.wikidata.org API (safe test environment)

