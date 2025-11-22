// SPARQL query service for Wikidata validation and lookups
// Enhanced with hybrid caching: Memory (L1) + Database (L2) + Local Mappings (L3) + SPARQL (L4)

import { db } from '@/lib/db/drizzle';
import { qidCache } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
// Embedded QID mappings for self-contained operation
const US_CITY_QIDS: Record<string, string> = {
  "san francisco, ca": "Q62",
  "new york, ny": "Q60",
  "los angeles, ca": "Q65",
  "chicago, il": "Q1297",
  "houston, tx": "Q16555",
  "phoenix, az": "Q16556",
  "philadelphia, pa": "Q1345",
  "san antonio, tx": "Q975",
  "san diego, ca": "Q16552",
  "dallas, tx": "Q16557",
  "san jose, ca": "Q16553",
  "austin, tx": "Q16559",
  "seattle, wa": "Q5083",
  "denver, co": "Q16554",
  "boston, ma": "Q100",
  "detroit, mi": "Q12439",
  "portland, or": "Q6106",
  "miami, fl": "Q8652",
  "atlanta, ga": "Q23556",
  "las vegas, nv": "Q23768"
};

const INDUSTRY_QIDS: Record<string, string> = {
  "software development": "Q7397",
  "technology": "Q11016",
  "healthcare": "Q31207",
  "finance": "Q43015",
  "retail": "Q126793",
  "manufacturing": "Q187939",
  "education": "Q8434",
  "consulting": "Q1780447",
  "real estate": "Q49773",
  "construction": "Q385378",
  "food service": "Q1643932",
  "transportation": "Q7590",
  "media": "Q11033",
  "telecommunications": "Q418",
  "energy": "Q11379"
};

const LEGAL_FORM_QIDS: Record<string, string> = {
  "corporation": "Q167037",
  "llc": "Q1191951",
  "partnership": "Q167037",
  "sole proprietorship": "Q2135465",
  "nonprofit": "Q163740",
  "cooperative": "Q4539",
  "limited partnership": "Q1191951"
};

const US_STATE_QIDS: Record<string, string> = {
  "ca": "Q99",
  "ny": "Q1384",
  "tx": "Q1439",
  "fl": "Q812",
  "il": "Q1204",
  "pa": "Q1400",
  "oh": "Q1397",
  "ga": "Q1428",
  "nc": "Q1454",
  "mi": "Q1166",
  "nj": "Q1408",
  "va": "Q1370",
  "wa": "Q1223",
  "az": "Q816",
  "ma": "Q771",
  "tn": "Q1509",
  "in": "Q1415",
  "mo": "Q1581",
  "md": "Q1391",
  "wi": "Q1537"
};

const COUNTRY_QIDS: Record<string, string> = {
  "us": "Q30",
  "usa": "Q30",
  "united states": "Q30",
  "canada": "Q16",
  "mexico": "Q96",
  "uk": "Q145",
  "germany": "Q183",
  "france": "Q142",
  "japan": "Q17",
  "china": "Q148",
  "australia": "Q408",
  "brazil": "Q155",
  "india": "Q668"
};

export class WikidataSPARQLService {
  private endpoint = 'https://query.wikidata.org/sparql';
  
  // L1 Cache: In-memory (fast, clears on restart)
  private memoryCache: Map<string, string> = new Map();
  
  /**
   * Find QID for a city (hybrid: L1 → L2 → L3 → L4)
   * @param skipSparql - If true, only use local/cached data (fast mode for commercial apps)
   */
  async findCityQID(
    cityName: string,
    state?: string,
    countryQID: string = 'Q30',
    skipSparql: boolean = false
  ): Promise<string | null> {
    const key = state
      ? `${cityName}, ${state}`
      : cityName;
    const normalizedKey = this.normalizeKey(key);
    
    // L1: Memory cache (< 1ms)
    const cacheKey = `city:${normalizedKey}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }
    
    // L2: Database cache (5-20ms)
    const dbResult = await this.getCachedQID('city', normalizedKey);
    if (dbResult) {
      this.memoryCache.set(cacheKey, dbResult);
      return dbResult;
    }
    
    // L3: Local mapping (< 1ms)
    if (US_CITY_QIDS[normalizedKey]) {
      const qid = US_CITY_QIDS[normalizedKey];
      this.cacheQID(cacheKey, qid, 'city', normalizedKey, 'local_mapping');
      console.log(`✓ Local city QID: ${key} → ${qid}`);
      return qid;
    }
    
    // L4: SPARQL lookup (200-500ms) - OPTIONAL for speed
    if (skipSparql) {
      console.log(`⏭️  Skipping SPARQL for: ${key} (fast mode)`);
      return null;
    }
    
    console.log(`⏳ SPARQL lookup for city: ${key}`);
    const qid = await this.sparqlCityLookup(cityName, countryQID);
    
    if (qid) {
      this.cacheQID(cacheKey, qid, 'city', normalizedKey, 'sparql');
      console.log(`✓ SPARQL found: ${key} → ${qid}`);
    } else {
      console.warn(`✗ No QID found for city: ${key}`);
    }
    
    return qid;
  }
  
  /**
   * Find QID for industry (hybrid: L1 → L2 → L3 → L4)
   * @param skipSparql - If true, only use local/cached data (fast mode)
   */
  async findIndustryQID(industryName: string, skipSparql: boolean = false): Promise<string | null> {
    const normalizedKey = this.normalizeKey(industryName);
    
    // L1: Memory cache
    const cacheKey = `industry:${normalizedKey}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }
    
