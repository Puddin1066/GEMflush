# QID Cache Strategy: Persistent vs. Runtime

## 🎯 Problem: How Long Should SPARQL Results Be Cached?

**Key Question:** When a SPARQL query finds a QID, how long should we cache it?

**Answer:** **Indefinitely** (with periodic validation)

**Reasoning:**
- QIDs don't change: `Q18383` (Providence, RI) will always be Q18383
- SPARQL queries are slow (200-500ms)
- Wikidata is free but rate-limited (10/sec)
- Cache = faster responses + fewer API calls

---

## 📊 Caching Approaches Comparison

### Option 1: Runtime Cache (In-Memory)
```typescript
private cache: Map<string, string> = new Map();
```

**Pros:**
- ✅ Instant lookups (< 1ms)
- ✅ Zero database overhead
- ✅ Simple implementation

**Cons:**
- ❌ **Clears on every deployment**
- ❌ **Clears on server restart**
- ❌ **Not shared in serverless** (each Lambda has own cache)
- ❌ **No persistence**
- ❌ **Learns slowly** (starts empty every time)

**Cache Lifetime:** Until process restarts (~1-7 days in production, ~minutes in dev)

---

### Option 2: Database Cache (Persistent) ⭐ **RECOMMENDED**
```sql
CREATE TABLE qid_cache (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50), -- 'city', 'industry', 'legal_form', 'organization'
  search_key VARCHAR(255), -- 'Providence, RI', 'Healthcare', etc.
  qid VARCHAR(20),         -- 'Q18383'
  source VARCHAR(20),      -- 'local_mapping', 'sparql', 'manual'
  validated_at TIMESTAMP,  -- Last validation
  created_at TIMESTAMP,
  INDEX (entity_type, search_key)
);
```

**Pros:**
- ✅ **Persistent across deployments**
- ✅ **Shared across all API routes**
- ✅ **Learns over time** (every SPARQL result cached forever)
- ✅ **Analytics** (see most-queried entities)
- ✅ **Manual overrides** (fix incorrect mappings)
- ✅ **Validation tracking** (re-validate old entries)

**Cons:**
- ⚠️ Requires database query (5-20ms)
- ⚠️ Requires schema migration
- ⚠️ Requires maintenance (cleanup old entries)

**Cache Lifetime:** **Indefinite** (with periodic revalidation)

---

### Option 3: Hybrid Cache (Best of Both) 🏆 **OPTIMAL**

```typescript
export class WikidataSPARQLService {
  // L1 Cache: In-memory (instant, clears on restart)
  private memoryCache: Map<string, string> = new Map();
  
  // L2 Cache: Database (persistent, shared)
  // Accessed via Drizzle ORM
  
  async findCityQID(city: string, state?: string): Promise<string | null> {
    const key = this.normalizeKey(`${city}, ${state}`);
    
    // 1. Check memory cache (< 1ms)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }
    
    // 2. Check database cache (5-20ms)
    const dbResult = await this.getCachedQID('city', key);
    if (dbResult) {
      this.memoryCache.set(key, dbResult); // Populate L1
      return dbResult;
    }
    
    // 3. Check local mapping (< 1ms)
    if (US_CITY_QIDS[key]) {
      const qid = US_CITY_QIDS[key];
      await this.setCachedQID('city', key, qid, 'local_mapping');
      this.memoryCache.set(key, qid);
      return qid;
    }
    
    // 4. Query SPARQL (200-500ms)
    const qid = await this.sparqlCityLookup(city, 'Q30');
    if (qid) {
      await this.setCachedQID('city', key, qid, 'sparql');
      this.memoryCache.set(key, qid);
    }
    
    return qid;
  }
}
```

**Pros:**
- ✅ **L1: Instant** (memory cache, < 1ms)
- ✅ **L2: Persistent** (database cache, 5-20ms)
- ✅ **L3: Comprehensive** (local mappings)
- ✅ **L4: Universal** (SPARQL fallback)
- ✅ **Best of all worlds**

**Cache Lifetime:**
- **L1 (Memory):** Until process restart (~1-7 days)
- **L2 (Database):** Indefinite (with revalidation)

---

## 🗄️ Database Schema

### Migration: `lib/db/migrations/0003_qid_cache.sql`

