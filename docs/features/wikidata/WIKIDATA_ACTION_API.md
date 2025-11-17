# Wikidata/Wikibase Action API Implementation

## Overview

This project uses the **Wikidata/Wikibase Action API** to publish business entities to Wikidata. The Action API is an extension of MediaWiki's Action API, specifically designed for interacting with Wikidata's structured data.

**Reference Documentation:**
- [Wikibase Action API](https://www.mediawiki.org/wiki/Wikibase/API)
- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Main_page)
- [Wikidata:Action API](https://www.wikidata.org/wiki/Wikidata:Main_page)

---

## API Endpoints

### Test Environment (Development)
```
https://test.wikidata.org/w/api.php
```

### Production Environment
```
https://www.wikidata.org/w/api.php
```

**Implementation:** `lib/wikidata/publisher.ts` (lines 16-17)

---

## Actions Used

### 1. `query` - Get Login Token
**Purpose:** Obtain authentication tokens for login

**Module:** `meta=tokens&type=login`

**Example Request:**
```http
GET https://test.wikidata.org/w/api.php?action=query&meta=tokens&type=login&format=json
```

**Response:**
```json
{
  "query": {
    "tokens": {
      "logintoken": "abc123..."
    }
  }
}
```

**Implementation:** `lib/wikidata/publisher.ts:193-207`

---

### 2. `login` - Authenticate
**Purpose:** Authenticate using bot password

**Module:** `action=login`

**Example Request:**
```http
POST https://test.wikidata.org/w/api.php
Content-Type: application/x-www-form-urlencoded

action=login&lgname=Username&lgpassword=BotPassword&lgtoken=abc123&format=json
```

**Response:**
```json
{
  "login": {
    "result": "Success",
    "lguserid": 12345,
    "lgusername": "Username"
  }
}
```

**Cookies:** Session cookies are returned in `Set-Cookie` headers and must be included in subsequent requests.

**Implementation:** `lib/wikidata/publisher.ts:214-311`

---

### 3. `query` - Get CSRF Token
**Purpose:** Obtain CSRF token required for write operations

**Module:** `meta=tokens&type=csrf`

**Example Request:**
```http
GET https://test.wikidata.org/w/api.php?action=query&meta=tokens&type=csrf&format=json
Cookie: [session cookies from login]
```

**Response:**
```json
{
  "query": {
    "tokens": {
      "csrftoken": "xyz789..."
    }
  }
}
```

**Implementation:** `lib/wikidata/publisher.ts:322-382`

---

### 4. `wbeditentity` - Create/Edit Entity ⭐
**Purpose:** Create new items or edit existing items in Wikidata

**Module:** Wikibase extension (`action=wbeditentity`)

**Example Request:**
```http
POST https://test.wikidata.org/w/api.php
Content-Type: application/x-www-form-urlencoded
Cookie: [session cookies]

action=wbeditentity
&new=item
&data={"labels":{"en":{"language":"en","value":"Business Name"}},"descriptions":{"en":{"language":"en","value":"Description"}},"claims":{...}}
&token=xyz789...
&format=json
&bot=1
&summary=Created via GEMflush
```

**Parameters:**
- `action=wbeditentity` - Wikibase action for editing entities
- `new=item` - Create a new item (omit for editing existing items)
- `data` - JSON string containing entity structure (labels, descriptions, claims)
- `token` - CSRF token (required for write operations)
- `format=json` - Response format
- `bot=1` - Optional: Mark edit as bot edit (requires bot flag)
- `summary` - Edit summary (visible in history)

**Response (Success):**
```json
{
  "success": 1,
  "entity": {
    "id": "Q123456",
    "labels": {...},
    "descriptions": {...},
    "claims": {...}
  }
}
```

**Response (Error):**
```json
{
  "error": {
    "code": "badtoken",
    "info": "Invalid token",
    ...
  }
}
```

**Implementation:** `lib/wikidata/publisher.ts:116-164`

**Documentation:** [Wikibase API: wbeditentity](https://www.mediawiki.org/wiki/Wikibase/API#wbeditentity)

---

## Authentication Flow

### Bot Password Authentication (Current Implementation)

**Flow:**
1. **Get Login Token** → `action=query&meta=tokens&type=login`
2. **Login** → `action=login` with username, bot password, and login token
3. **Extract Cookies** → Store session cookies from `Set-Cookie` headers
4. **Get CSRF Token** → `action=query&meta=tokens&type=csrf` with session cookies
5. **Publish Entity** → `action=wbeditentity` with CSRF token and session cookies

**Bot Password Format:**
```
Username@BotName:RandomPassword
```

**Example:**
```
WIKIDATA_BOT_USERNAME=Puddin1066@KGaaS_Bot
WIKIDATA_BOT_PASSWORD=abc123xyz789...
```

**Implementation:** `lib/wikidata/publisher.ts:178-382`

---

## Entity Data Structure

### What Gets Published

The entity structure sent to `wbeditentity` includes:

**1. Labels** (Entity Names)
```json
{
  "labels": {
    "en": {
      "language": "en",
      "value": "Alpha Dental Center"
    }
  }
}
```

**2. Descriptions** (Brief Descriptions)
```json
{
  "descriptions": {
    "en": {
      "language": "en",
      "value": "Dental practice in Attleboro, Massachusetts"
    }
  }
}
```

**3. Claims** (Statements/Properties)
```json
{
  "claims": {
    "P31": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P31",
        "datavalue": {
          "value": {"entity-type": "item", "id": "Q4830453", "numeric-id": 4830453},
          "type": "wikibase-entityid"
        }
      },
      "type": "statement",
      "qualifiers": {...},
      "references": {...}
    }]
  }
}
```

**Full Structure:** See `lib/types/gemflush.ts` → `WikidataEntityData`

---

## Rate Limits

### Without Bot Flag
- **test.wikidata.org:** ~50-100 edits/minute
- **wikidata.org:** ~50 edits/minute
- Edits appear in recent changes

### With Bot Flag
- **test.wikidata.org:** 500+ edits/minute (depends on approval)
- **wikidata.org:** 500+ edits/minute (requires community approval)
- Edits marked as automated
- Less likely to be reverted

**Note:** Single `wbeditentity` call with complete entity = **1 edit** (regardless of number of claims)

**Implementation:** `lib/wikidata/publisher.ts:134` (conditional `bot=1` parameter)

---

## Error Handling

### Common Errors

**1. Authentication Errors**
- `badtoken` - Invalid or expired CSRF token
- `assertuserfailed` - Authentication failed
- `sessionexpired` - Session expired, re-login required

**Implementation:** `lib/wikidata/publisher.ts:232-291`

**2. API Errors**
- `mustbeloggedin` - Not authenticated
- `missingparam` - Required parameter missing
- `baddata` - Invalid entity data structure

**Implementation:** `lib/wikidata/publisher.ts:142-149`

**3. Validation Errors**
- Entity structure doesn't match Wikibase schema
- Property IDs don't exist
- Value types don't match property data types

---

## Implementation Details

### Files

- **Publisher:** `lib/wikidata/publisher.ts`
  - `publishEntity()` - Main publishing method
  - `login()` - Bot password authentication
  - `getCSRFTokenAndCookies()` - Token management
  - `updateEntity()` - Edit existing entities

- **Entity Builder:** `lib/wikidata/tiered-entity-builder.ts`
  - Builds Wikidata-compatible entity JSON from business data

- **Types:** `lib/types/gemflush.ts`
  - `WikidataEntityData` - Entity structure type definition

### Environment Variables

```bash
# Required for real publishing
WIKIDATA_BOT_USERNAME=Username@BotName
WIKIDATA_BOT_PASSWORD=bot_password_here

# Optional
WIKIDATA_USE_BOT_FLAG=true  # Only if bot flag is granted
WIKIDATA_PUBLISH_MODE=real  # 'mock' or 'real'
```

---

## Testing

### Test Script
```bash
pnpm tsx scripts/test-wikidata-action-api.ts
```

This script tests:
1. READ operations (no auth required)
2. WRITE capability (login + CSRF token)

### E2E Test
```bash
pnpm test:e2e -- tests/e2e/frogandtoad-real-flow.spec.ts
```

Full end-to-end test including:
- Notability check
- Entity building
- Publishing via Action API

---

## Compliance with Wikidata Standards

✅ **Correct API Endpoint:** Uses `/w/api.php`  
✅ **Proper Authentication:** Bot password flow  
✅ **CSRF Protection:** Tokens obtained and used correctly  
✅ **Entity Structure:** Follows Wikibase JSON format  
✅ **Edit Summaries:** Includes descriptive summaries  
✅ **Rate Limiting:** Respects bot flag requirements  
✅ **Error Handling:** Comprehensive error detection  

---

## References

- [Wikibase API Documentation](https://www.mediawiki.org/wiki/Wikibase/API)
- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Main_page)
- [Wikidata:Action API](https://www.wikidata.org/wiki/Wikidata:Main_page)
- [Bot Passwords](https://www.mediawiki.org/wiki/Special:BotPasswords)

