# E2E Test Archive Summary

**Date:** November 23, 2024  
**Reason:** Cleanup of outdated tests that no longer apply to current platform development

## Archived Files

### Debug Tests (3 files)
- `wikidata-auth-debug.spec.ts` - Debug test for Wikidata authentication
- `wikidata-publish-debug.spec.ts` - Debug test for Wikidata publishing  
- `frogandtoad-real-flow.spec.ts` - Specific real site test

### Unit Tests (15 files)
These are Vitest unit tests, not Playwright e2e tests:
- `auth.test.ts`
- `crawler.test.ts`
- `data.test.ts`
- `db.test.ts`
- `email.test.ts`
- `gemflush.test.ts`
- `job.test.ts`
- `llm.test.ts`
- `stripe.test.ts`
- `team.test.ts`
- `types.test.ts`
- `user.test.ts`
- `utils.test.ts`
- `validation.test.ts`
- `wikidata.test.ts`

**Total Archived:** 18 files

## Active Test Suite

The following test patterns remain active and are maintained:

### Iterative Flow Tests (Following ITERATIVE_FLOW_TEST_METHODOLOGY.md)
- `business-detail-dto-card-flow.spec.ts`
- `wikidata-publish-dto-card-flow.spec.ts`
- `crawl-job-dto-status-card-flow.spec.ts`
- `fingerprint-service-accuracy-flow.spec.ts`
- `fingerprint-dto-transformation-flow.spec.ts`
- `fingerprint-frontend-cards-flow.spec.ts`
- `competitive-leaderboard-dto-flow.spec.ts`
- `competitive-leaderboard-data-accuracy-flow.spec.ts`
- `competitive-intelligence-cards-flow.spec.ts`
- `ranking-trend-calculation-flow.spec.ts`
- `ranking-fingerprint-ux-flow.spec.ts`
- `dto-ground-truth-verification.spec.ts`

### Core Workflow Tests
- `cfp-end-to-end-ux-flow.spec.ts`
- `production-readiness-complete-flow.spec.ts`
- `frictionless-onboarding-complete-flow.spec.ts`
- `complete-workflows.spec.ts`
- `user-workflows.spec.ts`

### Other Active Tests
- `auth.spec.ts`
- `businesses.spec.ts`
- `dashboard.spec.ts`
- `forms-validation.spec.ts`
- And others that follow current development patterns

## Restoration

If you need to restore any archived test:
1. Move it from `_archive/old-tests/` back to `tests/e2e/`
2. Update dependencies and imports
3. Verify compatibility with current codebase
4. Update test to follow current patterns if needed