```sql
CREATE TABLE IF NOT EXISTS qid_cache (
  id SERIAL PRIMARY KEY,
  
  -- What type of entity?
  entity_type VARCHAR(50) NOT NULL, -- 'city', 'industry', 'legal_form', 'organization', 'person'
  
  -- Search key (normalized)
  search_key VARCHAR(255) NOT NULL,
  
  -- Resolved QID
  qid VARCHAR(20) NOT NULL,
  
  -- How was this resolved?
  source VARCHAR(20) NOT NULL, -- 'local_mapping', 'sparql', 'manual'
  
  -- Metadata
  query_count INTEGER DEFAULT 1, -- How many times queried
  last_queried_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE(entity_type, search_key)
);

-- Index for fast lookups
CREATE INDEX idx_qid_cache_lookup ON qid_cache(entity_type, search_key);

-- Index for analytics
CREATE INDEX idx_qid_cache_popular ON qid_cache(query_count DESC);

-- Index for maintenance (find old entries)
CREATE INDEX idx_qid_cache_validated ON qid_cache(validated_at);
```

### Drizzle Schema: `lib/db/schema.ts`

```typescript
export const qidCache = pgTable('qid_cache', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  searchKey: varchar('search_key', { length: 255 }).notNull(),
  qid: varchar('qid', { length: 20 }).notNull(),
  source: varchar('source', { length: 20 }).notNull(),
  queryCount: integer('query_count').default(1),
  lastQueriedAt: timestamp('last_queried_at').defaultNow(),
  validatedAt: timestamp('validated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Unique constraint
export const qidCacheUniqueConstraint = unique('qid_cache_unique')
  .on(qidCache.entityType, qidCache.searchKey);
```

---

## 🔧 Implementation

### Enhanced SPARQL Service with Database Cache

```typescript
import { db } from '@/lib/db/drizzle';
import { qidCache } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export class WikidataSPARQLService {
  private memoryCache: Map<string, string> = new Map();
  
  /**
   * Get cached QID from database
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
        // Update query count and last queried timestamp
        await db
          .update(qidCache)
          .set({
            queryCount: db.raw('query_count + 1'),
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
   * Save QID to database cache
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
            queryCount: db.raw('qid_cache.query_count + 1'),
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
   * Hybrid city QID lookup
   */
  async findCityQID(city: string, state?: string): Promise<string | null> {
    const key = this.normalizeKey(`${city}, ${state}`);
    
    // L1: Memory cache (< 1ms)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }
    
    // L2: Database cache (5-20ms)
    const dbResult = await this.getCachedQID('city', key);
    if (dbResult) {
      this.memoryCache.set(key, dbResult);
      return dbResult;
    }
    
    // L3: Local mapping (< 1ms)
    if (US_CITY_QIDS[key]) {
      const qid = US_CITY_QIDS[key];
      await this.setCachedQID('city', key, qid, 'local_mapping');
      this.memoryCache.set(key, qid);
      return qid;
    }
    
    // L4: SPARQL lookup (200-500ms)
    const qid = await this.sparqlCityLookup(city, 'Q30');
    if (qid) {
      await this.setCachedQID('city', key, qid, 'sparql');
      this.memoryCache.set(key, qid);
    }
    
    return qid;
  }
}
```

---

## 📈 Cache Performance

### Cold Start (Empty Cache)
```
Query: "Providence, RI"
L1 Memory: MISS
L2 Database: MISS
L3 Local Mapping: HIT → Q18383 (< 1ms)
L2 Database: WRITE → cached for future
L1 Memory: WRITE → instant next time
```

### Warm Cache (After First Query)
```
Query: "Providence, RI"
L1 Memory: HIT → Q18383 (< 1ms) ✅
(No database query needed)
```

### After Server Restart (Memory Cache Lost)
```
Query: "Providence, RI"
L1 Memory: MISS (cleared on restart)
L2 Database: HIT → Q18383 (5-20ms) ✅
L1 Memory: WRITE → instant for rest of session
```

### Rare Entity (Not in Local Mapping)
```
Query: "Pawtucket, RI"
L1 Memory: MISS
L2 Database: MISS
L3 Local Mapping: MISS
L4 SPARQL: QUERY → Q54246 (300ms first time)
L2 Database: WRITE → cached forever
L1 Memory: WRITE → instant next time

Next Query: "Pawtucket, RI"
L1 Memory: HIT → Q54246 (< 1ms) ✅
```

