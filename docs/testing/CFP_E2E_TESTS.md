# CFP Process E2E Tests

## Overview

End-to-end tests for the complete **CFP (Crawl, Fingerprint, Publish)** workflow, verifying the sequential process from website crawling through entity publication.

**Location**: `tests/e2e/cfp-process.spec.ts`

---

## Test Coverage

### 1. Complete CFP Flow
**Test**: `complete CFP flow: crawl → fingerprint → publish with rich entity`

**Steps**:
1. **Crawl (C)**: Extract structured data from website
   - Verifies crawl completes successfully
   - Verifies `crawlData` is stored in database
   - Verifies `crawlData` structure (name, location, etc.)

2. **Fingerprint (F)**: Measure visibility using LLM
   - Verifies fingerprint requires `crawlData` (sequential dependency)
   - Verifies fingerprint completes with visibility score
   - Verifies fingerprint uses `crawlData` for prompt generation

3. **Publish (P)**: Build rich entity and publish to Wikidata
   - Verifies entity is built from `crawlData`
   - Verifies entity has properties from `crawlData`:
     - Basic: P31 (instance of), P856 (website), P1448 (name)
     - Contact: P1329 (phone), P968 (email)
     - Location: P625 (coordinates), P6375 (address)
     - Social: P2002 (Twitter), P4264 (LinkedIn)
     - Temporal: P571 (inception)
     - Scale: P1128 (employees)
   - Verifies entity is published (QID assigned)

**Key Assertions**:
- ✅ Crawl completes and stores `crawlData`
- ✅ Fingerprint completes using `crawlData`
- ✅ Entity has rich properties from `crawlData`
- ✅ Entity is published to Wikidata

---

### 2. Fingerprint Requires CrawlData
**Test**: `CFP flow: fingerprint requires crawlData`

**Purpose**: Verify that fingerprinting fails gracefully when `crawlData` is missing.

**Steps**:
1. Create business without crawling
2. Attempt to fingerprint
3. Verify error about missing `crawlData`

**Key Assertions**:
- ✅ Fingerprint API returns error when `crawlData` is missing
- ✅ Error message mentions `crawlData` requirement

---

### 3. Entity Uses CrawlData for Rich Properties
**Test**: `CFP flow: entity uses crawlData for rich properties`

**Purpose**: Verify that entity building extracts properties from `crawlData`.

**Steps**:
1. Create business
2. Crawl with rich `crawlData` (phone, email, social links, etc.)
3. Build entity (before publish)
4. Verify entity has properties from `crawlData`

**Key Assertions**:
- ✅ Entity has >10 properties (rich entity)
- ✅ Entity includes contact properties (phone, email)
- ✅ Entity includes location properties (coordinates, address)
- ✅ Entity includes social properties (Twitter, Facebook, Instagram, LinkedIn)
- ✅ Entity includes temporal properties (inception)
- ✅ Entity includes scale properties (employees)

---

### 4. Sequential Execution
**Test**: `CFP flow: sequential execution (crawl → fingerprint → publish)`

**Purpose**: Verify that CFP steps execute in correct order.

**Steps**:
1. **Crawl**: Verify `crawlData` exists before fingerprint
2. **Fingerprint**: Verify fingerprint uses `crawlData`
3. **Publish**: Verify entity uses `crawlData` for building

**Key Assertions**:
- ✅ Crawl completes before fingerprint starts
- ✅ Fingerprint uses `crawlData` from crawl step
- ✅ Entity building uses `crawlData` from crawl step
- ✅ Sequential dependencies are respected

---

## Test Infrastructure

### Fixtures
- **`authenticatedPage`**: Provides authenticated user session
- **`setupProTeam`**: Sets up Pro tier team (required for auto-publish)
- **`mockExternalServices`**: Mocks external APIs (OpenRouter, Stripe, Wikidata)

