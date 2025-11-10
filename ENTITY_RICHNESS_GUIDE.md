# Wikidata Entity Richness Guide

**Date:** November 10, 2025  
**Topic:** What determines how rich/detailed a published Wikidata entity is  
**Your Question:** "What determines how rich the entity being published is?"

---

## 🎯 **TL;DR: Entity Richness Factors**

The richness of your Wikidata entity is determined by:

1. **Data Available from Web Crawling** (Primary)
2. **Business Data Completeness** (Location, category, etc.)
3. **Progressive Enrichment Level** (Future feature)
4. **Subscription Plan** (What data sources you can access)

---

## 📊 **Current Entity Builder Analysis**

### **Location:** `lib/wikidata/entity-builder.ts`

Your entity builder currently creates **basic entities** with these properties:

### **Always Included (Minimum Entity):**

```typescript
// 1. P31: Instance of - "business" (Q4830453)
claims.P31 = [this.createItemClaim('P31', 'Q4830453', business.url)];

// 2. P856: Official website
claims.P856 = [this.createUrlClaim('P856', business.url)];

// 3. P1448: Official name
claims.P1448 = [this.createStringClaim('P1448', officialName, business.url)];

// Plus: Labels and descriptions (required)
labels: { en: { language: 'en', value: 'Business Name' } }
descriptions: { en: { language: 'en', value: '...' } }
```

**Minimum properties: 3** (P31, P856, P1448)

### **Conditionally Included (If Data Available):**

```typescript
// 4. P625: Coordinate location (if lat/lng provided)
if (business.location?.coordinates?.lat && business.location?.coordinates?.lng) {
  claims.P625 = [this.createCoordinateClaim('P625', lat, lng, url)];
}

// 5. P1329: Phone number (if crawled)
if (crawledData?.phone) {
  claims.P1329 = [this.createStringClaim('P1329', crawledData.phone, url)];
}

// COMMENTED OUT (not currently used):
// 6. P969: Street address
// 7. P159: Headquarters location (city QID)
```

**Maximum properties (current): 5** (if all data available)

---

## 🔑 **What Controls Entity Richness**

### **1. Web Crawl Data Quality** (PRIMARY FACTOR)

The **more data your crawler finds**, the richer the entity:

```typescript
// lib/crawler/index.ts extracts:
interface CrawledData {
  name?: string;              // → P1448 (official name)
  description?: string;       // → Wikidata description
  phone?: string;             // → P1329 (phone number)
  email?: string;             // → NOT USED YET (could add P968)
  socialLinks?: {             // → NOT USED YET (could add P2002, etc.)
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  categories?: string[];      // → NOT USED YET (could add P452 industry)
  services?: string[];        // → NOT USED YET
  imageUrl?: string;          // → NOT USED YET (could add P18 image)
  founded?: string;           // → NOT USED YET (could add P571 inception)
  structuredData?: Record;    // → JSON-LD data (partially used)
  metaTags?: Record;          // → OpenGraph data
}
```

**Current Utilization: ~30%** of crawled data is used!

**Opportunity:** You're crawling rich data but only using a fraction of it.

---

### **2. Business Location Data**

```typescript
// Database: businesses.location (JSONB)
location: {
  city: string;           // → Used in description
  state: string;          // → Used in description
  country: string;        // → Used in description
  coordinates?: {         // → P625 (coordinate location)
    lat: number;
    lng: number;
  };
}
```

**Impact:**
- ✅ **With coordinates:** Entity gets P625 (coordinate location) - More discoverable
- ❌ **Without coordinates:** Entity lacks precise location - Less useful

---

### **3. Progressive Enrichment (Future Feature)**

Your database schema has this planned:

```sql
-- lib/db/schema.ts
export const wikidataEntities = pgTable('wikidata_entities', {
  // ...
  version: integer('version'),              // Track entity versions
  enrichmentLevel: integer('enrichment_level'),  // Track richness
  lastEnrichedAt: timestamp('last_enriched_at'), // Last update
});
```

