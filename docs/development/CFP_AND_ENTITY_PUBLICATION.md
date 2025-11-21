# CFP Process & Entity Publication via Action API

## Overview: CFP (Crawl, Fingerprint, Publish)

The CFP pipeline is a **sequential 3-step process** that transforms a business URL into a published Wikidata entity with comprehensive visibility metrics.

```
URL → [Crawl] → [Fingerprint] → [Publish] → Wikidata Entity (QID)
```

---

## Step 1: Crawl (C)

### Purpose
Extract structured data from the business website to provide context for fingerprinting and entity building.

### Process

1. **Fetch HTML** from business URL using Firecrawl API (or Playwright/Fetch fallback)
2. **Extract structured data**:
   - JSON-LD structured data
   - Meta tags (OpenGraph, Twitter Cards)
   - HTML parsing for common patterns
3. **LLM Enhancement** (~1-2s):
   - Makes 1 LLM API call to enhance extraction
   - Extracts business category, service offerings, target audience
4. **Validate & Store**:
   - Validates extracted data against schema
   - Stores `crawlData` in database

### Output: `crawlData` Structure

```typescript
{
  // Basic Information
  name?: string;                    // Business name from website
  description?: string;             // Business description
  phone?: string;                   // Contact phone
  email?: string;                   // Contact email
  address?: string;                 // Street address
  
  // Location Data
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    lat?: number;                   // Latitude
    lng?: number;                   // Longitude
  };
  
  // Social Media
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  
  // Business Details
  founded?: string;                 // Founded year
  services?: string[];              // Services offered
  categories?: string[];             // Business categories
  
  // Rich Business Details (LLM-enhanced)
  businessDetails?: {
    industry?: string;
    sector?: string;
    employeeCount?: number;
    certifications?: string[];
    awards?: string[];
    // ... more fields
  };
  
  // LLM-Enhanced Extraction
  llmEnhanced?: {
    businessCategory?: string;
    serviceOfferings?: string[];
    targetAudience?: string;
    keyDifferentiators?: string[];
  };
}
```

**Status**: Business status changes to `'crawled'`

---

## Step 2: Fingerprint (F)

### Purpose
Measure business visibility across multiple LLMs using customer-query-style prompts.

### Process

1. **Generate Prompts** (requires `crawlData`):
   - Factual: "Tell me about [Business] in [Location]. [Description]. What do you know about them?"
   - Opinion: "Is [Business] in [Location] a good [Service]? [Description]. What are people saying?"
   - Recommendation: "What are the best [Industry] in [Location]? List the top 5 and rank them 1-5."

2. **Query LLMs** (3 models × 3 prompts = 9 queries):
   - GPT-4 Turbo
   - Claude 3 Opus
   - Gemini Pro
   - Executed in parallel (~3-5s)

3. **Analyze Responses**:
   - Mention detection (yes/no)
   - Sentiment (positive/neutral/negative)
   - Ranking position (1-5)
   - Competitor mentions

4. **Calculate Metrics**:
   - Visibility Score (0-100)
   - Mention Rate (%)
   - Sentiment Score
   - Competitive Leaderboard

### Output: `FingerprintAnalysis`

**Status**: Business status changes to `'generating'` → `'crawled'` (ready for publish)

---

## Step 3: Publish (P)

### Purpose
Build a rich Wikidata entity from business + crawlData and publish via Action API.

### Process

#### 3.1 Entity Building (`tiered-entity-builder.ts`)

**Input**: `business` + `crawlData` + `tier` + `notabilityReferences`

**Process**:

1. **Build Full Entity** (`entity-builder.ts`):
   ```typescript
   const fullEntity = await entityBuilder.buildEntity(
     business,
     crawlData,
     notabilityReferences
   );
   ```

2. **Filter by Tier**:
   - **Free**: Basic properties only (5 properties)
   - **Pro**: Enhanced properties (11+ properties)
   - **Agency**: Complete properties (15-20+ properties)

#### 3.2 How Crawled Data is Used

The `entity-builder.ts` uses `crawlData` extensively to build rich claims:

##### Labels & Descriptions

```typescript
// Labels: Use crawled name if available
labels: {
  en: {
    language: 'en',
    value: crawlData?.name || business.name
  }
}

// Descriptions: Use crawled description
descriptions: {
  en: {
    language: 'en',
    value: crawlData?.description || fallback
  }
}
```

##### Core Claims Built from CrawlData

