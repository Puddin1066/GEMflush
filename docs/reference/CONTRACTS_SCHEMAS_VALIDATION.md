# GEMflush Contracts, Schemas, and Validation Strategy

**Last Updated:** December 2024  
**Purpose:** Comprehensive reference for all contracts, schemas, and validation files with responsibilities, relationships, and usage patterns

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Database Schemas](#database-schemas)
3. [Type Contracts](#type-contracts)
4. [Service Contracts](#service-contracts)
5. [Validation Schemas](#validation-schemas)
6. [Validation Strategy](#validation-strategy)
7. [Contract-Schema-Validation Relationships](#contract-schema-validation-relationships)
8. [Usage Patterns](#usage-patterns)
9. [Compliance Checklist](#compliance-checklist)

---

## Overview & Architecture

### Three-Layer Validation Architecture

GEMflush uses a three-layer validation architecture for type safety, data integrity, and runtime validation:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Type Contracts (Compile-Time)                      │
│ lib/types/ - TypeScript interfaces & types                  │
│ - WikidataEntityDataContract, CrawledData, etc.            │
│ - Provides compile-time type checking                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Database Schemas (Schema Validation)               │
│ lib/db/schema.ts - Drizzle ORM table definitions            │
│ - Enforces database structure & constraints                 │
│ - Provides type inference ($inferSelect, $inferInsert)     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Validation Schemas (Runtime Validation)            │
│ lib/validation/ - Zod schemas                               │
│ - Runtime validation at API boundaries                      │
│ - Input sanitization & error messages                       │
└─────────────────────────────────────────────────────────────┘
```

### Validation Flow

```
User Input (API Request)
    ↓
[1] Zod Validation (lib/validation/*.ts)
    - Validates structure, types, constraints
    - Returns sanitized data or errors
    ↓ (if valid)
[2] Type Contract (lib/types/*.ts)
    - Ensures TypeScript type compatibility
    - Compile-time type checking
    ↓
[3] Database Schema (lib/db/schema.ts)
    - Validates against database structure
    - Enforces foreign keys, constraints
    ↓
Business Logic Processing
    ↓
Database Storage / External API Calls
```

---

## Database Schemas

Database table definitions using Drizzle ORM. All schemas are in `lib/db/schema.ts`.

### Core Platform Tables

| Schema | Table Name | Purpose | Key Fields | Relationships |
|--------|-----------|---------|------------|---------------|
| **users** | `users` | User accounts and authentication | `id`, `email`, `passwordHash`, `role` | → `teamMembers` (many) |
| **teams** | `teams` | Team/organization for multi-user access | `id`, `name`, `stripeCustomerId`, `planName`, `subscriptionStatus` | → `teamMembers` (many), → `businesses` (many) |
| **teamMembers** | `team_members` | User-team associations | `userId`, `teamId`, `role` | → `users` (one), → `teams` (one) |
| **activityLogs** | `activity_logs` | Audit trail for user actions | `teamId`, `userId`, `action`, `timestamp` | → `teams` (one), → `users` (one) |
| **invitations** | `invitations` | Team invitation system | `teamId`, `email`, `role`, `status` | → `teams` (one), → `users` (one - invitedBy) |

### GEMflush Business Tables

| Schema | Table Name | Purpose | Key Fields | Relationships |
|--------|-----------|---------|------------|---------------|
| **businesses** | `businesses` | Core business entities (CFP workflow) | `id`, `teamId`, `name`, `url`, `category`, `location` (jsonb), `status`, `crawlData` (jsonb), `wikidataQID`, `automationEnabled` | → `teams` (one), → `llmFingerprints` (many), → `wikidataEntities` (many), → `crawlJobs` (many) |
| **wikidataEntities** | `wikidata_entities` | Published Wikidata entities | `id`, `businessId`, `qid`, `entityData` (jsonb), `publishedTo`, `version`, `enrichmentLevel` | → `businesses` (one) |
| **llmFingerprints** | `llm_fingerprints` | LLM visibility analysis results | `id`, `businessId`, `visibilityScore`, `mentionRate`, `sentimentScore`, `llmResults` (jsonb), `competitiveLeaderboard` (jsonb) | → `businesses` (one) |
| **crawlJobs** | `crawl_jobs` | Crawl job tracking and status | `id`, `businessId`, `jobType`, `status`, `progress`, `result` (jsonb), `errorMessage` | → `businesses` (one) |
| **competitors** | `competitors` | Competitive intelligence relationships | `id`, `businessId`, `competitorBusinessId`, `competitorName`, `addedBy` | → `businesses` (one - business), → `businesses` (one - competitor) |
| **qidCache** | `qid_cache` | Persistent Wikidata QID resolution cache | `id`, `entityType`, `searchKey`, `qid`, `source`, `queryCount` | None (standalone cache) |

### Schema Responsibilities

| Schema | Validates | Enforces | Provides Types |
|--------|-----------|----------|----------------|
| **businesses** | Business data structure, JSONB fields | Foreign key to teams, status enum, URL format | `Business`, `NewBusiness` |
| **wikidataEntities** | Entity JSON structure (via jsonb), QID format | Foreign key to businesses, unique QID | `WikidataEntity`, `NewWikidataEntity` |
| **llmFingerprints** | Fingerprint metrics, JSONB result data | Foreign key to businesses, score ranges | `LLMFingerprint`, `NewLLMFingerprint` |
| **crawlJobs** | Job status, progress, result JSON | Foreign key to businesses, status enum | `CrawlJob`, `NewCrawlJob` |
| **qidCache** | Cache key uniqueness, QID format | Unique (entityType, searchKey) constraint | `QidCache`, `NewQidCache` |

### JSONB Field Validation

Database schemas use `jsonb` for flexible nested data. These fields are validated by Zod schemas before storage:

| Schema | JSONB Field | Validated By | Purpose |
|--------|-------------|--------------|---------|
| **businesses** | `location` | `businessLocationSchema` (Zod) | Business location (city, state, country, coordinates) |
| **businesses** | `crawlData` | `crawledDataSchema` (Zod) | Complete crawl result structure |
| **wikidataEntities** | `entityData` | `wikidataEntityDataSchema` (Zod) | Complete Wikidata entity JSON |
| **llmFingerprints** | `llmResults` | Type inference from `FingerprintAnalysis` | LLM query results array |
| **llmFingerprints** | `competitiveLeaderboard` | Type inference from `FingerprintAnalysis` | Competitive benchmark data |

---

## Type Contracts

TypeScript interfaces and types for compile-time type safety. Located in `lib/types/`.

### Domain Type Contracts

| Contract File | Key Types | Purpose | Used By |
|---------------|-----------|---------|---------|
| **gemflush.ts** | `CrawledData`, `CrawlResult`, `FingerprintAnalysis`, `LLMResult`, `BusinessLocation` | Core domain types for CFP workflow | Crawler, Fingerprinter, Services |
| **wikidata-contract.ts** | `WikidataEntityDataContract`, `WikidataClaim`, `WikidataSnak`, `WikidataReference`, `NotabilityAssessment` | Strict Wikidata entity structure (matches Wikibase spec) | Entity Builder, Publisher |
| **service-contracts.ts** | `IWebCrawler`, `ILLMFingerprinter`, `IWikidataEntityBuilder`, `IWikidataPublisher`, `IPaymentService` | Service interface contracts | Service implementations |

### Wikidata Contract Types

| Type | Purpose | Based On | Example |
|------|---------|----------|---------|
| **WikidataEntityDataContract** | Complete entity structure for publishing | Wikibase JSON Specification | `{ labels: {...}, descriptions: {...}, claims: {...} }` |
| **WikidataClaim** | Statement about an entity | Wikibase Data Model | `{ mainsnak: {...}, type: 'statement', references: [...] }` |
| **WikidataSnak** | Property-value pair | Wikibase Data Model | `{ snaktype: 'value', property: 'P31', datavalue: {...} }` |
| **WikidataDatavalue** | Discriminated union for value types | Wikibase Data Model | `{ type: 'wikibase-entityid', value: { id: 'Q123' } }` |
| **WikidataReference** | Source for claim | Wikibase Data Model | `{ snaks: { 'P854': [...] } }` |
| **NotabilityAssessment** | Notability verification result | Internal contract | `{ isNotable: boolean, confidence: number, recommendation: string }` |

### Domain Type Contracts

| Type | Purpose | Key Fields | Usage |
|------|---------|------------|-------|
| **CrawledData** | Web crawl extraction result | `name`, `description`, `location`, `socialLinks`, `businessDetails`, `llmEnhanced` | Crawler output, stored in `businesses.crawlData` |
| **FingerprintAnalysis** | LLM visibility analysis result | `visibilityScore`, `mentionRate`, `llmResults[]`, `competitiveLeaderboard` | Fingerprinter output, stored in `llm_fingerprints` |
| **CrawlResult** | Crawler API response | `success`, `data?`, `error?`, `url`, `crawledAt` | Crawler service return type |
| **BusinessLocation** | Business geographic location | `city`, `state`, `country`, `coordinates?` | Stored in `businesses.location` (jsonb) |

### Service Contract Interfaces

| Interface | Implementation | Methods | Purpose |
|-----------|---------------|---------|---------|
| **IWebCrawler** | `lib/crawler/index.ts` | `crawl(url: string): Promise<CrawlResult>` | Web crawling service contract |
| **ILLMFingerprinter** | `lib/llm/fingerprinter.ts` | `fingerprint(business: Business): Promise<FingerprintAnalysis>` | LLM fingerprinting service contract |
| **IWikidataEntityBuilder** | `lib/wikidata/entity-builder.ts` | `buildEntity(...): WikidataEntityDataContract`, `validateEntity(...): boolean` | Entity construction contract |
| **IWikidataPublisher** | `lib/wikidata/publisher.ts` | `publish(entity: WikidataEntityDataContract, target: 'test'\|'production'): Promise<WikidataPublishResult>` | Wikidata publishing contract |
| **IOpenRouterClient** | `lib/llm/openrouter.ts` | `query(model: string, prompt: string): Promise<{content, tokensUsed, model}>` | OpenRouter API client contract |
| **IPaymentService** | `lib/payments/stripe.ts` | `createCheckoutSession(...)`, `handleSubscriptionChange(...)`, etc. | Stripe payment service contract |
| **IManualPublishStorage** | `lib/wikidata/manual-publish-storage.ts` | `storeEntityForManualPublish(...)`, `listStoredEntities()`, etc. | Manual publish storage contract |

### Contract Compliance

| Contract | Implementation Status | Validation | Tests |
|----------|----------------------|------------|-------|
| **IWebCrawler** | ✅ Fully implemented | Runtime (service behavior) | `lib/crawler/__tests__/index.test.ts` |
| **ILLMFingerprinter** | ✅ Fully implemented | Runtime (service behavior) | `lib/llm/__tests__/fingerprinter.test.ts` |
| **IWikidataEntityBuilder** | ✅ Fully implemented | Zod schema + runtime checks | `lib/wikidata/__tests__/entity-builder.test.ts` |
| **IWikidataPublisher** | ✅ Fully implemented | Zod schema + API validation | `lib/wikidata/__tests__/publisher.test.ts` |
| **IOpenRouterClient** | ✅ Fully implemented | Runtime (API response format) | `lib/llm/__tests__/openrouter.test.ts` |
| **IPaymentService** | ✅ Fully implemented | Stripe SDK types | `lib/payments/__tests__/stripe.test.ts` |

---

## Validation Schemas

Zod runtime validation schemas. Located in `lib/validation/`.

### Input Validation Schemas

| Schema File | Schemas Defined | Purpose | Used In |
|-------------|-----------------|---------|---------|
| **business.ts** | `createBusinessSchema`, `createBusinessFromUrlSchema`, `updateBusinessSchema`, `businessLocationSchema`, `businessCategorySchema`, `crawlRequestSchema`, `fingerprintRequestSchema`, `wikidataPublishRequestSchema` | API request validation for business operations | `POST /api/business`, `PUT /api/business/[id]`, `POST /api/crawl`, `POST /api/fingerprint`, `POST /api/wikidata/publish` |
| **crawl.ts** | `crawledDataSchema`, `socialLinksSchema`, `businessDetailsSchema`, `llmEnhancedSchema`, `validateCrawledData()`, `assertCrawledData()` | Crawl data structure validation before storage | `lib/services/business-processing.ts` (executeCrawlJob), `lib/crawler/index.ts` |
| **wikidata.ts** | `wikidataEntityDataSchema`, `wikidataClaimSchema`, `wikidataSnakSchema`, `wikidataReferenceSchema`, `validateWikidataEntity()`, `assertWikidataEntity()`, `notabilityAssessmentSchema`, `storedEntityMetadataSchema` | Wikidata entity validation (matches Wikibase JSON spec) | `lib/wikidata/publisher.ts`, `lib/wikidata/entity-builder.ts`, `lib/wikidata/manual-publish-storage.ts` |

### Validation Schema Responsibilities

#### Business Validation (`lib/validation/business.ts`)

| Schema | Validates | Constraints | Example |
|--------|-----------|-------------|---------|
| **createBusinessSchema** | New business creation | Name: 2-200 chars, valid URL, required location | `{ name: "Acme Corp", url: "https://acme.com", location: {...} }` |
| **createBusinessFromUrlSchema** | URL-only business creation | URL required, all else optional (frictionless onboarding) | `{ url: "https://acme.com" }` |
| **businessLocationSchema** | Business location data | City/state/country required, lat/lng optional with ranges | `{ city: "SF", state: "CA", country: "US", lat: 37.7, lng: -122.4 }` |
| **businessCategorySchema** | Business category enum | One of 13 predefined categories | `"restaurant"`, `"technology"`, `"healthcare"` |
| **crawlRequestSchema** | Crawl API request | businessId: positive integer, forceRecrawl: optional boolean | `{ businessId: 1, forceRecrawl: false }` |
| **fingerprintRequestSchema** | Fingerprint API request | businessId: positive integer, includeCompetitors: optional boolean | `{ businessId: 1, includeCompetitors: true }` |
| **wikidataPublishRequestSchema** | Publish API request | businessId: positive integer, publishToProduction: optional boolean | `{ businessId: 1, publishToProduction: false }` |

#### Crawl Data Validation (`lib/validation/crawl.ts`)

| Schema | Validates | Constraints | Stored In |
|--------|-----------|-------------|-----------|
| **crawledDataSchema** | Complete crawl result structure | All fields optional (crawl may not extract all), nullish values allowed for LLM fields | `businesses.crawlData` (jsonb) |
| **socialLinksSchema** | Social media URLs | Valid URL format for each platform | `CrawledData.socialLinks` |
| **businessDetailsSchema** | Rich business information | Nullish values (LLM returns null), proper types for employeeCount, dates | `CrawledData.businessDetails` |
| **llmEnhancedSchema** | LLM-enhanced extraction | Confidence: 0-1, processedAt: Date or ISO string | `CrawledData.llmEnhanced` |

**Validation Function:**
- `validateCrawledData(data: unknown): { success: boolean; errors?: ZodError }` - Safe validation, returns result
- `assertCrawledData(data: unknown): asserts data is CrawledData` - Fail-fast validation, throws on error

#### Wikidata Validation (`lib/validation/wikidata.ts`)

| Schema | Validates | Constraints | Based On |
|--------|-----------|-------------|----------|
| **wikidataEntityDataSchema** | Complete Wikidata entity | Labels: 1+ required, Claims: 1+ required, Property IDs: P### format | Wikibase JSON Specification |
| **wikidataClaimSchema** | Claim structure | mainsnak required, type: 'statement'\|'claim', rank optional | Wikibase Data Model |
| **wikidataSnakSchema** | Snak structure | snaktype: 'value'\|'novalue'\|'somevalue', property: P### format, datavalue required if 'value' | Wikibase Data Model |
| **wikidataReferenceSchema** | Reference structure | snaks object with P### keys, array of snaks as values | Wikibase Data Model |
| **wikidataLabelSchema** | Label structure | language: 2-10 chars, value: 1-400 chars | Wikibase JSON Spec |
| **wikidataDescriptionSchema** | Description structure | language: 2-10 chars, value: 1-250 chars | Wikibase JSON Spec |
| **wikidataDatavalueSchema** | Datavalue structure | type enum, value depends on type (discriminated union) | Wikibase Data Model |
| **notabilityAssessmentSchema** | Notability result | isNotable: boolean, confidence: 0-1, recommendation: string | Internal contract |
| **storedEntityMetadataSchema** | Stored entity metadata | File naming patterns, ISO timestamps, businessId validation | Internal contract |

**Validation Functions:**
- `validateWikidataEntity(entity: unknown): { success: boolean; errors?: ZodError }` - Safe validation
- `assertWikidataEntity(entity: unknown): asserts entity is WikidataEntityData` - Fail-fast validation
- `validateStoredEntityMetadata(data: unknown): { success: boolean; data?: StoredEntityMetadata; errors?: ZodError }` - Metadata validation

---

## Validation Strategy

### Three-Tier Validation Approach

#### Tier 1: API Input Validation (lib/validation/*.ts)
**Purpose:** Validate user input at API boundaries

| When | Where | What | Error Response |
|------|-------|------|----------------|
| API request received | API route handlers (`app/api/*/route.ts`) | Request body parsed and validated with Zod schemas | `400 Bad Request` with validation errors |
| Example | `POST /api/business` | Validates `createBusinessSchema` | Returns error details if invalid |

**Benefits:**
- Prevents invalid data from entering the system
- Clear error messages for API consumers
- Type-safe after validation

#### Tier 2: Business Logic Validation (Service Layer)
**Purpose:** Validate data before storage or external API calls

| When | Where | What | Error Response |
|------|-------|------|----------------|
| Before database storage | `lib/services/business-processing.ts`, `lib/db/queries.ts` | Validates crawl data, fingerprint data before insert/update | Throws validation error, sets status to 'error' |
| Before external API calls | `lib/wikidata/publisher.ts`, `lib/crawler/index.ts` | Validates entity structure before Wikidata API, validates crawl result before storage | Throws validation error, logs details |

**Benefits:**
- Ensures data integrity before persistence
- Prevents invalid data from reaching external APIs
- Maintains data quality standards

#### Tier 3: Database Constraint Validation (lib/db/schema.ts)
**Purpose:** Database-level constraints as final validation layer

| When | Where | What | Error Response |
|------|-------|------|----------------|
| Database insert/update | Drizzle ORM operations | Foreign key constraints, unique constraints, not-null constraints | Database error, transaction rollback |

**Benefits:**
- Final safety net for data integrity
- Enforces referential integrity
- Prevents orphaned records

### Validation Flow Examples

#### Example 1: Business Creation Flow

```
User submits: POST /api/business
    ↓
[1] Zod Validation (business.ts)
    ├─ validate: createBusinessSchema or createBusinessFromUrlSchema
    ├─ check: name length (2-200 chars)
    ├─ check: URL format
    ├─ check: location structure
    └─ check: category enum
    ↓ (if valid)
[2] Type Contract (gemflush.ts)
    ├─ TypeScript: CreateBusinessInput type
    └─ Compile-time type checking
    ↓
[3] Business Logic
    ├─ check: business limit (permissions)
    ├─ check: duplicate URL
    └─ create: business record
    ↓
[4] Database Schema (schema.ts)
    ├─ insert: businesses table
    ├─ enforce: teamId foreign key
    ├─ enforce: name not-null
    └─ enforce: url not-null
```

#### Example 2: Crawl Data Storage Flow

```
Crawler returns: CrawlResult
    ↓
[1] Zod Validation (crawl.ts)
    ├─ validate: crawledDataSchema
    ├─ check: all fields optional (crawl may fail partially)
    ├─ check: nullish values allowed (LLM returns null)
    └─ check: socialLinks URLs valid
    ↓ (if valid)
[2] Type Contract (gemflush.ts)
    ├─ TypeScript: CrawledData type
    └─ Compile-time type checking
    ↓
[3] Business Logic
    ├─ validate: validateCrawledData() called
    └─ update: businesses.crawlData (jsonb)
    ↓
[4] Database Schema (schema.ts)
    ├─ update: businesses table
    ├─ store: crawlData as jsonb (flexible structure)
    └─ enforce: businessId foreign key
```

#### Example 3: Wikidata Publishing Flow

```
Entity Builder creates: WikidataEntityDataContract
    ↓
[1] Type Contract (wikidata-contract.ts)
    ├─ TypeScript: WikidataEntityDataContract interface
    └─ Compile-time type checking
    ↓
[2] Zod Validation (wikidata.ts)
    ├─ validate: wikidataEntityDataSchema
    ├─ check: labels object (1+ required)
    ├─ check: claims object (1+ required)
    ├─ check: property IDs (P### format)
    ├─ check: snak structure
    └─ check: datavalue types match
    ↓ (if valid)
[3] Business Logic
    ├─ validate: validateWikidataEntity() called
    ├─ clean: remove llmSuggestions (internal metadata)
    └─ publish: Wikidata Action API
    ↓
[4] Database Schema (schema.ts)
    ├─ insert/update: wikidata_entities table
    ├─ store: entityData as jsonb (validated structure)
    ├─ enforce: businessId foreign key
    └─ enforce: qid uniqueness
```

---

## Contract-Schema-Validation Relationships

### Mapping Table: Contracts ↔ Schemas ↔ Validation

| Domain | Type Contract | Database Schema | Validation Schema | Relationship |
|--------|---------------|-----------------|-------------------|--------------|
| **Business** | `BusinessLocation` (gemflush.ts) | `businesses` table (schema.ts) | `createBusinessSchema`, `businessLocationSchema` (business.ts) | Type contract defines structure, DB schema stores it, validation ensures API input matches |
| **Crawl Data** | `CrawledData` (gemflush.ts) | `businesses.crawlData` (jsonb) | `crawledDataSchema` (crawl.ts) | Type contract defines structure, stored as jsonb, validated before storage |
| **Wikidata Entity** | `WikidataEntityDataContract` (wikidata-contract.ts) | `wikidata_entities.entityData` (jsonb) | `wikidataEntityDataSchema` (wikidata.ts) | Contract matches Wikibase spec, stored as jsonb, validated before publishing |
| **Fingerprint** | `FingerprintAnalysis` (gemflush.ts) | `llm_fingerprints` table (schema.ts) | Type inference from contract | Type contract defines structure, DB schema stores fields, validation via type checking |
| **Notability** | `NotabilityAssessment` (wikidata-contract.ts) | Stored in metadata files | `notabilityAssessmentSchema` (wikidata.ts) | Contract defines structure, validated before storage in metadata |

### Alignment Verification

| Layer | Validation Method | Alignment Check |
|-------|------------------|-----------------|
| **Type Contract → Validation Schema** | Manual review + tests | Type inference from Zod schemas ensures alignment: `z.infer<typeof schema>` matches contract types |
| **Validation Schema → Database Schema** | Runtime validation before storage | Zod validation ensures jsonb fields match database expectations |
| **Database Schema → Type Contract** | Type inference from Drizzle | `$inferSelect` and `$inferInsert` types match contract types |

---

## Usage Patterns

### Pattern 1: API Input Validation

```typescript
// app/api/business/route.ts
import { createBusinessSchema } from '@/lib/validation/business';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate with Zod schema
  const validatedData = createBusinessSchema.parse(body);
  // TypeScript now knows: validatedData is CreateBusinessInput
  
  // Use validated data
  const business = await createBusiness(validatedData);
  return NextResponse.json({ business });
}
```

**Pattern:** Request → Zod Validation → Type-safe data → Business logic

### Pattern 2: Crawl Data Validation

```typescript
// lib/services/business-processing.ts
import { validateCrawledData } from '@/lib/validation/crawl';

async function executeCrawlJob(...) {
  const result = await webCrawler.crawl(business.url);
  
  // Validate before storage
  const validation = validateCrawledData(result.data);
  if (!validation.success) {
    throw new Error(`Crawl data validation failed: ${validation.errors}`);
  }
  
  // Store validated data
  await updateBusiness(businessId, {
    crawlData: result.data, // TypeScript knows: CrawledData
  });
}
```

**Pattern:** Crawl result → Zod Validation → Validated data → Database storage

### Pattern 3: Wikidata Entity Validation

```typescript
// lib/wikidata/publisher.ts
import { validateWikidataEntity } from '@/lib/validation/wikidata';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';

async function publishEntity(
  entity: WikidataEntityDataContract
): Promise<{ success: boolean; qid?: string }> {
  // Validate before publishing
  const validation = validateWikidataEntity(entity);
  if (!validation.success) {
    throw new Error(`Entity validation failed: ${validation.errors}`);
  }
  
  // Clean internal metadata
  const cleaned = cleanEntityForWikidata(entity);
  
  // Publish to Wikidata API
  const result = await wikidataApi.wbeditentity(cleaned);
  return { success: true, qid: result.entity.id };
}
```

**Pattern:** Contract type → Zod Validation → Cleaned entity → External API

### Pattern 4: Type-Safe Database Operations

```typescript
// lib/db/queries.ts
import { businesses, type Business, type NewBusiness } from '@/lib/db/schema';

export async function createBusiness(data: NewBusiness): Promise<Business> {
  // Drizzle infers types from schema
  const [business] = await db
    .insert(businesses)
    .values(data) // TypeScript enforces: data matches NewBusiness
    .returning();
  
  return business; // TypeScript knows: Business type
}
```

**Pattern:** Database schema → Type inference → Type-safe operations → Type-safe results

---

## Compliance Checklist

### Contract Implementation

| Service | Contract | Implementation Status | Validation | Tests |
|---------|----------|----------------------|------------|-------|
| **Web Crawler** | `IWebCrawler` | ✅ Implemented in `lib/crawler/index.ts` | Runtime validation | ✅ `lib/crawler/__tests__/index.test.ts` |
| **LLM Fingerprinter** | `ILLMFingerprinter` | ✅ Implemented in `lib/llm/fingerprinter.ts` | Type checking | ✅ `lib/llm/__tests__/fingerprinter.test.ts` |
| **Entity Builder** | `IWikidataEntityBuilder` | ✅ Implemented in `lib/wikidata/entity-builder.ts` | Zod + runtime | ✅ `lib/wikidata/__tests__/entity-builder.test.ts` |
| **Publisher** | `IWikidataPublisher` | ✅ Implemented in `lib/wikidata/publisher.ts` | Zod + API validation | ✅ `lib/wikidata/__tests__/publisher.test.ts` |
| **Payment Service** | `IPaymentService` | ✅ Implemented in `lib/payments/stripe.ts` | Stripe SDK types | ✅ `lib/payments/__tests__/stripe.test.ts` |

### Schema Alignment

| Domain | Type Contract | Validation Schema | Database Schema | Alignment |
|--------|---------------|-------------------|-----------------|-----------|
| **Business** | `BusinessLocation` | `businessLocationSchema` | `businesses.location` (jsonb) | ✅ Aligned |
| **Crawl Data** | `CrawledData` | `crawledDataSchema` | `businesses.crawlData` (jsonb) | ✅ Aligned |
| **Wikidata Entity** | `WikidataEntityDataContract` | `wikidataEntityDataSchema` | `wikidata_entities.entityData` (jsonb) | ✅ Aligned (matches Wikibase spec) |
| **Fingerprint** | `FingerprintAnalysis` | Type inference | `llm_fingerprints` table | ✅ Aligned |

### Validation Coverage

| API Route | Input Validation | Business Logic Validation | Database Validation | Status |
|-----------|-----------------|---------------------------|---------------------|--------|
| `POST /api/business` | ✅ `createBusinessSchema` | ✅ Business limit check | ✅ Foreign key constraint | ✅ Complete |
| `POST /api/crawl` | ✅ `crawlRequestSchema` | ✅ Cache check | ✅ Job tracking | ✅ Complete |
| `POST /api/fingerprint` | ✅ `fingerprintRequestSchema` | ✅ Frequency check | ✅ Fingerprint storage | ✅ Complete |
| `POST /api/wikidata/publish` | ✅ `wikidataPublishRequestSchema` | ✅ Notability check, entity validation | ✅ Entity storage | ✅ Complete |

---

## Validation Strategy Principles

### 1. Fail-Fast at Boundaries
- **Principle:** Validate input at API boundaries before processing
- **Implementation:** All API routes use Zod schemas for request validation
- **Benefit:** Prevents invalid data from entering the system

### 2. Type Safety Throughout
- **Principle:** Use TypeScript types for compile-time safety, Zod for runtime validation
- **Implementation:** Type contracts → Zod validation → Type inference
- **Benefit:** Catch errors at compile time, validate at runtime

### 3. Schema Alignment
- **Principle:** Ensure type contracts, validation schemas, and database schemas align
- **Implementation:** Type inference from Zod schemas, database type inference from Drizzle
- **Benefit:** Single source of truth for data structure

### 4. Progressive Validation
- **Principle:** Validate at each layer (API → Business Logic → Database)
- **Implementation:** Zod at API, service validation before storage, database constraints
- **Benefit:** Defense in depth, catches issues early

### 5. Clear Error Messages
- **Principle:** Validation errors should be actionable and clear
- **Implementation:** Zod error messages, custom validation messages
- **Benefit:** Better developer and user experience

---

## Quick Reference Tables

### Schema Locations

| Schema Type | Location | File Pattern | Purpose |
|-------------|----------|--------------|---------|
| **Database Schema** | `lib/db/schema.ts` | Single file | Database table definitions |
| **Type Contract** | `lib/types/*.ts` | Domain-specific files | TypeScript interfaces |
| **Validation Schema** | `lib/validation/*.ts` | Domain-specific files | Zod runtime validation |

### Validation Functions

| Function | Location | Purpose | Returns |
|----------|----------|---------|---------|
| `validateCrawledData()` | `lib/validation/crawl.ts` | Validate crawl result before storage | `{ success: boolean; errors?: ZodError }` |
| `validateWikidataEntity()` | `lib/validation/wikidata.ts` | Validate entity before publishing | `{ success: boolean; errors?: ZodError }` |
| `assertCrawledData()` | `lib/validation/crawl.ts` | Fail-fast crawl validation | `asserts data is CrawledData` |
| `assertWikidataEntity()` | `lib/validation/wikidata.ts` | Fail-fast entity validation | `asserts entity is WikidataEntityData` |

### Contract Implementations

| Contract | Implementation | File | Status |
|----------|---------------|------|--------|
| `IWebCrawler` | `webCrawler` | `lib/crawler/index.ts` | ✅ Implemented |
| `ILLMFingerprinter` | `llmFingerprinter` | `lib/llm/fingerprinter.ts` | ✅ Implemented |
| `IWikidataEntityBuilder` | `WikidataEntityBuilder` | `lib/wikidata/entity-builder.ts` | ✅ Implemented |
| `IWikidataPublisher` | `wikidataPublisher` | `lib/wikidata/publisher.ts` | ✅ Implemented |
| `IOpenRouterClient` | `openRouterClient` | `lib/llm/openrouter.ts` | ✅ Implemented |
| `IPaymentService` | `stripeService` | `lib/payments/stripe.ts` | ✅ Implemented |

---

## Future Adaptations

### Potential Enhancements

| Enhancement | Purpose | Impact |
|-------------|---------|--------|
| **JSON Schema Export** | Generate JSON Schema from Zod schemas for API documentation | Better API documentation, OpenAPI/Swagger integration |
| **Contract Testing** | Automated contract compliance tests | Ensure services match contracts |
| **Validation Middleware** | Centralized validation middleware for API routes | DRY validation logic |
| **Schema Migrations** | Automated schema migration from validation changes | Easier schema evolution |
| **Type Generation** | Generate TypeScript types from Zod schemas | Single source of truth |

### Migration Considerations

- **Schema Changes:** Update type contracts, validation schemas, and database schemas together
- **Breaking Changes:** Version validation schemas when making breaking changes
- **Backward Compatibility:** Consider validation schema versioning for API compatibility
- **Documentation:** Keep validation schemas documented alongside contracts

---

**Document Version:** 1.0.0  
**Maintained By:** Development Team  
**Last Review:** December 2024