**Enrichment Levels (Proposed):**

| Level | Properties | Description |
|-------|-----------|-------------|
| **0 - Basic** | 3-5 | P31, P856, P1448, (P625), (P1329) |
| **1 - Standard** | 6-10 | + Social links, email, address |
| **2 - Enhanced** | 11-15 | + Industry, services, images |
| **3 - Complete** | 16+ | + Founded, employees, revenue |

**Currently:** You're publishing **Level 0 (Basic)** entities.

---

### **4. Subscription Plan (Permission-Based)**

```typescript
// lib/gemflush/plans.ts
export const PLANS = {
  free: {
    features: {
      wikidataPublishing: false,  // ❌ Can't publish
      progressiveEnrichment: false,
    }
  },
  pro: {
    features: {
      wikidataPublishing: true,   // ✅ Can publish
      progressiveEnrichment: false, // Not yet implemented
    }
  },
  agency: {
    features: {
      wikidataPublishing: true,
      progressiveEnrichment: true,  // Future: Auto-enrich over time
    }
  }
};
```

---

## 🚀 **How to Make Entities Richer**

### **Option 1: Use More Crawled Data (Easy - No Plan Changes)**

Add these properties to `buildClaims()`:

```typescript
// lib/wikidata/entity-builder.ts

private buildClaims(business: Business, crawledData?: CrawledData) {
  const claims = {};
  
  // Existing properties...
  claims.P31 = [this.createItemClaim('P31', 'Q4830453', business.url)];
  claims.P856 = [this.createUrlClaim('P856', business.url)];
  // ...
  
  // NEW: Add more properties from crawled data
  
  // P968: Email address
  if (crawledData?.email) {
    claims.P968 = [this.createStringClaim('P968', crawledData.email, business.url)];
  }
  
  // P969: Street address (currently commented out)
  if (crawledData?.structuredData?.address?.streetAddress) {
    const address = crawledData.structuredData.address.streetAddress;
    claims.P969 = [this.createStringClaim('P969', address, business.url)];
  }
  
  // P2002: Twitter username
  if (crawledData?.socialLinks?.twitter) {
    const username = this.extractTwitterUsername(crawledData.socialLinks.twitter);
    claims.P2002 = [this.createStringClaim('P2002', username, business.url)];
  }
  
  // P2013: Facebook ID
  if (crawledData?.socialLinks?.facebook) {
    const fbId = this.extractFacebookId(crawledData.socialLinks.facebook);
    claims.P2013 = [this.createStringClaim('P2013', fbId, business.url)];
  }
  
  // P2035: LinkedIn company ID
  if (crawledData?.socialLinks?.linkedin) {
    const linkedinId = this.extractLinkedInId(crawledData.socialLinks.linkedin);
    claims.P2035 = [this.createStringClaim('P2035', linkedinId, business.url)];
  }
  
  // P18: Image (if logo/photo available)
  if (crawledData?.imageUrl) {
    // Note: Wikidata requires images to be on Wikimedia Commons
    // This would need to be uploaded first, or use P4896 (logo image URL)
    claims.P4896 = [this.createUrlClaim('P4896', crawledData.imageUrl)];
  }
  
  // P571: Inception/founded date
  if (crawledData?.founded) {
    claims.P571 = [this.createTimeClaim('P571', crawledData.founded, business.url)];
  }
  
  // P452: Industry (map from categories)
  if (crawledData?.categories && crawledData.categories.length > 0) {
    const industryQID = this.mapCategoryToIndustryQID(crawledData.categories[0]);
    if (industryQID) {
      claims.P452 = [this.createItemClaim('P452', industryQID, business.url)];
    }
  }
  
  return claims;
}
```

**Impact:** Entity jumps from **3-5 properties → 10-15 properties**

**Effort:** 2-3 hours of coding

---