| Property | Wikidata Property | Source | Example |
|----------|------------------|--------|---------|
| **P31** | instance of | Always | `Q4830453` (business) |
| **P856** | official website | `business.url` | `https://example.com` |
| **P1448** | official name | `crawlData.name` | "Acme Corp" |
| **P625** | coordinate location | `crawlData.location.lat/lng` | `37.7749, -122.4194` |
| **P6375** | street address | `crawlData.location.address` | "123 Main St, Seattle, WA" |
| **P1329** | phone number | `crawlData.phone` | "+1-555-123-4567" |
| **P968** | email address | `crawlData.email` | "contact@example.com" |
| **P571** | inception (founded) | `crawlData.founded` | `2015` |
| **P2002** | Twitter username | `crawlData.socialLinks.twitter` | "acmecorp" |
| **P2013** | Facebook ID | `crawlData.socialLinks.facebook` | "acmecorp" |
| **P2003** | Instagram username | `crawlData.socialLinks.instagram` | "acmecorp" |
| **P4264** | LinkedIn company ID | `crawlData.socialLinks.linkedin` | "acme-corp" |
| **P1128** | employees | `crawlData.businessDetails.employeeCount` | `50` (with unit Q11573) |

##### Example: Entity Building with CrawlData

```typescript
// Input
business = {
  id: 1,
  name: "Acme Corp",
  url: "https://acmecorp.com",
  location: { city: "Seattle", state: "WA" }
}

crawlData = {
  name: "Acme Corporation",
  description: "Software company specializing in project management tools",
  phone: "+1-555-123-4567",
  email: "contact@acmecorp.com",
  location: {
    address: "123 Main St",
    city: "Seattle",
    state: "WA",
    lat: 47.6062,
    lng: -122.3321
  },
  socialLinks: {
    twitter: "https://twitter.com/acmecorp",
    linkedin: "https://linkedin.com/company/acme-corp"
  },
  founded: "2015",
  businessDetails: {
    employeeCount: 50,
    industry: "Technology"
  }
}

// Output: Wikidata Entity
{
  labels: {
    en: { language: "en", value: "Acme Corporation" }  // From crawlData.name
  },
  descriptions: {
    en: { language: "en", value: "Software company specializing in project management tools" }  // From crawlData.description
  },
  claims: {
    P31: [{ mainsnak: { ... }, datavalue: { value: { id: "Q4830453" } } }],  // Always: business
    P856: [{ mainsnak: { ... }, datavalue: { value: "https://acmecorp.com" } }],  // From business.url
    P1448: [{ mainsnak: { ... }, datavalue: { value: "Acme Corporation" } }],  // From crawlData.name
    P625: [{ mainsnak: { ... }, datavalue: { value: { latitude: 47.6062, longitude: -122.3321 } } }],  // From crawlData.location
    P6375: [{ mainsnak: { ... }, datavalue: { value: "123 Main St, Seattle, WA" } }],  // From crawlData.location.address
    P1329: [{ mainsnak: { ... }, datavalue: { value: "+1-555-123-4567" } }],  // From crawlData.phone
    P968: [{ mainsnak: { ... }, datavalue: { value: "contact@acmecorp.com" } }],  // From crawlData.email
    P571: [{ mainsnak: { ... }, datavalue: { value: { time: "+2015-00-00T00:00:00Z" } } }],  // From crawlData.founded
    P2002: [{ mainsnak: { ... }, datavalue: { value: "acmecorp" } }],  // Extracted from crawlData.socialLinks.twitter
    P4264: [{ mainsnak: { ... }, datavalue: { value: "acme-corp" } }],  // Extracted from crawlData.socialLinks.linkedin
    P1128: [{ mainsnak: { ... }, datavalue: { value: { amount: 50, unit: "Q11573" } } }],  // From crawlData.businessDetails.employeeCount
  }
}
```

#### 3.3 Notability Check & References

Before building the entity, the system checks notability:

1. **Google Search** for independent references
2. **LLM Analysis** of reference quality
3. **Extract Top References** (URLs, titles, relevance scores)
4. **Attach to Claims**: Each claim gets references for provenance

```typescript
// Notability references are attached to claims
claim.references = [
  {
    snaks: {
      P854: [{ datavalue: { value: "https://reference1.com" } }],  // Reference URL
      P813: [{ datavalue: { value: { time: "+2024-01-15T00:00:00Z" } } }],  // Retrieved date
    }
  },
  // ... more references
];
```

#### 3.4 Tier-Based Filtering

After building the full entity, properties are filtered by tier:

