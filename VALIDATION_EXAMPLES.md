# Validation Layer: What Does It Actually Validate?

## Simple Explanation

`lib/validation/business.ts` is like a **bouncer at the door of your API**. It checks that incoming data from users is:
1. The right shape
2. The right type
3. Within acceptable limits
4. Not missing required pieces

Before letting any data into your database, it asks: "Does this look right?"

## What It Validates (With Examples)

### 1. Creating a New Business

When a user submits this form:
```
Business Name: [Acme Coffee Shop]
Website: [https://acmecoffee.com]
Category: [Restaurant]
City: [San Francisco]
State: [CA]
Country: [US]
```

The validation checks:

#### ✅ Valid Example (Passes):
```json
{
  "name": "Acme Coffee Shop",
  "url": "https://acmecoffee.com",
  "category": "restaurant",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US"
  }
}
```

**Checks:**
- ✅ Name is at least 2 characters
- ✅ Name is not longer than 200 characters
- ✅ URL starts with http:// or https://
- ✅ Category is one of the 13 allowed types
- ✅ City, state, country are all provided
- ✅ All fields are the correct type (strings)

**Result:** Data enters the system ✅

---

#### ❌ Invalid Example #1 - Bad URL:
```json
{
  "name": "Acme Coffee Shop",
  "url": "not-a-url",  // ❌ Invalid!
  "category": "restaurant",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US"
  }
}
```

**Error Response:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "message": "Must be a valid URL",
      "path": ["url"]
    }
  ]
}
```

**Result:** Request rejected with 400 error ❌

---

#### ❌ Invalid Example #2 - Missing City:
```json
{
  "name": "Acme Coffee Shop",
  "url": "https://acmecoffee.com",
  "category": "restaurant",
  "location": {
    "city": "",  // ❌ Empty!
    "state": "CA",
    "country": "US"
  }
}
```

**Error Response:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "message": "City is required",
      "path": ["location", "city"]
    }
  ]
}
```

**Result:** Request rejected with 400 error ❌

---

#### ❌ Invalid Example #3 - Name Too Short:
```json
{
  "name": "A",  // ❌ Only 1 character!
  "url": "https://acmecoffee.com",
  "category": "restaurant",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US"
  }
}
```

**Error Response:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "message": "Name must be at least 2 characters",
      "path": ["name"]
    }
  ]
}
```

**Result:** Request rejected with 400 error ❌

---

#### ❌ Invalid Example #4 - Invalid Category:
```json
{
  "name": "Acme Coffee Shop",
  "url": "https://acmecoffee.com",
  "category": "coffee_shop",  // ❌ Not in the list!
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US"
  }
}
```

**Error Response:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "message": "Invalid enum value. Expected 'restaurant' | 'retail' | 'healthcare' | ... (13 options)",
      "path": ["category"]
    }
  ]
}
```

**Valid categories are:**
- restaurant
- retail
- healthcare
- professional_services
- home_services
- automotive
- beauty
- fitness
- entertainment
- education
- real_estate
- technology
- other

**Result:** Request rejected with 400 error ❌

---

### 2. Optional Coordinates Validation

If a user provides GPS coordinates, they must be valid:

#### ✅ Valid Coordinates:
```json
{
  "name": "Acme Coffee Shop",
  "url": "https://acmecoffee.com",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US",
    "lat": 37.7749,     // ✅ Valid latitude
    "lng": -122.4194    // ✅ Valid longitude
  }
}
```

**Checks:**
- ✅ Latitude is between -90 and 90
- ✅ Longitude is between -180 and 180

---

#### ❌ Invalid Coordinates:
```json
{
  "name": "Acme Coffee Shop",
  "url": "https://acmecoffee.com",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US",
    "lat": 200,      // ❌ Too large! (max 90)
    "lng": -122.4194
  }
}
```

**Error Response:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "message": "Number must be less than or equal to 90",
      "path": ["location", "lat"]
    }
  ]
}
```

---

### 3. Requesting a Web Crawl

When triggering a web crawl job:

#### ✅ Valid Crawl Request:
```json
{
  "businessId": 42,
  "forceRecrawl": true
}
```

**Checks:**
- ✅ businessId is a number
- ✅ businessId is a positive integer (not 0, not negative, not decimal)
- ✅ forceRecrawl is a boolean (optional)

---

#### ❌ Invalid Crawl Request:
```json
{
  "businessId": -5,  // ❌ Negative!
  "forceRecrawl": "yes"  // ❌ Should be boolean!
}
```

**Error Response:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "message": "Number must be greater than 0",
      "path": ["businessId"]
    },
    {
      "message": "Expected boolean, received string",
      "path": ["forceRecrawl"]
    }
  ]
}
```

---

### 4. Requesting LLM Fingerprinting

When analyzing business visibility:

#### ✅ Valid Fingerprint Request:
```json
{
  "businessId": 42,
  "includeCompetitors": true
}
```

**Checks:**
- ✅ businessId is a positive integer
- ✅ includeCompetitors is a boolean (optional, defaults to true)

---

### 5. Publishing to Wikidata

When publishing a business to Wikidata:

