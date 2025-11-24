# Database Module (`lib/db/`)

**Purpose**: Database schema, queries, and data access layer using Drizzle ORM  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `db/` module provides the database layer using Drizzle ORM. It includes schema definitions, query functions, migrations, and database setup utilities. All database operations are type-safe and follow SOLID principles.

### Architecture Principles

1. **Type Safety**: Full TypeScript coverage with Drizzle ORM
2. **Schema-First**: Database schema defined in TypeScript
3. **Migration-Based**: Version-controlled database changes
4. **Query Separation**: Business logic separate from queries
5. **Transaction Support**: Safe multi-step operations

---

## 🏗️ Module Structure

```
lib/db/
├── schema.ts            # Database schema definitions
├── drizzle.ts          # Drizzle client setup
├── queries.ts          # Database query functions
├── setup.ts            # Database setup utilities
├── seed.ts             # Database seeding
├── kgaas-integration.ts # KGAAS-specific queries
├── kgaas-queries.ts    # KGAAS query helpers
└── migrations/        # Database migration files
    ├── 0000_*.sql
    ├── 0001_*.sql
    └── meta/
```

---

## 🔑 Core Components

### 1. Database Schema (`schema.ts`)

**Purpose**: TypeScript definitions for all database tables

**Key Tables:**

```typescript
// Users and Teams
users              // User accounts
teams              // Team/organization accounts
teamMembers        // User-team relationships

// Businesses
businesses         // Business entities
crawlJobs          // Crawl job tracking
llmFingerprints    // LLM analysis results
wikidataEntities   // Wikidata publishing data

// Activity and Analytics
activityLogs       // Activity feed
competitors        // Competitive analysis data
```

**Usage:**

```typescript
import { businesses, users, teams } from '@/lib/db/schema';

// Type-safe table references
const business = await db
  .select()
  .from(businesses)
  .where(eq(businesses.id, businessId))
  .limit(1);
```

---

### 2. Database Queries (`queries.ts`)

**Purpose**: Reusable query functions for common operations

**Key Functions:**

```typescript
// User queries
export async function getUser(): Promise<User | null>
export async function getUserByEmail(email: string): Promise<User | null>

// Team queries
export async function getTeamForUser(userId: number): Promise<TeamDataWithMembers | null>
export async function getTeamById(teamId: number): Promise<Team | null>

// Business queries
export async function getBusinessById(id: number): Promise<Business | null>
export async function getBusinessesByTeam(teamId: number): Promise<Business[]>
export async function createBusiness(data: NewBusiness): Promise<Business>

// Crawl job queries
export async function createCrawlJob(data: NewCrawlJob): Promise<CrawlJob>
export async function getCrawlJob(businessId: number): Promise<CrawlJob | null>
export async function updateCrawlJob(id: number, data: Partial<CrawlJob>): Promise<CrawlJob>

// Fingerprint queries
export async function createFingerprint(data: NewLLMFingerprint): Promise<LLMFingerprint>
export async function getFingerprintByBusinessId(businessId: number): Promise<LLMFingerprint | null>

// Wikidata queries
export async function createWikidataEntity(data: NewWikidataEntity): Promise<WikidataEntity>
export async function getWikidataEntityByBusinessId(businessId: number): Promise<WikidataEntity | null>
```

**Usage:**

```typescript
import { getBusinessById, createBusiness } from '@/lib/db/queries';

// Get business
const business = await getBusinessById(1);

// Create business
const newBusiness = await createBusiness({
  name: 'Test Business',
  url: 'https://example.com',
  teamId: 1,
});
```

---

### 3. Drizzle Client (`drizzle.ts`)

**Purpose**: Database connection and client setup

**Usage:**

```typescript
import { db } from '@/lib/db/drizzle';

// Direct query
const result = await db
  .select()
  .from(businesses)
  .where(eq(businesses.id, 1));
```

---

### 4. Database Migrations (`migrations/`)

**Purpose**: Version-controlled database schema changes

**Migration Files:**

```
migrations/
├── 0000_soft_the_anarchist.sql    # Initial schema
├── 0001_flawless_logan.sql       # Add fields
├── 0002_lush_masked_marvel.sql   # Add tables
├── 0003_add_qid_cache.sql        # Add QID cache
├── 0004_add_fingerprint_fields.sql
├── 0005_add_automation_fields.sql
├── 0006_enhance_crawl_jobs_for_firecrawl.sql
└── meta/                         # Migration metadata
```

**Running Migrations:**

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit push

# Or use Drizzle Studio
pnpm drizzle-studio
```

---

## 🔄 Query Patterns

### 1. Simple Select

```typescript
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const business = await db
  .select()
  .from(businesses)
  .where(eq(businesses.id, businessId))
  .limit(1);