### Helpers
- **`BusinessPage`**: Page object for business creation
- **`waitForBusinessDetailPage`**: Waits for business page to load
- **`waitForBusinessInAPI`**: Polls API for business status
- **`runCrawlAndFingerprint`**: Triggers crawl operation
- **`mockCrawlAPI`**: Mocks crawl API responses

### Timeouts
- **Test timeout**: 5 minutes (300000ms) for complete CFP flow
- **Crawl timeout**: 60 seconds
- **Fingerprint timeout**: 120 seconds
- **Publish timeout**: 120 seconds

---

## Test Principles

### SOLID
- **Single Responsibility**: Each test focuses on one aspect of CFP
- **Open/Closed**: Tests use helpers and fixtures (extensible)
- **Dependency Inversion**: Tests depend on abstractions (API endpoints, not internal functions)

### DRY
- **Reusable Helpers**: Common operations (crawl, fingerprint, publish) are extracted
- **Shared Fixtures**: Authentication and team setup are shared
- **Page Objects**: UI interactions are centralized

### Pragmatic Testing
- **Real Internal APIs**: Uses actual API endpoints (not mocked)
- **Mock External Services**: Only mocks external services (OpenRouter, Stripe, Wikidata API)
- **Behavior-Focused**: Tests verify observable behavior (status changes, data storage)
- **No Overfitting**: Tests focus on outcomes, not implementation details

---

## Running Tests

### Run All CFP Tests
```bash
pnpm test:e2e cfp-process
```

### Run Specific Test
```bash
pnpm test:e2e cfp-process -g "complete CFP flow"
```

### Run in UI Mode
```bash
pnpm test:e2e:ui cfp-process
```

### Run in Headed Mode
```bash
pnpm test:e2e:headed cfp-process
```

---

## Expected Behavior

### Successful Flow
1. **Business Created**: Business appears in database
2. **Crawl Completes**: `crawlData` stored, status = `'crawled'`
3. **Fingerprint Completes**: Visibility score calculated, `llmFingerprints` record created
4. **Entity Built**: Rich entity with properties from `crawlData`
5. **Entity Published**: QID assigned, entity in Wikidata

### Error Handling
- **Missing CrawlData**: Fingerprint returns error
- **Crawl Failure**: Status = `'error'`, test continues (entity may still be buildable)
- **Fingerprint Failure**: Test fails (fingerprint is required for visibility measurement)
- **Publish Failure**: Test may continue (notability check may fail)

---

## Dependencies

### Sequential Dependencies
1. **Crawl → Fingerprint**: Fingerprint requires `crawlData`
2. **Crawl → Publish**: Entity building uses `crawlData`
3. **Fingerprint → Publish**: Optional (publish can happen without fingerprint)

### Data Flow
```
Business Creation
  ↓
Crawl (extracts crawlData)
  ↓
Fingerprint (uses crawlData for prompts)
  ↓
Entity Building (uses crawlData for properties)
  ↓
Publish (sends entity to Wikidata)
```

---

## Known Issues

### Playwright Module Resolution
**Warning**: `Module not found: Can't resolve 'playwright'` in crawler

**Impact**: Build warning only, does not prevent tests from running

**Cause**: Crawler tries to import Playwright dynamically, but it's not available in Next.js build context

**Workaround**: Tests use mocked crawl API, so Playwright import is not executed

---

## Future Enhancements

1. **Notability Verification**: Test notability check before publish
2. **Entity Update Flow**: Test entity updates after republish
3. **Error Recovery**: Test error handling and recovery flows
4. **Tier-Based Features**: Test different entity richness by tier
5. **LLM Suggestions**: Test LLM property suggestions in entity building

---

## Related Documentation

- **CFP Process**: `docs/development/CFP_AND_ENTITY_PUBLICATION.md`
- **Crawl Data Mapping**: `docs/development/CRAWL_DATA_TO_WIKIDATA_MAPPING.md`
- **Entity Building**: `docs/development/TYPED_ENTITY_BUILDER.md`
- **E2E Testing Guide**: `docs/testing/E2E_TESTING_GUIDE.md`


