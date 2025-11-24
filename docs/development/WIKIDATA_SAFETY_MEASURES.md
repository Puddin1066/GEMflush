# Wikidata Publishing Safety Measures

**Critical:** This document explains the safety measures in place to prevent account blocking and ensure reliable publishing.

---

## 🛡️ Safety Principles

1. **Always Default to test.wikidata.org** - Production publishing can get accounts blocked
2. **Validate PIDs/QIDs Before Publishing** - Prevent incompatibility errors
3. **Tolerate Errors in Test Mode** - test.wikidata.org is more forgiving
4. **Fail Fast in Production** - Don't attempt production if validation fails

---

## 🔒 Safety Measures Implemented

### 1. Forced Test Mode (Default)

**Location:** `lib/wikidata/client.ts` - `publishEntity()`

**Implementation:**
```typescript
// SAFETY: Force test.wikidata.org - production publishing can get accounts blocked
const allowProduction = process.env.WIKIDATA_ALLOW_PRODUCTION === 'true';
if (options.target === 'production' && !allowProduction) {
  console.warn('[SAFETY] Production publishing blocked. Publishing to test.wikidata.org instead.');
  options.target = 'test';
}
```

**Behavior:**
- ✅ All publishing defaults to `test.wikidata.org`
- ✅ Production publishing requires explicit `WIKIDATA_ALLOW_PRODUCTION=true`
- ✅ API route also blocks production (double safety)

### 2. PID/QID Validation

**Location:** `lib/wikidata/client.ts` - `validatePIDsAndQIDs()`

**What It Validates:**
- ✅ PID format (must be `P` followed by numbers)
- ✅ QID format (must be `Q` followed by numbers)
- ✅ Known valid PIDs (whitelist approach)
- ✅ Claim structure (mainsnak, datavalue)
- ✅ Type mismatches

**Behavior:**
- ⚠️ **Test Mode**: Logs warnings but continues (test.wikidata.org tolerates errors)
- ❌ **Production Mode**: Fails early to prevent blocking

**Example:**
```typescript
// Invalid PID format
errors.push(`Invalid PID format: P123abc (must be P followed by numbers)`);

// Invalid QID format
errors.push(`PID P131 has invalid QID format: Q123abc`);

// Unknown PID (warning only)
console.warn(`[VALIDATION] PID P9999 not in known whitelist - may cause incompatibility`);
```

### 3. Error Handling for PID/QID Incompatibility

**Location:** `lib/wikidata/client.ts` - `publishEntity()` catch block

**What It Detects:**
- `modification-failed` - Property/value incompatibility
- `invalid-snak` - Invalid claim structure
- `bad-request` - Malformed entity data
- `property-not-found` - PID doesn't exist

**Behavior:**
- Provides helpful error messages
- Explains that test.wikidata.org tolerates these better
- Guides user to check PIDs/QIDs

**Example Error Message:**
```
modification-failed: Property P123 does not allow value type 'string'

This error likely indicates PID/QID incompatibility. 
test.wikidata.org tolerates these errors better than production. 
Check that all PIDs and QIDs are valid and compatible.
```

### 4. API Route Blocking

**Location:** `app/api/wikidata/publish/route.ts`

**Implementation:**
```typescript
// IMPORTANT: Force test.wikidata.org only
const publishToProduction = false;
if (requestedProduction) {
  console.warn('[BLOCKED] Production publishing requested but blocked');
  console.warn('[BLOCKED] Publishing to test.wikidata.org instead');
}
```

**Behavior:**
- ✅ Always publishes to test.wikidata.org
- ✅ Ignores `publishToProduction` request parameter
- ✅ Logs warning if production was requested

---

## 📋 Valid PIDs Whitelist

The system uses a whitelist of known valid PIDs for businesses:

- `P31` - instance of (required)
- `P856` - official website
- `P1448` - official name
- `P625` - coordinate location
- `P6375` - street address
- `P131` - located in
- `P17` - country
- `P452` - industry
- `P1329` - phone number
- `P968` - email address
- `P159` - headquarters location
- `P571` - inception
- `P112` - founded by
- `P1128` - employees