    // L2: Database cache
    const dbResult = await this.getCachedQID('industry', normalizedKey);
    if (dbResult) {
      this.memoryCache.set(cacheKey, dbResult);
      return dbResult;
    }
    
    // L3: Local mapping
    if (INDUSTRY_QIDS[normalizedKey]) {
      const qid = INDUSTRY_QIDS[normalizedKey];
      this.cacheQID(cacheKey, qid, 'industry', normalizedKey, 'local_mapping');
      console.log(`✓ Local industry QID: ${industryName} → ${qid}`);
      return qid;
    }
    
    // L4: SPARQL lookup - OPTIONAL for speed
    if (skipSparql) {
      console.log(`⏭️  Skipping SPARQL for industry: ${industryName} (fast mode)`);
      return null;
    }
    
    console.log(`⏳ SPARQL lookup for industry: ${industryName}`);
    const qid = await this.sparqlIndustryLookup(industryName);
    
    if (qid) {
      this.cacheQID(cacheKey, qid, 'industry', normalizedKey, 'sparql');
      console.log(`✓ SPARQL found: ${industryName} → ${qid}`);
    } else {
      console.warn(`✗ No QID found for industry: ${industryName}`);
    }
    
    return qid;
  }
  
  /**
   * Find QID for legal form (local mapping only - 100% coverage)
   */
  async findLegalFormQID(legalForm: string): Promise<string | null> {
    const normalizedKey = this.normalizeKey(legalForm);
    
    // L1: Memory cache
    const cacheKey = `legal_form:${normalizedKey}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }
    
    // L2: Database cache
    const dbResult = await this.getCachedQID('legal_form', normalizedKey);
    if (dbResult) {
      this.memoryCache.set(cacheKey, dbResult);
      return dbResult;
    }
    
    // L3: Local mapping (complete coverage)
    const qid = LEGAL_FORM_QIDS[normalizedKey];
    
    if (qid) {
      this.cacheQID(cacheKey, qid, 'legal_form', normalizedKey, 'local_mapping', true);
      console.log(`✓ Legal form QID: ${legalForm} → ${qid}`);
      return qid;
    }
    
    console.warn(`✗ Unknown legal form: ${legalForm}`);
    return null;
  }
  
  /**
   * Validate that a QID exists in Wikidata
   */
  async validateQID(qid: string): Promise<boolean> {
    const query = `ASK { wd:${qid} ?p ?o }`;
    
    try {
      const response = await this.executeQuery(query);
      return response.boolean || false;
    } catch (error) {
      console.error('QID validation error:', error);
      return false;
    }
  }
  
  /**
   * Get cached QID from database (L2)
   */
  private async getCachedQID(
    entityType: string,
    searchKey: string
  ): Promise<string | null> {
    try {
      const result = await db
        .select({ qid: qidCache.qid })
        .from(qidCache)
        .where(
          and(
            eq(qidCache.entityType, entityType),
            eq(qidCache.searchKey, searchKey)
          )
        )
        .limit(1);
      
      if (result.length > 0) {
        // Update query count and timestamp
        await db
          .update(qidCache)
          .set({
            queryCount: sql`${qidCache.queryCount} + 1`,
            lastQueriedAt: new Date(),
          })
          .where(
            and(
              eq(qidCache.entityType, entityType),
              eq(qidCache.searchKey, searchKey)
            )
          );
        
        console.log(`✓ DB cache hit: ${entityType}:${searchKey} → ${result[0].qid}`);
        return result[0].qid;
      }
      
      return null;
    } catch (error) {
      console.error('Database cache lookup error:', error);
      return null;
    }
  }
  
  /**
   * Save QID to database cache (L2)
   * Helper method to cache QIDs (DRY principle)
   */
  private async setCachedQID(
    entityType: string,
    searchKey: string,
    qid: string,
    source: 'local_mapping' | 'sparql' | 'manual'
  ): Promise<void> {
    try {
      await db
        .insert(qidCache)
        .values({
          entityType,
          searchKey,
          qid,
          source,
          queryCount: 1,
          lastQueriedAt: new Date(),
          validatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [qidCache.entityType, qidCache.searchKey],
          set: {
            qid,
            source,
            queryCount: sql`${qidCache.queryCount} + 1`,
            lastQueriedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      
      console.log(`✓ Cached: ${entityType}:${searchKey} → ${qid} (${source})`);
    } catch (error) {
      console.error('Database cache save error:', error);
    }
  }

  /**
   * Cache QID in memory and optionally in database (DRY principle)
   */
  private cacheQID(
    cacheKey: string,
    qid: string,
    entityType: string,
    searchKey: string,
    source: 'local_mapping' | 'sparql' | 'manual',
    saveToDb: boolean = true
  ): void {
    this.memoryCache.set(cacheKey, qid);
    if (saveToDb) {
      // Background save (fire and forget)
      this.setCachedQID(entityType, searchKey, qid, source).catch(err =>
        console.error('Background cache save failed:', err)
      );
    }
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
}

export const sparqlService = new WikidataSPARQLService();
