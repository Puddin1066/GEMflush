# Wikidata Authentication - Detailed Technical Documentation

## Overview

This document details the technical specifics of authenticating with Wikidata's Action API, based on extensive testing and debugging. It covers the authentication flow, cookie handling, token management, and common issues.

## Critical Discovery: Cookie Requirement

**IMPORTANT**: MediaWiki/Wikidata requires session cookies from the token request to be included in the login request. Without these cookies, authentication will fail with "Unable to continue login. Your session most likely timed out."

### Cookie Flow

1. **Token Request**: When requesting a login token, MediaWiki sets session cookies in the response
2. **Cookie Extraction**: These cookies must be extracted from the `set-cookie` header
3. **Login Request**: The same cookies must be included in the login request's `Cookie` header
4. **Session Continuity**: This maintains session state between token retrieval and authentication

## Authentication Flow

### Step 1: Get Login Token

**Endpoint**: `GET https://test.wikidata.org/w/api.php?action=query&meta=tokens&type=login&format=json`

**Request**:
```http
GET /w/api.php?action=query&meta=tokens&type=login&format=json HTTP/1.1
Host: test.wikidata.org
User-Agent: GEMflush/1.0 (auth debug test)
```

**Response**:
```json
{
  "batchcomplete": "",
  "query": {
    "tokens": {
      "logintoken": "127ce2ae5f0aae81fc72b9f6c11fd6bf691ac968+\\"
    }
  }
}
```

**Critical**: Extract cookies from `set-cookie` header:
```
set-cookie: testwikidatawikiSession=r0tgb28kuvrs6u4bt1ad5sl2rpjqnh4q; path=/; secure; HttpOnly; SameSite=None, WMF-Last-Access=17-Nov-2025; ...
```

**Cookie Parsing**:
```javascript
const setCookieHeader = response.headers.get('set-cookie');
const cookies = setCookieHeader
  .split(',')
  .map(cookie => cookie.split(';')[0].trim())
  .join('; ');
// Result: "testwikidatawikiSession=r0tgb28kuvrs6u4bt1ad5sl2rpjqnh4q; WMF-Last-Access=17-Nov-2025; ..."
```

### Step 2: Login with Bot Password

**Endpoint**: `POST https://test.wikidata.org/w/api.php`

**Request** (NEW FORMAT - Recommended):
```http
POST /w/api.php HTTP/1.1
Host: test.wikidata.org
Content-Type: application/x-www-form-urlencoded
User-Agent: GEMflush/1.0 (auth debug test)
Cookie: testwikidatawikiSession=r0tgb28kuvrs6u4bt1ad5sl2rpjqnh4q; WMF-Last-Access=17-Nov-2025; ...

action=login
&lgname=Puddin1066@Puddin1066@kgaasbot
&lgpassword=0g435bt282nfk3fhq7rql3qvt0astl3h
&lgtoken=127ce2ae5f0aae81fc72b9f6c11fd6bf691ac968+\\
&format=json
```

**Response** (Success):
```json
{
  "login": {
    "result": "Success",
    "lguserid": 8388,
    "lgusername": "Puddin1066"
  }
}
```

**Response** (NeedToken - requires second attempt):
```json
{
  "login": {
    "result": "NeedToken",
    "token": "same_token_as_before"
  }
}
```

**Response** (Failure):
```json
{
  "login": {
    "result": "Failed",
    "reason": "Unable to continue login. Your session most likely timed out."
  }
}
```

## Bot Password Formats

### NEW FORMAT (Recommended)

Based on Wikidata's bot password creation message:
```
The new password to log in with Puddin1066@Puddin1066@kgaasbot is 0g435bt282nfk3fhq7rql3qvt0astl3h.
```

**Format**:
- `lgname`: `{username}@{username}@{botname}`
- `lgpassword`: Just the random password string (no prefix)

**Example**:
- Username: `Puddin1066`
- Bot name: `kgaasbot`
- Password: `0g435bt282nfk3fhq7rql3qvt0astl3h`
- `lgname`: `Puddin1066@Puddin1066@kgaasbot`
- `lgpassword`: `0g435bt282nfk3fhq7rql3qvt0astl3h`

### OLD FORMAT (Legacy Compatibility)

For older bots or compatibility:
```
(For old bots which require the login name to be the same as the eventual username, 
you can also use Puddin1066 as username and Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h as password.)
```

**Format**:
- `lgname`: `{username}` (just username)
- `lgpassword`: `{username}@{botname}@{password}` (full format)

