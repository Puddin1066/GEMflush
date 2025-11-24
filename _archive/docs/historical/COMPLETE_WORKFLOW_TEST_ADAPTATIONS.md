# Complete User Workflow Test - Proposed Adaptations

## Overview

The complete user workflow test emulates the full platform behavior from URL submission to Wikidata publication. This document proposes adaptations to enhance the test's emulation of real platform behavior.

## Current Test Flow

1. ✅ Submit URL (Create business)
2. ✅ Crawl the URL
3. ✅ Fingerprint the business
4. ✅ Assemble Wikidata entity
5. ✅ Publish to TEST wikidata
6. ✅ Store data in DB
7. ✅ Store JSON for manual publication

## Proposed Adaptations

### 1. **Use Real API Endpoints Instead of Direct Service Calls**

**Current**: Direct service layer calls (`executeCrawlJob`, `executeFingerprint`)

**Proposed**: Use actual API endpoints (`POST /api/business`, `POST /api/crawl`, `POST /api/fingerprint`, `POST /api/wikidata/publish`)

**Benefits**:
- Tests the actual HTTP layer (request/response handling)
- Tests authentication/authorization middleware
- Tests API validation and error handling
- More realistic emulation of user behavior

**Implementation**:
```typescript
// Instead of:
await executeCrawlJob(jobId, businessId);

// Use:
const response = await fetch('/api/crawl', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ businessId }),
});
```

### 2. **Add Polling/Waiting for Async Operations**

**Current**: Immediate execution of async operations

**Proposed**: Poll for completion status (like real users would see)

**Benefits**:
- Tests actual async behavior
- Tests status transitions
- Tests timeout handling
- More realistic workflow timing

**Implementation**:
```typescript
// Poll for crawl completion
const crawlCompleted = await waitForBusinessStatus(businessId, 'crawled', {
  timeout: 120000,
  pollInterval: 2000,
});
```

### 3. **Test Parallel Execution (Crawl + Fingerprint)**

**Current**: Sequential execution

**Proposed**: Verify that crawl and fingerprint run in parallel (as they do in production)

**Benefits**:
- Tests actual parallel processing
- Verifies performance characteristics
- Tests race condition handling

**Implementation**:
```typescript
// Start both operations
const crawlPromise = startCrawl(businessId);
const fingerprintPromise = startFingerprint(businessId);

// Verify they complete (order doesn't matter)
const [crawlResult, fingerprintResult] = await Promise.all([
  crawlPromise,
  fingerprintPromise,
]);
```

### 4. **Add Database Transaction Testing**

**Current**: Direct database operations

**Proposed**: Test within database transactions to ensure atomicity

**Benefits**:
- Tests transaction rollback on errors
- Tests data consistency
- Tests concurrent operation handling

**Implementation**:
```typescript
await db.transaction(async (tx) => {
  const business = await createBusiness(data, tx);
  await executeCrawlJob(jobId, business.id, tx);
  // If any step fails, entire transaction rolls back
});
```

### 5. **Add Rate Limiting and Throttling Tests**

**Current**: No rate limiting simulation

**Proposed**: Test behavior under rate limits

**Benefits**:
- Tests rate limit handling
- Tests retry logic
- Tests graceful degradation

**Implementation**:
```typescript
// Simulate rate limiting
vi.spyOn(openRouterModule, 'openRouterClient').mockImplementation(() => {
  let callCount = 0;
  return {
    query: async () => {
      callCount++;
      if (callCount > 10) {
        throw new Error('Rate limit exceeded');
      }
      return mockResponse;
    },
  };
});
```

### 6. **Add Error Recovery Testing**

**Current**: Only tests happy path

**Proposed**: Test error scenarios and recovery

**Benefits**:
- Tests error handling
- Tests retry mechanisms
- Tests partial failure recovery

**Implementation**:
```typescript
// Test crawl failure → retry → success
vi.spyOn(crawlerModule, 'webCrawler').mockImplementationOnce(() => {
  throw new Error('Network error');
}).mockImplementationOnce(() => {
  return { success: true, data: mockCrawlData };
});
```

### 7. **Add Concurrency Testing**

**Current**: Single-threaded execution

**Proposed**: Test multiple businesses processed concurrently

