# CFP DTO Routing Analysis

**Question:** Is the DTO properly routed to the CFP (Crawl, Fingerprint, Publish) process?

## Current Flow

### Step 1: Crawl
```typescript
// lib/services/business-processing.ts:599
await executeCrawlJob(crawlJob.id, businessId);
// Updates business with:
// - crawlData (extracted data)
// - name (if extracted, and not 'Unknown Business')
// - location (if extracted)
```

### Step 2: Business Refresh (After Crawl)
```typescript
// lib/services/business-processing.ts:602
const crawledBusiness = await getBusinessById(businessId);
currentBusiness = crawledBusiness; // ✅ Business refreshed with updated name
```

### Step 3: Fingerprint
```typescript
// lib/services/business-processing.ts:609
currentBusiness = await executeFingerprint(currentBusiness, true);
// Uses: currentBusiness.name (should be updated from crawl)
```

**Fingerprint uses:**
- `business.name` - ✅ Should be updated from crawl
- `business.crawlData` - ✅ Updated from crawl
- Passes `business.name` to LLM prompts

### Step 4: Publish
```typescript
// lib/services/business-processing.ts:651
const businessForPublish = await getBusinessById(businessId);
// ✅ Business refreshed again before publish
```

**Publish DTO uses:**
```typescript
// lib/services/scheduler-service.ts:56
const publishData = await getWikidataPublishDTO(businessId);
```

**Inside getWikidataPublishDTO:**
```typescript
// lib/data/wikidata-dto.ts:39
const business = await db.query.businesses.findFirst({
  where: eq(businesses.id, businessId),
});
// ✅ Fetches fresh business from database

// lib/data/wikidata-dto.ts:63
const notabilityResult = await notabilityChecker.checkNotability(
  business.name,  // ✅ Uses business.name from fresh fetch
  business.location || undefined
);
```

## Analysis

### ✅ What's Working

1. **Business is refreshed after crawl** (line 602)
   - Ensures fingerprint gets updated name

2. **Business is refreshed before publish** (line 651)
   - Ensures publish gets latest data

3. **Publish DTO fetches fresh business** (wikidata-dto.ts:39)
   - Ensures notability check uses latest name

4. **Fingerprint uses refreshed business object** (line 609)
   - Should have updated name from crawl

### ⚠️ Potential Issues

1. **Fingerprint might use stale business object**
   - If `executeFingerprint` doesn't refresh, it uses the passed object
   - But the object is refreshed at line 602, so should be OK

2. **Race condition possibility**
   - If crawl updates name, but fingerprint runs before DB commit
   - Unlikely but possible

3. **Name update condition**
   - Name only updates if current name is 'Business' or 'Unknown Business'
   - If name extraction fails, stays as 'Unknown Business'
   - ✅ Fixed: Now prevents updating to 'Unknown Business'

## Data Flow Diagram

```
Crawl
  ↓
Update Business (name, crawlData, location)
  ↓
Refresh Business from DB ✅
  ↓
Fingerprint (uses refreshed business.name)
  ↓
Update Fingerprint in DB
  ↓
Refresh Business from DB ✅
  ↓
Publish (getWikidataPublishDTO)
  ↓
Fetch Business from DB ✅
  ↓
Use business.name for notability check ✅
  ↓
Build entity with business.name ✅
```

## Verification

### Check 1: Is business refreshed after crawl?
✅ **YES** - Line 602: `const crawledBusiness = await getBusinessById(businessId);`

### Check 2: Does fingerprint use refreshed business?
✅ **YES** - Line 609: `currentBusiness = await executeFingerprint(currentBusiness, true);`
- Uses `currentBusiness` which was refreshed at line 602

### Check 3: Does publish use fresh business?
✅ **YES** - Line 651: `const businessForPublish = await getBusinessById(businessId);`
- And `getWikidataPublishDTO` fetches fresh business again (line 39)

### Check 4: Is name properly extracted and updated?
✅ **IMPROVED** - Recent fixes:
- Better name extraction from Firecrawl titles
- Domain-based fallback
- Prevents updating to 'Unknown Business'

## Conclusion

**✅ DTO is properly routed through CFP**

The flow ensures:
1. Business is refreshed after each step
2. Fresh data is used for each operation
3. Name updates flow correctly from crawl → fingerprint → publish

**However**, there's one potential improvement:

### Recommendation

**Ensure fingerprint always uses fresh business:**
```typescript
// Current (line 609):
currentBusiness = await executeFingerprint(currentBusiness, true);

// Better (defensive):
const businessForFingerprint = await getBusinessById(businessId);
currentBusiness = await executeFingerprint(businessForFingerprint, true);
```

This ensures fingerprint always has the absolute latest business data, even if there's any delay in DB updates.

## Status

- ✅ **Crawl → Fingerprint:** Business refreshed, name should flow correctly
- ✅ **Fingerprint → Publish:** Business refreshed, name should flow correctly  
- ✅ **Publish DTO:** Fetches fresh business, uses correct name
- ⚠️ **Minor:** Could add defensive refresh before fingerprint (but current flow should work)



