# Deprecated Types Migration Guide

## What Are Deprecated Types?

The deprecated types in `lib/types/gemflush.ts` are **loose TypeScript types** that use `unknown` and `string` instead of strict, well-defined types. They were created for backward compatibility but are now replaced by strict types that match the official Wikibase JSON specification.

### Deprecated Types (Loose)

```typescript
// lib/types/gemflush.ts - DEPRECATED
export interface WikidataEntityData {
  labels: Record<string, { language: string; value: string }>;
  descriptions: Record<string, { language: string; value: string }>;
  claims: Record<string, WikidataClaim[]>; // Uses deprecated WikidataClaim
  llmSuggestions?: { ... };
}

export interface WikidataClaim {
  mainsnak: {
    datavalue: {
      value: unknown; // ❌ Loose type - no type safety!
      type: string;
    };
  };
  // ...
}

export interface WikidataReference {
  snaks: Record<string, unknown[]>; // ❌ Loose type - no type safety!
}
```

### Strict Types (Current Standard)

```typescript
// lib/types/wikidata-contract.ts - STRICT
export interface WikidataEntityDataContract {
  labels: Record<string, WikidataLabel>; // Strict type
  descriptions: Record<string, WikidataDescription>; // Strict type
  claims: Record<string, WikidataClaim[]>; // Uses strict WikidataClaim
  llmSuggestions?: LLMSuggestions; // Strict type
}

export interface WikidataClaim {
  mainsnak: WikidataSnak; // Strict type
  type: 'statement';
  rank?: 'preferred' | 'normal' | 'deprecated';
  references?: WikidataReference[]; // Strict type
  qualifiers?: Record<string, WikidataSnak[]>;
}

export interface WikidataReference {
  snaks: Record<string, WikidataReferenceSnak[]>; // Strict type
  'snak-order'?: string[];
}
```

---

## Key Differences

### 1. Type Safety

**Deprecated (Loose)**:
```typescript
datavalue: {
  value: unknown; // ❌ Can be anything - no type checking
  type: string;
}
```

**Strict**:
```typescript
datavalue: WikidataDatavalue; // ✅ Discriminated union - type-safe
// Can be: WikibaseEntityIdValue | TimeValue | QuantityValue | etc.
```

### 2. Structure Validation

**Deprecated (Loose)**:
```typescript
labels: Record<string, { language: string; value: string }>;
// ❌ No validation of structure
```

**Strict**:
```typescript
labels: Record<string, WikidataLabel>;
// ✅ WikidataLabel has required fields: { language: string; value: string }
```

### 3. Property Types

**Deprecated (Loose)**:
```typescript
rank?: string; // ❌ Can be any string
```

**Strict**:
```typescript
rank?: 'preferred' | 'normal' | 'deprecated'; // ✅ Union type
```

---

## What Migration Entails

### Step 1: Update Imports

**Before**:
```typescript
import { WikidataEntityData } from '@/lib/types/gemflush';
```

**After**:
```typescript
import { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';
```

### Step 2: Update Type Annotations

**Before**:
```typescript
function processEntity(entity: WikidataEntityData) {
  // TypeScript doesn't know what entity.claims[0].mainsnak.datavalue.value is
  const value = entity.claims.P31[0].mainsnak.datavalue.value; // unknown
}
```

**After**:
```typescript
function processEntity(entity: WikidataEntityDataContract) {
  // TypeScript knows the exact structure
  const claim = entity.claims.P31[0];
  if (claim.mainsnak.datavalue.type === 'wikibase-entityid') {
    const qid = claim.mainsnak.datavalue.value.id; // ✅ Type-safe!
  }
}
```

### Step 3: Handle Type Errors

The strict types may reveal existing bugs or require type assertions. Here's how to handle common cases:

#### Case 1: Accessing Datavalue

**Before** (works but unsafe):
```typescript
const qid = claim.mainsnak.datavalue.value.id; // ❌ TypeScript error: value is unknown
```

**After** (type-safe):
```typescript
if (claim.mainsnak.datavalue.type === 'wikibase-entityid') {
  const qid = claim.mainsnak.datavalue.value.id; // ✅ TypeScript knows it's WikibaseEntityIdValue
}
```

