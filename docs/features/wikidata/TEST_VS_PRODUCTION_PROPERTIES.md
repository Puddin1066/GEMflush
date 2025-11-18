# Test vs Production Wikidata Property Differences

## Overview

`test.wikidata.org` has **incorrect property definitions** compared to production `www.wikidata.org`. This document details the differences and how we handle them.

## Why This Matters

When building entities for production Wikidata, we use the correct property types. However, when publishing to `test.wikidata.org` for testing, the API validates against test's incorrect schema, causing type mismatch errors.

## Property Type Differences

### Core Properties

| Property | Production Type | Test Type | Status |
|----------|----------------|-----------|--------|
| P31 (instance of) | `wikibase-item` | `url` ❌ | **WRONG** |
| P854 (reference URL) | `url` | `globe-coordinate` ❌ | **WRONG** |
| P813 (retrieved date) | `time` | `wikibase-item` ❌ | **WRONG** |
| P1476 (title) | `monolingualtext` | `globe-coordinate` ❌ | **WRONG** |

### Impact

- **P31**: Cannot use "instance of" claims on test (they're built as `wikibase-entityid` but test expects `string`)
- **P854**: Cannot use reference URLs on test (they're built as `string` but test expects `globecoordinate`)
- **P813**: Cannot use retrieved dates in references on test (they're built as `time` but test expects `wikibase-entityid`)
- **P1476**: Cannot use reference titles on test (they're built as `monolingualtext` but test expects `globecoordinate`)

## Our Solution

### Build for Production, Publish to Test

1. **Entity Building**: Always build entities using **production** property definitions
2. **Validation**: Validate against **production** property types
3. **Test Publishing**: When publishing to test, adapt the entity:
   - Remove P31 (instance of) - test has wrong type
   - Remove all references - reference properties have wrong types on test
   - Keep mainsnaks for other properties (if they match test's schema)

### Code Implementation

Located in: `lib/wikidata/publisher.ts`

```typescript
// Query PRODUCTION Wikidata property info to verify expected types
const productionBaseUrl = this.prodBaseUrl;
const propertyTypeMap = await this.verifyPropertyTypes(cleanedEntity, productionBaseUrl);

if (baseUrl !== productionBaseUrl) {
  // Publishing to test - remove problematic properties and references
  if (cleanedEntity.claims.P31) {
    delete cleanedEntity.claims.P31; // Test has wrong type
  }
  
  // Remove all references - test has wrong types for reference properties
  for (const [pid, claimArray] of Object.entries(cleanedEntity.claims)) {
    for (const claim of claimArray) {
      if (claim.references) {
        claim.references = [];
      }
    }
  }
}
```

## Verification

To verify property types:

```bash
# Production
curl "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=P31|P854|P813|P1476&props=datatype&format=json" | jq '.entities'

# Test
curl "https://test.wikidata.org/w/api.php?action=wbgetentities&ids=P31|P854|P813|P1476&props=datatype&format=json" | jq '.entities'
```

## Testing Strategy

1. **Build entities** using production property definitions
2. **Validate** against production types (for correctness)
3. **Publish to test** with adaptations (remove P31, remove references)
4. **Verify** mainsnaks publish successfully
5. **Production** will have full entity with all properties and references

## Future Considerations

- Consider using mock mode for tests instead of real test.wikidata.org API
- Or create a test-specific entity builder that uses test's (incorrect) schema
- Monitor if test.wikidata.org property definitions are ever corrected

## References

- Wikibase Data Model: https://www.mediawiki.org/wiki/Wikibase/DataModel
- Wikidata Action API: https://www.wikidata.org/wiki/Wikidata:Data_access
- Test Wikidata: https://test.wikidata.org


