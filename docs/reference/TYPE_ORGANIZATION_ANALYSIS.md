# Type Organization Analysis & Refactoring Recommendations

## Current Organization Status

### ✅ **Well Organized**

1. **Database Schema Types** (`lib/db/schema.ts`)
   - ✅ All database types in one place
   - ✅ Clear separation of Select vs Insert types
   - ✅ Proper use of Drizzle ORM type inference

2. **DTO Types** (`lib/data/types.ts`)
   - ✅ All UI-facing DTOs in one place
   - ✅ Clear purpose and usage documentation
   - ✅ Well-tested

3. **Wikidata Contract Types** (`lib/types/wikidata-contract.ts`)
   - ✅ Strict, well-documented types
   - ✅ Based on official Wikibase specifications
   - ✅ Well-tested

4. **Service Contract Types** (`lib/types/service-contracts.ts`)
   - ✅ Clear service interfaces
   - ✅ API response types
   - ✅ Error classes

### ⚠️ **Issues Found**

## 1. Deprecated Types Still in Use

**Problem**: Deprecated Wikidata types in `lib/types/gemflush.ts` are still being imported and used.

**Deprecated Types**:
- `WikidataEntityData` (line 76) - marked `@deprecated`
- `WikidataClaim` (line 105) - marked `@deprecated`
- `WikidataReference` (line 123) - marked `@deprecated`

**Current Usage**:
```typescript
// lib/types/service-contracts.ts (line 8)
import { WikidataEntityData } from './gemflush'; // ❌ Using deprecated type
```

**Impact**:
- Confusion between loose and strict types
- Type safety issues (loose types use `unknown`)
- Maintenance burden (two sets of types)

**Recommendation**: **MIGRATE** deprecated types

---

## 2. Mixed Concerns in `gemflush.ts`

**Problem**: `lib/types/gemflush.ts` contains:
- ✅ Domain types (BusinessLocation, CrawledData, etc.) - **Good**
- ❌ Deprecated Wikidata types - **Should be removed**
- ✅ LLM/Fingerprint types - **Good**
- ✅ Job result types - **Good**

**Recommendation**: **SPLIT** deprecated Wikidata types from domain types

---

## 3. Type Name Conflicts

**Problem**: Same type names exist in multiple files:
- `WikidataClaim` in `gemflush.ts` (deprecated) vs `wikidata-contract.ts` (strict)
- `WikidataReference` in `gemflush.ts` (deprecated) vs `wikidata-contract.ts` (strict)
- `WikidataEntityData` in `gemflush.ts` (deprecated) vs `WikidataEntityDataContract` in `wikidata-contract.ts` (strict)

**Impact**: Import confusion, potential type errors

**Recommendation**: **RENAME** or **REMOVE** deprecated types

---

## 4. Import Patterns

**Current Pattern**:
```typescript
// Mixed imports from deprecated and strict types
import { WikidataEntityData } from './gemflush'; // deprecated
import { WikidataEntityDataContract } from './wikidata-contract'; // strict
```

**Recommendation**: **STANDARDIZE** on strict types

---

## Refactoring Plan

### Phase 1: Audit Current Usage (Priority: High)

**Action**: Find all usages of deprecated types

```bash
# Find all imports of deprecated types
grep -r "WikidataEntityData\|WikidataClaim\|WikidataReference" lib/ --include="*.ts" --exclude-dir="__tests__"
```

**Files Using Deprecated Types** (Found 6 files):
1. `lib/types/service-contracts.ts` - Uses `WikidataEntityData`
2. `lib/data/wikidata-dto.ts` - Uses `WikidataEntityData`
3. `lib/wikidata/entity-builder.ts` - Uses `WikidataEntityData` (aliased as `WikidataEntityDataLoose`)
4. `lib/wikidata/tiered-entity-builder.ts` - Uses `WikidataEntityData`
5. `lib/wikidata/__tests__/publisher.test.ts` - Uses `WikidataEntityData`
6. `lib/wikidata/__tests__/tiered-entity-builder.test.ts` - Uses `WikidataEntityData`
7. `lib/types/__tests__/contract-implementation.test.ts` - Uses `WikidataEntityData`

---

### Phase 2: Migrate to Strict Types (Priority: High)

**Action**: Replace deprecated type imports with strict types

**Before**:
```typescript
import { WikidataEntityData } from '@/lib/types/domain/gemflush';
```

**After**:
```typescript
import { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';
```

**Files to Update** (7 files total):
1. `lib/types/service-contracts.ts`
   - Replace `WikidataEntityData` with `WikidataEntityDataContract`
   - Update interface signatures

2. `lib/data/wikidata-dto.ts`
   - Replace `WikidataEntityData` with `WikidataEntityDataContract`

