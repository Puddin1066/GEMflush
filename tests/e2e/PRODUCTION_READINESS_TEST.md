# Production Readiness: Complete End-to-End Flow Test

## Overview

This is the **single most important test** for production readiness. If this test passes, the platform is ready for production deployment.

## What It Tests

### ✅ User Account & Authentication
- User account creation and storage in PostgreSQL
- Session persistence across page reloads
- Session cookie security (httpOnly, secure)
- Authentication verification via API

### ✅ Subscription & Tier Management
- Pro tier subscription validation
- Publishing permission checks
- Business limit enforcement (Pro: 5 businesses)
- Tier-based feature access

### ✅ Business Creation & Storage
- Business form validation
- Business data storage in PostgreSQL
- Foreign key relationships (team → business)
- UI feedback and navigation

### ✅ REAL Crawl (No Mocks)
- Real website crawling
- Data extraction from real websites
- Crawl data storage in `businesses.crawlData`
- Crawl job tracking in `crawl_jobs` table
- Crawl cache verification (24h TTL)
- Status transitions (pending → crawling → crawled)

### ✅ REAL Fingerprinting (No Mocks)
- Real LLM visibility analysis
- Fingerprint data storage in `llm_fingerprints` table
- Visibility scores, mention rates, sentiment analysis
- Fingerprint idempotency (10min cache)
- UI display of fingerprint results

### ✅ Entity Assembly & Preview
- Wikidata entity building from business data
- Entity preview card display
- Property count validation
- Stats display (claims, references)

### ✅ Notability Check Validation
- Notability assessment before publishing
- Confidence threshold validation
- References attachment to claims
- Publishing eligibility determination

### ✅ REAL Wikidata Publishing (test.wikidata.org)
- Real API integration with test.wikidata.org
- QID assignment and storage
- Entity publication verification
- Entity update/republish logic
- Published entity URL validation

### ✅ Wikidata Entity Data Storage
- Entity data storage in `wikidata_entities` table
- QID storage in `businesses.wikidataQID`
- Entity versioning
- Status updates (crawled → generating → published)

### ✅ Authorization & Security
- Business ownership verification
- Cross-team access blocking (403 errors)
- Unauthorized access handling (401 errors)
- Permission checks at API level

### ✅ Error Handling
- Invalid input validation (400 errors)
- Network failure handling
- API error responses
- Graceful error messages

### ✅ Business Status Transitions
- Valid state progression: `pending` → `crawling` → `crawled` → `generating` → `published`
- Status consistency across UI and database
- Invalid state handling

### ✅ Data Integrity & Persistence
- Data persistence across page reloads
- Foreign key relationships intact
- Data consistency across API endpoints
- Crawl, fingerprint, and entity data all retrievable

### ✅ Activity Logging
- User action logging (if enabled)
- Activity log retrieval

### ✅ UI Flow & Visuals
- Gem-themed card styling
- Value proposition copy display
- Screenshots at each major phase
- Button visibility and states
- Status displays

## Prerequisites

### Environment Variables

```bash
# Required for REAL Wikidata publishing
export WIKIDATA_PUBLISH_MODE=real
export WIKIDATA_BOT_USERNAME=your_test_bot_username
export WIKIDATA_BOT_PASSWORD=your_test_bot_password

# Note: Google Search API is mocked in test mode (NODE_ENV=test)
# This allows real notability logic to run without external API calls
```

### Test Configuration

The test is configured in `playwright.config.ts`:
- `WIKIDATA_PUBLISH_MODE='real'` - Enables real test.wikidata.org API calls
- `NODE_ENV='test'` - Enables test mode mocking for Google Search
- `OPENROUTER_API_KEY=''` - Forces mock mode for LLM APIs
- `GOOGLE_SEARCH_API_KEY=''` - Forces mock mode for Google Search

## Test Structure

The test is organized as **11 discrete sequential tests** using `test.describe.serial()`:

1. **Phase 1**: User Account & Session Verification
2. **Phase 2**: Subscription & Tier Validation
3. **Phase 3**: Business Creation & Storage
4. **Phase 4**: REAL Crawl + Data Storage
5. **Phase 5**: REAL Fingerprinting + Data Storage
6. **Phase 6**: Entity Assembly & Notability Check
7. **Phase 7**: Authorization & Security Checks
8. **Phase 8**: REAL Wikidata Publishing + Storage
9. **Phase 9**: Data Integrity & Persistence
10. **Phase 10**: Error Handling & Edge Cases
11. **Phase 11**: Final Integration Verification

**Benefits of discrete tests:**
- ✅ Better error isolation (know exactly what failed)
- ✅ Easier debugging (smaller test scope)
- ✅ Clearer test reports (each phase is separate)
- ✅ Can run individual phases for faster feedback

**Sequential execution:**
- Tests run in order (serial execution)
- State is shared across tests
- If one test fails, later tests are skipped (prevents cascading failures)

## Running the Test

```bash
# Run all production readiness tests (all phases)
pnpm exec playwright test tests/e2e/production-readiness-complete-flow.spec.ts

# Run a specific phase (e.g., Phase 3)
pnpm exec playwright test tests/e2e/production-readiness-complete-flow.spec.ts -g "Phase 3"

# Run from a specific phase onwards (e.g., Phase 5)
pnpm exec playwright test tests/e2e/production-readiness-complete-flow.spec.ts -g "Phase [5-9]"

# Run with UI (for debugging)
pnpm exec playwright test tests/e2e/production-readiness-complete-flow.spec.ts --ui

# Run with headed browser (see browser)
pnpm exec playwright test tests/e2e/production-readiness-complete-flow.spec.ts --headed

# Run with verbose output
pnpm exec playwright test tests/e2e/production-readiness-complete-flow.spec.ts --reporter=list
```

