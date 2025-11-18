# Contract Separation Analysis: Test vs Production Wikidata

## Current State

### Single Contract with Runtime Adaptation

**Current Approach:**
- **One Contract**: `WikidataEntityDataContract` used for both test and production
- **Runtime Adaptation**: `adaptEntityForTest()` method removes problematic properties when publishing to test
- **Entity Building**: Always builds using production property definitions (correct types)

**Implementation:**
```typescript
// lib/wikidata/publisher.ts
private adaptEntityForTest(cleanedEntity: CleanedWikidataEntity): void {
  // Remove properties that don't match test's schema
  const propertiesToRemove = ['P31', 'P856', 'P1128', 'P2003'];
  // Remove all references
  // Make labels/descriptions unique
}
```

## Should Contracts Be Separate?

### Arguments FOR Separate Contracts

1. **Type Safety**: Compile-time guarantees that test entities are valid for test environment
2. **Explicit Differences**: Makes test vs production differences clear in code
3. **Prevent Errors**: Can't accidentally use production contract for test or vice versa
4. **Better Testing**: Can test each contract independently
5. **Documentation**: Contract types serve as documentation of what's allowed in each environment

### Arguments AGAINST Separate Contracts

1. **Code Duplication**: Would need to maintain two similar contract structures
2. **Maintenance Burden**: Changes to entity structure need to be made in two places
3. **Current Approach Works**: Runtime adaptation handles the differences pragmatically
4. **DRY Principle**: Single source of truth for entity structure
5. **Future-Proofing**: If test.wikidata.org fixes its schema, only one contract needs updating

### Recommendation: **Hybrid Approach**

**Keep one base contract, but add type guards and explicit test contract:**

```typescript
// Base contract (production-ready)
export interface WikidataEntityDataContract { ... }

// Test contract (subset of production)
export type TestWikidataEntityData = Omit<WikidataEntityDataContract, 'claims'> & {
  claims: Omit<WikidataEntityDataContract['claims'], 'P31' | 'P856' | 'P1128' | 'P2003'> & {
    // No references allowed in test
    [pid: string]: Array<Omit<WikidataClaim, 'references'>>;
  };
};

// Type guard
export function isTestCompatible(entity: WikidataEntityDataContract): entity is TestWikidataEntityData {
  // Validation logic
}
```

**Benefits:**
- ✅ Single source of truth (base contract)
- ✅ Type safety for test environment
- ✅ Explicit differences
- ✅ Minimal duplication (uses TypeScript utility types)

## Test Coverage Analysis

### ✅ What's Tested

1. **Contract Implementation Tests** (`lib/types/__tests__/contract-implementation.test.ts`)
   - ✅ Service contract signatures match implementations
   - ✅ Type checking for `IWikidataPublisher` contract
   - ✅ Tests both 'test' and 'production' targets

2. **Publisher Tests** (`lib/wikidata/__tests__/publisher.test.ts`)
   - ✅ Publish to test Wikidata (mock mode)
   - ✅ Publish to production Wikidata (mock mode)
   - ✅ Unique QID generation
   - ✅ Error handling
   - ✅ Update entity functionality

3. **Validation Tests** (`lib/validation/__tests__/business.test.ts`)
   - ✅ Business validation schemas
   - ✅ Location validation
   - ✅ Category validation
   - ✅ Request validation (crawl, fingerprint, publish)

4. **Wikidata Module Tests** (71 tests total)
   - ✅ Entity building
   - ✅ Property mapping
   - ✅ QID resolution
   - ✅ SPARQL queries
   - ✅ Notability checking

### ❌ What's Missing

1. **No Tests for `adaptEntityForTest()` Method**
   - ❌ No verification that P31 is removed for test
   - ❌ No verification that references are removed
   - ❌ No verification that other properties remain intact
   - ❌ No verification that labels/descriptions are made unique

2. **No Wikidata Schema Validation Tests**
   - ❌ No tests for `wikidataEntityDataSchema` (Zod)
   - ❌ No tests for `wikidataClaimSchema`
   - ❌ No tests for `wikidataLabelSchema`
   - ❌ No tests for `wikidataDescriptionSchema`
   - ❌ No tests for `wikidataReferenceSchema`

3. **No Test vs Production Contract Comparison Tests**
   - ❌ No tests verifying test entities are valid for test environment
   - ❌ No tests verifying production entities are valid for production
   - ❌ No tests verifying adaptation doesn't break entity structure

4. **No Contract Compliance Tests**
   - ❌ No tests verifying entities match Wikibase JSON spec
   - ❌ No tests verifying property type correctness
   - ❌ No tests verifying reference structure correctness

## Recommendations

### Immediate Actions

1. **Add Tests for `adaptEntityForTest()`**
   ```typescript
   describe('adaptEntityForTest', () => {
     it('should remove P31 for test environment', () => {
       const entity = { claims: { P31: [...] } };
       adaptEntityForTest(entity);
       expect(entity.claims.P31).toBeUndefined();
     });
     
     it('should remove all references', () => {
       const entity = { claims: { P856: [{ references: [...] }] } };
       adaptEntityForTest(entity);
       expect(entity.claims.P856[0].references).toEqual([]);
     });
   });
   ```

2. **Add Wikidata Validation Schema Tests**
   ```typescript
   describe('wikidataEntityDataSchema', () => {
     it('should validate production entity structure', () => {
       const entity = { labels: {...}, descriptions: {...}, claims: {...} };
       const result = wikidataEntityDataSchema.safeParse(entity);
       expect(result.success).toBe(true);
     });
     
     it('should reject entities without labels', () => {
       const entity = { descriptions: {...}, claims: {...} };
       const result = wikidataEntityDataSchema.safeParse(entity);
       expect(result.success).toBe(false);
     });
   });
   ```

3. **Add Test vs Production Comparison Tests**
   ```typescript
   describe('Test vs Production Entity Compatibility', () => {
     it('should produce valid test entity after adaptation', () => {
       const productionEntity = buildEntityForProduction(business);
       const testEntity = adaptForTest(productionEntity);
       // Verify test entity is valid for test environment
       expect(testEntity.claims.P31).toBeUndefined();
       expect(hasReferences(testEntity)).toBe(false);
     });
   });
   ```

### Long-term Improvements

1. **Consider Separate Contracts** (if test.wikidata.org schema issues persist)
   - Use TypeScript utility types to minimize duplication
   - Add type guards for compile-time safety
   - Document differences explicitly

2. **Add Contract Compliance Tests**
   - Verify entities match Wikibase JSON spec
   - Verify property types match Wikidata definitions
   - Verify reference structure correctness

3. **Add Integration Tests**
   - Test actual publishing to test.wikidata.org (with real credentials)
   - Verify adapted entities publish successfully
   - Verify production entities would publish successfully (mocked)

## Conclusion

**Current State**: Single contract with runtime adaptation works pragmatically, but lacks test coverage for the adaptation logic.

**Recommendation**: 
1. **Short-term**: Add missing tests for adaptation and validation schemas
2. **Long-term**: Consider hybrid approach with explicit test contract type if test.wikidata.org issues persist

**Priority**: High - The adaptation logic is critical but untested, which could lead to runtime errors in production.