**Example**:
- `lgname`: `Puddin1066`
- `lgpassword`: `Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h`

## Token Timing

### Token Expiration

- **Typical expiration**: ~30 seconds (MediaWiki default)
- **Warning threshold**: >5 seconds old (may be risky)
- **Critical threshold**: >30 seconds old (likely expired)

### Best Practices

1. **Get token immediately before use**: Don't cache tokens
2. **Use token within seconds**: Ideally <1 second after obtaining
3. **Include cookies**: Always include cookies from token request
4. **Handle NeedToken**: If `NeedToken` response, retry with SAME token (not new one)

### Timing Analysis from Tests

**Successful Authentication**:
- Token request duration: ~100-250ms
- Time between token and login: <1 second
- Login request duration: ~400-500ms
- Total authentication time: ~600-800ms

**Failed Authentication (without cookies)**:
- Error: "Unable to continue login. Your session most likely timed out."
- Occurs even with fresh tokens (<1 second old)
- **Root cause**: Missing cookies from token request

## NeedToken Response Handling

MediaWiki may return `NeedToken` which requires a two-step login:

1. **First attempt**: Returns `NeedToken`
2. **Second attempt**: Use the **SAME token** (not a new one) with same credentials
3. **Result**: Should return `Success`

**Important**: Do NOT get a fresh token for the second attempt. Use the exact same token from the first attempt.

## Environment Variables

### Required

```bash
WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot
WIKIDATA_BOT_PASSWORD=0g435bt282nfk3fhq7rql3qvt0astl3h
```

### Format

- `WIKIDATA_BOT_USERNAME`: `{username}@{botname}` (e.g., `Puddin1066@kgaasbot`)
- `WIKIDATA_BOT_PASSWORD`: Just the random password string (32 characters in this case)

### Important Notes

- Bot names are **case-sensitive** - use exact case from bot password creation
- Password is just the random string, NOT the full `username@botname@password` format
- Username and bot name are separated by a single `@` in the env var

## Common Errors and Solutions

### Error: "Unable to continue login. Your session most likely timed out."

**Cause**: Missing cookies from token request in login request

**Solution**:
1. Extract cookies from token response `set-cookie` header
2. Include cookies in login request `Cookie` header
3. Ensure cookies are parsed correctly (split by `,`, take first part before `;`)

**Code Example**:
```javascript
// Get token
const tokenResponse = await fetch(tokenUrl);
const setCookieHeader = tokenResponse.headers.get('set-cookie');
const cookies = setCookieHeader
  .split(',')
  .map(cookie => cookie.split(';')[0].trim())
  .join('; ');

// Login with cookies
const loginResponse = await fetch(loginUrl, {
  method: 'POST',
  headers: {
    'Cookie': cookies,  // CRITICAL: Include cookies
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    action: 'login',
    lgname: loginUsername,
    lgpassword: loginPassword,
    lgtoken: token,
    format: 'json',
  }),
});
```

### Error: "Wrong password"

**Causes**:
1. Incorrect bot password format
2. Wrong password value
3. Bot name case mismatch

**Solutions**:
1. Verify password matches exactly what was generated at Special:BotPasswords
2. Check bot name case (e.g., `kgaasbot` not `KGaaS_Bot`)
3. Try both NEW and OLD formats
4. Verify `.env` file has correct values

### Error: "NeedToken" then still fails

**Cause**: Using a new token for the second attempt instead of the same token

**Solution**: Use the exact same token from the first attempt for the second login request

## Complete Authentication Code Example