---

## 🧹 Cache Maintenance

### Revalidation Strategy

```typescript
/**
 * Revalidate old QID cache entries
 * Run as a cron job: daily or weekly
 */
async function revalidateQIDCache() {
  // Find entries not validated in 90+ days
  const oldEntries = await db
    .select()
    .from(qidCache)
    .where(
      lt(qidCache.validatedAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    )
    .limit(100);
  
  for (const entry of oldEntries) {
    // Re-query SPARQL to ensure QID still exists
    const stillValid = await sparqlService.validateQID(entry.qid);
    
    if (stillValid) {
      await db
        .update(qidCache)
        .set({ validatedAt: new Date() })
        .where(eq(qidCache.id, entry.id));
      
      console.log(`✓ Revalidated: ${entry.searchKey} → ${entry.qid}`);
    } else {
      // QID no longer exists (rare), remove from cache
      await db.delete(qidCache).where(eq(qidCache.id, entry.id));
      console.warn(`✗ Removed invalid: ${entry.searchKey} → ${entry.qid}`);
    }
  }
}
```

### Analytics Queries

```typescript
// Most popular searches (consider adding to local mappings)
const popular = await db
  .select()
  .from(qidCache)
  .orderBy(desc(qidCache.queryCount))
  .limit(50);

// SPARQL-resolved entities (learned over time)
const learned = await db
  .select()
  .from(qidCache)
  .where(eq(qidCache.source, 'sparql'))
  .orderBy(desc(qidCache.queryCount));

// Cache hit rate
const total = await db.select({ count: count() }).from(qidCache);
const sparqlResolved = await db
  .select({ count: count() })
  .from(qidCache)
  .where(eq(qidCache.source, 'sparql'));

console.log(`Cache entries: ${total[0].count}`);
console.log(`SPARQL-learned: ${sparqlResolved[0].count}`);
console.log(`Local mappings: ${total[0].count - sparqlResolved[0].count}`);
```

---

## 🎯 Recommended Approach

### **Hybrid Cache (L1 + L2)**

**Implementation Priority:**
1. ✅ **Start with runtime cache** (simple, immediate benefit)
2. ✅ **Add database cache** (migration + schema)
3. ✅ **Implement hybrid lookup** (best performance)
4. ⏳ **Add revalidation cron** (maintenance)

**Cache Lifetime:**
- **Memory (L1):** Process lifetime (~1-7 days in production)
- **Database (L2):** **Indefinite** with 90-day revalidation

**Benefits:**
- ✅ Instant lookups after first query
- ✅ Survives deployments and restarts
- ✅ Learns over time (every SPARQL result cached)
- ✅ Analytics on most-queried entities
- ✅ Manual override capability

**Cost:**
- Database storage: ~1KB per cached QID
- 10,000 cached QIDs = ~10MB database space
- Negligible cost

---

## 📊 Expected Cache Growth

### Month 1 (New System)
- Local mappings: 670 entries (pre-populated)
- SPARQL-learned: ~50 entries (rare entities)
- **Total: ~720 cached QIDs**

### Month 6 (Mature System)
- Local mappings: 670 entries
- SPARQL-learned: ~500 entries (learned over time)
- **Total: ~1,170 cached QIDs**

### Month 12 (Fully Learned)
- Local mappings: 670 entries
- SPARQL-learned: ~1,000+ entries
- **Total: ~1,670+ cached QIDs**

**Result:** System gets smarter over time, fewer SPARQL queries needed.

---

## ✅ Summary

**Question:** How long does it cache new QIDs found by SPARQL?

**Answer:** 

| Cache Type | Lifetime | Performance |
|------------|----------|-------------|
| **Memory (L1)** | Process lifetime (1-7 days) | < 1ms ⚡ |
| **Database (L2)** | **Indefinite** (with 90-day revalidation) | 5-20ms 🔄 |
| **Combined** | Best of both | < 1ms warm, 5-20ms cold ✅ |

**Recommendation:** Use **Hybrid Cache** for optimal performance and persistence.

