# CFP Flow - Import Fix Summary

**Date:** December 6, 2025  
**Issue:** Build/Import error blocking CFP flow test  
**Status:** ✅ **FIXED** (file updated, awaiting Next.js rebuild)

---

## 🐛 **Bug Identified**

### **Build Error:**
```
Module not found: Can't resolve '@/lib/wikidata/tiered-entity-builder'
Error location: lib/data/wikidata-dto.ts (line 5)
```

### **Root Cause:**
- `tiered-entity-builder.ts` was moved to `_legacy_archive/` 
- `wikidata-dto.ts` was still importing from the old location
- The file path `@/lib/wikidata/tiered-entity-builder` no longer exists

---

## ✅ **Fix Applied**

### **File:** `lib/data/wikidata-dto.ts`

**Changes Made:**

1. **Updated import (line 5):**
   ```typescript
   // ❌ Old:
   import { tieredEntityBuilder } from '@/lib/wikidata/tiered-entity-builder';
   
   // ✅ New:
   import { entityBuilder } from '@/lib/wikidata/entity-builder';
   ```

2. **Updated entity building call (line 75-79):**
   ```typescript
   // ❌ Old:
   const fullEntity = await tieredEntityBuilder.buildEntity(
     business,
     business.crawlData as any,
     tier,
     enrichmentLevel,
     notabilityReferences
   );
   
   // ✅ New:
   const fullEntity = await entityBuilder.buildEntity(
     business,
     business.crawlData as any,
     notabilityReferences
   );
   
   // Filter claims by tier-appropriate richness
   const filteredEntity = filterEntityByTier(fullEntity, tier, enrichmentLevel);
   ```

3. **Added tier filtering function (lines 143-201):**
   - Created `filterEntityByTier()` function to handle tier-based property filtering
   - **DRY:** Centralized tier filtering logic (replaces tieredEntityBuilder)
   - **SOLID:** Single Responsibility - only handles tier-based property filtering
   - Preserves all tier logic from the original `tieredEntityBuilder`

4. **Updated return value (line 134):**
   ```typescript
   // ✅ Uses filtered entity (tier-appropriate)
   fullEntity: filteredEntity, // For API route to use with publisher (tier-filtered)
   ```

---

## 🔍 **API Routing Analysis**

### **CFP Flow API Routes:**

1. **Business Detail Page Load:**
   - `/api/business/[id]` → Business data
   - `/api/fingerprint/business/[id]` → Fingerprint data
   - `/api/wikidata/entity/[businessId]` → **Entity data (calls `getWikidataPublishDTO`)**

2. **Entity API Route:**
   - `app/api/wikidata/entity/[businessId]/route.ts`
   - Calls `getWikidataPublishDTO(businessId)` on lines 92 and 130
   - This is called when business status is `'crawled'`, `'published'`, or `'generating'`

3. **Publish API Route:**
   - `app/api/wikidata/publish/route.ts`
   - Calls `getWikidataPublishDTO(businessId)` on line 80
   - Used when user clicks "Publish to Wikidata"

---

## 📝 **Verification**

✅ **File content verified:**
- `lib/data/wikidata-dto.ts` correctly imports `entityBuilder` from `@/lib/wikidata/entity-builder`
- `filterEntityByTier()` function is correctly implemented
- All references to `tieredEntityBuilder` have been removed

✅ **Export verified:**
- `lib/wikidata/entity-builder.ts` correctly exports `entityBuilder` (line 1137)

✅ **No other imports found:**
- Searched entire codebase - no other files import `tiered-entity-builder`

---

## 🚨 **Current Status**

- ✅ **File fix:** Complete
- ⏳ **Build cache:** Cleared (`.next` directory removed)
- ⏳ **Next.js rebuild:** In progress (may take a moment for Turbopack to recompile)

**Next Steps:**
1. Wait for Next.js to rebuild (Turbopack should detect file changes)
2. Refresh browser to verify build error is resolved
3. Continue with full CFP flow test

---

## 🎯 **Impact on CFP Flow**

Once the build error resolves:
- ✅ Business detail pages will load correctly
- ✅ Entity preview cards will display properly
- ✅ Publish workflow will function correctly
- ✅ Full CFP flow (crawl → fingerprint → publish) can proceed

---

**SOLID Principles Applied:**
- **Single Responsibility:** `filterEntityByTier()` only handles tier-based filtering
- **Open/Closed:** Entity building is open for extension, closed for modification
- **Dependency Inversion:** DTO layer depends on abstraction (`entityBuilder`)

**DRY Principle Applied:**
- Centralized tier filtering logic in one function
- Reuses `entityBuilder` instead of duplicating entity building logic