```javascript
async function authenticate(baseUrl, botUsername, botPassword) {
  // Step 1: Get login token
  const tokenUrl = `${baseUrl}?action=query&meta=tokens&type=login&format=json`;
  const tokenResponse = await fetch(tokenUrl, {
    headers: {
      'User-Agent': 'GEMflush/1.0',
    },
  });
  
  // Extract cookies from token response
  const setCookieHeader = tokenResponse.headers.get('set-cookie');
  const cookies = setCookieHeader
    .split(',')
    .map(cookie => cookie.split(';')[0].trim())
    .join('; ');
  
  const tokenData = await tokenResponse.json();
  const loginToken = tokenData.query?.tokens?.logintoken;
  
  // Step 2: Parse credentials
  const username = botUsername.includes('@') 
    ? botUsername.split('@')[0] 
    : botUsername;
  const botName = botUsername.includes('@') 
    ? botUsername.split('@')[1] 
    : botUsername;
  
  // NEW FORMAT (recommended)
  const loginUsername = `${username}@${username}@${botName}`;
  const loginPassword = botPassword;
  
  // Step 3: Login with cookies
  const loginResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GEMflush/1.0',
      'Cookie': cookies,  // CRITICAL: Include cookies
    },
    body: new URLSearchParams({
      action: 'login',
      lgname: loginUsername,
      lgpassword: loginPassword,
      lgtoken: loginToken,
      format: 'json',
    }),
  });
  
  const loginData = await loginResponse.json();
  
  // Handle NeedToken response
  if (loginData.login?.result === 'NeedToken') {
    // Retry with SAME token
    const retryResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GEMflush/1.0',
        'Cookie': cookies,  // Use same cookies
      },
      body: new URLSearchParams({
        action: 'login',
        lgname: loginUsername,
        lgpassword: loginPassword,
        lgtoken: loginToken,  // SAME token, not new one
        format: 'json',
      }),
    });
    
    const retryData = await retryResponse.json();
    if (retryData.login?.result === 'Success') {
      // Extract session cookies from login response
      const loginCookies = retryResponse.headers.get('set-cookie');
      return { success: true, cookies: loginCookies };
    }
  }
  
  if (loginData.login?.result === 'Success') {
    // Extract session cookies from login response
    const loginCookies = loginResponse.headers.get('set-cookie');
    return { success: true, cookies: loginCookies };
  }
  
  throw new Error(`Login failed: ${loginData.login?.result} - ${loginData.login?.reason}`);
}
```

## Testing

### Running the Authentication Debug Test

```bash
pnpm test:e2e wikidata-auth-debug
```

This test provides extensive logging of:
- Token retrieval timing
- Cookie extraction and inclusion
- Login attempt timing
- Token age analysis
- Full request/response details

### Expected Output (Success)

```
[STEP 3] Getting Login Token
  - Token obtained: 127ce2ae5f0aae81fc72b9f6c11fd6bf691ac968+\\
  - Request duration: ~200-250ms
  - Cookies extracted: 9 cookies

[STEP 4] Attempting Authentication (NEW FORMAT)
  - Cookies included: testwikidatawikiSession=...; WMF-Last-Access=...
  - Token age: <1 second
  - Login result: Success
  - User ID: 8388
  - Username: Puddin1066
```

## Production vs Test Environment

### Test Environment (test.wikidata.org)

- **URL**: `https://test.wikidata.org/w/api.php`
- **Purpose**: Safe testing environment
- **Account Status**: Account `Puddin1066` is active on test.wikidata.org
- **Recommended**: Use for all development and testing

### Production Environment (www.wikidata.org)

- **URL**: `https://www.wikidata.org/w/api.php`
- **Account Status**: Account `Puddin1066` is **BLOCKED indefinitely**
- **Status**: Production publishing is disabled in code
- **Note**: Do not attempt production authentication with this account

## Security Considerations

1. **Never commit credentials**: Keep `.env` file in `.gitignore`
2. **Use test environment**: Always test on test.wikidata.org first
3. **Bot passwords**: More secure than account passwords
4. **Token expiration**: Tokens expire quickly, reducing risk if leaked
5. **Session cookies**: Handle cookies securely, don't log full values

## References

- [MediaWiki API: Login](https://www.mediawiki.org/wiki/API:Login)
- [MediaWiki Manual: Bot Passwords](https://www.mediawiki.org/wiki/Manual:Bot_passwords)
- [Wikidata Special:BotPasswords](https://test.wikidata.org/wiki/Special:BotPasswords)
- [Official Bot Password Format Spec](./OFFICIAL_BOT_PASSWORD_SPEC.md)
- [Bot Password Format Guide](./BOT_PASSWORD_FORMAT.md)

## Summary

**Key Takeaways**:

1. ✅ **Cookies are required**: Extract cookies from token response and include in login request
2. ✅ **Use NEW FORMAT**: `username@username@botname` as `lgname`, just password as `lgpassword`
3. ✅ **Get fresh tokens**: Don't cache tokens, get them immediately before use
4. ✅ **Handle NeedToken**: Retry with SAME token if `NeedToken` response
5. ✅ **Test environment only**: Use test.wikidata.org for all development

**Critical Success Factor**: Including cookies from the token request in the login request is the most important requirement. Without this, authentication will fail even with correct credentials and fresh tokens.


