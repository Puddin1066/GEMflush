# Real Wikidata Credentials Publication Test

## Overview

This test verifies that **REAL wikidata credentials** can successfully publish entities according to contracts and schemas. It performs end-to-end validation:

1. **Contract Validation**: Entity matches TypeScript contracts
2. **Schema Validation**: Entity passes Zod schema validation  
3. **Real Publication**: Attempts actual API call to test.wikidata.org
4. **QID Verification**: Verifies returned QID is real (not mock)
5. **Entity Retrieval**: Optionally fetches and verifies published entity

## Important Notes

⚠️ **This test requires REAL credentials and makes REAL API calls**
- Only runs when `WIKIDATA_BOT_USERNAME` and `WIKIDATA_BOT_PASSWORD` are set
- Only publishes to **test.wikidata.org** (safe testing environment)
- Skips automatically if credentials are missing or invalid
- Creates real entities on test.wikidata.org

## Prerequisites

1. **Bot Account on test.wikidata.org**:
   - Create account: https://test.wikidata.org
   - Create bot password: https://test.wikidata.org/wiki/Special:BotPasswords
   - Grant permissions: `editpage`, `createeditmovepage`

2. **Environment Variables**:
   ```bash
   WIKIDATA_BOT_USERNAME=YourBotName@YourBotName
   WIKIDATA_BOT_PASSWORD=your_actual_bot_password
   WIKIDATA_PUBLISH_MODE=real
   ```

## Running the Test

### Option 1: Via Environment Variables

```bash
# Set credentials
export WIKIDATA_BOT_USERNAME=YourBot@YourBot
export WIKIDATA_BOT_PASSWORD=your_password
export WIKIDATA_PUBLISH_MODE=real

# Run test
pnpm test lib/wikidata/__tests__/real-credentials-publication.test.ts
```

### Option 2: Via .env File

```bash
# Add to .env file
WIKIDATA_BOT_USERNAME=YourBot@YourBot
WIKIDATA_BOT_PASSWORD=your_password
WIKIDATA_PUBLISH_MODE=real

# Run test (vitest loads .env automatically)
pnpm test lib/wikidata/__tests__/real-credentials-publication.test.ts
```

### Option 3: Via Vercel Environment Variables

If running in CI/CD or Vercel:
- Set environment variables in Vercel dashboard
- Test will automatically use them

## Test Structure

### 1. Contract and Schema Validation

Tests that entities built by `WikidataEntityBuilder` match:
- TypeScript contracts (`isWikidataEntityDataContract`)
- Zod schemas (`validateWikidataEntity`)

### 2. Real Publication with Credentials

