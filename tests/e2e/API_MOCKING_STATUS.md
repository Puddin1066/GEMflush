# API Mocking Status for frogandtoad-real-flow.spec.ts

## Timestamp Source
The timestamp is added in the test itself (line 39-40) to ensure unique business names per test run:
```typescript
const timestamp = Date.now();
const businessName = `Alpha Dental Center ${timestamp}`;
```

This timestamp flows through:
1. Form submission → `/api/business` POST
2. Database storage → `businesses.name` column
3. Notability check → `getWikidataPublishDTO()` retrieves `business.name` from DB
4. Normalization → `checkNotability()` should normalize it via `normalizeBusinessName()`

## Current API Status

### MOCKED (via playwright.config.ts webServer.env):
- **OpenRouter API** (`OPENROUTER_API_KEY=''`) - Paid API, mocked to save costs
- **Google Search API** (`GOOGLE_SEARCH_API_KEY=''`, `USE_MOCK_GOOGLE_SEARCH='true'`) - Paid API, mocked to save costs
  - ⚠️ **ISSUE**: Test mode detection may be failing, causing real API calls instead of mocks

### REAL (using actual endpoints):
- **Internal APIs**:
  - `/api/business` - Real database operations
  - `/api/crawl` - Real web crawling (hits external site)
  - `/api/fingerprint` - Real LLM fingerprinting (uses OpenRouter, which is mocked)
  - `/api/wikidata/publish` - Real Wikidata publishing (test.wikidata.org)
  - `/api/wikidata/entity/[businessId]` - Real entity building
- **External APIs**:
  - **Web Crawling** - Real HTTP requests to `alphadentalcenter.com`
  - **Wikidata test.wikidata.org** - Real Action API calls (`WIKIDATA_PUBLISH_MODE='real'`)

## Test Requirements
Per user request: "do not mock any free API and use real endpoints to guarantee test flow emulates real UX"

### Interpretation:
- ✅ **Real internal endpoints** - Already using real internal APIs
- ✅ **Real external free APIs** - Web crawling is real
- ⚠️ **Paid APIs** - OpenRouter and Google Search are mocked (paid services)
  - Need to verify mocking works correctly
  - If user wants real paid APIs, need to provide credentials

## Issues to Fix
1. Google Search API mocking not working (test mode detection failing)
2. Verify timestamp normalization is working in notability checker
3. Ensure all real endpoints are actually being used (not accidentally mocked)

