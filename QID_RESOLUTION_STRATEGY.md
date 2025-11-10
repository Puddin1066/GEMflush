# QID Resolution Strategy: Hybrid SPARQL + Local Mappings

## 🎯 Problem Statement

**Current Issue:** LLM suggests properties with text values that need QID resolution:
- ❌ `P159 (headquarters): "Providence"` → Need `Q18383` (Providence, RI)
- ❌ `P452 (industry): "Healthcare"` → Need `Q31207` (Healthcare)
- ❌ `P1454 (legal form): "Corporation"` → Need `Q167037` (Corporation)
- ❌ `P749 (parent org): "Brown University Health"` → Need QID lookup

**Impact:**
- **Current:** 14 PIDs generated
- **Potential:** 18+ PIDs with proper QID resolution
- **Quality:** Would increase from 88/100 to 95+/100

---

## 🔍 Proposed Solution: Hybrid Approach

### Strategy: **Local Cache-First, SPARQL Fallback**

```
1. Check local QID mappings (fast, no API call)
   ↓ (if not found)
2. Query Wikidata SPARQL (slow, but comprehensive)
   ↓ (if found)
3. Cache result for future use
```

**Benefits:**
- ✅ Fast lookups for common entities (cities, industries, legal forms)
- ✅ No rate limits for 95% of queries
- ✅ Comprehensive coverage via SPARQL for rare entities
- ✅ Progressive enhancement (works offline with cache)

---

## 📊 Implementation Plan

### Phase 1: Comprehensive Local QID Mappings

**Create:** `lib/wikidata/qid-mappings.ts`

#### 1.1 US Cities (Top 500)
```typescript
export const US_CITY_QIDS: Record<string, string> = {
  // Format: "City, State" → QID
  "New York, NY": "Q60",
  "Los Angeles, CA": "Q65",
  "Chicago, IL": "Q1297",
  "Houston, TX": "Q16555",
  "Phoenix, AZ": "Q16556",
  "Philadelphia, PA": "Q1345",
  "San Antonio, TX": "Q975",
  "San Diego, CA": "Q16552",
  "Dallas, TX": "Q16557",
  "San Jose, CA": "Q16553",
  "Providence, RI": "Q18383",  // ← Brown Physicians fix
  // ... 490 more cities
};
```