Tests that:
- Entity can be published to test.wikidata.org
- Returned QID is real (not mock Q999999###)
- Entity has multiple properties
- Entity can be retrieved and verified

### 3. Error Handling

Tests that invalid entities are rejected before API calls

### 4. Credential Validation

Tests that placeholder credentials are detected

## Expected Output

### Successful Test Run

```
✓ Contract and Schema Validation
  ✓ should build entity that matches contract structure
  ✓ should build entity that passes Zod schema validation
  ✓ should build entity with valid label structure
  ✓ should build entity with valid description structure
  ✓ should build entity with valid claim structures

✓ Real Publication with Credentials
  ✓ should successfully publish entity to test.wikidata.org with real credentials
    [TEST] ✓ Entity matches contract structure
    [TEST] ✓ Entity passes Zod schema validation
    [TEST] Attempting real publication to test.wikidata.org...
    [TEST] ✓ Entity published successfully with QID: Q242819
    [TEST] ✓ QID is real (not mock): Q242819
    [TEST] View entity: https://test.wikidata.org/wiki/Q242819

  ✓ should publish entity with multiple properties and references
    [TEST] Entity has 8 properties
    [TEST] ✓ Published entity with 8 properties
    [TEST] ✓ QID: Q242820

  ✓ should retrieve and verify published entity
    [TEST] Published entity with QID: Q242821
    [TEST] ✓ Published label: "GEMflush Test Business 1234567890"
    [TEST] ✓ Published description: "A test business entity created by..."
    [TEST] ✓ Published entity has 8 properties
    [TEST] ✓ Entity successfully retrieved and verified
```

### Skipped Test Run (No Credentials)

```
⚠ [SKIP] Real credentials not configured. Skipping real publication tests.
⚠ [SKIP] Set WIKIDATA_BOT_USERNAME, WIKIDATA_BOT_PASSWORD, and WIKIDATA_PUBLISH_MODE=real to run these tests.

✓ Contract and Schema Validation
  ✓ should build entity that matches contract structure
  ✓ should build entity that passes Zod schema validation
  ...

⊘ Real Publication with Credentials (skipped)
  ⊘ should successfully publish entity to test.wikidata.org with real credentials
  ⊘ should publish entity with multiple properties and references
  ⊘ should retrieve and verify published entity
```

## Verification

After running the test, verify the published entity:

1. **Check QID**: Should be `Q####` format (not `Q999999####`)
2. **Visit Entity**: `https://test.wikidata.org/wiki/Q{returned_qid}`
3. **Verify Properties**: Check that all properties are present
4. **Verify Labels**: Check that labels match expected values
5. **Verify Descriptions**: Check that descriptions match expected values

## Troubleshooting

### Test is Skipped

**Problem**: Test shows `⊘` (skipped) instead of running

**Solutions**:
1. ✅ Check `WIKIDATA_BOT_USERNAME` is set and doesn't contain placeholders
2. ✅ Check `WIKIDATA_BOT_PASSWORD` is set and is at least 5 characters
3. ✅ Check `WIKIDATA_PUBLISH_MODE=real` is set
4. ✅ Verify credentials are not placeholders (`YourBot`, `example`, etc.)

### Authentication Errors

**Problem**: Test fails with authentication errors

**Solutions**:
1. ✅ Verify bot password format: `username@botname:password`
2. ✅ Verify username format: `username@botname` (not just `username`)
3. ✅ Verify password is the random string (not full format)
4. ✅ Check bot account exists on test.wikidata.org
5. ✅ Verify bot password has correct permissions

### Publication Fails

**Problem**: Test fails during publication

**Solutions**:
1. ✅ Check Vercel/logs for detailed error messages
2. ✅ Verify entity structure is valid (contract + schema)
3. ✅ Check for rate limiting (wait and retry)
4. ✅ Verify test.wikidata.org is accessible

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Real Wikidata Publishing

on:
  workflow_dispatch: # Manual trigger only

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: |
          export WIKIDATA_BOT_USERNAME=${{ secrets.WIKIDATA_BOT_USERNAME }}
          export WIKIDATA_BOT_PASSWORD=${{ secrets.WIKIDATA_BOT_PASSWORD }}
          export WIKIDATA_PUBLISH_MODE=real
          pnpm test lib/wikidata/__tests__/real-credentials-publication.test.ts
    env:
      WIKIDATA_BOT_USERNAME: ${{ secrets.WIKIDATA_BOT_USERNAME }}
      WIKIDATA_BOT_PASSWORD: ${{ secrets.WIKIDATA_BOT_PASSWORD }}
      WIKIDATA_PUBLISH_MODE: real
```

**Important**: Store credentials as GitHub Secrets, never commit them!

## Related Tests

- `contract-schema-integration.test.ts` - Contract/schema integration (mocked)
- `publisher.test.ts` - Publisher functionality (mocked)
- `entity-builder.test.ts` - Entity builder (mocked)

## See Also

- [Wikidata Authentication Setup](../docs/features/wikidata/WIKIDATA_AUTH_SETUP.md)
- [Vercel Deployment Guide](../../../docs/deployment/VERCEL_WIKIDATA_PUBLISHING.md)
- [Contracts and Schemas Documentation](../../../docs/features/wikidata/CONTRACTS_SCHEMAS_TESTS.md)