### **Option 2: Geocode Addresses to Coordinates (Medium)**

Many businesses don't have coordinates in your database. Add geocoding:

```typescript
// lib/geocoder/index.ts (new file)
import { geocode } from 'some-geocoding-service';

export async function geocodeAddress(address: string) {
  // Use Google Maps API, Mapbox, or Nominatim
  const result = await geocode(address);
  return {
    lat: result.latitude,
    lng: result.longitude
  };
}

// In crawler or business creation:
if (crawledData.address && !business.location.coordinates) {
  const coords = await geocodeAddress(crawledData.address);
  business.location.coordinates = coords;
}
```

**Impact:** More entities get P625 (coordinates)

**Cost:** Free tier: Nominatim (OpenStreetMap), Paid: Google Maps ($5 per 1000 requests)

---

### **Option 3: SPARQL Lookups for City/State QIDs (Medium)**

Instead of just text like "Seattle, WA", link to actual Wikidata entities:

```typescript
// lib/wikidata/sparql.ts (you already have this file!)

// P131: Located in administrative territory
const cityQID = await sparqlQuery.getCityQID('Seattle', 'Washington', 'USA');
if (cityQID) {
  claims.P131 = [this.createItemClaim('P131', cityQID, business.url)];
}

// P17: Country
const countryQID = this.mapCountryToQID(business.location.country);
claims.P17 = [this.createItemClaim('P17', countryQID, business.url)];
```

**Impact:** Entity is better connected in Wikidata's knowledge graph

**Effort:** 1-2 hours (you already have SPARQL query infrastructure)

---

### **Option 4: Progressive Enrichment (Advanced - Future Feature)**

Implement the enrichment levels stored in your database:

```typescript
// lib/wikidata/progressive-enrichment.ts (new file)

export class ProgressiveEnrichment {
  async enrichEntity(businessId: number, targetLevel: number) {
    const business = await getBusinessById(businessId);
    const currentEntity = await getWikidataEntity(businessId);
    const currentLevel = currentEntity.enrichmentLevel || 0;
    
    if (currentLevel >= targetLevel) return; // Already enriched
    
    // Level 1: Add social links, email, address
    if (targetLevel >= 1 && currentLevel < 1) {
      await this.addSocialLinks(business);
      await this.addContactInfo(business);
      await updateEnrichmentLevel(businessId, 1);
    }
    
    // Level 2: Add industry, services, images
    if (targetLevel >= 2 && currentLevel < 2) {
      await this.addIndustryClassification(business);
      await this.addServices(business);
      await this.addImages(business);
      await updateEnrichmentLevel(businessId, 2);
    }
    
    // Level 3: Add financial data, employee count, etc.
    if (targetLevel >= 3 && currentLevel < 3) {
      await this.addFinancialData(business);
      await this.addEmployeeCount(business);
      await updateEnrichmentLevel(businessId, 3);
    }
  }
}
```

**Usage:**
```typescript
// Agency plan: Auto-enrich over time
if (team.planName === 'agency') {
  // Week 1: Publish basic entity (level 0)
  await publisher.publish(basicEntity);
  
  // Week 2: Enrich to level 1
  await enrichment.enrichEntity(businessId, 1);
  
  // Month 2: Enrich to level 2
  await enrichment.enrichEntity(businessId, 2);
}
```

**Impact:** Entities get progressively richer over time

**Business Value:** Differentiation between Pro and Agency plans

---

## 🎯 **Recommended Implementation Priority**

### **Phase 1: Quick Wins (Week 1)** ⚡

1. **Use more crawled data** (3 hours)
   - Add email (P968)
   - Add social links (P2002, P2013, P2035)
   - Add street address (P969)
   - Add logo URL (P4896)

**Result:** Entities go from 3-5 properties → 8-12 properties

### **Phase 2: Location Enhancement (Week 2)** 🗺️

