# Vercel Deployment: Wikidata Publishing Configuration

## Overview

When you deploy to Vercel for commercial use, the REAL wikidata publishing behavior depends on **environment variables** you configure in Vercel's dashboard.

## Current Publishing Status

### Test.wikidata.org (Available for Real Publishing)
- ✅ **Real API calls enabled** when credentials are configured
- ✅ **Safe testing environment** - no impact on production Wikidata
- ✅ **Recommended** for all commercial deployments initially

### Production wikidata.org (Currently Disabled)
- 🚫 **Publishing is BLOCKED** in code (line 113-122 in `publisher.ts`)
- 🚫 **Bot account is banned** from wikidata.org
- 🚫 **Only test.wikidata.org is available** for real publishing
- ⚠️ **Production publishing must be enabled manually** after test verification

## How REAL Publishing Works in Vercel

### Step 1: Environment Variable Check

The publisher checks these environment variables in order:

1. **`WIKIDATA_PUBLISH_MODE`**:
   - If set to `'mock'` → Always uses mock mode (returns fake QIDs)
   - If set to `'real'` → Attempts real API calls (requires credentials)
   - If not set → Defaults to `'real'` mode

2. **`WIKIDATA_BOT_USERNAME`** and **`WIKIDATA_BOT_PASSWORD`**:
   - If missing or invalid → Falls back to mock mode
   - If valid → Uses real API calls to test.wikidata.org

### Step 2: Credential Validation

The `hasInvalidCredentials()` method checks:

```typescript
// Missing credentials
if (!botUsername || !botPassword) {
  return true; // Invalid
}

// Placeholder detection
if (
  botUsername.includes('YourBot') ||
  botUsername.includes('example') ||
  botPassword.includes('the_full_bot_password') ||
  botPassword.length < 5
) {
  return true; // Invalid
}
```

### Step 3: Publishing Flow

```
┌─────────────────────────────────────┐
│  Publish Request                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check WIKIDATA_PUBLISH_MODE        │
│  - 'mock' → Return mock QID          │
│  - 'real' → Continue                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check Production Flag              │
│  - production=true → BLOCKED         │
│  - production=false → Continue       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check Credentials                   │
│  - Invalid → Fallback to mock        │
│  - Valid → Real API call             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Real API Call to test.wikidata.org │
│  - Authenticate (login + CSRF)      │
│  - Publish entity                    │
│  - Return real QID                   │
└─────────────────────────────────────┘
```

## Setting Up Credentials in Vercel

### Step 1: Create Bot Account on test.wikidata.org

1. **Create account**: https://test.wikidata.org
   - Username: e.g., `GEMflushBot`
   - Email: Your business email

2. **Request bot flag** (optional but recommended):
   - Go to: https://test.wikidata.org/wiki/Wikidata:Requests_for_permissions/Bot
   - Create request explaining your bot's purpose
   - Approval is typically quick on test.wikidata.org

3. **Create bot password**:
   - Go to: https://test.wikidata.org/wiki/Special:BotPasswords
   - Click "Create new bot password"
   - Grant permissions: `editpage`, `createeditmovepage`
   - Copy the password (format: `username@botname:randompassword`)

### Step 2: Configure Vercel Environment Variables

**Via Vercel Dashboard:**

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```bash
# Required for REAL publishing
WIKIDATA_PUBLISH_MODE=real
WIKIDATA_BOT_USERNAME=YourBotName@YourBotName
WIKIDATA_BOT_PASSWORD=your_actual_bot_password_here

# Optional: Enable bot flag (only if bot flag is granted)
WIKIDATA_USE_BOT_FLAG=true
```

**Via Vercel CLI:**

```bash
vercel env add WIKIDATA_PUBLISH_MODE
# Enter: real

vercel env add WIKIDATA_BOT_USERNAME
# Enter: YourBotName@YourBotName

vercel env add WIKIDATA_BOT_PASSWORD
# Enter: your_actual_bot_password_here

vercel env add WIKIDATA_USE_BOT_FLAG
# Enter: true (only if bot flag is granted)
```

### Step 3: Set Environment Scope

For each variable, set the scope:
- ✅ **Production** - For production deployments
- ✅ **Preview** - For preview deployments (optional)
- ✅ **Development** - For local development (optional)

**Important**: Make sure to set these for **Production** environment!

### Step 4: Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## Verification

### Check if Real Publishing is Active

Look for these log messages in Vercel logs:

