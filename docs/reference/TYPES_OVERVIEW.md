# Types Overview

Comprehensive overview of all types defined in the codebase, organized by category.

## Table of Contents
- [Database Schema Types](#database-schema-types)
- [DTO Types (Data Transfer Objects)](#dto-types-data-transfer-objects)
- [Domain Types](#domain-types)
- [Service Contract Types](#service-contract-types)
- [Wikidata Contract Types](#wikidata-contract-types)
- [Validation Schema Types](#validation-schema-types)

---

## Database Schema Types

**Location**: `lib/db/schema.ts`

### User & Team Management
- `User` - User entity (Select type)
- `NewUser` - User entity (Insert type)
- `Team` - Team entity (Select type)
- `NewTeam` - Team entity (Insert type)
- `TeamMember` - Team membership (Select type)
- `NewTeamMember` - Team membership (Insert type)
- `TeamDataWithMembers` - Team with nested members
- `ActivityLog` - Activity log entry (Select type)
- `NewActivityLog` - Activity log entry (Insert type)
- `Invitation` - Team invitation (Select type)
- `NewInvitation` - Team invitation (Insert type)
- `ActivityType` (enum) - Activity type constants

### Business & Core Entities
- `Business` - Business entity (Select type)
- `NewBusiness` - Business entity (Insert type)
- `WikidataEntity` - Published Wikidata entity (Select type)
- `NewWikidataEntity` - Published Wikidata entity (Insert type)
- `LLMFingerprint` - LLM fingerprint analysis (Select type)
- `NewLLMFingerprint` - LLM fingerprint analysis (Insert type)
- `CrawlJob` - Crawl job tracking (Select type)
- `NewCrawlJob` - Crawl job tracking (Insert type)
- `Competitor` - Competitor relationship (Select type)
- `NewCompetitor` - Competitor relationship (Insert type)
- `QidCache` - Cached QID lookup (Select type)
- `NewQidCache` - Cached QID lookup (Insert type)

**Total**: 22 database types (11 Select + 11 Insert) + 1 enum

---

## DTO Types (Data Transfer Objects)

**Location**: `lib/data/types.ts`

### Dashboard DTOs
- `DashboardDTO` - Dashboard overview data
- `DashboardBusinessDTO` - Business card data for dashboard

### Business Detail DTOs
- `BusinessDetailDTO` - Full business details
- `ActivityDTO` - Activity feed item

### Fingerprint DTOs
- `FingerprintDetailDTO` - Detailed fingerprint analysis
- `FingerprintResultDTO` - Individual LLM result
- `CompetitiveLeaderboardDTO` - Competitive leaderboard data
- `CompetitorDTO` - Individual competitor data

### Wikidata DTOs
- `WikidataPublishDTO` - Wikidata publish preview data
- `WikidataStatusDTO` - Wikidata entity status
- `WikidataEntityDetailDTO` - Rich Wikidata entity details
- `WikidataClaimDTO` - Simplified claim structure
- `WikidataPropertySuggestionDTO` - Property suggestion structure

### Crawler DTOs
- `CrawlResultDTO` - Crawl result for display

**Total**: 14 DTO interfaces

---

## Domain Types

**Location**: `lib/types/gemflush.ts`

### Business & Location
- `BusinessLocation` - Location data structure
- `CrawledData` - Extracted business data from web crawl

### Wikidata (Loose Types)
- `WikidataEntityData` - Wikidata entity structure (loose, deprecated)
- `WikidataClaim` - Wikidata claim structure (loose)
- `WikidataReference` - Wikidata reference structure (loose)

### LLM & Fingerprinting
- `LLMResult` - Individual LLM response structure
- `FingerprintAnalysis` - LLM fingerprint analysis results
- `CompetitiveBenchmark` - Competitor analysis structure

### Job Results
- `CrawlResult` - Web crawler output structure
- `CrawlJobResult` - Crawl job output
- `FingerprintJobResult` - Fingerprint job output
- `WikidataPublishResult` - Publish job output

### Subscription
- `PlanFeatures` - Subscription plan features
- `SubscriptionPlan` - Subscription plan configuration

**Total**: 13 domain type interfaces

---

## Service Contract Types

**Location**: `lib/types/service-contracts.ts`

### Service Interfaces
- `IWebCrawler` - Web crawler service interface
- `ILLMFingerprinter` - LLM fingerprinting service interface
- `IOpenRouterClient` - OpenRouter API client interface
- `IWikidataEntityBuilder` - Entity builder service interface
- `IWikidataPublisher` - Wikidata publisher service interface

### API Response Types
- `ApiResponse<T>` - Standard API response structure
- `JobResponse` - Job status response structure
- `BusinessCreateResponse` - Business creation response

### Error Classes
- `ServiceError` - Base service error class
- `CrawlerError` - Crawler-specific errors
- `LLMError` - LLM-specific errors
- `WikidataError` - Wikidata-specific errors

**Total**: 5 interfaces + 3 response types + 4 error classes

---

## Wikidata Contract Types

**Location**: `lib/types/wikidata-contract.ts`

### Wikibase Data Model Types
- `WikibaseEntityIdValue` - Entity ID value structure (QIDs/PIDs)
- `TimeValue` - Time/date value structure
- `QuantityValue` - Numeric quantity with units
- `MonolingualTextValue` - Text with language code
- `GlobeCoordinateValue` - Geographic coordinates
- `WikidataDatavalue` - Discriminated union for all datavalue types

### Wikidata Structure Types
- `WikidataSnak` - Property-value pair structure
- `WikidataReferenceSnak` - Reference snak structure
- `WikidataReference` - Reference/source structure
- `WikidataClaim` - Claim/statement structure
- `WikidataLabel` - Label structure
- `WikidataDescription` - Description structure

### Entity Types
- `WikidataEntityDataContract` - Complete entity structure contract (strict)
- `CleanedWikidataEntity` - Entity without internal metadata
- `LLMSuggestions` - LLM-generated suggestions for entity enhancement

**Total**: 15 strict Wikidata contract types

---

## Validation Schema Types

**Location**: `lib/validation/`

### Business Validation (`lib/validation/business.ts`)
- Zod schemas (not TypeScript types, but generate types):
  - `businessLocationSchema`
  - `businessCategorySchema`
  - `createBusinessSchema`
  - `updateBusinessSchema`
  - `crawlRequestSchema`
  - `fingerprintRequestSchema`
  - `wikidataPublishRequestSchema`

### Wikidata Validation (`lib/validation/wikidata.ts`)
- Zod schemas (not TypeScript types, but generate types):
  - `wikidataLabelSchema`
  - `wikidataDescriptionSchema`
  - `wikidataDatavalueSchema`
  - `wikidataSnakSchema`
  - `wikidataReferenceSnakSchema`
  - `wikidataReferenceSchema`
  - `wikidataClaimSchema`
  - `wikidataEntityDataSchema`

**Note**: Zod schemas generate TypeScript types via `z.infer<typeof schema>`

---

## Type Categories Summary

| Category | Count | Location |
|----------|-------|----------|
| **Database Schema Types** | 22 types + 1 enum | `lib/db/schema.ts` |
| **DTO Types** | 14 interfaces | `lib/data/types.ts` |
| **Domain Types** | 13 interfaces | `lib/types/gemflush.ts` |
| **Service Contract Types** | 5 interfaces + 3 response types + 4 error classes | `lib/types/service-contracts.ts` |
| **Wikidata Contract Types** | 15 strict types | `lib/types/wikidata-contract.ts` |
| **Validation Schemas** | 15 Zod schemas | `lib/validation/` |
| **Total** | **~80+ types** | Multiple files |

---

## Type Relationships

### Database → Domain → DTO Flow
```
Database Schema (Business)
    ↓
Domain Type (BusinessLocation, CrawledData)
    ↓
DTO Type (DashboardBusinessDTO, BusinessDetailDTO)
    ↓
UI Component
```

### Wikidata Type Hierarchy
```
WikidataEntityDataContract (strict)
    ↓
WikidataEntityData (loose, deprecated)
    ↓
WikidataEntity (database)
    ↓
WikidataPublishDTO (UI)
```

### Service Contract Flow
```
Service Interface (IWebCrawler)
    ↓
Implementation (WebCrawler)
    ↓
Domain Type (CrawlResult)
    ↓
API Response (ApiResponse<CrawlResult>)
```

---

## Type Safety Levels

1. **Strict Types** (Compile-time + Runtime validation)
   - Wikidata Contract Types (`wikidata-contract.ts`)
   - Database Schema Types (Drizzle ORM)
   - Validation Schema Types (Zod)

2. **Loose Types** (Compile-time only)
   - Domain Types (`gemflush.ts`)
   - DTO Types (`data/types.ts`)
   - Service Contract Types (`service-contracts.ts`)

3. **Runtime Validation** (Zod schemas)
   - Business validation schemas
   - Wikidata validation schemas

---

## Related Documentation

- [Schemas and Contracts Table](./SCHEMAS_CONTRACTS_MODULES_TABLE.md) - Complete contract mapping
- [Database Schema Contract Tests](../testing/COMPLETED/DB_SCHEMA_CONTRACT_TESTS_COMPLETE.md) - Database type tests
- [Data DTO Contract Tests](../testing/COMPLETED/DATA_DTO_CONTRACT_TESTS_COMPLETE.md) - DTO type tests
- [Wikidata Entity Contract](../features/wikidata/WIKIDATA_ENTITY_CONTRACT.md) - Wikidata type details