3. `lib/wikidata/entity-builder.ts`
   - Remove `WikidataEntityDataLoose` import (already uses strict types internally)

4. `lib/wikidata/tiered-entity-builder.ts`
   - Replace `WikidataEntityData` with `WikidataEntityDataContract`

5. `lib/wikidata/__tests__/publisher.test.ts`
   - Replace `WikidataEntityData` with `WikidataEntityDataContract`

6. `lib/wikidata/__tests__/tiered-entity-builder.test.ts`
   - Replace `WikidataEntityData` with `WikidataEntityDataContract`

7. `lib/types/__tests__/contract-implementation.test.ts`
   - Replace `WikidataEntityData` with `WikidataEntityDataContract`

---

### Phase 3: Remove Deprecated Types (Priority: Medium)

**Action**: Remove deprecated types from `gemflush.ts` after migration

**Remove**:
- `WikidataEntityData` interface (lines 76-99)
- `WikidataClaim` interface (lines 105-117)
- `WikidataReference` interface (lines 123-125)

**Keep**:
- All domain types (BusinessLocation, CrawledData, etc.)
- LLM/Fingerprint types
- Job result types
- Subscription types

---

### Phase 4: Reorganize if Needed (Priority: Low)

**Option A: Keep Current Structure** (Recommended)
```
lib/
  ├── db/
  │   └── schema.ts          # Database types
  ├── data/
  │   └── types.ts           # DTO types
  └── types/
      ├── gemflush.ts        # Domain types (cleaned)
      ├── service-contracts.ts # Service interfaces
      └── wikidata-contract.ts # Strict Wikidata types
```

**Option B: Split Domain Types** (If `gemflush.ts` gets too large)
```
lib/types/
  ├── domain/
  │   ├── business.ts        # BusinessLocation, CrawledData
  │   ├── llm.ts            # LLMResult, FingerprintAnalysis
  │   └── jobs.ts           # Job result types
  ├── service-contracts.ts
  └── wikidata-contract.ts
```

**Recommendation**: **Option A** - Current structure is fine, just needs cleanup

---

## Migration Checklist

### Step 1: Audit
- [ ] Find all files importing deprecated Wikidata types
- [ ] Document current usage patterns
- [ ] Identify breaking changes

### Step 2: Migrate
- [ ] Update `lib/types/service-contracts.ts`
- [ ] Update `lib/data/wikidata-dto.ts` (if needed)
- [ ] Update any other files using deprecated types
- [ ] Run tests to verify no regressions

### Step 3: Remove
- [ ] Remove `WikidataEntityData` from `gemflush.ts`
- [ ] Remove `WikidataClaim` from `gemflush.ts`
- [ ] Remove `WikidataReference` from `gemflush.ts`
- [ ] Update documentation

### Step 4: Verify
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Documentation updated

---

## Benefits of Refactoring

1. **Type Safety**: Strict types catch errors at compile time
2. **Clarity**: Single source of truth for Wikidata types
3. **Maintainability**: Less confusion, easier to maintain
4. **Consistency**: All code uses same type definitions
5. **Documentation**: Clearer type documentation

---

## Risks & Mitigation

### Risk: Breaking Changes
**Mitigation**: 
- Run full test suite after migration
- Update imports incrementally
- Keep deprecated types until migration complete

### Risk: Type Errors
**Mitigation**:
- Strict types may reveal existing bugs (good!)
- Fix type errors as they appear
- Use type assertions if needed during transition

---

## Current Organization Score

| Category | Score | Status |
|----------|-------|--------|
| **Database Types** | 10/10 | ✅ Excellent |
| **DTO Types** | 10/10 | ✅ Excellent |
| **Domain Types** | 7/10 | ⚠️ Needs cleanup |
| **Service Contracts** | 8/10 | ⚠️ Uses deprecated types |
| **Wikidata Contracts** | 10/10 | ✅ Excellent |
| **Overall** | **9/10** | ✅ Good, minor cleanup needed |

---

## Recommendation

**Status**: ✅ **Well Organized** with minor cleanup needed

**Action**: **Migrate deprecated types** (Phase 1-3)

**Priority**: **Medium** - Not urgent, but should be done for long-term maintainability

**Effort**: **Low-Medium** - Mostly find-and-replace with type updates

---

## Related Documentation

- [Types Overview](./TYPES_OVERVIEW.md) - Complete type listing
- [Schemas and Contracts Table](./SCHEMAS_CONTRACTS_MODULES_TABLE.md) - Contract mapping
- [Wikidata Entity Contract](../features/wikidata/WIKIDATA_ENTITY_CONTRACT.md) - Wikidata types