**Source:** [Wikidata Query Service - US Cities by Population](https://query.wikidata.org)

#### 1.2 Industries (Top 100)
```typescript
export const INDUSTRY_QIDS: Record<string, string> = {
  "Healthcare": "Q31207",
  "Medical Services": "Q31207",
  "Physician Services": "Q5532073",
  "Software Development": "Q7397",
  "Information Technology": "Q11016",
  "Retail": "Q194353",
  "E-commerce": "Q484847",
  "Manufacturing": "Q8148",
  "Construction": "Q385378",
  "Finance": "Q43015",
  "Banking": "Q22687",
  "Insurance": "Q43183",
  "Real Estate": "Q66344",
  "Professional Services": "Q17489659",
  "Consulting": "Q7020",
  "Legal Services": "Q185351",
  "Education": "Q8434",
  "Hospitality": "Q2352616",
  "Restaurant": "Q11862829",
  "Entertainment": "Q173799",
  // ... 80 more industries
};
```

#### 1.3 Legal Forms (All Common Types)
```typescript
export const LEGAL_FORM_QIDS: Record<string, string> = {
  "LLC": "Q1269299",
  "Limited Liability Company": "Q1269299",
  "Corporation": "Q167037",
  "C Corporation": "Q167037",
  "S Corporation": "Q7387004",
  "Public Company": "Q891723",
  "Private Company": "Q380085",
  "Publicly Traded Company": "Q891723",
  "Partnership": "Q167395",
  "Limited Partnership": "Q1463121",
  "General Partnership": "Q167395",
  "Sole Proprietorship": "Q849495",
  "Non-profit": "Q163740",
  "Not-for-profit": "Q163740",
  "Not-for-profit corporation": "Q163740",
  "501(c)(3)": "Q163740",
  "Cooperative": "Q4539",
  "Joint Venture": "Q489209",
  "Franchise": "Q219577",
  "Trust": "Q1361864",
};
```

#### 1.4 US States (All 50)
```typescript
export const US_STATE_QIDS: Record<string, string> = {
  "Alabama": "Q173", "AL": "Q173",
  "Alaska": "Q797", "AK": "Q797",
  "Arizona": "Q816", "AZ": "Q816",
  // ... all 50 states with full names and abbreviations
  "Rhode Island": "Q1387", "RI": "Q1387",
  // ...
};
```

#### 1.5 Countries (Top 200)
```typescript
export const COUNTRY_QIDS: Record<string, string> = {
  "United States": "Q30",
  "US": "Q30",
  "USA": "Q30",
  "Canada": "Q16",
  "Mexico": "Q96",
  "United Kingdom": "Q145",
  "UK": "Q145",
  // ... 195 more countries
};
```

---

### Phase 2: Enable SPARQL with Fallback

**Enhance:** `lib/wikidata/sparql.ts`

```typescript
import { 
  US_CITY_QIDS, 
  INDUSTRY_QIDS, 
  LEGAL_FORM_QIDS,
  US_STATE_QIDS,
  COUNTRY_QIDS 
} from './qid-mappings';

export class WikidataSPARQLService {
  private endpoint = 'https://query.wikidata.org/sparql';
  private cache: Map<string, string> = new Map(); // Runtime cache
  
  /**
   * Find QID for a city (hybrid approach)
   */
  async findCityQID(
    cityName: string, 
    state?: string,
    countryQID: string = 'Q30'
  ): Promise<string | null> {
    // 1. Try local mapping first (instant)
    const key = state 
      ? `${cityName}, ${state}` 
      : cityName;
    const normalized = this.normalizeKey(key);
    
    if (US_CITY_QIDS[normalized]) {
      console.log(`✓ Local QID found for: ${key}`);
      return US_CITY_QIDS[normalized];
    }
    
    // 2. Check runtime cache
    const cacheKey = `city:${normalized}:${countryQID}`;
    if (this.cache.has(cacheKey)) {
      console.log(`✓ Cache hit for: ${key}`);
      return this.cache.get(cacheKey)!;
    }
    
    // 3. Query Wikidata SPARQL (slow but comprehensive)
    console.log(`⏳ SPARQL lookup for: ${key}`);
    const qid = await this.sparqlCityLookup(cityName, countryQID);
    
    if (qid) {
      this.cache.set(cacheKey, qid);
      console.log(`✓ SPARQL found: ${key} → ${qid}`);
    } else {
      console.warn(`✗ No QID found for: ${key}`);
    }
    
    return qid;
  }
  
  /**
   * Find QID for industry (hybrid)
   */
  async findIndustryQID(industryName: string): Promise<string | null> {
    // 1. Local mapping
    const normalized = this.normalizeKey(industryName);
    if (INDUSTRY_QIDS[normalized]) {
      console.log(`✓ Local QID found for industry: ${industryName}`);
      return INDUSTRY_QIDS[normalized];
    }
    
    // 2. Cache check
    const cacheKey = `industry:${normalized}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // 3. SPARQL lookup
    console.log(`⏳ SPARQL lookup for industry: ${industryName}`);
    const qid = await this.sparqlIndustryLookup(industryName);
    
    if (qid) {
      this.cache.set(cacheKey, qid);
    }
    
    return qid;
  }
  
  /**
   * Find QID for legal form (local only - comprehensive coverage)
   */
  async findLegalFormQID(legalForm: string): Promise<string | null> {
    const normalized = this.normalizeKey(legalForm);
    const qid = LEGAL_FORM_QIDS[normalized];
    
    if (qid) {
      console.log(`✓ Legal form QID found: ${legalForm} → ${qid}`);
    } else {
      console.warn(`✗ Unknown legal form: ${legalForm}`);
    }
    
    return qid || null;
  }
  
  /**
   * Normalize keys for consistent lookup
   */
  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9,\s-]/g, '')
      .replace(/\s+/g, ' ');
  }
  
  /**
   * SPARQL city lookup (production)
   */
  private async sparqlCityLookup(
    cityName: string, 
    countryQID: string
  ): Promise<string | null> {
    const query = `
      SELECT ?city WHERE {
        ?city rdfs:label "${cityName}"@en .
        ?city wdt:P31/wdt:P279* wd:Q515 .
        ?city wdt:P17 wd:${countryQID} .
      }
      LIMIT 1
    `;
    
    try {
      const response = await this.executeQuery(query);
      
      if (response.results.bindings.length > 0) {
        const uri = response.results.bindings[0].city.value;
        return uri.split('/').pop() || null;
      }
    } catch (error) {
      console.error('SPARQL city lookup error:', error);
    }
    
    return null;
  }
  
  /**
   * SPARQL industry lookup (production)
   */
  private async sparqlIndustryLookup(industryName: string): Promise<string | null> {
    const query = `
      SELECT ?industry WHERE {
        ?industry rdfs:label "${industryName}"@en .
        ?industry wdt:P31/wdt:P279* wd:Q268592 .
      }
      LIMIT 1
    `;
    
    try {
      const response = await this.executeQuery(query);
      
      if (response.results.bindings.length > 0) {
        const uri = response.results.bindings[0].industry.value;
        return uri.split('/').pop() || null;
      }
    } catch (error) {
      console.error('SPARQL industry lookup error:', error);
    }
    
    return null;
  }
  
  /**
   * Execute SPARQL query (PRODUCTION)
   */
  private async executeQuery(query: string): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/json',
        'User-Agent': 'GEMflush/1.0 (https://gemflush.com)',
      },
      body: query,
    });
    
    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
}
```

---

### Phase 3: Update Property Mapping

**Enhance:** `lib/wikidata/property-mapping.ts`

```typescript
import { sparqlService } from './sparql';

