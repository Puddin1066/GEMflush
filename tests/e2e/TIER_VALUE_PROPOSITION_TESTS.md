# Tier Value Proposition & Efficiency E2E Tests

## Purpose

Comprehensive E2E tests that verify:
1. **Frictionless UX**: Auto-start processing, no manual steps
2. **Tier Value Delivery**: Features work correctly based on subscription tier
3. **API Efficiency**: Caching, frequency enforcement, lazy loading prevent redundant calls

## Test Coverage

### Free Tier - LLM Fingerprinter Value

**Features Tested:**
- ✅ Fingerprinting works automatically
- ✅ 1 business limit enforced
- ✅ Monthly fingerprint frequency enforced
- ✅ Wikidata publishing blocked (free tier limitation)

**Value Proposition:**
- Free tier users get fingerprint results (visibility scores) automatically
- Processing starts automatically on business creation (frictionless UX)
- Clear limits prevent abuse while delivering value

**Tests:**
1. `free tier user can create business and get fingerprint results automatically`
   - Verifies auto-start processing works
   - Confirms fingerprint results appear automatically
   - Ensures Wikidata publishing is blocked
   - Verifies API efficiency (minimal redundant calls)

2. `free tier user is limited to 1 business`
   - Verifies business limit enforcement
   - Tests upgrade prompts appear correctly

3. `free tier fingerprint frequency is enforced (monthly)`
   - Verifies frequency limits prevent duplicate fingerprints
   - Tests frequency enforcement API responses

### Pro Tier - Wikidata Publisher Value

**Features Tested:**
- ✅ Wikidata publishing enabled (primary value proposition)
- ✅ Up to 5 businesses allowed
- ✅ Weekly fingerprint frequency
- ✅ Entity preview available
- ✅ Publishing workflow completes successfully

**Value Proposition:**
- Pro tier users can publish to Wikidata (core value)
- Processing happens automatically (frictionless UX)
- Entity preview shows rich data before publishing

**Tests:**
1. `pro tier user can publish to Wikidata (primary value proposition)`
   - Verifies publishing workflow end-to-end
   - Tests entity preview loads lazily (efficient)
   - Confirms publish button is visible and functional
   - Verifies API efficiency (lazy entity loading)

2. `pro tier user can create up to 5 businesses`
   - Verifies 5 business limit works correctly
   - Tests limit enforcement at 6th business
   - Ensures auto-start works for each business

### Agency Tier - Full Feature Access

**Features Tested:**
- ✅ All Pro features plus API access
- ✅ Up to 25 businesses allowed
- ✅ Weekly fingerprint frequency

**Value Proposition:**
- Agency tier users have all features plus API access
- Higher business limits for larger organizations
- Same efficient processing as Pro tier

**Tests:**
1. `agency tier user has all features including API access`
   - Verifies all Pro features work
   - Confirms higher limits than Pro

2. `agency tier user can create up to 25 businesses`
   - Verifies 25 business limit (tests 3 businesses, verifies limit is higher than Pro)

### API Efficiency - Caching & Optimization

**Features Tested:**
- ✅ Crawl caching prevents redundant crawls
- ✅ Frequency enforcement prevents duplicate fingerprints
- ✅ Lazy entity loading (only when needed)
- ✅ Parallel processing efficiency

**Value Proposition:**
- Efficient API usage reduces costs
- Faster response times (caching, lazy loading)
- Better user experience (auto-start, parallel processing)

**Tests:**
1. `crawl caching prevents redundant crawls`
   - Verifies cache logic skips redundant crawls
   - Tests manual crawl respects cache

2. `entity loading is lazy (only when needed)`
   - Verifies entity API is only called when detail page loads
   - Tests entity doesn't load until needed

3. `auto-start processing is efficient (parallel execution)`
   - Verifies crawl and fingerprint run in parallel
   - Tests processing completes quickly (efficient timing)

### Frictionless UX - Auto-Start & No Manual Steps

**Features Tested:**
- ✅ Auto-start processing on business creation
- ✅ Fingerprint results appear automatically
- ✅ No manual crawl/fingerprint button clicks required

**Value Proposition:**
- Zero-friction onboarding
- Processing happens automatically in background
- Users see results without manual steps

**Tests:**
1. `business creation triggers auto-start processing automatically`
   - Verifies processing starts without user action
   - Tests crawl status updates automatically

2. `fingerprint results appear automatically after business creation`
   - Verifies fingerprint results load automatically
   - Tests results visible without manual trigger

## Running Tests

```bash
# Run all tier value proposition tests
pnpm test:e2e tier-value-proposition-efficiency

# Run specific tier tests
pnpm test:e2e tier-value-proposition-efficiency --grep "Free Tier"
pnpm test:e2e tier-value-proposition-efficiency --grep "Pro Tier"
pnpm test:e2e tier-value-proposition-efficiency --grep "Agency Tier"

# Run efficiency tests
pnpm test:e2e tier-value-proposition-efficiency --grep "API Efficiency"

# Run UX tests
pnpm test:e2e tier-value-proposition-efficiency --grep "Frictionless UX"
```

## Test Philosophy

### SOLID Principles
- **Single Responsibility**: Each test focuses on one tier/value proposition
- **Open/Closed**: Tests are extensible for new tiers/features
- **DRY**: Reuses fixtures, page objects, and helpers

### Pragmatic Approach
- **Critical Paths**: Tests revenue-generating features (Pro tier publishing)
- **User Value**: Tests features users actually use
- **Efficiency**: Verifies optimizations reduce costs and improve UX

### Real APIs
- Uses real internal APIs (business creation, auto-start processing)
- Only mocks external services (Stripe, Wikidata publishing, OpenRouter)
- Tests actual user experience with real API responses

## Success Criteria

### UX Frictionless
- ✅ Processing starts automatically (no manual steps)
- ✅ Results appear without user action
- ✅ Clear error messages for limits

### Tier Value Delivery
- ✅ Free tier: Fingerprinting only, 1 business, monthly frequency
- ✅ Pro tier: Publishing enabled, 5 businesses, weekly frequency
- ✅ Agency tier: All features, 25 businesses, weekly frequency

### API Efficiency
- ✅ Crawl caching prevents redundant calls
- ✅ Frequency enforcement respects plan limits
- ✅ Lazy entity loading minimizes API calls
- ✅ Parallel processing reduces total time

## Integration with Existing Tests

This test suite complements existing tests:
- `pro-user-core-journey.spec.ts`: Pro tier publishing workflow
- `subscription-to-publishing-journey.spec.ts`: Free → Pro upgrade journey
- `wikidata-value-proposition.spec.ts`: Wikidata entity publication value

## Future Enhancements

- [ ] Add tests for upgrade flow (Free → Pro → Agency)
- [ ] Add tests for downgrade flow (tier limit enforcement)
- [ ] Add performance benchmarks for processing time
- [ ] Add API call counting metrics
- [ ] Add tests for error recovery (failed crawl/fingerprint)


