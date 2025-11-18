# Wikidata Entity Contract

## Overview

The `WikidataEntityDataContract` provides **strict TypeScript types** that match the Wikibase JSON specification exactly. This contract ensures compile-time type safety and prevents type mismatches that cause Wikidata API errors.

## Why a Contract is Needed

The original `WikidataEntityData` interface uses loose types:
- `datavalue.value: unknown` - no type safety
- `references.snaks: Record<string, unknown[]>` - no structure validation
- `type: string` - no enum validation

This led to runtime errors like:
```
Bad value type wikibase-entityid, expected string
```

## The Contract

Located in: `lib/types/wikidata-contract.ts`

### Key Features

1. **Discriminated Unions**: Each datavalue type has its own structure
   ```typescript
   type WikidataDatavalue =
     | { type: 'wikibase-entityid'; value: WikibaseEntityIdValue }
     | { type: 'string'; value: string }
     | { type: 'time'; value: TimeValue }
     | { type: 'quantity'; value: QuantityValue }
     | { type: 'monolingualtext'; value: MonolingualTextValue }
     | { type: 'globecoordinate'; value: GlobeCoordinateValue };
   ```

2. **Strict Value Structures**: Each type has a well-defined structure
   - `TimeValue`: Includes `time`, `precision`, `calendarmodel`, etc.
   - `QuantityValue`: Includes `amount`, `unit` (QID or "1")
   - `MonolingualTextValue`: Includes `text` and `language`
   - `WikibaseEntityIdValue`: Includes `entity-type` and `id`

3. **Type Safety**: TypeScript will catch mismatches at compile time
   ```typescript
   // ❌ This will cause a compile error:
   const claim: WikidataClaim = {
     mainsnak: {
       snaktype: 'value',
       property: 'P1448',
       datavalue: {
         type: 'string',
         value: { id: 'Q123' } // Error: string type expects string, not object
       }
     }
   };
   
   // ✅ This is correct:
   const claim: WikidataClaim = {
     mainsnak: {
       snaktype: 'value',
       property: 'P1448',
       datavalue: {
         type: 'string',
         value: 'Alpha Dental Center' // Correct: string value
       }
     }
   };
   ```

## Usage

### For New Code

Use the strict contract types:

```typescript
import { 
  WikidataEntityDataContract,
  WikidataClaim,
  WikidataDatavalue,
  TimeValue,
  QuantityValue
} from '@/lib/types/wikidata-contract';

// Type-safe entity creation
const entity: WikidataEntityDataContract = {
  labels: { /* ... */ },
  descriptions: { /* ... */ },
  claims: { /* ... */ }
};
```

### For Existing Code

The loose types in `lib/types/gemflush.ts` are still available for backward compatibility but are marked as `@deprecated`. Gradually migrate to the contract types.

### Runtime Validation

Use the type guard for runtime checks:

```typescript
import { isWikidataEntityDataContract } from '@/lib/types/wikidata-contract';

if (isWikidataEntityDataContract(data)) {
  // TypeScript now knows data matches the contract
  // Full validation should still use Zod schemas
}
```

## Benefits

1. **Compile-Time Safety**: Catch type mismatches before runtime
2. **Better IDE Support**: Autocomplete and type hints for all structures
3. **Documentation**: Types serve as inline documentation
4. **Refactoring Safety**: TypeScript will catch breaking changes
5. **Alignment with Spec**: Matches Wikibase JSON specification exactly

## Migration Path

1. **Phase 1** (Current): Contract exists alongside loose types
2. **Phase 2**: Update entity builder to use contract types
3. **Phase 3**: Update publisher to use contract types
4. **Phase 4**: Remove deprecated loose types

## Related Files

- `lib/types/wikidata-contract.ts` - The strict contract
- `lib/types/gemflush.ts` - Loose types (deprecated)
- `lib/validation/wikidata.ts` - Zod schemas for runtime validation
- `lib/wikidata/entity-builder.ts` - Entity construction
- `lib/wikidata/publisher.ts` - Entity publishing

## References

- [Wikibase Data Model](https://www.mediawiki.org/wiki/Wikibase/DataModel)
- [Wikibase JSON Spec](https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html)
- [Wikidata Action API](https://www.wikidata.org/wiki/Wikidata:Data_access)