#### Case 2: Type Assertions (if needed)

If you're certain about the type but TypeScript isn't:
```typescript
// Only use if you're 100% certain
const value = claim.mainsnak.datavalue.value as WikibaseEntityIdValue;
```

#### Case 3: Optional Properties

**Before**:
```typescript
const rank = claim.rank || 'normal'; // rank is string | undefined
```

**After**:
```typescript
const rank = claim.rank || 'normal'; // rank is 'preferred' | 'normal' | 'deprecated' | undefined
```

---

## File-by-File Migration

### File 1: `lib/types/service-contracts.ts`

**Current**:
```typescript
import {
  CrawlResult,
  CrawledData,
  FingerprintAnalysis,
  WikidataEntityData, // ❌ Deprecated
  WikidataPublishResult,
} from './gemflush';
import { 
  WikidataEntityDataContract, // ✅ Already imported but not used
  WikidataClaim as WikidataClaimStrict
} from './wikidata-contract';
```

**Change**:
```typescript
import {
  CrawlResult,
  CrawledData,
  FingerprintAnalysis,
  WikidataPublishResult,
} from './gemflush';
import { 
  WikidataEntityDataContract, // ✅ Use this instead
  WikidataClaim as WikidataClaimStrict
} from './wikidata-contract';
```

**Impact**: If any interface uses `WikidataEntityData`, update to `WikidataEntityDataContract`.

---

### File 2: `lib/data/wikidata-dto.ts`

**Current**:
```typescript
import type { WikidataEntityData } from '@/lib/types/gemflush';

export async function getWikidataPublishDTO(
  businessId: number
): Promise<WikidataPublishDTO & { fullEntity: WikidataEntityData }> {
  // ...
}
```

**Change**:
```typescript
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';

export async function getWikidataPublishDTO(
  businessId: number
): Promise<WikidataPublishDTO & { fullEntity: WikidataEntityDataContract }> {
  // ...
}
```

**Impact**: 
- Update return type annotation
- Any code accessing `fullEntity` may need type guards if accessing nested properties

---

### File 3: `lib/wikidata/entity-builder.ts`

**Current**:
```typescript
import { WikidataEntityData as WikidataEntityDataLoose } from '@/lib/types/gemflush';
// ... but internally uses WikidataEntityDataContract
```

**Change**:
```typescript
// Remove the deprecated import entirely
// The file already uses WikidataEntityDataContract internally
```

**Impact**: Minimal - just remove unused import.

---

### File 4: `lib/wikidata/tiered-entity-builder.ts`

**Current**:
```typescript
import type { CrawledData, WikidataEntityData } from '@/lib/types/gemflush';
```

**Change**:
```typescript
import type { CrawledData } from '@/lib/types/gemflush';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';
```

**Impact**: 
- Update all type annotations from `WikidataEntityData` to `WikidataEntityDataContract`
- Check for any code that accesses nested properties - may need type guards

---

### File 5-7: Test Files

**Current**:
```typescript
import { WikidataEntityData } from '@/lib/types/gemflush';

const mockEntity: WikidataEntityData = { ... };
```

**Change**:
```typescript
import { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';

const mockEntity: WikidataEntityDataContract = { ... };
```

**Impact**: 
- Update mock data to match strict structure
- May need to add missing required fields
- May need to fix property types (e.g., `rank` must be union type)

---

## Common Migration Challenges

### Challenge 1: Accessing Nested Properties

**Problem**: Strict types require type guards for discriminated unions.

**Solution**:
```typescript
// Before (unsafe)
const qid = claim.mainsnak.datavalue.value.id;

// After (type-safe)
if (claim.mainsnak.datavalue.type === 'wikibase-entityid') {
  const qid = claim.mainsnak.datavalue.value.id; // ✅ TypeScript knows the structure
}
```

### Challenge 2: Mock Data in Tests

**Problem**: Test mocks may not match strict structure.

