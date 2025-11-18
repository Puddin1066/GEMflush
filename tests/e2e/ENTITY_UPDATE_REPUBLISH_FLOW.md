# Entity Update/Republish Flow E2E Test

## Overview

This document describes the **Entity Update/Republish Flow** e2e test, which is **critical for iterative development** of the KGaaS platform.

## Why This Test is Critical

### 1. **Iterative Development Workflow**
- **Real-world scenario**: Businesses update their websites, and entities need to be kept current
- **User behavior**: Users will want to improve and enrich their entities over time
- **Development pattern**: This is the primary method through which the platform will be built and refined

### 2. **Core Platform Functionality**
- Tests the `updateEntity()` method in `WikidataPublisher` end-to-end
- Validates that existing QIDs are preserved (not creating duplicate entities)
- Ensures entity updates work correctly with real Wikidata API

### 3. **Data Integrity**
- Verifies that QIDs are not lost during re-crawls or updates
- Ensures business status transitions correctly (published → crawled → published)
- Validates that entity data persists correctly through update cycles

### 4. **Production Readiness**
- This is a common workflow users will need in production
- Tests the complete update cycle: publish → re-crawl → rebuild → update
- Validates error handling and edge cases

## Test Flow

### Phase 1: Initial Publish (Get QID)
1. Create business
2. Crawl website
3. Publish to Wikidata (get initial QID)
4. Verify QID is assigned and business status is 'published'

### Phase 2: Re-crawl and Rebuild Entity
1. Re-crawl business (simulating website updates)
2. Rebuild entity with new/enriched data
3. Verify QID is preserved after re-crawl
4. Verify entity has same or more properties

### Phase 3: Update Existing Wikidata Entity
1. Update existing entity on Wikidata (using `updateEntity`, not `publishEntity`)
2. Preserve existing QID (not creating new entity)
3. Update entity with new/enriched data
4. Verify update succeeded

### Phase 4: Verify Update Succeeded
1. Verify entity card shows updated entity with preserved QID
2. Verify business status and QID in database
3. Verify final entity data has preserved QID and updated claims

## Implementation Notes

### Current State
- ✅ `updateEntity()` method exists in `WikidataPublisher`
- ⏳ Update/republish API endpoint may need to be created
- ✅ Test handles both cases (update endpoint exists or doesn't exist yet)

### Test Strategy
- **Pragmatic**: Uses real internal APIs, mocks external services only
- **Flexible**: Handles case where update endpoint doesn't exist yet (uses publish endpoint as workaround)
- **Comprehensive**: Tests complete update cycle from publish to update

### Future Enhancements
1. **Entity Enrichment Test**: Verify that enriched entities (with more properties) update correctly
2. **Conflict Resolution Test**: Verify that entity conflicts (external edits) are handled gracefully
3. **Batch Update Test**: Verify that multiple entities can be updated in sequence

## Running the Test

```bash
# Run the update/republish flow test
pnpm test:e2e entity-update-republish-flow

# Run with UI (debugging)
pnpm test:e2e entity-update-republish-flow --headed

# Run with verbose logging
DEBUG=pw:api pnpm test:e2e entity-update-republish-flow
```

## Expected Behavior

### Success Case
- ✅ Initial publish succeeds and QID is assigned
- ✅ Re-crawl completes and QID is preserved
- ✅ Entity update succeeds and QID is preserved
- ✅ Entity card shows updated entity with preserved QID
- ✅ Business status and QID persist correctly in database

### Error Cases (Handled Gracefully)
- ⚠️ Update endpoint doesn't exist yet → Uses publish endpoint (workaround)
- ⚠️ Entity already exists → Detects duplicate and preserves QID
- ⚠️ Re-crawl fails → Test continues (entity may still be updateable)

## Integration with Development Workflow

This test is designed to be run **iteratively during development**:

1. **Initial Development**: Test may fail if update endpoint doesn't exist → Guides implementation
2. **Implementation**: As update endpoint is built, test validates correctness
3. **Refinement**: Test catches regressions and validates improvements
4. **Production**: Test ensures update flow works correctly in production

## Related Tests

- `frogandtoad-real-flow.spec.ts` - Initial publish flow
- `crawl-entity-publish-flow.spec.ts` - Complete publish workflow
- `wikidata-publishing-workflows.spec.ts` - Publishing workflows with feature gates

## Dependencies

- Requires Pro team (for Wikidata publishing)
- Requires real Wikidata credentials (for test.wikidata.org)
- Requires real crawl service (or mocked crawl API)
- Requires entity builder service

## Maintenance

### When to Update
- ✅ When update/republish API endpoint is implemented
- ✅ When entity update logic changes
- ✅ When Wikidata API integration changes
- ✅ When business status transitions change

### When to Skip
- ❌ If update functionality is not yet implemented (test will guide implementation)
- ❌ If external services are unavailable (test will fail gracefully)


