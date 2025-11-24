# Legacy Property Mapping Deprecation Proposal

**Date**: January 2025  
**File**: `lib/wikidata/_legacy_archive/property-mapping.ts`  
**Status**: 🔴 **DEPRECATED** - Should not be used in CFP flow

---

## 📍 **Where Legacy Property Mapping is Imported**

### ✅ **Safe (Archived Files - Not in CFP Flow)**

1. **Legacy Entity Builder** (Archived)
   - **File**: `lib/wikidata/_legacy_archive/entity-builder.ts`
   - **Line**: 14
   - **Import**: `import { BUSINESS_PROPERTY_MAP, type PropertyMapping } from './property-mapping';`
   - **Status**: ✅ **SAFE** - File is in `_legacy_archive/` and not used in CFP flow

2. **Legacy Publisher** (Archived)
   - **File**: `lib/wikidata/_legacy_archive/publisher.ts`
   - **Line**: 30
   - **Import**: `import { BUSINESS_PROPERTY_MAP } from './property-mapping';`
   - **Status**: ✅ **SAFE** - File is in `_legacy_archive/` and not used in CFP flow

### ✅ **Active (Uses Modern Version)**

3. **Modern Entity Builder** (Active - CFP Flow)
   - **File**: `lib/wikidata/entity-builder.ts`
   - **Line**: 14
   - **Import**: `import { BUSINESS_PROPERTY_MAP, type PropertyMapping } from './property-mapping';`
   - **Status**: ✅ **USES MODERN VERSION** - Imports from `./property-mapping` (not `_legacy_archive/`)

---

## ✅ **Modern Replacement Architecture**

The **modern** `lib/wikidata/property-mapping.ts` provides all functionality:

### 1. **Property Definitions** (`BUSINESS_PROPERTY_MAP`)
- ✅ **Location**: `lib/wikidata/property-mapping.ts`
- ✅ **Status**: Active and used by `entity-builder.ts`
- ✅ **Interface**: Same as legacy version

### 2. **QID Resolution**
**Legacy approach** (deprecated):
```typescript
// Legacy: Direct SPARQL calls
async function resolveIndustryQID(industry: string) {
  return await sparqlService.findIndustryQID(industry);
}
```

**Modern approach** (active):
```typescript
// Modern: Uses PropertyManager for QID resolution
qidResolver: async (industry) => {
  const config = PropertyManager.getPropertyConfig('P452');
  return config?.qidResolver ? await config.qidResolver(industry) : null;
}
```

**Benefits**:
- ✅ **DRY**: Reuses PropertyManager logic
- ✅ **Consistency**: Single source of truth for QID resolution
- ✅ **Maintainability**: Changes in PropertyManager automatically propagate

### 3. **Helper Functions**
- ✅ `getPropertyMapping(pid)` - Available in modern version
- ✅ `getRequiredProperties()` - Available in modern version
- ✅ `getOptionalProperties()` - Available in modern version

---

## 🔄 **Responsibility Mapping**

| Legacy Responsibility | Modern Replacement | Status |
|----------------------|-------------------|--------|
| `BUSINESS_PROPERTY_MAP` | `lib/wikidata/property-mapping.ts` | ✅ Migrated |
| `resolveIndustryQID()` | `PropertyManager.getPropertyConfig('P452').qidResolver` | ✅ Migrated |
| `resolveLegalFormQID()` | `PropertyManager` + `sparqlService.findLegalFormQID()` | ✅ Migrated |
| `resolveCityQID()` | `PropertyManager.getPropertyConfig('P131').qidResolver` | ✅ Migrated |
| `getPropertyMapping()` | `lib/wikidata/property-mapping.ts` | ✅ Migrated |
| `getRequiredProperties()` | `lib/wikidata/property-mapping.ts` | ✅ Migrated |
| `getOptionalProperties()` | `lib/wikidata/property-mapping.ts` | ✅ Migrated |

---

## 📊 **CFP Flow Impact Analysis**

### Files in CFP Flow:
1. ✅ **`lib/services/business-execution.ts`** - No property mapping imports
2. ✅ **`lib/services/cfp-orchestrator.ts`** - Uses `wikidataService` (no direct import)
3. ✅ **`lib/data/wikidata-dto.ts`** - Uses `entityBuilder` (no direct import)
4. ✅ **`lib/wikidata/entity-builder.ts`** - Uses modern `property-mapping.ts`

