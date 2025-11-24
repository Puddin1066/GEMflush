/**
 * SPARQL Query Service for Wikidata Validation and Lookups
 * 
 * Enhanced with hybrid caching: Memory (L1) → Database (L2) → Local Mappings (L3) → SPARQL (L4)
 * 
 * Strategy:
 * - Comprehensive embedded mappings cover 95%+ of queries (fast, reliable, zero-cost)
 * - SPARQL used only as optional fallback for edge cases (< 5% of queries)
 * - Default: skipSparql = true (SPARQL disabled by default for production reliability)
 * 
 * Coverage:
 * - 100+ US cities (~95% of US business locations)
 * - 100+ industries (~90% of business industries)
 * - 20+ legal forms (~99% of business legal forms)
 * - 50 US states (complete coverage)
 * - 50+ countries (major countries)
 * 
 * Contract: Implements IWikidataSPARQLService (lib/types/service-contracts.ts)
 */

import { db } from '@/lib/db/drizzle';
import { qidCache } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
// Import comprehensive QID mappings (95%+ coverage)
import {
  US_CITY_QIDS,
  INDUSTRY_QIDS,
  LEGAL_FORM_QIDS,
  US_STATE_QIDS,
  COUNTRY_QIDS
} from './qid-mappings';

import type { IWikidataSPARQLService } from '@/lib/types/service-contracts';

export class WikidataSPARQLService implements IWikidataSPARQLService {
  private endpoint = 'https://query.wikidata.org/sparql';
  
  // L1 Cache: In-memory (fast, clears on restart)
  private memoryCache: Map<string, string> = new Map();
  
