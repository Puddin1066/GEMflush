# Archived E2E Tests

This directory contains e2e tests that are no longer actively used in the current platform development.

## Archive Categories

### Debug Tests
- `wikidata-auth-debug.spec.ts` - Debug test for Wikidata authentication issues
- `wikidata-publish-debug.spec.ts` - Debug test for Wikidata publishing issues

### Unit Tests (Vitest)
These `.test.ts` files are unit tests using Vitest, not Playwright e2e tests:
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

### Specific/One-off Tests
- `frogandtoad-real-flow.spec.ts` - Specific real site test (may be outdated)

## Why Archived

These tests were archived because:
1. **Debug tests**: Were created for specific debugging sessions and are no longer needed for regular development
2. **Unit tests**: Should be in a separate unit test directory, not mixed with e2e tests
3. **One-off tests**: Very specific tests that don't represent general platform functionality

## Current Active Tests

The following test patterns are actively maintained:
- **Iterative Flow Tests**: `*-flow.spec.ts` files following the iterative flow test methodology
- **DTO Validation Tests**: Tests validating data transformation layers
- **Service Accuracy Tests**: Tests validating service layer calculations
- **Frontend Card Tests**: Tests validating UI display accuracy

## Restoring Archived Tests

If you need to restore any archived test:
1. Move it back to `tests/e2e/`
2. Update any outdated dependencies
3. Verify it still works with current platform code