### Conclusion:
✅ **No CFP flow files import the legacy property-mapping**  
✅ **All active code uses the modern version**

---

## 🎯 **Proposed Actions**

### 1. ✅ **Add Deprecation Notice** (COMPLETED)
Added to `lib/wikidata/_legacy_archive/property-mapping.ts`:
```typescript
/**
 * @deprecated This file is DEPRECATED and should NOT be used.
 * 
 * Use `lib/wikidata/property-mapping.ts` instead.
 * 
 * This file is kept only for reference in the legacy archive and will be removed
 * in a future version. All functionality has been migrated to the modern version.
 */
```

### 2. ✅ **Verify No Active Imports** (COMPLETED)
- ✅ `lib/wikidata/entity-builder.ts` - Uses modern version
- ✅ `lib/services/cfp-orchestrator.ts` - Uses `wikidataService` (no direct import)
- ✅ `lib/services/business-execution.ts` - No property mapping imports
- ✅ `lib/data/wikidata-dto.ts` - Uses `entityBuilder` (no direct import)

### 3. **Document Migration Path**
- ✅ Modern version available at `lib/wikidata/property-mapping.ts`
- ✅ All functionality preserved
- ✅ Uses PropertyManager for QID resolution (better architecture)

---

## 📝 **Modern Architecture**

```
lib/wikidata/
├── property-mapping.ts      ← Modern version (ACTIVE in CFP flow)
│   ├── BUSINESS_PROPERTY_MAP
│   ├── Uses PropertyManager.getPropertyConfig() for QID resolution
│   └── Reuses sparqlService through PropertyManager
│
├── property-manager.ts      ← QID resolution & property selection
│   ├── PROPERTY_CONFIGS[] (PropertyConfig[])
│   ├── getPropertyConfig(pid) → Returns PropertyConfig with qidResolver
│   └── Uses sparqlService directly
│
├── sparql.ts                ← SPARQL service for QID lookups
│   ├── findIndustryQID()
│   ├── findLegalFormQID()
│   └── findCityQID()
│
└── _legacy_archive/
    └── property-mapping.ts  ← DEPRECATED (this file)
        └── Should not be used
```

---

## ✅ **Summary**

- ✅ Legacy `property-mapping.ts` is **NOT used in CFP flow**
- ✅ Modern `property-mapping.ts` handles all responsibilities
- ✅ `PropertyManager` provides QID resolution (better architecture)
- ✅ All active code uses modern version
- ✅ Legacy file has been deprecated with clear notice

**Status**: ✅ **DEPRECATION COMPLETE** - Legacy file marked as deprecated, no CFP flow impact

---

## 🔍 **How Modern Version Fulfills Responsibilities**

### Property Definitions
**Legacy**: `BUSINESS_PROPERTY_MAP` in `_legacy_archive/property-mapping.ts`  
**Modern**: `BUSINESS_PROPERTY_MAP` in `lib/wikidata/property-mapping.ts`  
✅ **Same interface, modern location**

### QID Resolution
**Legacy**: Direct functions calling `sparqlService`:
```typescript
async function resolveIndustryQID(industry: string) {
  return await sparqlService.findIndustryQID(industry);
}
```

**Modern**: Uses PropertyManager (DRY principle):
```typescript
qidResolver: async (industry) => {
  const config = PropertyManager.getPropertyConfig('P452');
  return config?.qidResolver ? await config.qidResolver(industry) : null;
}
```

**Benefits**:
- ✅ Single source of truth (PropertyManager)
- ✅ Consistent QID resolution across all properties
- ✅ Easier to maintain and extend

### Helper Functions
**Legacy**: `getPropertyMapping()`, `getRequiredProperties()`, `getOptionalProperties()`  
**Modern**: Same functions in `lib/wikidata/property-mapping.ts`  
✅ **Identical functionality, modern location**

---

## 🎯 **Conclusion**

The legacy `property-mapping.ts` file:
- ❌ **Should NOT be used** in CFP flow
- ✅ **Has been deprecated** with clear notice
- ✅ **All functionality** is available in modern version
- ✅ **No CFP flow impact** - all active code uses modern version

**Action Required**: None - deprecation complete, file can remain in archive for reference.