```

### 2. Select with Relations

```typescript
import { businesses, llmFingerprints } from '@/lib/db/schema';
import { eq, leftJoin } from 'drizzle-orm';

const result = await db
  .select()
  .from(businesses)
  .leftJoin(llmFingerprints, eq(businesses.id, llmFingerprints.businessId))
  .where(eq(businesses.id, businessId));
```

### 3. Insert

```typescript
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';

const [newBusiness] = await db
  .insert(businesses)
  .values({
    name: 'Test Business',
    url: 'https://example.com',
    teamId: 1,
  })
  .returning();
```

### 4. Update

```typescript
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const [updated] = await db
  .update(businesses)
  .set({ status: 'crawled' })
  .where(eq(businesses.id, businessId))
  .returning();
```

### 5. Transactions

```typescript
import { db } from '@/lib/db/drizzle';

await db.transaction(async (tx) => {
  // Create business
  const [business] = await tx
    .insert(businesses)
    .values({ name: 'Test', teamId: 1 })
    .returning();
  
  // Create crawl job
  await tx
    .insert(crawlJobs)
    .values({ businessId: business.id, status: 'pending' });
  
  // If any operation fails, all are rolled back
});
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Business Queries
 * 
 * As a system
 * I want to query businesses from the database
 * So that I can retrieve business data
 * 
 * Acceptance Criteria:
 * - getBusinessById returns business when exists
 * - getBusinessById returns null when not exists
 * - createBusiness creates business with correct data
 */
describe('Business Queries - Specification', () => {
  it('retrieves business by ID', async () => {
    // SPECIFICATION: Given a business exists
    const business = await createBusiness({
      name: 'Test Business',
      url: 'https://example.com',
      teamId: 1,
    });
    
    // SPECIFICATION: When querying by ID
    const found = await getBusinessById(business.id);
    
    // SPECIFICATION: Then business should be found
    expect(found).toBeDefined();
    expect(found?.id).toBe(business.id);
    expect(found?.name).toBe('Test Business');
  });
  
  it('returns null when business does not exist', async () => {
    // SPECIFICATION: When querying non-existent ID
    const found = await getBusinessById(99999);
    
    // SPECIFICATION: Then should return null
    expect(found).toBeNull();
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/db/__tests__/queries.test.ts

# With coverage
pnpm test:coverage lib/db/
```

---

## 🔧 Database Setup

### Environment Variables

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://postgres:password@localhost:5432/saas_starter`

### Database Connection

The database connection is configured in `drizzle.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

---

## 📊 Schema Design Principles

### 1. Soft Deletes

Many tables use `deletedAt` for soft deletes:

```typescript
deletedAt: timestamp('deleted_at'),
```

**Query Pattern:**

```typescript
import { isNull } from 'drizzle-orm';

.where(and(eq(users.id, userId), isNull(users.deletedAt)))
```

### 2. Timestamps

Standard timestamps on all tables:

```typescript
createdAt: timestamp('created_at').defaultNow().notNull(),
updatedAt: timestamp('updated_at').defaultNow().notNull(),
```

### 3. Foreign Keys

Type-safe foreign key relationships:

```typescript
businessId: integer('business_id')
  .references(() => businesses.id)
  .notNull(),
```

### 4. Enums

Type-safe enums for status fields:

```typescript
status: text('status', { enum: ['pending', 'crawling', 'crawled', 'published'] })
  .notNull()
  .default('pending'),
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Drizzle ORM Docs**: https://orm.drizzle.team
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Type Safety**: Full TypeScript coverage with Drizzle ORM
2. **Schema-First**: Database schema defined in TypeScript
3. **Migration-Based**: Version-controlled database changes
4. **Query Separation**: Business logic separate from queries
5. **Transaction Support**: Safe multi-step operations
6. **TDD Development**: Write tests first as specifications
7. **SOLID Principles**: Single responsibility, clear separation

---

## ⚠️ Important Notes

### Database Migrations

- **Never edit existing migrations**: Create new migrations for changes
- **Test migrations**: Always test migrations in development first
- **Backup production**: Backup database before running migrations in production

### Query Performance

- **Use indexes**: Add indexes for frequently queried columns
- **Avoid N+1 queries**: Use joins or batch queries
- **Monitor slow queries**: Use database monitoring tools

### Type Safety

- **Always use typed queries**: Use Drizzle's type-safe query API
- **Validate inputs**: Use Zod schemas for input validation
- **Handle nulls**: Always check for null/undefined results

---

**Remember**: The database layer is the foundation of the application. Write tests first, use transactions for multi-step operations, and always validate data.