2. **Add country QID** (30 minutes)
   ```typescript
   // Simple mapping
   const countryMap = {
     'USA': 'Q30',
     'Canada': 'Q16',
     'UK': 'Q145',
     // ...
   };
   claims.P17 = [this.createItemClaim('P17', countryMap[country])];
   ```

3. **SPARQL city lookups** (2 hours)
   - Use existing sparql.ts infrastructure
   - Add P131 (located in) with city QID

**Result:** Better geolocation, more connected entities

### **Phase 3: Advanced Features (Month 2)** 🚀

4. **Geocoding service** (1 day)
   - Add Nominatim or Google Maps API
   - Geocode addresses without coordinates

5. **Progressive enrichment** (3-5 days)
   - Implement enrichment levels
   - Agency plan differentiation
   - Automated re-publishing

**Result:** Rich, evolving entities that improve over time

---

## 📊 **Entity Richness Comparison**

### **Current Basic Entity (Your MVP)**
```json
{
  "labels": { "en": "Joe's Coffee Shop" },
  "descriptions": { "en": "Local business in Seattle, WA" },
  "claims": {
    "P31": "business (Q4830453)",
    "P856": "https://joescoffee.com",
    "P1448": "Joe's Coffee Shop",
    "P625": "47.6062, -122.3321",  // if available
    "P1329": "+1-206-555-0123"      // if available
  }
}
```
**Properties: 3-5**  
**Richness: Basic** ✅ Good for MVP

---

### **Enhanced Entity (Phase 1 Complete)**
```json
{
  "labels": { "en": "Joe's Coffee Shop" },
  "descriptions": { "en": "Coffee shop in Seattle specializing in artisan roasts" },
  "claims": {
    "P31": "business (Q4830453)",
    "P856": "https://joescoffee.com",
    "P1448": "Joe's Coffee Shop",
    "P625": "47.6062, -122.3321",
    "P1329": "+1-206-555-0123",
    "P968": "hello@joescoffee.com",     // NEW
    "P969": "123 Pike Street",          // NEW
    "P2002": "joescoffeeseattle",       // NEW (Twitter)
    "P2013": "joescoffeeshop",          // NEW (Facebook)
    "P4896": "https://joescoffee.com/logo.png", // NEW (logo)
    "P17": "United States (Q30)"        // NEW (country)
  }
}
```
**Properties: 11**  
**Richness: Enhanced** ⭐ Great for Pro users

---

### **Complete Entity (Phase 3 Complete)**
```json
{
  "labels": { "en": "Joe's Coffee Shop" },
  "descriptions": { "en": "Award-winning coffee shop founded in 2010" },
  "claims": {
    // All Phase 1 properties +
    "P131": "Seattle (Q5083)",          // located in Seattle
    "P452": "Food services (Q1429218)", // industry
    "P571": "2010-03-15",               // founded
    "P159": "Seattle (Q5083)",          // headquarters
    "P1128": ["coffee", "pastries"],    // products
    // ... more properties
  }
}
```
**Properties: 15-20**  
**Richness: Complete** 🌟 Excellent for Agency users

---

## 🔍 **How Entity Richness Affects Visibility**

### **Why Rich Entities Matter:**

1. **Better LLM Mention Rates**
   - More properties = more ways to be found
   - Example: LLM searching for "coffee shops with outdoor seating" finds entities with P2846 (outdoor seating: yes)

2. **Better Knowledge Graph Connections**
   - P131 (located in) connects to Seattle's entity
   - P452 (industry) connects to food services
   - More connections = more discoverability

3. **Better Human Discoverability**
   - Wikidata search ranks richer entities higher
   - More complete profiles look more legitimate

4. **Better API Integration**
   - Rich entities work better with Siri, Alexa, Google Assistant
   - More structured data = better voice search results

---

## 💡 **Practical Recommendation for Your MVP**

### **For Launch (Week 1):**

Keep current **basic entities** (3-5 properties):
- ✅ Fast to publish
- ✅ Meets notability standards
- ✅ Validates concept
- ✅ No complex integrations needed