**Note:** PIDs not in this list will generate warnings but won't block publishing in test mode.

---

## 🧪 Test vs Production Behavior

### Test Mode (test.wikidata.org)

**Tolerates:**
- ✅ Unknown PIDs (will validate and return error if invalid)
- ✅ Invalid QIDs (will return error but won't block account)
- ✅ Type mismatches (will return error but won't block account)
- ✅ Missing required properties (will return error but won't block account)

**Benefits:**
- Safe testing environment
- No risk of account blocking
- Can test edge cases
- Errors are informative, not destructive

### Production Mode (wikidata.org)

**Strict:**
- ❌ Unknown PIDs → Account may be flagged
- ❌ Invalid QIDs → Account may be blocked
- ❌ Type mismatches → Account may be blocked
- ❌ Repeated errors → Account will be blocked

**Risks:**
- Account blocking for inaccurate publications
- Permanent ban for repeated violations
- No recovery mechanism

---

## 🚨 Why Production Publishing is Blocked

1. **Account Blocking Risk**
   - Production wikidata.org has strict validation
   - Invalid PIDs/QIDs can trigger account flags
   - Repeated errors result in permanent bans

2. **No Recovery**
   - Once blocked, account cannot be unblocked easily
   - Requires manual intervention from Wikidata admins
   - Process can take weeks

3. **Test Environment is Sufficient**
   - test.wikidata.org provides same validation
   - Can test all functionality safely
   - No risk of blocking

---

## ✅ Best Practices

1. **Always Use Test Mode**
   - Default behavior is test.wikidata.org
   - Only enable production after thorough testing
   - Validate all PIDs/QIDs before production

2. **Validate Before Publishing**
   - Run `validateOnly: true` first
   - Check validation errors
   - Fix issues before publishing

3. **Monitor Errors**
   - Check terminal logs for PID/QID warnings
   - Fix validation errors before retrying
   - Don't ignore warnings

4. **Test Thoroughly**
   - Test with various business types
   - Test edge cases (missing data, invalid formats)
   - Verify all PIDs/QIDs resolve correctly

---

## 🔧 Configuration

### Environment Variables

```bash
# Force test mode (default)
# No environment variable needed - test is default

# Enable production (NOT RECOMMENDED)
WIKIDATA_ALLOW_PRODUCTION=true

# Publishing mode
WIKIDATA_PUBLISH_MODE=real  # or 'mock'
```

### Code Configuration

```typescript
// Always defaults to test
const options: PublishOptions = {
  target: 'test',  // Default, safe
  // target: 'production',  // Requires WIKIDATA_ALLOW_PRODUCTION=true
};

// Validate before publishing
const result = await client.publishEntity(entity, {
  validateOnly: true,  // Validate first
  target: 'test',
});
```

---

## 📊 Error Handling Flow

```
Publish Request
    ↓
Check Production Allowed? → NO → Force test.wikidata.org
    ↓ YES (if allowed)
Validate PIDs/QIDs
    ↓
Errors Found?
    ↓ YES
Test Mode? → YES → Log warnings, continue
    ↓ NO
Production Mode? → YES → Fail early (prevent blocking)
    ↓
Publish to test.wikidata.org
    ↓
API Error?
    ↓ YES
Check Error Type
    ↓
PID/QID Error? → YES → Provide helpful message
    ↓
Return error with guidance
```

---

## 🎯 Summary

✅ **All publishing defaults to test.wikidata.org**  
✅ **Production publishing is blocked by default**  
✅ **PIDs/QIDs are validated before publishing**  
✅ **Errors are handled gracefully in test mode**  
✅ **Helpful error messages guide fixes**  

**Result:** Safe, reliable publishing that won't get accounts blocked.

---

**Last Updated:** January 2025  
**Maintainer:** Development team

