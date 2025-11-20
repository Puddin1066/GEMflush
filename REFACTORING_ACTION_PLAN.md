# Refactoring Action Plan

Generated: 2025-11-20T01:18:28.705Z

## Summary

- Files to Keep: 39
- Files to Refactor: 29
- Files to Deprecate: 6
- Files to Archive: 0
- Files to Remove: 0

## ⚠️ Files to Deprecate

### lib/db/seed.ts
- **Reason:** Active code
- **Issues:** 
- **Action:** Add `@deprecated` JSDoc comments

### lib/db/setup.ts
- **Reason:** Active code
- **Issues:** 
- **Action:** Add `@deprecated` JSDoc comments

### lib/services/monthly-processing.ts
- **Reason:** Questionable usage - needs review
- **Issues:** Usage unclear - may be redundant
- **Action:** Add `@deprecated` JSDoc comments

### lib/utils.ts
- **Reason:** Questionable usage - needs review
- **Issues:** Duplicate of another file, Usage unclear - may be redundant
- **Action:** Add `@deprecated` JSDoc comments

### lib/wikidata/manual-publish-storage.ts
- **Reason:** Questionable usage - needs review
- **Issues:** Usage unclear - may be redundant
- **Action:** Add `@deprecated` JSDoc comments

### lib/wikidata/tiered-entity-builder.ts
- **Reason:** Questionable usage - needs review
- **Issues:** Usage unclear - may be redundant
- **Action:** Add `@deprecated` JSDoc comments

## 🔧 Files to Refactor

### lib/auth/middleware.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/crawler/index.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Should implement IWebCrawler contract, Contains `any` types - should use proper types

### lib/data/dashboard-dto.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/data/fingerprint-dto.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/data/wikidata-dto.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/email/send.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/hooks/use-business-detail.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/llm/fingerprinter.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Should implement ILLMFingerprinter contract, Contains `any` types - should use proper types

### lib/llm/openrouter.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Should implement IOpenRouterClient contract

### lib/payments/stripe.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Should implement IPaymentService contract, Contains `any` types - should use proper types

### lib/services/business-processing.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/types/service-contracts.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/utils/idempotency.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/wikidata/entity-builder.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### lib/wikidata/property-mapping.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types, Function accepts unvalidated unknown/any parameters

### lib/wikidata/publisher.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

### app/api/business/[id]/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/cron/monthly/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/cron/weekly-crawls/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/dashboard/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/fingerprint/[id]/route.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types, API route may be missing input validation

### app/api/fingerprint/business/[businessId]/route.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types, API route may be missing input validation

### app/api/fingerprint/route.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types, API route may be missing input validation

### app/api/job/[jobId]/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/team/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/test/team/customer-id/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/user/route.ts
- **Reason:** Active code
- **Issues:** API route may be missing input validation

### app/api/wikidata/entity/[businessId]/route.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types, API route may be missing input validation

### app/api/wikidata/publish/route.ts
- **Reason:** Contract compliance issues detected
- **Issues:** Contains `any` types - should use proper types