## Execution Time

- **Expected**: 5-10 minutes
- **Timeout**: 10 minutes (600 seconds)
- **Why so long?**
  - Real crawl: 30-60 seconds
  - Real fingerprinting: 10-30 seconds (LLM API calls)
  - Real Wikidata publishing: 30-120 seconds (API calls + entity processing)
  - Multiple page reloads and API calls

## Test Output

### Test Report

Each phase appears as a separate test in the report:
- ✅ Phase 1: User Account & Session Verification
- ✅ Phase 2: Subscription & Tier Validation
- ✅ Phase 3: Business Creation & Storage
- ✅ Phase 4: REAL Crawl + Data Storage
- ✅ Phase 5: REAL Fingerprinting + Data Storage
- ✅ Phase 6: Entity Assembly & Notability Check
- ✅ Phase 7: Authorization & Security Checks
- ✅ Phase 8: REAL Wikidata Publishing + Storage
- ✅ Phase 9: Data Integrity & Persistence
- ✅ Phase 10: Error Handling & Edge Cases
- ✅ Phase 11: Final Integration Verification

### Screenshots

Screenshots are saved to `test-results/prod-test/`:
1. `1-business-form-filled.png` - Form completion
2. `2-business-detail-page.png` - Business detail view
3. `3-after-crawl.png` - Post-crawl state
4. `4-after-fingerprint.png` - Post-fingerprint state
5. `5-entity-card.png` - Entity preview card
6. `6-after-publish.png` - Post-publish state
7. `7-complete-flow.png` - Final state

### Console Logging

Each test logs detailed progress:
```
[PROD TEST] PHASE 1: User Account & Session Verification
[PROD TEST] PHASE 2: Subscription & Tier Validation
[PROD TEST] PHASE 3: Business Creation & Storage
[PROD TEST] PHASE 4: REAL Crawl (no mocks)
[PROD TEST] PHASE 5: REAL Fingerprinting (no mocks)
[PROD TEST] PHASE 6: Entity Assembly & Notability Check
[PROD TEST] PHASE 7: Authorization & Security Checks
[PROD TEST] PHASE 8: REAL Wikidata Publishing
[PROD TEST] PHASE 9: Data Integrity & Persistence
[PROD TEST] PHASE 10: Error Handling & Edge Cases
[PROD TEST] PHASE 11: Final Integration Verification
```

## Success Criteria

**All 11 phases must pass** for the platform to be production-ready:

1. ✅ **Phase 1**: User account is created and retrievable, session persists
2. ✅ **Phase 2**: Pro tier subscription is validated, permissions checked
3. ✅ **Phase 3**: Business is created and stored in database
4. ✅ **Phase 4**: REAL crawl completes successfully, data stored and cached
5. ✅ **Phase 5**: REAL fingerprinting completes successfully, data stored and cached
6. ✅ **Phase 6**: Entity assembly works correctly, notability check passes
7. ✅ **Phase 7**: Authorization checks work (404, 401, 403)
8. ✅ **Phase 8**: REAL Wikidata publishing succeeds (test.wikidata.org), QID stored
9. ✅ **Phase 9**: Data persists across reloads, foreign keys intact
10. ✅ **Phase 10**: Error handling works correctly (400, 401, 404)
11. ✅ **Phase 11**: All data consistent across endpoints, integration verified

**If any phase fails:**
- The test stops at that phase
- Later phases are skipped (serial execution)
- You know exactly which system failed
- Easier debugging with focused test scope

## Troubleshooting

### Test Fails at Crawl Phase
- Check if test website is accessible
- Verify network connectivity
- Check crawl API logs for errors

### Test Fails at Fingerprinting Phase
- Check LLM API configuration (should be mocked in test mode)
- Verify fingerprint API endpoint is accessible
- Check database connection

### Test Fails at Publishing Phase
- Verify `WIKIDATA_PUBLISH_MODE=real` is set
- Check Wikidata bot credentials (`WIKIDATA_BOT_USERNAME`, `WIKIDATA_BOT_PASSWORD`)
- Verify test.wikidata.org is accessible
- Check Wikidata API logs for errors

### Test Times Out
- Increase timeout in test (currently 600 seconds)
- Check for slow API responses
- Verify network connectivity
- Check database performance

## Production Readiness Checklist

After this test passes, verify:

- [ ] All environment variables are set for production
- [ ] Database migrations are complete
- [ ] Real Wikidata credentials are configured (for production)
- [ ] Monitoring and logging are configured
- [ ] Error tracking is set up (e.g., Sentry)
- [ ] Rate limiting is configured
- [ ] Backup strategy is in place
- [ ] Security review is complete
- [ ] Performance testing is complete
- [ ] Load testing is complete

## Related Tests

- `entity-update-republish-flow.spec.ts` - Tests entity updates
- `ux-value-proposition-display.spec.ts` - Tests UI/UX
- `tier-value-proposition-efficiency.spec.ts` - Tests tier features
- `core-subscription-logic.spec.ts` - Tests subscription logic

## Notes

- This test uses **REAL APIs** to catch real-world issues
- Only external services (OpenRouter, Stripe) are mocked
- Test website (Alpha Dental Center) is a real, publicly accessible site
- Wikidata publishing uses test.wikidata.org (safe test environment)
- Test creates real database records (cleanup handled by test fixtures)

