# Test Database Strategy - Ground Truth

**Date:** January 2025  
**Purpose:** Clarify database ground truth and test strategy

---

## 🎯 Ground Truth for Data Storage

### **The Stack:**

```
┌─────────────────────────────────────────────────────────┐
│                    GROUND TRUTH                          │
│                                                          │
│  PostgreSQL (The Actual Database)                      │
│  ↓                                                       │
│  Hosted on: Supabase (Managed PostgreSQL Service)       │
│  ↓                                                       │
│  Accessed via: Drizzle ORM (Abstraction Layer)         │
│  ↓                                                       │
│  Used by: Next.js API Routes & Server Components       │
└─────────────────────────────────────────────────────────┘
```

### **Key Points:**

1. **PostgreSQL** = The actual database (ground truth)
   - This is the real data storage system
   - Stores all tables: `users`, `businesses`, `llmFingerprints`, etc.
   - Uses SQL as the query language

2. **Supabase** = The hosting provider
   - Provides managed PostgreSQL database
   - Handles backups, scaling, connection pooling
   - Connection string: `postgresql://...@pooler.supabase.com:6543/postgres`
   - **Not** the database itself, just the hosting service

3. **Drizzle ORM** = The abstraction layer
   - Type-safe query builder
   - Maps TypeScript types to SQL
   - Used in both production and tests
   - **This is what you import and use in code**

---

## 📊 Current Test Strategy

### **What Tests Currently Do:**

```typescript
// All integration tests use this pattern:
import { db } from '@/lib/db/drizzle';
import { businesses, users } from '@/lib/db/schema';

describe('Integration Test', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(businesses);
    await db.delete(users);
    
    // Create test data
    await db.insert(users).values({ ... });
  });
});
```

### **Current Approach:**
- ✅ Uses **Drizzle ORM** (same as production)
- ✅ Connects to **PostgreSQL** (via `POSTGRES_URL`)
- ⚠️ Uses **same database** as production (or dev)
- ⚠️ Cleans up data in `beforeEach`

### **Issues with Current Approach:**
1. **Data Pollution**: Tests write to real database
2. **Slow**: Network calls to Supabase
3. **Fragile**: Tests fail if database is unavailable
4. **Not Isolated**: Tests can interfere with each other

---

## ✅ Recommended Test Strategy

### **Option 1: Separate Test Database (Recommended)**

Use a separate PostgreSQL database for tests:

```typescript
// lib/db/test-drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const testDatabaseUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL;

export const testDb = drizzle(postgres(testDatabaseUrl), { schema });
```

**Benefits:**
- ✅ Isolated from production data
- ✅ Can run tests in parallel
- ✅ Can use faster test database
- ✅ Same Drizzle ORM (consistent with production)

**Setup:**
1. Create separate Supabase project for tests
2. Set `TEST_POSTGRES_URL` environment variable
3. Use `testDb` in tests instead of `db`

---

### **Option 2: In-Memory Database (For Unit Tests)**

Use an in-memory database for fast unit tests:

```typescript
// For unit tests only (not integration tests)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(':memory:');
export const testDb = drizzle(sqlite, { schema });
```

**Benefits:**
- ✅ Very fast (no network calls)
- ✅ Completely isolated
- ✅ No cleanup needed

**Drawbacks:**
- ⚠️ Different database engine (SQLite vs PostgreSQL)
- ⚠️ Some PostgreSQL features won't work
- ⚠️ Not suitable for integration tests

---

### **Option 3: Docker PostgreSQL (For CI/CD)**

Use Docker to spin up PostgreSQL for tests:

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

**Benefits:**
- ✅ True PostgreSQL (same as production)
- ✅ Isolated per test run
- ✅ Works in CI/CD

---

## 🎯 Recommended Approach for This Project

### **For Integration Tests:**

**Use Drizzle ORM + Separate Test Database**

```typescript
// tests/utils/test-db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

// Use test database URL, fallback to regular for local dev
const testDbUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL;

if (!testDbUrl) {
  throw new Error('TEST_POSTGRES_URL or POSTGRES_URL must be set');
}

export const testDb = drizzle(postgres(testDbUrl), { schema });
```

**Why:**
- ✅ Same Drizzle ORM as production (consistent)
- ✅ Same PostgreSQL engine (true integration test)
- ✅ Isolated from production data
- ✅ Can use Supabase test project or separate database

---

### **For Unit Tests:**

**Mock Drizzle ORM or use in-memory SQLite**

```typescript
// Unit tests don't need real database
// Mock the database calls instead
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));
```

---

## 📝 Summary

### **Ground Truth:**
- **PostgreSQL** = The actual database (ground truth)
- **Supabase** = Hosting provider (managed PostgreSQL)
- **Drizzle ORM** = Abstraction layer (what you use in code)

### **For Tests:**
- ✅ **Use Drizzle ORM** (same as production)
- ✅ **Use PostgreSQL** (same engine as production)
- ✅ **Use separate test database** (isolated from production)
- ❌ **Don't use Supabase directly** (it's just hosting)
- ❌ **Don't use production database** (data pollution)

### **Best Practice:**
1. **Integration Tests**: Drizzle ORM + Separate PostgreSQL test database
2. **Unit Tests**: Mock Drizzle ORM or use in-memory SQLite
3. **E2E Tests**: Use test database or Docker PostgreSQL

---

## 🔧 Implementation

### **Step 1: Create Test Database Helper**

```typescript
// tests/utils/test-db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

const testDbUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL;

if (!testDbUrl) {
  throw new Error('TEST_POSTGRES_URL or POSTGRES_URL must be set for tests');
}

export const testDb = drizzle(postgres(testDbUrl), { schema });
```

### **Step 2: Update Integration Tests**

```typescript
// tests/integration/competitive-leaderboard-integration.test.ts
import { testDb } from '@/tests/utils/test-db';
import { businesses, users } from '@/lib/db/schema';

describe('Integration Test', () => {
  beforeEach(async () => {
    await testDb.delete(businesses);
    await testDb.delete(users);
  });
});
```

### **Step 3: Set Environment Variable**

```bash
# .env.test
TEST_POSTGRES_URL=postgresql://user:pass@test-db.example.com:5432/test_db
```

---

## ✅ Conclusion

**Ground Truth:**
- **PostgreSQL** is the database (ground truth)
- **Drizzle ORM** is how you access it (abstraction)
- **Supabase** is where it's hosted (infrastructure)

**For Tests:**
- Use **Drizzle ORM** (same as production)
- Use **PostgreSQL** (same engine)
- Use **separate test database** (isolation)

This ensures tests are:
- ✅ Consistent with production
- ✅ Isolated from production data
- ✅ Fast and reliable