async function resolveCityQID(
  city: string, 
  state?: string
): Promise<string | null> {
  // Pass state for better accuracy
  return await sparqlService.findCityQID(city, state);
}

async function resolveLegalFormQID(form: string): Promise<string | null> {
  // Now uses comprehensive local mapping + SPARQL fallback
  return await sparqlService.findLegalFormQID(form);
}

async function resolveIndustryQID(industry: string): Promise<string | null> {
  // Hybrid: local mapping + SPARQL
  return await sparqlService.findIndustryQID(industry);
}
```

---

## 📈 Expected Impact

### Before (Current State)
```
Brown Physicians Inc:
- 14 PIDs generated
- Quality: 88/100
- Completeness: 54%
- Failed QIDs: P159, P1454, P749
```

### After (With Hybrid Approach)
```
Brown Physicians Inc:
- 18+ PIDs generated ✅
- Quality: 95+/100 ✅
- Completeness: 70%+ ✅
- Resolved QIDs:
  ✅ P159 (Providence, RI → Q18383)
  ✅ P1454 (Not-for-profit → Q163740)
  ✅ P452 (Healthcare → Q31207)
  ⏳ P749 (Parent org - needs SPARQL)
```

---

## 🚀 Implementation Priority

### Priority 1: High-Value, Easy Wins
1. ✅ **Legal Forms** - Complete local mapping (20 entries)
2. ✅ **Industries** - Local mapping (100 entries)
3. ✅ **US States** - Complete local mapping (50 entries)

### Priority 2: Location QIDs
4. ✅ **Top 500 US Cities** - Local mapping
5. ✅ **Enable SPARQL** - For rare cities
6. ✅ **Add caching** - Reduce SPARQL queries

### Priority 3: Advanced Lookups
7. ⏳ **Organizations** - SPARQL only (too many to map)
8. ⏳ **People** - SPARQL only (too many to map)
9. ⏳ **Stock Exchanges** - Local mapping (20 entries)

---

## 💰 Cost & Performance Analysis

### Local Mappings (95% of queries)
- **Speed:** < 1ms
- **Cost:** $0
- **Rate Limit:** None
- **Coverage:** 95% of common entities

### SPARQL Queries (5% of queries)
- **Speed:** 200-500ms
- **Cost:** $0 (Wikidata is free)
- **Rate Limit:** ~10/second (generous)
- **Coverage:** 100% of all entities in Wikidata

### Runtime Cache
- **Stores:** Successful SPARQL lookups
- **Benefit:** Repeat queries → instant
- **Lifetime:** Per-process (cleared on restart)

**Total Cost:** $0 per month (Wikidata SPARQL is free)  
**Total Queries Saved:** ~95% (via local mappings)

---

## 🔧 Testing Strategy

### Test 1: Local Mapping Coverage
```typescript
// Should return QIDs instantly
await sparqlService.findCityQID('Providence', 'RI');
// → Q18383 (< 1ms)