**Real Publishing Active:**
```
[REAL] Publishing entity to test.wikidata.org
[REAL] CSRF token obtained successfully
[REAL] Entity published successfully
```

**Mock Mode (Credentials Missing):**
```
[REAL] Wikidata credentials not configured or are placeholders. Falling back to mock mode.
[REAL] To enable real publishing, set valid WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD
[REAL] Returning mock QID (credentials not configured): Q999999...
```

**Mock Mode (Explicit):**
```
[MOCK] Publishing entity to test.wikidata.org (mock mode)
[MOCK] Returning mock QID for test.wikidata.org: Q999999...
```

### Test Publishing

1. **Create a business** via your Vercel deployment
2. **Trigger publishing** (via API or UI)
3. **Check Vercel logs** for `[REAL]` messages
4. **Verify QID** - Real QIDs are `Q####` (not `Q999999####`)
5. **Visit entity**: `https://test.wikidata.org/wiki/Q{returned_qid}`

## Current Limitations

### Production wikidata.org Publishing

**Status**: 🚫 **DISABLED** in code

**Reason**: Bot account is banned from wikidata.org

**Code Location**: `lib/wikidata/publisher.ts` lines 113-122

```typescript
// PRODUCTION MODE: Currently mocked and DISABLED
// IMPORTANT: Bot account is banned from wikidata.org - only use test.wikidata.org
if (production) {
  console.warn(`[BLOCKED] Production publishing to wikidata.org is DISABLED`);
  console.warn(`[BLOCKED] Bot account is banned from wikidata.org - only test.wikidata.org is available`);
  // ... returns mock QID
}
```

**To Enable Production Publishing:**

1. **Create new bot account** on wikidata.org (not test.wikidata.org)
2. **Request bot flag** on wikidata.org (requires community approval)
3. **Update code** to remove the production block
4. **Set production credentials** in Vercel
5. **Test thoroughly** before enabling

## Security Best Practices

### 1. Never Commit Credentials

- ✅ Use Vercel environment variables
- ✅ Never commit `.env` files
- ✅ Use `.env.example` for documentation

### 2. Use Bot Passwords (Not Account Passwords)

- ✅ Bot passwords are more secure
- ✅ Can be revoked individually
- ✅ Limited permissions

### 3. Rotate Credentials Regularly

- ✅ Change bot passwords periodically
- ✅ Revoke old bot passwords
- ✅ Update Vercel environment variables

### 4. Monitor Logs

- ✅ Check Vercel logs for authentication errors
- ✅ Monitor for unauthorized access attempts
- ✅ Set up alerts for publishing failures

## Troubleshooting

### Issue: Publishing Still Returns Mock QIDs

**Check:**
1. ✅ `WIKIDATA_PUBLISH_MODE=real` is set in Vercel
2. ✅ `WIKIDATA_BOT_USERNAME` is set and doesn't contain placeholders
3. ✅ `WIKIDATA_BOT_PASSWORD` is set and is at least 5 characters
4. ✅ Environment variables are set for **Production** scope
5. ✅ Deployment was **redeployed** after adding variables

### Issue: Authentication Errors

**Check:**
1. ✅ Bot password format is correct: `username@botname:password`
2. ✅ Username format: `username@botname` (not just `username`)
3. ✅ Password is the random string (not the full `username@botname:password`)
4. ✅ Bot account exists on test.wikidata.org
5. ✅ Bot password has correct permissions (`editpage`, `createeditmovepage`)

### Issue: Rate Limiting

**Solutions:**
1. ✅ Request bot flag for higher rate limits (500+ edits/minute)
2. ✅ Without bot flag: ~50-100 edits/minute
3. ✅ Implement rate limiting in your code
4. ✅ Use batch publishing for multiple entities

## Summary

**For Commercial Use on Vercel:**

1. ✅ **Set environment variables** in Vercel dashboard:
   - `WIKIDATA_PUBLISH_MODE=real`
   - `WIKIDATA_BOT_USERNAME=YourBot@YourBot`
   - `WIKIDATA_BOT_PASSWORD=your_password`

2. ✅ **Create bot account** on test.wikidata.org (not wikidata.org)

3. ✅ **Redeploy** after adding environment variables

4. ✅ **Verify** real publishing is active via logs

5. ⚠️ **Note**: Production wikidata.org publishing is currently disabled - only test.wikidata.org works

**Result**: Real entities will be published to test.wikidata.org with real QIDs when credentials are properly configured.