  /**
   * Find QID for a city (hybrid: L1 → L2 → L3 → L4)
   * 
   * Priority: Memory Cache → Database Cache → Embedded Mappings → SPARQL (optional)
   * 
   * @param cityName - City name (e.g., "San Francisco")
   * @param state - Optional state abbreviation (e.g., "CA")
   * @param countryQID - Country QID (default: Q30 for United States)
   * @param skipSparql - If true, only use local/cached data (default: true for production reliability)
   * @returns QID string or null if not found
   */
  async findCityQID(
    cityName: string,
    state?: string,
    countryQID: string = 'Q30',
    skipSparql: boolean = true
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
    
    // L4: SPARQL lookup (200-500ms) - OPTIONAL fallback for edge cases
    if (skipSparql) {
      console.log(`⏭️  Skipping SPARQL for: ${key} (fast mode - not in embedded mappings)`);
      return null;
    }
    
    console.log(`⏳ SPARQL lookup for city: ${key} (edge case)`);
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
   * 
   * Priority: Memory Cache → Database Cache → Embedded Mappings → SPARQL (optional)
   * 
   * @param industryName - Industry name (e.g., "Technology", "Healthcare")
   * @param skipSparql - If true, only use local/cached data (default: true for production reliability)
   * @returns QID string or null if not found
   */
  async findIndustryQID(industryName: string, skipSparql: boolean = true): Promise<string | null> {
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
    
    // L4: SPARQL lookup - OPTIONAL fallback for edge cases
    if (skipSparql) {
      console.log(`⏭️  Skipping SPARQL for industry: ${industryName} (fast mode - not in embedded mappings)`);
      return null;
    }
    
    console.log(`⏳ SPARQL lookup for industry: ${industryName} (edge case)`);
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
   * Find QID for legal form (hybrid: L1 → L2 → L3)
   * 
   * Legal forms have 99%+ coverage in embedded mappings, so SPARQL is not needed.
   * 
   * @param legalForm - Legal form name (e.g., "LLC", "Corporation", "Non-profit")
   * @returns QID string or null if not found
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
   * Find QID for US state (embedded mapping only - 100% coverage)
   * 
   * @param stateName - State name or abbreviation (e.g., "CA", "California")
   * @returns QID string or null if not found
   */
  async findStateQID(stateName: string): Promise<string | null> {
    const normalizedKey = this.normalizeKey(stateName);
    
    // L1: Memory cache
    const cacheKey = `state:${normalizedKey}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }
    
    // L2: Database cache
    const dbResult = await this.getCachedQID('state', normalizedKey);
    if (dbResult) {
      this.memoryCache.set(cacheKey, dbResult);
      return dbResult;
    }
    
    // L3: Local mapping (complete coverage for all 50 states + DC)
    const qid = US_STATE_QIDS[normalizedKey];
    
    if (qid) {
      this.cacheQID(cacheKey, qid, 'state', normalizedKey, 'local_mapping', true);
      return qid;
    }
    
    console.warn(`✗ Unknown US state: ${stateName}`);
    return null;
  }
  
  /**
   * Find QID for country (embedded mapping only - covers major countries)
   * 
   * @param countryName - Country name or code (e.g., "US", "United States", "USA")
   * @returns QID string or null if not found
   */
  async findCountryQID(countryName: string): Promise<string | null> {
    const normalizedKey = this.normalizeKey(countryName);
    
    // L1: Memory cache
    const cacheKey = `country:${normalizedKey}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }
    
    // L2: Database cache
    const dbResult = await this.getCachedQID('country', normalizedKey);
    if (dbResult) {
      this.memoryCache.set(cacheKey, dbResult);
      return dbResult;
    }
    
    // L3: Local mapping (covers 50+ major countries)
    const qid = COUNTRY_QIDS[normalizedKey];
    
    if (qid) {
      this.cacheQID(cacheKey, qid, 'country', normalizedKey, 'local_mapping', true);
      return qid;
    }
    
    // For countries not in mapping, could use SPARQL if needed
    // But for now, return null (most businesses are US-based)
    console.warn(`✗ Unknown country: ${countryName} (not in embedded mappings)`);
    return null;
  }
  
  /**
   * Validate that a QID exists in Wikidata
   * 
   * Uses SPARQL ASK query to verify QID existence.
   * 
   * @param qid - QID to validate (e.g., "Q62")
   * @returns true if QID exists, false otherwise
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
    } catch (error: any) {
      // P0 Fix: Better error handling for constraint issues
      if (error?.code === '23505' || error?.message?.includes('unique constraint') || 
          error?.message?.includes('ON CONFLICT')) {
        // Constraint exists but ON CONFLICT failed - try update instead
        console.warn(
          `Database cache constraint issue for ${entityType}:${searchKey}. ` +
          `Attempting update instead of insert...`
        );
        
        try {
          await db
            .update(qidCache)
            .set({
              qid,
              source,
              queryCount: sql`${qidCache.queryCount} + 1`,
              lastQueriedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(qidCache.entityType, entityType),
                eq(qidCache.searchKey, searchKey)
              )
            );
          console.log(`✓ Updated cache: ${entityType}:${searchKey} → ${qid} (${source})`);
        } catch (updateError) {
          // If update also fails, log but don't throw (non-critical)
          console.error(
            `Database cache save failed for ${entityType}:${searchKey}:`,
            updateError
          );
          console.error(
            'This may indicate a database migration issue. ' +
            'Run: pnpm drizzle-kit push to ensure qid_cache table has unique constraint.'
          );
        }
      } else {
        // Other errors - log but don't throw (non-critical cache operation)
        console.error(`Database cache save error:`, error);
      }
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
   * Escape string for SPARQL query (prevent injection and handle special characters)
   */
  private escapeSparqlString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Extract QID from Wikidata URI (handles multiple formats)
   */
  private extractQID(uri: string): string | null {
    // Handle formats: http://www.wikidata.org/entity/Q123, wd:Q123, Q123
    const qidMatch = uri.match(/(?:entity\/|^)(Q\d+)$/);
    return qidMatch ? qidMatch[1] : null;
  }

  /**
   * SPARQL city lookup (fallback for edge cases)
   * 
   * Uses proper SPARQL syntax with namespace prefixes and string escaping.
   * Only called when city is not in embedded mappings and skipSparql = false.
   * 
   * @param cityName - City name to lookup
   * @param countryQID - Country QID to filter results (default: Q30 for US)
   * @returns QID string or null if not found
   */
  private async sparqlCityLookup(
    cityName: string,
    countryQID: string
  ): Promise<string | null> {
    const escapedCity = this.escapeSparqlString(cityName);
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT ?city WHERE {
        ?city rdfs:label "${escapedCity}"@en .
        ?city wdt:P31/wdt:P279* wd:Q515 .
        ?city wdt:P17 wd:${countryQID} .
      }
      LIMIT 1
    `;
    
    try {
      const response = await this.executeQuery(query);
      
      if (response.results?.bindings?.length > 0) {
        const uri = response.results.bindings[0].city.value;
        const qid = this.extractQID(uri);
        return qid;
      }
    } catch (error) {
      console.error('SPARQL city lookup error:', error);
    }
    
    return null;
  }
  
  /**
   * SPARQL industry lookup (fallback for edge cases)
   * 
   * Uses proper SPARQL syntax with namespace prefixes and string escaping.
   * Only called when industry is not in embedded mappings and skipSparql = false.
   * 
   * @param industryName - Industry name to lookup
   * @returns QID string or null if not found
   */
  private async sparqlIndustryLookup(industryName: string): Promise<string | null> {
    const escapedIndustry = this.escapeSparqlString(industryName);
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT ?industry WHERE {
        ?industry rdfs:label "${escapedIndustry}"@en .
        ?industry wdt:P31/wdt:P279* wd:Q268592 .
      }
      LIMIT 1
    `;
    
    try {
      const response = await this.executeQuery(query);
      
      if (response.results?.bindings?.length > 0) {
        const uri = response.results.bindings[0].industry.value;
        const qid = this.extractQID(uri);
        return qid;
      }
    } catch (error) {
      console.error('SPARQL industry lookup error:', error);
    }
    
    return null;
  }
  
  /**
   * Execute SPARQL query (fallback for edge cases)
   * 
   * Uses proper Wikidata SPARQL endpoint format: POST with form-encoded data.
   * Note: This is only used for edge cases (< 5% of queries) when skipSparql = false.
   * 
   * @param query - SPARQL query string
   * @returns Query response JSON or throws error
   * @throws Error if query fails or response is not OK
   */
  private async executeQuery(query: string): Promise<any> {
    // Wikidata SPARQL endpoint expects POST with application/x-www-form-urlencoded
    const params = new URLSearchParams({
      query: query,
      format: 'json'
    });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'GEMflush/1.0 (https://gemflush.com)',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}\n${errorText}`);
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