```typescript
// Free Tier: 5 properties
BASIC_PROPERTIES = ['P31', 'P856', 'P1448', 'P625', 'P1329'];

// Pro Tier: 11+ properties
ENHANCED_PROPERTIES = [
  ...BASIC_PROPERTIES,
  'P6375',  // street address
  'P968',   // email
  'P2002',  // Twitter
  'P2013',  // Facebook
  'P2003',  // Instagram
  'P4264',  // LinkedIn
  'P571',   // inception
  'P1128',  // employees
];

// Agency Tier: 15-20+ properties
COMPLETE_PROPERTIES = [
  ...ENHANCED_PROPERTIES,
  'P131',   // located in (city QID)
  'P159',   // headquarters
  'P17',    // country
  'P452',   // industry
  'P18',    // image
  'P4896',  // logo
];
```

**Result**: Entity with tier-appropriate richness, all built from `crawlData` + `business` data.

---

## Publication via Action API

### Wikidata Action API Overview

The **Wikibase Action API** is an extension of MediaWiki's Action API for interacting with Wikidata's structured data.

**Endpoints**:
- Test: `https://test.wikidata.org/w/api.php`
- Production: `https://www.wikidata.org/w/api.php`

### Authentication Flow

#### 1. Get Login Token

```http
GET https://test.wikidata.org/w/api.php?action=query&meta=tokens&type=login&format=json
```

**Response**:
```json
{
  "query": {
    "tokens": {
      "logintoken": "abc123..."
    }
  }
}
```

**Implementation**: `lib/wikidata/publisher.ts:355-383`

#### 2. Login with Bot Password

```http
POST https://test.wikidata.org/w/api.php
Content-Type: application/x-www-form-urlencoded

action=login
&lgname=Username@BotName
&lgpassword=bot_password
&lgtoken=abc123...
&format=json
```

**Bot Password Format**:
```
WIKIDATA_BOT_USERNAME=Username@BotName
WIKIDATA_BOT_PASSWORD=random_password_here
```

**Response**:
```json
{
  "login": {
    "result": "Success",
    "lguserid": 12345,
    "lgusername": "Username"
  }
}
```

**Cookies**: Session cookies are returned in `Set-Cookie` headers and must be included in subsequent requests.

**Implementation**: `lib/wikidata/publisher.ts:334-523`

#### 3. Get CSRF Token

```http
GET https://test.wikidata.org/w/api.php?action=query&meta=tokens&type=csrf&format=json
Cookie: [session cookies from login]
```

**Response**:
```json
{
  "query": {
    "tokens": {
      "csrftoken": "xyz789..."
    }
  }
}
```

**Implementation**: `lib/wikidata/publisher.ts:525-600`

#### 4. Publish Entity (`wbeditentity`)

```http
POST https://test.wikidata.org/w/api.php
Content-Type: application/x-www-form-urlencoded
Cookie: [session cookies]

action=wbeditentity
&new=item
&data={"labels":{"en":{"language":"en","value":"Acme Corporation"}},"descriptions":{"en":{"language":"en","value":"Software company"}},"claims":{...}}
&token=xyz789...
&format=json
&bot=1
&summary=Created via GEMflush
```

**Parameters**:
- `action=wbeditentity` - Wikibase action for editing entities
- `new=item` - Create a new item (omit for editing existing items)
- `data` - **JSON string** containing entity structure (labels, descriptions, claims)
- `token` - CSRF token (required for write operations)
- `format=json` - Response format
- `bot=1` - Optional: Mark edit as bot edit (requires bot flag)
- `summary` - Edit summary (visible in history)

**Response (Success)**:
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

**Implementation**: `lib/wikidata/publisher.ts:700-900`

---

## Complete Flow: From URL to Published Entity

### Example: "Acme Corp" Publication

#### Step 1: Crawl
```
Input: URL = "https://acmecorp.com"

Process:
1. Fetch HTML from URL
2. Extract JSON-LD, meta tags
3. LLM enhancement call
4. Validate & store

Output: crawlData = {
  name: "Acme Corporation",
  description: "Software company specializing in project management tools",
  phone: "+1-555-123-4567",
  email: "contact@acmecorp.com",
  location: { address: "123 Main St", city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  socialLinks: { twitter: "https://twitter.com/acmecorp", linkedin: "https://linkedin.com/company/acme-corp" },
  founded: "2015",
  businessDetails: { employeeCount: 50, industry: "Technology" }
}
```

#### Step 2: Fingerprint
```
Input: business + crawlData

Process:
1. Generate prompts using crawlData (description, services, industry)
2. Query 3 LLMs × 3 prompts = 9 queries
3. Analyze responses
4. Calculate visibility score

Output: FingerprintAnalysis = {
  visibilityScore: 72,
  mentionRate: 77.8%,
  sentimentScore: 0.857,
  competitiveLeaderboard: {...}
}
```

#### Step 3: Publish

**3.1 Notability Check**:
```
Google Search → Find references → LLM analysis → Extract top references
```

