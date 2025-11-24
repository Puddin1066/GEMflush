# Legacy Archive Dependency Audit

**Date**: January 2025  
**Status**: ✅ **AUDIT COMPLETE**

---

## 📊 **Current Dependencies on `_legacy_archive`**

### ✅ **Allowed Re-Exports** (Stub Files for Backward Compatibility)

1. **`lib/wikidata/publisher.ts`**
   - Re-exports: `wikidataPublisher` from `_legacy_archive/publisher`
   - Used by: `lib/services/scheduler-service-decision.ts`
   - Status: ✅ **OK** - Stub file for backward compatibility

2. **`lib/wikidata/manual-publish-storage.ts`**
   - Re-exports: `storeEntityForManualPublish` from `_legacy_archive/manual-publish-storage`
   - Used by: `lib/services/scheduler-service-decision.ts`
   - Status: ✅ **OK** - Stub file for backward compatibility

---

## ✅ **No Direct Dependencies**

### Files That Do NOT Import from `_legacy_archive`:

1. ✅ `lib/wikidata/sparql.ts` - Uses `./qid-mappings` (NOT from legacy)
2. ✅ `lib/wikidata/entity-builder.ts` - Uses `sparqlService` (NOT from legacy)
3. ✅ `lib/wikidata/property-manager.ts` - Uses `sparqlService` (NOT from legacy)
4. ✅ `lib/wikidata/property-mapping.ts` - Uses `sparqlService` (NOT from legacy)
5. ✅ `lib/wikidata/service.ts` - No legacy dependencies
6. ✅ `lib/wikidata/qid-mappings.ts` - Standalone file (NOT in legacy)

---

## 📍 **Where `sparql.ts` is Used**

### Active Usage (Non-Legacy):

1. ✅ **`lib/wikidata/entity-builder.ts`**
   - Uses: `sparqlService.findCityQID()`, `findIndustryQID()`, `findLegalFormQID()`
   - Status: ✅ Active, non-legacy

2. ✅ **`lib/wikidata/property-manager.ts`**
   - Uses: `sparqlService.findCityQID()`, `findIndustryQID()`
   - Status: ✅ Active, non-legacy

3. ✅ **`lib/wikidata/property-mapping.ts`**
   - Uses: `sparqlService.findLegalFormQID()`
   - Status: ✅ Active, non-legacy

4. ✅ **`lib/wikidata/index.ts`**
   - Exports: `sparqlService`
   - Status: ✅ Active, non-legacy

### Legacy Usage (Ignored):

- ❌ `lib/wikidata/_legacy_archive/entity-builder.ts` - Legacy file (ignored)
- ❌ `lib/wikidata/_legacy_archive/property-mapping.ts` - Legacy file (ignored)

---

## ✅ **Conclusion**

**Status**: ✅ **NO PROBLEMS FOUND**

- ✅ `sparql.ts` does NOT depend on `_legacy_archive`
- ✅ `sparql.ts` uses `./qid-mappings` (standalone file, not in legacy)
- ✅ Only 2 stub files re-export from legacy (for backward compatibility)
- ✅ All active code uses non-legacy implementations

**Recommendation**: ✅ **No changes needed** - Current architecture is correct.

---

## 🔄 **Future Migration Path**

When ready to fully migrate away from legacy publisher:

1. Update `lib/services/scheduler-service-decision.ts` to use `wikidataService` instead of `wikidataPublisher`
2. Remove stub files: `lib/wikidata/publisher.ts` and `lib/wikidata/manual-publish-storage.ts`
3. Update all references to use new `WikidataService` API

**Current Status**: Legacy publisher is still needed for `handleAutoPublish()` function.