**Benefits**:
- Tests concurrent database operations
- Tests resource contention
- Tests system under load

**Implementation**:
```typescript
// Create and process multiple businesses concurrently
const businesses = await Promise.all(
  Array.from({ length: 5 }, (_, i) => 
    createAndProcessBusiness(`Business ${i}`)
  )
);
```

### 8. **Add Realistic Timing and Delays**

**Current**: Immediate execution

**Proposed**: Add realistic delays between operations

**Benefits**:
- Tests timing-dependent behavior
- Tests cache expiration
- Tests session timeout handling

**Implementation**:
```typescript
// Add realistic delays
await new Promise(resolve => setTimeout(resolve, 1000)); // 1s crawl delay
await new Promise(resolve => setTimeout(resolve, 2000)); // 2s fingerprint delay
```

### 9. **Add Validation Testing**

**Current**: Assumes valid data

**Proposed**: Test with invalid/malformed data

**Benefits**:
- Tests input validation
- Tests error messages
- Tests data sanitization

**Implementation**:
```typescript
// Test invalid URL
await expect(
  createBusiness({ url: 'not-a-url', ... })
).rejects.toThrow('Invalid URL');

// Test missing required fields
await expect(
  createBusiness({ name: '', ... })
).rejects.toThrow('Name is required');
```

### 10. **Add Storage Verification Tests**

**Current**: Basic storage verification

**Proposed**: Comprehensive storage verification

**Benefits**:
- Tests data integrity
- Tests storage format
- Tests retrieval accuracy

**Implementation**:
```typescript
// Verify stored entity matches published entity exactly
const storedEntity = await loadStoredEntity(metadata);
expect(storedEntity).toEqual(publishedEntity);

// Verify metadata accuracy
expect(storedEntity.metadata.businessId).toBe(businessId);
expect(storedEntity.metadata.storedAt).toBeInstanceOf(Date);
```

### 11. **Add Notability Assessment Testing**

**Current**: Basic notability check

**Proposed**: Test various notability scenarios

**Benefits**:
- Tests notability logic
- Tests confidence thresholds
- Tests recommendation generation

**Implementation**:
```typescript
// Test high notability
const highNotability = await checkNotability('Well-known Business');
expect(highNotability.isNotable).toBe(true);
expect(highNotability.confidence).toBeGreaterThan(0.8);

// Test low notability
const lowNotability = await checkNotability('Unknown Business');
expect(lowNotability.isNotable).toBe(false);
expect(lowNotability.confidence).toBeLessThan(0.3);
```

### 12. **Add Entity Richness Verification**

**Current**: Basic entity verification

**Proposed**: Verify entity richness (PIDs, QIDs, references)

**Benefits**:
- Tests entity enrichment
- Tests property mapping
- Tests reference attachment

**Implementation**:
```typescript
// Verify entity has expected properties
expect(entity.claims.P31).toBeDefined(); // Instance of
expect(entity.claims.P856).toBeDefined(); // Official website
expect(entity.claims.P625).toBeDefined(); // Coordinate location

// Verify references attached
const claimWithRefs = entity.claims.P31[0];
expect(claimWithRefs.references).toBeDefined();
expect(claimWithRefs.references.length).toBeGreaterThan(0);
```

## Implementation Priority

### High Priority (Core Functionality)
1. Use Real API Endpoints
2. Add Polling/Waiting for Async Operations
3. Add Error Recovery Testing
4. Add Storage Verification Tests

### Medium Priority (Enhanced Testing)
5. Test Parallel Execution
6. Add Validation Testing
7. Add Notability Assessment Testing
8. Add Entity Richness Verification

### Low Priority (Edge Cases)
9. Add Database Transaction Testing
10. Add Rate Limiting and Throttling Tests
11. Add Concurrency Testing
12. Add Realistic Timing and Delays

## Testing Strategy

### Unit Tests
- Test individual service methods
- Test validation logic
- Test data transformations

### Integration Tests (Current)
- Test complete workflow
- Test service interactions
- Test database operations

### E2E Tests (Proposed)
- Test via UI (Playwright)
- Test via API (HTTP requests)
- Test real user scenarios

## Conclusion

These adaptations will make the test more realistic and comprehensive, better emulating actual platform behavior while maintaining test reliability and speed.