**Solution**:
```typescript
// Before (loose)
const mockEntity: WikidataEntityData = {
  labels: { en: { language: 'en', value: 'Test' } },
  claims: { P31: [{ mainsnak: { datavalue: { value: 'Q123', type: 'string' } } }] }
};

// After (strict)
const mockEntity: WikidataEntityDataContract = {
  labels: { en: { language: 'en', value: 'Test' } },
  claims: { 
    P31: [{ 
      mainsnak: { 
        snaktype: 'value',
        property: 'P31',
        datavalue: { 
          type: 'wikibase-entityid',
          value: { 'entity-type': 'item', id: 'Q123' } // ✅ Strict structure
        }
      },
      type: 'statement'
    }] 
  }
};
```

### Challenge 3: Optional vs Required Fields

**Problem**: Strict types may require fields that were optional before.

**Solution**: Check the strict type definition and add required fields:
```typescript
// WikidataClaim requires 'type' field
const claim: WikidataClaim = {
  mainsnak: { ... },
  type: 'statement', // ✅ Required in strict type
  // rank is optional
};
```

### Challenge 4: Type Assertions

**Problem**: Sometimes you need to assert types during migration.

**Solution**: Use type assertions sparingly, only when necessary:
```typescript
// Only if you're certain about the type
const entity = someData as WikidataEntityDataContract;
```

---

## Migration Checklist

### Pre-Migration
- [ ] Review all files using deprecated types
- [ ] Understand the differences between loose and strict types
- [ ] Identify potential breaking changes

### Migration Steps
- [ ] Update imports in each file
- [ ] Update type annotations
- [ ] Add type guards where needed
- [ ] Fix mock data in tests
- [ ] Run TypeScript compiler to find errors
- [ ] Fix type errors one by one
- [ ] Run tests to verify functionality

### Post-Migration
- [ ] Remove deprecated types from `gemflush.ts`
- [ ] Update documentation
- [ ] Verify all tests pass
- [ ] Check for any runtime issues

---

## Benefits After Migration

1. **Type Safety**: Compile-time errors catch bugs before runtime
2. **Better IDE Support**: Autocomplete and type hints work correctly
3. **Documentation**: Types serve as inline documentation
4. **Refactoring Safety**: TypeScript ensures changes are consistent
5. **Single Source of Truth**: One set of types, not two

---

## Example: Complete Migration

### Before (Deprecated Types)

```typescript
// lib/data/wikidata-dto.ts
import type { WikidataEntityData } from '@/lib/types/gemflush';

export async function getWikidataPublishDTO(
  businessId: number
): Promise<WikidataPublishDTO & { fullEntity: WikidataEntityData }> {
  const entity = await buildEntity(business);
  
  // Unsafe - TypeScript doesn't know the structure
  const claimCount = Object.keys(entity.claims).length;
  const firstClaim = entity.claims.P31?.[0];
  const qid = firstClaim?.mainsnak.datavalue.value; // unknown type
  
  return {
    // ...
    fullEntity: entity,
  };
}
```

### After (Strict Types)

```typescript
// lib/data/wikidata-dto.ts
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';

export async function getWikidataPublishDTO(
  businessId: number
): Promise<WikidataPublishDTO & { fullEntity: WikidataEntityDataContract }> {
  const entity = await buildEntity(business);
  
  // Type-safe - TypeScript knows the structure
  const claimCount = Object.keys(entity.claims).length;
  const firstClaim = entity.claims.P31?.[0];
  
  // Type guard required for discriminated union
  if (firstClaim?.mainsnak.datavalue.type === 'wikibase-entityid') {
    const qid = firstClaim.mainsnak.datavalue.value.id; // ✅ Type-safe!
  }
  
  return {
    // ...
    fullEntity: entity,
  };
}
```

---

## Summary

**Migration entails**:
1. **Changing imports** - From `gemflush.ts` to `wikidata-contract.ts`
2. **Updating type annotations** - Replace `WikidataEntityData` with `WikidataEntityDataContract`
3. **Adding type guards** - For accessing discriminated union properties
4. **Fixing mock data** - In tests to match strict structure
5. **Handling type errors** - TypeScript will catch issues that loose types missed

**Effort**: Low-Medium (mostly find-and-replace with some type guard additions)

**Risk**: Low (strict types may reveal existing bugs, which is good!)

**Benefit**: High (better type safety, fewer runtime errors)

