# Real Wikidata Credentials Publication Test

## Overview

A comprehensive test suite that verifies **REAL wikidata credentials** can successfully publish entities according to contracts and schemas.

**Location**: `lib/wikidata/__tests__/real-credentials-publication.test.ts`

## Test Coverage

### 1. Contract and Schema Validation ✅

Tests that entities built by `WikidataEntityBuilder` match:
- **TypeScript Contracts**: `isWikidataEntityDataContract()` type guard
- **Zod Schemas**: `validateWikidataEntity()` schema validation
- **Label Structure**: Valid language codes and value lengths (≤400 chars)
- **Description Structure**: Valid language codes and value lengths (≤250 chars)
- **Claim Structures**: Valid property IDs (P####), snak types, claim types

### 2. Real Publication with Credentials ⚠️ (Requires Credentials)

Tests that:
- Entity can be published to test.wikidata.org with real credentials
- Returned QID is real (not mock Q999999###)
- Entity with multiple properties can be published
- Published entity can be retrieved and verified

### 3. Error Handling ✅

Tests that invalid entities are rejected by schema validation before API calls

### 4. Credential Validation ✅

Tests that placeholder credentials are correctly detected

## Running the Test

### With Credentials (Full Test)

```bash
# Set credentials
export WIKIDATA_BOT_USERNAME=YourBot@YourBot
export WIKIDATA_BOT_PASSWORD=your_password
export WIKIDATA_PUBLISH_MODE=real

# Run test
pnpm test lib/wikidata/__tests__/real-credentials-publication.test.ts
```

### Without Credentials (Contract/Schema Only)

```bash
# Test runs automatically, skips real publication tests
pnpm test lib/wikidata/__tests__/real-credentials-publication.test.ts
```

**Result**: 7 tests pass (contract/schema validation), 4 tests skipped (real publication)

## Test Results

### With Credentials

```
✓ Contract and Schema Validation (5 tests)
  ✓ should build entity that matches contract structure
  ✓ should build entity that passes Zod schema validation
  ✓ should build entity with valid label structure
  ✓ should build entity with valid description structure
  ✓ should build entity with valid claim structures

✓ Real Publication with Credentials (3 tests)
  ✓ should successfully publish entity to test.wikidata.org with real credentials
  ✓ should publish entity with multiple properties and references
  ✓ should retrieve and verify published entity

✓ Error Handling (1 test)
  ✓ should handle invalid entity gracefully

✓ Credential Validation (2 tests)
  ✓ should detect missing credentials
  ✓ should detect placeholder credentials
```

### Without Credentials

```
✓ Contract and Schema Validation (5 tests) - All pass
⊘ Real Publication with Credentials (3 tests) - Skipped
✓ Error Handling (1 test) - Pass
✓ Credential Validation (2 tests) - Pass
```

## What Gets Tested

### Contract Validation

- Entity structure matches `WikidataEntityDataContract` interface
- All required fields present (labels, descriptions, claims)
- Type safety enforced by TypeScript

### Schema Validation

- Entity passes Zod schema validation
- Label/description length limits enforced
- Property ID format validated (P####)
- Claim structure validated

### Real Publication

- Authentication with test.wikidata.org
- Entity publication via API
- QID verification (real vs mock)
- Entity retrieval and verification

## Integration with CI/CD

The test can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Test Real Wikidata Publishing
  run: |
    export WIKIDATA_BOT_USERNAME=${{ secrets.WIKIDATA_BOT_USERNAME }}
    export WIKIDATA_BOT_PASSWORD=${{ secrets.WIKIDATA_BOT_PASSWORD }}
    export WIKIDATA_PUBLISH_MODE=real
    pnpm test lib/wikidata/__tests__/real-credentials-publication.test.ts
  env:
    WIKIDATA_BOT_USERNAME: ${{ secrets.WIKIDATA_BOT_USERNAME }}
    WIKIDATA_BOT_PASSWORD: ${{ secrets.WIKIDATA_BOT_PASSWORD }}
    WIKIDATA_PUBLISH_MODE: real
```

**Important**: Store credentials as secrets, never commit them!

## Related Documentation

- [Test README](../lib/wikidata/__tests__/README_REAL_CREDENTIALS_TEST.md) - Detailed test documentation
- [Wikidata Authentication Setup](../features/wikidata/WIKIDATA_AUTH_SETUP.md) - How to set up credentials
- [Vercel Deployment Guide](../deployment/VERCEL_WIKIDATA_PUBLISHING.md) - Production deployment
- [Contracts and Schemas](../features/wikidata/CONTRACTS_SCHEMAS_TESTS.md) - Contract/schema documentation

## Key Features

✅ **Automatic Skipping**: Skips real publication tests when credentials are missing
✅ **Comprehensive Validation**: Tests contracts, schemas, and real publication
✅ **Safe Testing**: Only publishes to test.wikidata.org (not production)
✅ **Error Handling**: Tests error cases and invalid entities
✅ **Credential Detection**: Detects placeholder credentials automatically

