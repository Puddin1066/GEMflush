// SPARQL query service for Wikidata validation and lookups
// Enhanced with hybrid caching: Memory (L1) + Database (L2) + Local Mappings (L3) + SPARQL (L4)

import { db } from '@/lib/db/drizzle';
import { qidCache } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  US_CITY_QIDS,
  INDUSTRY_QIDS,
  LEGAL_FORM_QIDS,
  US_STATE_QIDS,
  COUNTRY_QIDS,
} from './qid-mappings';

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
      // Background save to DB (don't await - fire and forget)
      this.setCachedQID('city', normalizedKey, qid, 'local_mapping').catch(err => 
        console.error('Background cache save failed:', err)
      );
      this.memoryCache.set(cacheKey, qid);
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
      // Background save to DB (don't await)
      this.setCachedQID('city', normalizedKey, qid, 'sparql').catch(err =>
        console.error('Background cache save failed:', err)
      );
      this.memoryCache.set(cacheKey, qid);
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
      // Background save (fire and forget)
      this.setCachedQID('industry', normalizedKey, qid, 'local_mapping').catch(err =>
        console.error('Background cache save failed:', err)
      );
      this.memoryCache.set(cacheKey, qid);
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
      // Background save (fire and forget)
      this.setCachedQID('industry', normalizedKey, qid, 'sparql').catch(err =>
        console.error('Background cache save failed:', err)
      );
      this.memoryCache.set(cacheKey, qid);
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
      await this.setCachedQID('legal_form', normalizedKey, qid, 'local_mapping');
      this.memoryCache.set(cacheKey, qid);
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