await sparqlService.findIndustryQID('Healthcare');
// → Q31207 (< 1ms)

await sparqlService.findLegalFormQID('Not-for-profit corporation');
// → Q163740 (< 1ms)
```

### Test 2: SPARQL Fallback
```typescript
// Should query SPARQL for rare city
await sparqlService.findCityQID('Pawtucket', 'RI');
// → Q54246 (300ms, then cached)
```

### Test 3: Cache Effectiveness
```typescript
// First call: SPARQL (300ms)
await sparqlService.findCityQID('Pawtucket', 'RI');

// Second call: Cache (< 1ms)
await sparqlService.findCityQID('Pawtucket', 'RI');
```

---

## 📁 File Structure

```
lib/wikidata/
├── qid-mappings.ts          (NEW - 1000+ mappings)
│   ├── US_CITY_QIDS         (500 cities)
│   ├── INDUSTRY_QIDS        (100 industries)
│   ├── LEGAL_FORM_QIDS      (20 legal forms)
│   ├── US_STATE_QIDS        (50 states)
│   └── COUNTRY_QIDS         (200 countries)
│
├── sparql.ts                (ENHANCED)
│   ├── findCityQID()        (hybrid: local + SPARQL)
│   ├── findIndustryQID()    (hybrid: local + SPARQL)
│   ├── findLegalFormQID()   (local only)
│   └── cache                (runtime cache)
│
├── property-mapping.ts      (NO CHANGE)
└── entity-builder.ts        (NO CHANGE)
```

---

## 🎯 Success Metrics

### Coverage Goals
- ✅ **95%** of city lookups via local mapping
- ✅ **100%** of legal form lookups via local mapping
- ✅ **90%** of industry lookups via local mapping
- ✅ **5%** fallback to SPARQL for rare entities

### Performance Goals
- ✅ **< 1ms** for local mapping lookups
- ✅ **< 500ms** for SPARQL queries
- ✅ **18+ PIDs** per entity (vs. current 14)
- ✅ **95+ quality score** (vs. current 88)

### Reliability Goals
- ✅ **Zero API rate limits** (due to 95% local)
- ✅ **Graceful fallback** if SPARQL unavailable
- ✅ **Progressive enhancement** (works offline)

---

## 📝 Next Steps

1. **Create `lib/wikidata/qid-mappings.ts`** with comprehensive local mappings
2. **Enable SPARQL** in `sparql.ts` (uncomment production code)
3. **Add hybrid lookup logic** (local first, SPARQL fallback)
4. **Add runtime caching** for SPARQL results
5. **Update tests** to validate hybrid approach
6. **Run full pipeline** with Brown Physicians Inc
7. **Verify 18+ PIDs** with proper QID resolution

**Estimated Implementation Time:** 2-3 hours  
**Expected Improvement:** 14 PIDs → 18+ PIDs, 88 → 95+ quality score

