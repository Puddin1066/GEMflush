# Schemas and Contracts by Module/Role

This document provides a comprehensive mapping of database schemas, validation schemas, type contracts, and API contracts to their corresponding modules and roles in the codebase.

## Table of Contents
- [Database Schemas](#database-schemas)
- [Validation Schemas (Zod)](#validation-schemas-zod)
- [Type Contracts](#type-contracts)
- [API Contracts](#api-contracts)
- [External Service Contracts](#external-service-contracts)

---

## Database Schemas

| Schema | Module/Role | Location | Description | Related Contracts | Test Coverage |
|--------|-------------|----------|-------------|------------------|---------------|
| `users` | Authentication & User Management | `lib/db/schema.ts` | User accounts with email, password, role | `User`, `NewUser` types | ✅ `schema-contracts.test.ts` |
| `teams` | Team Management | `lib/db/schema.ts` | Team/organization entities with Stripe integration | `Team`, `NewTeam` types | ✅ `schema-contracts.test.ts` |
| `teamMembers` | Team Management | `lib/db/schema.ts` | User-team relationships with roles | `TeamMember`, `NewTeamMember` types | ✅ `schema-contracts.test.ts` |
| `activityLogs` | Activity Tracking | `lib/db/schema.ts` | Audit log for user actions | `ActivityLog`, `NewActivityLog` types | ✅ `schema-contracts.test.ts` |
| `invitations` | Team Management | `lib/db/schema.ts` | Team invitation system | `Invitation`, `NewInvitation` types | ✅ `schema-contracts.test.ts` |
| `businesses` | Business Management | `lib/db/schema.ts` | Core business entities with location, crawl data, Wikidata QID | `Business`, `NewBusiness` types | ✅ `schema-contracts.test.ts` |
| `wikidataEntities` | Wikidata Publishing | `lib/db/schema.ts` | Published Wikidata entities with QIDs and versioning | `WikidataEntity`, `NewWikidataEntity` types | ✅ `schema-contracts.test.ts` |
| `llmFingerprints` | LLM Fingerprinting | `lib/db/schema.ts` | LLM visibility analysis results | `LLMFingerprint`, `NewLLMFingerprint` types | ✅ `schema-contracts.test.ts` |
| `crawlJobs` | Web Crawling | `lib/db/schema.ts` | Background job tracking for crawls | `CrawlJob`, `NewCrawlJob` types | ✅ `schema-contracts.test.ts` |
| `competitors` | Competitive Analysis | `lib/db/schema.ts` | Competitive relationships between businesses | `Competitor`, `NewCompetitor` types | ✅ `schema-contracts.test.ts` |
| `qidCache` | Wikidata Lookups | `lib/db/schema.ts` | Cached QID lookups for performance | `QidCache`, `NewQidCache` types | ✅ `schema-contracts.test.ts` |

**Note**: All database schemas have comprehensive contract tests verifying:
- Drizzle ORM type inference (Select and Insert types)
- JSONB field type safety (location, crawlData, entityData, etc.)
- Query return types match schema contracts
- Type safety between queries and schemas
- See `lib/db/__tests__/schema-contracts.test.ts` and `lib/db/__tests__/schema-queries-integration.test.ts`

---

## Validation Schemas (Zod)

| Schema | Module/Role | Location | Purpose | Used By |
|--------|-------------|----------|---------|---------|
| `businessLocationSchema` | Business Management | `lib/validation/business.ts` | Validates location data (city, state, country, coordinates) | Business creation/update APIs |
| `businessCategorySchema` | Business Management | `lib/validation/business.ts` | Enum validation for business categories | Business creation/update APIs |
| `createBusinessSchema` | Business Management | `lib/validation/business.ts` | Validates new business creation requests | `POST /api/business` |
| `updateBusinessSchema` | Business Management | `lib/validation/business.ts` | Validates business update requests | `PATCH /api/business/[id]` |
| `crawlRequestSchema` | Web Crawling | `lib/validation/business.ts` | Validates crawl job requests | `POST /api/crawl` |
| `fingerprintRequestSchema` | LLM Fingerprinting | `lib/validation/business.ts` | Validates fingerprint job requests | `POST /api/fingerprint` |
| `wikidataPublishRequestSchema` | Wikidata Publishing | `lib/validation/business.ts` | Validates Wikidata publish requests | `POST /api/wikidata/publish` |
| `wikidataLabelSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates Wikidata label structure (language + value) | Entity builder, publisher |
| `wikidataDescriptionSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates Wikidata description structure | Entity builder, publisher |
| `wikidataDatavalueSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates datavalue structure (type + value) | Entity builder, publisher |
| `wikidataSnakSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates snak structure (property-value pair) | Entity builder, publisher |
| `wikidataReferenceSnakSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates reference snak structure | Entity builder, publisher |
| `wikidataReferenceSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates reference structure (snaks object) | Entity builder, publisher |
| `wikidataClaimSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates claim structure (mainsnak + type + references) | Entity builder, publisher |
| `wikidataEntityDataSchema` | Wikidata Publishing | `lib/validation/wikidata.ts` | Validates complete entity structure for Wikidata API | Entity builder, publisher validation |

---

## Type Contracts

### Service Contracts

| Contract | Module/Role | Location | Implementation | Purpose |
|----------|-------------|----------|----------------|---------|
| `IWebCrawler` | Web Crawling | `lib/types/service-contracts.ts` | `lib/crawler/index.ts` | Web crawler service interface |
| `ILLMFingerprinter` | LLM Fingerprinting | `lib/types/service-contracts.ts` | `lib/llm/fingerprinter.ts` | LLM fingerprinting service interface |
| `IOpenRouterClient` | LLM Integration | `lib/types/service-contracts.ts` | `lib/llm/openrouter.ts` | OpenRouter API client interface |
| `IWikidataEntityBuilder` | Wikidata Publishing | `lib/types/service-contracts.ts` | `lib/wikidata/entity-builder.ts` | Entity builder service interface |
| `IWikidataPublisher` | Wikidata Publishing | `lib/types/service-contracts.ts` | `lib/wikidata/publisher.ts` | Wikidata publisher service interface |
| `ApiResponse<T>` | API Layer | `lib/types/service-contracts.ts` | All API routes | Standard API response structure |
| `JobResponse` | Job Management | `lib/types/service-contracts.ts` | Job tracking APIs | Job status response structure |

### Wikidata Type Contracts

| Contract | Module/Role | Location | Based On | Purpose |
|----------|-------------|----------|----------|---------|
| `WikibaseEntityIdValue` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Entity ID value structure (QIDs/PIDs) |
| `TimeValue` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Time/date value structure |
| `QuantityValue` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Numeric quantity with units |
| `MonolingualTextValue` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Text with language code |
| `GlobeCoordinateValue` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Geographic coordinates |
| `WikidataDatavalue` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Discriminated union for all datavalue types |
| `WikidataSnak` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Property-value pair structure |
| `WikidataReference` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Reference/source structure |
| `WikidataClaim` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Claim/statement structure |
| `WikidataLabel` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Label structure |
| `WikidataDescription` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase Data Model | Description structure |
| `WikidataEntityDataContract` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase JSON Spec | Complete entity structure contract |
| `CleanedWikidataEntity` | Wikidata Publishing | `lib/types/wikidata-contract.ts` | Wikibase JSON Spec | Entity without internal metadata |

### Domain Type Contracts

| Contract | Module/Role | Location | Purpose |
|----------|-------------|----------|---------|
| `CrawlResult` | Web Crawling | `lib/types/gemflush.ts` | Web crawler output structure |
| `CrawledData` | Web Crawling | `lib/types/gemflush.ts` | Extracted business data structure |
| `FingerprintAnalysis` | LLM Fingerprinting | `lib/types/gemflush.ts` | LLM fingerprint analysis results |
| `LLMResult` | LLM Fingerprinting | `lib/types/gemflush.ts` | Individual LLM response structure |
| `WikidataEntityData` | Wikidata Publishing | `lib/types/gemflush.ts` | Wikidata entity structure (loose types) |
| `WikidataPublishResult` | Wikidata Publishing | `lib/types/gemflush.ts` | Publishing operation result |
| `BusinessLocation` | Business Management | `lib/types/gemflush.ts` | Location data structure |
| `PlanFeatures` | Subscription Management | `lib/types/gemflush.ts` | Subscription plan features |
| `SubscriptionPlan` | Subscription Management | `lib/types/gemflush.ts` | Subscription plan configuration |
| `CompetitiveBenchmark` | Competitive Analysis | `lib/types/gemflush.ts` | Competitor analysis structure |

### DTO Contracts (Data Transfer Objects)

| Contract | Module/Role | Location | Purpose | Used By | Test Coverage |
|----------|-------------|----------|---------|---------|---------------|
| `DashboardDTO` | Dashboard UI | `lib/data/types.ts` | Dashboard overview data | `app/(dashboard)/dashboard/page.tsx` | ✅ `dto-contracts.test.ts` |
| `DashboardBusinessDTO` | Dashboard UI | `lib/data/types.ts` | Business card data for dashboard | Dashboard list views | ✅ `dto-contracts.test.ts` |
| `BusinessDetailDTO` | Business Detail UI | `lib/data/types.ts` | Full business details | Business detail pages | ✅ `dto-contracts.test.ts` |
| `ActivityDTO` | Activity Feed UI | `lib/data/types.ts` | Activity feed item structure | Activity feed components | ✅ `dto-contracts.test.ts` |
| `FingerprintDetailDTO` | Fingerprint UI | `lib/data/types.ts` | Detailed fingerprint analysis | Fingerprint detail pages | ✅ `dto-contracts.test.ts` |
| `FingerprintResultDTO` | Fingerprint UI | `lib/data/types.ts` | Individual LLM result | Fingerprint display components | ✅ `dto-contracts.test.ts` |
| `CompetitiveLeaderboardDTO` | Competitive Analysis UI | `lib/data/types.ts` | Competitive leaderboard data | Competitive analysis components | ✅ `dto-contracts.test.ts` |
| `CompetitorDTO` | Competitive Analysis UI | `lib/data/types.ts` | Individual competitor data | Leaderboard components | ✅ `dto-contracts.test.ts` |
| `WikidataPublishDTO` | Wikidata UI | `lib/data/types.ts` | Wikidata publish preview data | Publish preview components | ✅ `dto-contracts.test.ts` |
| `WikidataStatusDTO` | Wikidata UI | `lib/data/types.ts` | Wikidata entity status | Status display components | ✅ `dto-contracts.test.ts` |
| `WikidataEntityDetailDTO` | Wikidata UI | `lib/data/types.ts` | Rich Wikidata entity details | Entity detail views | ✅ `dto-contracts.test.ts` |
| `WikidataClaimDTO` | Wikidata UI | `lib/data/types.ts` | Simplified claim structure | Claim display components | ✅ `dto-contracts.test.ts` |
| `WikidataPropertySuggestionDTO` | Wikidata UI | `lib/data/types.ts` | Property suggestion structure | Enhancement suggestions | ✅ `dto-contracts.test.ts` |
| `CrawlResultDTO` | Crawler UI | `lib/data/types.ts` | Crawl result for display | Crawl status components | ✅ `dto-contracts.test.ts` |

**Note**: All DTO contracts have comprehensive contract tests verifying:
- Type structure matches interface definitions
- Union types are enforced (trend, status, sentiment, etc.)
- Optional and nullable fields are properly typed
- String formatting requirements (IDs, dates)
- Nested object structures
- See `lib/data/__tests__/dto-contracts.test.ts`

---

## API Contracts

### Business Management APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/business` | POST | Business Management | `createBusinessSchema` | `BusinessCreateResponse` | `app/api/business/route.ts` |
| `/api/business` | GET | Business Management | None | `Business[]` | `app/api/business/route.ts` |
| `/api/business/[id]` | GET | Business Management | None | `Business` | `app/api/business/[id]/route.ts` |
| `/api/business/[id]` | PATCH | Business Management | `updateBusinessSchema` | `Business` | `app/api/business/[id]/route.ts` |
| `/api/business/[id]` | DELETE | Business Management | None | `ApiResponse` | `app/api/business/[id]/route.ts` |

### Web Crawling APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/crawl` | POST | Web Crawling | `crawlRequestSchema` | `JobResponse` | `app/api/crawl/route.ts` |

### LLM Fingerprinting APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/fingerprint` | POST | LLM Fingerprinting | `fingerprintRequestSchema` | `JobResponse` | `app/api/fingerprint/route.ts` |
| `/api/fingerprint/[id]` | GET | LLM Fingerprinting | None | `FingerprintAnalysis` | `app/api/fingerprint/[id]/route.ts` |
| `/api/fingerprint/business/[businessId]` | GET | LLM Fingerprinting | None | `FingerprintAnalysis` | `app/api/fingerprint/business/[businessId]/route.ts` |

### Wikidata Publishing APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/wikidata/publish` | POST | Wikidata Publishing | `wikidataPublishRequestSchema` | `WikidataPublishResult` | `app/api/wikidata/publish/route.ts` |
| `/api/wikidata/entity/[businessId]` | GET | Wikidata Publishing | None | `WikidataEntityDetailDTO` | `app/api/wikidata/entity/[businessId]/route.ts` |

### Job Management APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/job/[jobId]` | GET | Job Management | None | `CrawlJob \| FingerprintJobResult \| WikidataPublishResult` | `app/api/job/[jobId]/route.ts` |

### Payment & Subscription APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/stripe/checkout` | GET | Payments | Query params (priceId) | Redirect to Stripe | `app/api/stripe/checkout/route.ts` |
| `/api/stripe/webhook` | POST | Payments | Stripe webhook payload | `ApiResponse` | `app/api/stripe/webhook/route.ts` |

### Team Management APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/team` | GET | Team Management | None | `TeamDataWithMembers` | `app/api/team/route.ts` |

### User Management APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/user` | GET | User Management | None | `User` | `app/api/user/route.ts` |

### Cron Job APIs

| Endpoint | Method | Module/Role | Request Schema | Response Type | Location |
|----------|--------|-------------|----------------|---------------|----------|
| `/api/cron/weekly-crawls` | GET | Automation | None | `ApiResponse` | `app/api/cron/weekly-crawls/route.ts` |
| `/api/cron/monthly` | GET | Automation | None | `ApiResponse` | `app/api/cron/monthly/route.ts` |

---

## External Service Contracts

### Wikidata API Contracts

| Contract | Module/Role | Specification | Implementation | Purpose |
|----------|-------------|---------------|----------------|---------|
| **Wikibase Data Model (WDM)** | Wikidata Publishing | https://www.mediawiki.org/wiki/Wikibase/DataModel | `lib/types/wikidata-contract.ts` | Core schema contract for entity structure |
| **Wikibase JSON Specification** | Wikidata Publishing | https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html | `lib/validation/wikidata.ts` | JSON format contract for API writes |
| **Wikidata Action API Protocol** | Wikidata Publishing | https://www.wikidata.org/wiki/Wikidata:Data_access | `lib/wikidata/publisher.ts` | Authentication, tokens, edit operations |
| **Wikidata Bot Policy** | Wikidata Publishing | https://www.wikidata.org/wiki/Wikidata:Bots | `lib/wikidata/publisher.ts` | Behavioral protocol for bots |
| **Wikidata Ontology** | Wikidata Publishing | https://www.wikidata.org/wiki/Wikidata:Glossary | `lib/wikidata/entity-builder.ts` | Conceptual contract for relationships |
| **ORES + Edit Quality Models** | Wikidata Publishing | https://www.mediawiki.org/wiki/ORES | `lib/wikidata/publisher.ts` | Quality constraints contract |

#### Test vs Production Wikidata Contracts

**Important**: There is **ONE contract structure** (`WikidataEntityDataContract`) used for both test and production Wikidata. However, `test.wikidata.org` has **incorrect property definitions** compared to production, requiring runtime adaptation.

**Contract Structure**:
- **Single Contract**: `WikidataEntityDataContract` - Same structure for both environments
- **Entity Building**: Always uses **production** property definitions (correct types)
- **Publishing Adaptation**: When publishing to `test.wikidata.org`, the publisher adapts the entity:
  - Removes P31 (instance of) - test expects `url` but production uses `wikibase-item`
  - Removes all references - reference properties (P854, P813, P1476) have wrong types on test
  - Keeps other mainsnaks that match test's schema

**Implementation Details**:
- **Location**: `lib/wikidata/publisher.ts` → `adaptEntityForTest()`
- **Strategy**: Build for production, adapt for test
- **Documentation**: See `docs/features/wikidata/TEST_VS_PRODUCTION_PROPERTIES.md`

**Property Type Differences**:
| Property | Production Type | Test Type | Status |
|----------|----------------|-----------|--------|
| P31 (instance of) | `wikibase-item` | `url` ❌ | Removed for test |
| P854 (reference URL) | `url` | `globe-coordinate` ❌ | References removed for test |
| P813 (retrieved date) | `time` | `wikibase-item` ❌ | References removed for test |
| P1476 (title) | `monolingualtext` | `globe-coordinate` ❌ | References removed for test |

### Stripe API Contracts

| Contract | Module/Role | Specification | Implementation | Purpose |
|----------|-------------|---------------|----------------|---------|
| **Stripe Checkout Session** | Payments | Stripe API v2025-04-30.basil | `lib/payments/stripe.ts` | Checkout session creation |
| **Stripe Webhook Events** | Payments | Stripe Webhook API | `app/api/stripe/webhook/route.ts` | Subscription status updates |
| **Stripe Product/Price** | Payments | Stripe Products API | `lib/payments/gemflush-products.ts` | Product and pricing configuration |

### OpenRouter API Contracts

| Contract | Module/Role | Specification | Implementation | Purpose |
|----------|-------------|---------------|----------------|---------|
| **OpenRouter Chat Completion** | LLM Integration | OpenRouter API | `lib/llm/openrouter.ts` | Multi-LLM query interface |

---

## Module-to-Contract Mapping Summary

### Authentication & User Management Module
- **Database Schemas**: `users`, `teams`, `teamMembers`, `activityLogs`, `invitations`
- **Type Contracts**: `User`, `Team`, `TeamMember`, `ActivityLog`, `Invitation`
- **API Contracts**: `/api/user`, `/api/team`

### Business Management Module
- **Database Schemas**: `businesses`
- **Validation Schemas**: `createBusinessSchema`, `updateBusinessSchema`, `businessLocationSchema`, `businessCategorySchema`
- **Type Contracts**: `Business`, `BusinessLocation`, `BusinessDetailDTO`, `DashboardBusinessDTO`
- **API Contracts**: `/api/business/*`

### Web Crawling Module
- **Database Schemas**: `crawlJobs`, `businesses` (crawlData field)
- **Validation Schemas**: `crawlRequestSchema`
- **Type Contracts**: `IWebCrawler`, `CrawlResult`, `CrawledData`, `CrawlJob`, `CrawlResultDTO`
- **API Contracts**: `/api/crawl`

### LLM Fingerprinting Module
- **Database Schemas**: `llmFingerprints` | ✅ `schema-contracts.test.ts`
- **Validation Schemas**: `fingerprintRequestSchema` | ✅ `llm-validation-contracts.test.ts`
- **Type Contracts**: `ILLMFingerprinter`, `IOpenRouterClient`, `FingerprintAnalysis`, `LLMResult`, `FingerprintDetailDTO`, `FingerprintResultDTO` | ✅ `llm-type-contracts.test.ts`, `openrouter-contracts.test.ts`
- **API Contracts**: `/api/fingerprint/*`

### Wikidata Publishing Module
- **Database Schemas**: `wikidataEntities`, `qidCache`
- **Validation Schemas**: `wikidataEntityDataSchema`, `wikidataClaimSchema`, `wikidataLabelSchema`, `wikidataDescriptionSchema`, `wikidataPublishRequestSchema`
- **Type Contracts**: `IWikidataEntityBuilder`, `IWikidataPublisher`, `WikidataEntityDataContract`, `WikidataEntityData`, `WikidataClaim`, `WikidataPublishResult`, `WikidataPublishDTO`, `WikidataStatusDTO`, `WikidataEntityDetailDTO`
- **External Contracts**: Wikibase Data Model, Wikibase JSON Spec, Wikidata Action API Protocol
- **API Contracts**: `/api/wikidata/publish`, `/api/wikidata/entity/[businessId]`

### Competitive Analysis Module
- **Database Schemas**: `competitors`, `llmFingerprints` (competitiveBenchmark field)
- **Type Contracts**: `CompetitiveBenchmark`, `CompetitiveLeaderboardDTO`, `CompetitorDTO`
- **API Contracts**: Integrated into fingerprint APIs

### Payment & Subscription Module
- **Database Schemas**: `teams` (Stripe fields)
- **Type Contracts**: `SubscriptionPlan`, `PlanFeatures`, `ApiResponse`
- **External Contracts**: Stripe API contracts
- **API Contracts**: `/api/stripe/checkout`, `/api/stripe/webhook`

### Job Management Module
- **Database Schemas**: `crawlJobs`
- **Type Contracts**: `JobResponse`, `CrawlJobResult`, `FingerprintJobResult`, `WikidataPublishResult`
- **API Contracts**: `/api/job/[jobId]`

### Automation Module
- **Database Schemas**: `businesses` (automation fields)
- **API Contracts**: `/api/cron/weekly-crawls`, `/api/cron/monthly`

---

## Notes

1. **Contract Hierarchy**: External service contracts (Wikidata, Stripe) → Type contracts → Validation schemas → Database schemas
2. **DTO Pattern**: DTOs (`lib/data/types.ts`) are UI-focused transformations of domain types (`lib/types/gemflush.ts`)
3. **Validation Layer**: Zod schemas (`lib/validation/`) validate at API boundaries before domain logic
4. **Type Safety**: TypeScript contracts (`lib/types/`) provide compile-time safety, Zod schemas provide runtime validation
5. **External Contracts**: Wikidata contracts are based on official Wikibase specifications and must be followed exactly
6. **Test vs Production Wikidata**: There is **one contract structure** (`WikidataEntityDataContract`) for both environments. Entities are built using production property definitions, then adapted at runtime when publishing to `test.wikidata.org` (which has incorrect property types). See [Test vs Production Properties](../features/wikidata/TEST_VS_PRODUCTION_PROPERTIES.md) for details.

---

## Related Documentation

- [Contracts Status](../status/CONTRACTS_STATUS.md) - Overall contract completeness
- [Wikidata Contracts](../features/wikidata/CONTRACTS_AND_SCHEMAS.md) - Wikidata-specific contracts
- [Wikidata Entity Contract](../features/wikidata/WIKIDATA_ENTITY_CONTRACT.md) - Entity contract details
- [Contract Separation Analysis](./CONTRACT_SEPARATION_ANALYSIS.md) - Analysis of whether test/production contracts should be separate
- [Database Schema Contract Tests](../testing/COMPLETED/DB_SCHEMA_CONTRACT_TESTS_COMPLETE.md) - Database schema and contract test coverage
- [Data DTO Contract Tests](../testing/COMPLETED/DATA_DTO_CONTRACT_TESTS_COMPLETE.md) - DTO type contract test coverage
- [DTO Service Mapping](./DTO_SERVICE_MAPPING.md) - DTO to service mapping
- [Validation Layer Trace](./VALIDATION_LAYER_TRACE.md) - Validation schema usage