**3.2 Entity Building**:
```typescript
// Build full entity from business + crawlData
fullEntity = await entityBuilder.buildEntity(
  business,
  crawlData,  // ← All rich data comes from here
  notabilityReferences
);

// Filter by tier (Pro = Enhanced properties)
filteredEntity = tieredEntityBuilder.filterByTier(fullEntity, 'pro');
```

**3.3 Action API Publication**:
```
1. Login → Get session cookies
2. Get CSRF token
3. POST wbeditentity with entity JSON
4. Receive QID (e.g., Q123456)
5. Store in database
```

**Final Entity Structure Sent to Action API**:
```json
{
  "labels": {
    "en": {
      "language": "en",
      "value": "Acme Corporation"
    }
  },
  "descriptions": {
    "en": {
      "language": "en",
      "value": "Software company specializing in project management tools"
    }
  },
  "claims": {
    "P31": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P31",
        "datavalue": {
          "value": {"entity-type": "item", "id": "Q4830453"},
          "type": "wikibase-entityid"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z"}}}]
        }
      }]
    }],
    "P856": [{"mainsnak": {...}, "datavalue": {"value": "https://acmecorp.com"}}],
    "P1448": [{"mainsnak": {...}, "datavalue": {"value": "Acme Corporation"}}],
    "P625": [{"mainsnak": {...}, "datavalue": {"value": {"latitude": 47.6062, "longitude": -122.3321}}}],
    "P6375": [{"mainsnak": {...}, "datavalue": {"value": "123 Main St, Seattle, WA"}}],
    "P1329": [{"mainsnak": {...}, "datavalue": {"value": "+1-555-123-4567"}}],
    "P968": [{"mainsnak": {...}, "datavalue": {"value": "contact@acmecorp.com"}}],
    "P571": [{"mainsnak": {...}, "datavalue": {"value": {"time": "+2015-00-00T00:00:00Z"}}}],
    "P2002": [{"mainsnak": {...}, "datavalue": {"value": "acmecorp"}}],
    "P4264": [{"mainsnak": {...}, "datavalue": {"value": "acme-corp"}}],
    "P1128": [{"mainsnak": {...}, "datavalue": {"value": {"amount": 50, "unit": "Q11573"}}}]
  }
}
```

**Action API Request**:
```http
POST https://test.wikidata.org/w/api.php
action=wbeditentity
&new=item
&data={"labels":{...},"descriptions":{...},"claims":{...}}
&token=xyz789...
&format=json
&bot=1
&summary=Created via GEMflush
```

**Response**:
```json
{
  "success": 1,
  "entity": {
    "id": "Q123456"
  }
}
```

**Result**: Entity published with QID `Q123456` ✅

---

## Key Points

### 1. CrawlData is Essential

**Why crawlData is required**:
- **Fingerprinting**: Needs description, services, industry for effective prompts
- **Entity Building**: Provides 80%+ of entity properties (phone, email, address, social links, founded date, etc.)
- **Richness**: Without crawlData, entities would have only 3-5 basic properties

### 2. Sequential Process

**Why sequential (not parallel)**:
- **Crawl → Fingerprint**: Fingerprinting requires `crawlData` for prompts
- **Fingerprint → Publish**: Publishing can use fingerprint data for richer entities
- Each step builds on the previous, ensuring data quality

### 3. Tier-Based Richness

**Property filtering by tier**:
- **Free**: 5 properties (basic)
- **Pro**: 11+ properties (enhanced with contact, social, temporal)
- **Agency**: 15-20+ properties (complete with location QIDs, images, industry)

### 4. Action API Structure

**Entity JSON structure**:
- Same structure for test.wikidata.org and wikidata.org
- Only the base URL changes (`/w/api.php`)
- All claims include references for provenance
- Follows Wikibase JSON specification

### 5. References & Notability

**Every claim gets references**:
- Official website (P854)
- Retrieved date (P813)
- Multiple references per claim for better provenance
- References come from notability check (Google Search + LLM analysis)

---

## Summary

The CFP process transforms a URL into a published Wikidata entity:

1. **Crawl** extracts structured data → produces `crawlData`
2. **Fingerprint** measures visibility → produces `FingerprintAnalysis`
3. **Publish** builds entity from `crawlData` + `business` → publishes via Action API → produces `QID`

**crawlData is the foundation** for both fingerprinting (prompts) and entity building (properties). Without it, the system would have minimal context and produce basic entities with only 3-5 properties.

The Action API (`wbeditentity`) receives a complete entity JSON structure built from crawled data, with all claims properly formatted, typed, and referenced according to Wikibase specifications.