#### ✅ Valid Publish Request:
```json
{
  "businessId": 42,
  "publishToProduction": false  // false = test.wikidata.org
}
```

**Checks:**
- ✅ businessId is a positive integer
- ✅ publishToProduction is a boolean (optional, defaults to false)

**Safety:** Defaults to test environment to prevent accidental production publishes!

---

## Real-World Attack Prevention

### Attack #1: SQL Injection Attempt
**Malicious Input:**
```json
{
  "name": "'; DROP TABLE businesses; --",
  "url": "https://evil.com"
}
```

**What Happens:**
1. Validation passes (it's a valid string)
2. BUT: Database layer uses parameterized queries
3. Result: String is stored safely, not executed

**Validation's Role:** Ensures it's the right TYPE of data

---

### Attack #2: Script Injection
**Malicious Input:**
```json
{
  "name": "<script>alert('hacked')</script>",
  "url": "https://evil.com"
}
```

**What Happens:**
1. Validation passes (it's a string within limits)
2. BUT: UI layer escapes HTML when displaying
3. Result: Displayed as plain text, not executed

**Validation's Role:** Ensures reasonable length limits

---

### Attack #3: Type Confusion
**Malicious Input:**
```json
{
  "name": 123,  // ❌ Number instead of string
  "url": ["https://evil.com"]  // ❌ Array instead of string
}
```

**What Happens:**
1. ❌ Validation rejects immediately
2. Error: "Expected string, received number"
3. Request never reaches database

**Validation's Role:** Enforces correct data types

---

### Attack #4: Resource Exhaustion
**Malicious Input:**
```json
{
  "name": "A".repeat(10000),  // ❌ 10,000 characters!
  "url": "https://evil.com"
}
```

**What Happens:**
1. ❌ Validation rejects immediately
2. Error: "Name too long" (max 200 characters)
3. Prevents massive strings from consuming database space

**Validation's Role:** Enforces reasonable size limits

---

### Attack #5: Invalid References
**Malicious Input:**
```json
{
  "businessId": 999999999  // Business doesn't exist
}
```

**What Happens:**
1. ✅ Validation passes (valid number format)
2. Database query: `getBusinessById(999999999)`
3. Returns null
4. API route checks ownership and returns 404

**Validation's Role:** Ensures correct format, DB layer checks existence

---

## What Validation Does NOT Do

### ❌ Business Logic Validation
**Example:** "Is this user allowed to create a business?"

**Not handled by Zod schema** - handled by:
```typescript
const canAdd = await canAddBusiness(currentCount, team);
if (!canAdd) {
  return NextResponse.json({ error: 'Business limit reached' });
}
```

---

### ❌ Database Constraint Checks
**Example:** "Does this business name already exist?"

**Not handled by Zod schema** - handled by database uniqueness constraints

---

### ❌ Authorization Checks
**Example:** "Does this user own this business?"

**Not handled by Zod schema** - handled by:
```typescript
if (business.teamId !== team.id) {
  return NextResponse.json({ error: 'Unauthorized' });
}
```

---

## Visual Flow

```
┌─────────────────────────────────────┐
│ User Submits Form                   │
│ { name: "Acme", url: "..." }       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ API Receives Request                │
│ POST /api/business                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 🛡️ VALIDATION LAYER                 │
│ lib/validation/business.ts          │
│                                     │
│ Check:                              │
│ ☑ Is name 2-200 chars?             │
│ ☑ Is URL valid format?             │
│ ☑ Is category in allowed list?     │
│ ☑ Are city/state/country provided? │
│ ☑ Are coordinates in valid range?  │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    Invalid?      Valid?
        │             │
        ▼             ▼
┌──────────────┐  ┌─────────────────┐
│ Return 400   │  │ Continue to DB  │
│ with errors  │  │ with clean data │
└──────────────┘  └─────────────────┘
```

---

## Summary: What Does It Validate?

### For Business Creation:
✅ **Name:** 2-200 characters, string type
✅ **URL:** Valid HTTP/HTTPS format
✅ **Category:** One of 13 predefined types (optional)
✅ **City:** Not empty, string type
✅ **State:** Not empty, string type
✅ **Country:** Not empty, string type
✅ **Latitude:** -90 to 90 (optional)
✅ **Longitude:** -180 to 180 (optional)

### For Crawl/Fingerprint/Publish Requests:
✅ **businessId:** Positive integer
✅ **forceRecrawl:** Boolean (optional)
✅ **includeCompetitors:** Boolean (optional)
✅ **publishToProduction:** Boolean (optional)

### What It Protects Against:
🛡️ Wrong data types (string vs number vs boolean)
🛡️ Missing required fields
🛡️ Invalid URLs
🛡️ Out-of-range numbers
🛡️ Excessively long strings
🛡️ Invalid category values
🛡️ Malformed coordinates

### What It Does NOT Protect Against:
❌ Business logic violations (limits, permissions)
❌ Database constraint violations (uniqueness)
❌ Authorization issues (ownership checks)
❌ XSS/SQL injection (handled by other layers)

**Think of it as:** The first line of defense that ensures data is **structurally correct** before anything else touches it.

