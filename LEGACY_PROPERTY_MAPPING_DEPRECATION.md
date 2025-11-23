# Legacy Property Mapping Deprecation Plan

**Date**: January 2025  
**File**: `lib/wikidata/_legacy_archive/property-mapping.ts`  
**Status**: 🔴 **DEPRECATED** - Should not be used

---

## 📍 **Where Legacy Property Mapping is Imported**

### 1. **Legacy Entity Builder** (Archived)
**File**: `lib/wikidata/_legacy_archive/entity-builder.ts`  
**Line**: 14  
**Import**: `import { BUSINESS_PROPERTY_MAP, type PropertyMapping } from './property-mapping';`

**Status**: ✅ **SAFE** - This file is in `_legacy_archive/` and should not be used in CFP flow

### 2. **Legacy Publisher** (Archived)
**File**: `lib/wikidata/_legacy_archive/publisher.ts`  
**Line**: 30  
**Import**: `import { BUSINESS_PROPERTY_MAP } from './property-mapping';`

**Status**: ✅ **SAFE** - This file is in `_legacy_archive/` and should not be used in CFP flow

### 3. **Modern Entity Builder** (Active)
**File**: `lib/wikidata/entity-builder.ts`  
**Line**: 14  
**Import**: `import { BUSINESS_PROPERTY_MAP, type PropertyMapping } from './property-mapping';`

**Status**: ⚠️ **USES MODERN VERSION** - Imports from `./property-mapping` (not `_legacy_archive/`)

---

## ✅ **Modern Replacement**

The **modern** `lib/wikidata/property-mapping.ts` already exists and:
- ✅ Uses `PropertyManager` for QID resolution (DRY principle)
- ✅ Reuses SPARQL service through PropertyManager
- ✅ Provides same interface (`BUSINESS_PROPERTY_MAP`, `getPropertyMapping`, etc.)
- ✅ Is actively used by `entity-builder.ts`

**The legacy version should be completely removed or marked as deprecated.**

---

## 🔄 **Responsibility Mapping**

### Legacy Property Mapping Responsibilities:

1. **Property Definitions** (`BUSINESS_PROPERTY_MAP`)
   - ✅ **Replaced by**: `lib/wikidata/property-mapping.ts` (modern version)
   - ✅ **Status**: Already migrated

2. **QID Resolution Functions**
   - `resolveIndustryQID()` → Uses `sparqlService.findIndustryQID()`
   - `resolveLegalFormQID()` → Uses `sparqlService.findLegalFormQID()`
   - `resolveCityQID()` → Uses `sparqlService.findCityQID()`
   - `resolveOrganizationQID()` → Returns null (manual entry)
   - `resolvePersonQID()` → Returns null (manual entry)
   
   - ✅ **Replaced by**: `PropertyManager.getPropertyConfig(pid).qidResolver`
   - ✅ **Status**: Modern version uses PropertyManager

3. **Helper Functions**
   - `getPropertyMapping(pid)` → Returns mapping for PID
   - `getRequiredProperties()` → Returns required properties
   - `getOptionalProperties()` → Returns optional properties
   
   - ✅ **Replaced by**: Same functions in modern `property-mapping.ts`
   - ✅ **Status**: Already migrated

---

## 🎯 **Proposed Actions**

### 1. **Deprecate Legacy File**
Add deprecation notice to `lib/wikidata/_legacy_archive/property-mapping.ts`:

```typescript
/**
 * @deprecated This file is deprecated and should not be used.
 * Use `lib/wikidata/property-mapping.ts` instead.
 * 
 * This file is kept only for reference and will be removed in a future version.
 * 
 * Migration:
 * - Import from '../property-mapping' instead of './property-mapping'
 * - All functionality is available in the modern version
 */
```

### 2. **Verify No Active Imports**
Ensure no active CFP flow files import from `_legacy_archive/property-mapping`:
- ✅ `lib/wikidata/entity-builder.ts` - Uses modern version
- ✅ `lib/services/cfp-orchestrator.ts` - Uses `wikidataService` (no direct import)
- ✅ `lib/services/business-execution.ts` - No property mapping imports
- ✅ `lib/data/wikidata-dto.ts` - Uses `entityBuilder` (no direct import)

### 3. **Remove or Archive**
Since legacy files in `_legacy_archive/` are already archived:
- Option A: Keep file but add deprecation notice (recommended)
- Option B: Delete file entirely (if no tests depend on it)

---

## 📊 **CFP Flow Impact Analysis**

### Files in CFP Flow:
1. **`lib/services/business-execution.ts`** - No property mapping imports ✅
2. **`lib/services/cfp-orchestrator.ts`** - Uses `wikidataService` ✅
3. **`lib/data/wikidata-dto.ts`** - Uses `entityBuilder` ✅
4. **`lib/wikidata/entity-builder.ts`** - Uses modern `property-mapping.ts` ✅

### Conclusion:
✅ **No CFP flow files import the legacy property-mapping**  
✅ **All active code uses the modern version**

---

## 🔧 **Implementation Steps**

1. ✅ Add deprecation notice to legacy file
2. ✅ Verify no active imports (already done)
3. ✅ Document migration path
4. ⏳ Consider removing file if no tests depend on it

---

## 📝 **Modern Architecture**

The modern architecture uses:

```
lib/wikidata/
├── property-mapping.ts      ← Modern version (ACTIVE)
│   ├── BUSINESS_PROPERTY_MAP
│   ├── Uses PropertyManager for QID resolution
│   └── Reuses sparqlService through PropertyManager
│
├── property-manager.ts      ← QID resolution & property selection
│   ├── PropertyConfig[]
│   ├── getPropertyConfig(pid)
│   └── Uses sparqlService directly
│
└── _legacy_archive/
    └── property-mapping.ts  ← DEPRECATED (this file)
        └── Should not be used
```

---

## ✅ **Summary**

- ✅ Legacy `property-mapping.ts` is **NOT used in CFP flow**
- ✅ Modern `property-mapping.ts` handles all responsibilities
- ✅ `PropertyManager` provides QID resolution
- ✅ All active code uses modern version
- ✅ Legacy file can be safely deprecated

**Action**: Add deprecation notice and document that it should not be used.

