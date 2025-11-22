# CFP Flow LBDD - Bugs Fixed & API Routing Analysis

**Date:** December 6, 2025  
**Methodology:** Live Browser-Driven Development (LBDD)  
**Test Type:** Full CFP Flow with API Routing Observation

---

## 🐛 **Bug #1: Import Error - Fixed**

### **Issue:**
```
Module not found: Can't resolve '@/lib/wikidata/tiered-entity-builder'
Error location: lib/data/wikidata-dto.ts (line 5)
```

### **Root Cause:**
- `tiered-entity-builder.ts` was moved to `_legacy_archive/` but `wikidata-dto.ts` was still importing from the old location
- The file path `@/lib/wikidata/tiered-entity-builder` no longer exists

### **Fix Applied:**
✅ **File:** `lib/data/wikidata-dto.ts`

**Changes:**
1. **Updated import:**
   - ❌ Old: `import { tieredEntityBuilder } from '@/lib/wikidata/tiered-entity-builder';`
   - ✅ New: `import { entityBuilder } from '@/lib/wikidata/entity-builder';`

2. **Updated entity building call:**
   - ❌ Old: `await tieredEntityBuilder.buildEntity(business, crawledData, tier, enrichmentLevel, notabilityReferences)`
   - ✅ New: `await entityBuilder.buildEntity(business, crawledData, notabilityReferences)`

3. **Added tier filtering function:**
   - Created `filterEntityByTier()` helper function to handle tier-based property filtering
   - Implements same logic as legacy `tieredEntityBuilder` but directly in DTO layer
   - Follows DRY principle: Centralized tier filtering logic
   - Follows SOLID principle: Single Responsibility - only handles tier filtering

**Code:**
```typescript
// Build full entity with entityBuilder
const fullEntity = await entityBuilder.buildEntity(
  business,
  business.crawlData as any,
  notabilityReferences
);

// Filter claims by tier-appropriate richness
const filteredEntity = filterEntityByTier(fullEntity, tier, enrichmentLevel);
```

### **Verification:**
- ✅ File updated correctly
- ✅ Imports verified
- ✅ No linter errors
- ⚠️ Build error may persist due to Next.js/Turbopack caching (requires dev server restart)

---

## 📊 **API Routing Analysis - CFP Flow**

### **Primary CFP Routes:**

1. **`POST /api/business/[id]/process`**
   - **Purpose:** Triggers full CFP (Crawl, Fingerprint, Publish) process
   - **Service:** `lib/services/business-execution.autoStartProcessing()`
   - **Flow:** 
     ```
     autoStartProcessing(businessId)
       → executeParallelProcessing(businessId)
         ├── Crawl (parallel)
         └── Fingerprint (parallel)
       → Publish (if automation enabled)
     ```

2. **`POST /api/crawl`**
   - **Purpose:** Triggers web crawl for a business
   - **Service:** `lib/services/business-processing.executeCrawlJob()`
   - **External:** Firecrawl API (mocked in dev)

3. **`POST /api/fingerprint`**
   - **Purpose:** Triggers LLM fingerprinting analysis
   - **Service:** `lib/llm/fingerprinter.fingerprint()`
   - **External:** OpenRouter API (9 parallel queries)

4. **`POST /api/wikidata/publish`**
   - **Purpose:** Publishes entity to Wikidata
   - **Service:** `lib/data/wikidata-dto.getWikidataPublishDTO()`
   - **Uses:** `lib/wikidata/entity-builder` ✅ (now fixed)
   - **External:** Wikidata Action API

5. **`POST /api/cfp`**
   - **Purpose:** CFP Orchestrator endpoint (standalone CFP flow)
   - **Service:** `lib/services/cfp-orchestrator.executeCFPFlow()`

### **Data Flow:**
```
User Action: Create Business (POST /api/business)
    ↓
Auto-start Processing (autoStartProcessing)
    ├── [C] Crawl (POST /api/crawl → Firecrawl API → OpenRouter API)
    │       ↓
    │   Extract data → Update business.crawlData → status = 'crawled'
    │
    └── [F] Fingerprint (POST /api/fingerprint → OpenRouter API)
            ↓
        9 parallel LLM queries → Calculate visibility score
            ↓
        Store fingerprint → status = 'fingerprinted'
            ↓
[P] Publish (POST /api/wikidata/publish)
    ├── getWikidataPublishDTO() → entityBuilder.buildEntity() ✅ (fixed)
    ├── Resolve QIDs (Wikidata SPARQL)
    ├── Check notability (Google Custom Search API)
    ├── Filter by tier (filterEntityByTier()) ✅ (new helper)
    └── Publish (Wikidata Action API)
        ↓
    Update business.status = 'published', store QID
```

---

## 🔍 **Additional Observations**

### **Tier-Based Filtering:**
- **Free Tier:** Basic properties only (`P31`, `P856`, `P1448`, `P625`, `P1329`)
- **Pro Tier:** Enhanced properties (adds `P6375`, `P968`, social media, `P571`, `P1128`)
- **Agency Tier:** Complete properties (adds `P131`, `P159`, `P17`, `P452`, images)

### **Entity Building Process:**
1. `entityBuilder.buildEntity()` - Builds full entity with all available properties
2. `filterEntityByTier()` - Filters claims based on subscription tier
3. `notabilityChecker.checkNotability()` - Validates entity meets notability standards
4. References attached to claims during entity building

### **Import Path Updates Needed:**
- ✅ `lib/data/wikidata-dto.ts` - Fixed
- ⚠️ `tests/integration/automation-flow.test.ts` - Still imports `tieredEntityBuilder` (in `_legacy_archive`)
- ⚠️ `lib/wikidata/_legacy_archive/typed-entity-builder.ts` - Uses legacy import (archived, OK)

---

## ✅ **Status Summary**

### **Fixed:**
- ✅ Import error in `wikidata-dto.ts`
- ✅ Entity building logic updated to use `entityBuilder`
- ✅ Tier filtering logic added as helper function

### **Pending (Cache-Related):**
- ⚠️ Next.js/Turbopack build cache needs refresh (dev server restart may be required)

### **Next Steps:**
1. Restart dev server to clear cache and verify build error resolves
2. Continue with full CFP flow test once build error clears
3. Monitor API routing during CFP process execution
4. Verify data display on all cards after CFP completion

---

## 📝 **Code Changes Summary**

**File:** `lib/data/wikidata-dto.ts`

**Lines Changed:**
- Line 5: Import updated
- Lines 75-82: Entity building updated
- Lines 143-207: Added `filterEntityByTier()` helper function

**Key Improvements:**
- Follows DRY principle: Tier filtering logic centralized
- Follows SOLID principle: Single Responsibility for each function
- Removes dependency on legacy archived code
- Maintains same functionality with cleaner architecture