### **For Growth (Month 2):**

Implement **enhanced entities** (8-12 properties):
- Add social links, email, address
- Add country linking
- Market as "Pro feature: Richer entities"

### **For Agency Tier (Month 3+):**

Add **progressive enrichment**:
- Entities start basic
- Automatically enrich over time
- Agency customers get "living" entities that improve

---

## 🎯 **Action Items**

### **Immediate (Optional for MVP):**
- [ ] Uncomment P969 (address) in entity-builder.ts
- [ ] Test current entities have minimum 3 properties
- [ ] Document which properties are used

### **Week 2-3 (Quick Enhancement):**
- [ ] Add helper methods for social link extraction
- [ ] Add P968 (email), P2002 (Twitter), P2013 (Facebook)
- [ ] Add P17 (country) with simple mapping
- [ ] Test enriched entities

### **Month 2 (Advanced Features):**
- [ ] Implement enrichment levels in database
- [ ] Create progressive enrichment service
- [ ] Add geocoding for missing coordinates
- [ ] Add SPARQL city lookups

---

## 📚 **Wikidata Property Reference**

### **Properties Your Crawler Already Has Data For:**

| Property | Name | Type | Source | Currently Used? |
|----------|------|------|--------|----------------|
| P31 | instance of | Item | Hardcoded | ✅ Yes |
| P856 | official website | URL | business.url | ✅ Yes |
| P1448 | official name | String | crawledData.name | ✅ Yes |
| P625 | coordinate location | Coordinate | location.coordinates | ✅ Yes |
| P1329 | phone number | String | crawledData.phone | ✅ Yes |
| P968 | email address | String | crawledData.email | ❌ No |
| P969 | street address | String | crawledData.address | ❌ Commented out |
| P2002 | Twitter username | String | crawledData.socialLinks.twitter | ❌ No |
| P2013 | Facebook ID | String | crawledData.socialLinks.facebook | ❌ No |
| P2035 | LinkedIn ID | String | crawledData.socialLinks.linkedin | ❌ No |
| P18 or P4896 | image/logo | URL | crawledData.imageUrl | ❌ No |
| P571 | inception (founded) | Time | crawledData.founded | ❌ No |
| P452 | industry | Item | crawledData.categories | ❌ No |

### **Properties Requiring External Lookups:**

| Property | Name | Type | Lookup Method |
|----------|------|------|---------------|
| P17 | country | Item | Map country name → QID |
| P131 | located in | Item | SPARQL query for city |
| P159 | headquarters | Item | Same as P131 |

---

## 🎉 **Summary**

### **What determines entity richness:**

1. **Web crawl data quality** (Primary)
   - More data crawled = more properties available
   - Currently using ~30% of crawled data

2. **Business data completeness**
   - Coordinates make entity more useful
   - Location data enables geographic linking

3. **Implementation choices**
   - Which properties you choose to include
   - Whether you do SPARQL lookups
   - Whether you add geocoding

4. **Progressive enrichment** (Future)
   - Start basic, enrich over time
   - Agency plan differentiation

### **Your current state:**
- ✅ Creating valid basic entities (3-5 properties)
- ✅ Meeting Wikidata notability standards
- ✅ Good foundation for enhancement

### **Recommended path:**
- **MVP:** Ship with current basic entities
- **Week 2-3:** Add social links and email (2-3 hours work)
- **Month 2:** Implement progressive enrichment

**You're already 90% there for MVP. Entity enhancement can come later!** 🚀

---

**Document Created:** November 10, 2025  
**Related Files:**
- `lib/wikidata/entity-builder.ts` - Entity construction
- `lib/crawler/index.ts` - Data source
- `lib/db/schema.ts` - Enrichment level tracking
- `lib/gemflush/plans.ts` - Feature permissions

**Next Steps:** Focus on service validation, enhance entities later.

