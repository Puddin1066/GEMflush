# CrawlData to Wikidata Mapping: Parsing & Statement Creation

## Overview

This document explains how `crawlData` is parsed, validated, and transformed into Wikidata statements (claims) with proper PIDs (Property IDs) and QIDs (Item IDs) for publication via the Action API.

---

## Process Flow

```
crawlData (raw) 
  → Parse & Extract (entity-builder.ts)
  → Map to PIDs (property-mapping.ts)
  → Resolve QIDs (for item-type properties)
  → Create Claims (typed statements)
  → Attach References (provenance)
  → Filter by Tier (tiered-entity-builder.ts)
  → Validate Structure (Wikibase JSON spec)
  → Publish via Action API (wbeditentity)
```

---

## Step 1: Parsing crawlData

### Source: `lib/wikidata/entity-builder.ts` → `buildClaims()`

The `buildClaims()` method extracts values from `crawlData` and maps them to Wikidata properties.

### Example crawlData Input

```typescript
crawlData = {
  name: "Acme Corporation",
  description: "Software company specializing in project management tools",
  phone: "+1-555-123-4567",
  email: "contact@acmecorp.com",
  address: "123 Main St",
  location: {
    address: "123 Main St, Suite 100",
    city: "Seattle",
    state: "WA",
    country: "US",
    lat: 47.6062,
    lng: -122.3321
  },
  socialLinks: {
    twitter: "https://twitter.com/acmecorp",
    facebook: "https://facebook.com/acmecorp",
    instagram: "https://instagram.com/acmecorp",
    linkedin: "https://linkedin.com/company/acme-corp"
  },
  founded: "2015",
  businessDetails: {
    industry: "Technology",
    employeeCount: 50,
    stockSymbol: "ACME"
  }
}
```

---

## Step 2: Mapping to PIDs (Property IDs)

### Property Mapping Table

| crawlData Field | Wikidata PID | Property Name | Data Type | Transformation |
|----------------|--------------|---------------|-----------|----------------|
| `name` | **P1448** | official name | `string` | Direct assignment |
| `description` | (labels/descriptions) | - | `monolingualtext` | Used in entity labels/descriptions |
| `phone` | **P1329** | phone number | `string` | Direct assignment |
| `email` | **P968** | email address | `string` | Direct assignment |
| `location.address` | **P6375** | street address | `string` | Direct assignment or constructed |
| `location.lat/lng` | **P625** | coordinate location | `coordinate` | Converted to globecoordinate |
| `socialLinks.twitter` | **P2002** | Twitter username | `string` | URL parsed to extract username |
| `socialLinks.facebook` | **P2013** | Facebook ID | `string` | URL parsed to extract ID |
| `socialLinks.instagram` | **P2003** | Instagram username | `string` | URL parsed to extract username |
| `socialLinks.linkedin` | **P4264** | LinkedIn company ID | `string` | URL parsed to extract company ID |
| `founded` | **P571** | inception | `time` | Converted to Wikidata time format |
| `businessDetails.employeeCount` | **P1128** | employees | `quantity` | Converted to quantity with unit Q11573 |
| `businessDetails.stockSymbol` | **P249** | ticker symbol | `string` | Direct assignment |
| (always) | **P31** | instance of | `item` | Always set to `Q4830453` (business) |
| `business.url` | **P856** | official website | `url` | Direct assignment |

### Source: `lib/wikidata/property-mapping.ts`

The `BUSINESS_PROPERTY_MAP` defines the mapping rules:

```typescript
export const BUSINESS_PROPERTY_MAP: Record<string, PropertyMapping> = {
  'P31': {
    pid: 'P31',
    label: 'instance of',
    dataType: 'item',  // ← Requires QID
    required: true,
  },
  'P1329': {
    pid: 'P1329',
    label: 'phone number',
    dataType: 'string',  // ← Direct string value
    required: false,
    validator: (phone) => /^[+\d\s()-]+$/.test(phone),
  },
  'P571': {
    pid: 'P571',
    label: 'inception',
    dataType: 'time',  // ← Requires time format conversion
    required: false,
    validator: (date) => /^\d{4}(-\d{2}-\d{2})?/.test(date),
  },
  // ... more properties
};
```

---

## Step 3: QID Resolution (for Item-Type Properties)

### When QIDs Are Needed

QIDs are required for properties with `dataType: 'item'`:

- **P31** (instance of): Always `Q4830453` (business) - hardcoded
- **P452** (industry): Requires SPARQL lookup (e.g., "Technology" → `Q11650`)
- **P159** (headquarters): Requires SPARQL lookup (e.g., "Seattle" → `Q5083`)
- **P131** (located in): Requires SPARQL lookup (city QID)

### QID Resolution Process

```typescript
// Example: Resolving industry QID
if (mapping.dataType === 'item' && mapping.qidResolver) {
  const qid = await mapping.qidResolver(value);
  // value = "Technology" → qid = "Q11650"
  if (!qid) {
    console.warn(`QID not found for: ${value}`);
    continue; // Skip this property
  }
  value = qid; // Use QID instead of string
}
```

### Source: `lib/wikidata/property-mapping.ts` → `qidResolver`

```typescript
'P452': {
  pid: 'P452',
  label: 'industry',
  dataType: 'item',
  qidResolver: async (industry) => await resolveIndustryQID(industry),
  // "Technology" → "Q11650"
}
```

**Note**: Currently, most QID resolution is done via SPARQL queries to Wikidata. For properties like P31 (instance of), the QID is hardcoded.

---

## Step 4: Creating Claims (Statements)

### Claim Structure

Each claim follows the Wikibase Data Model:

```typescript
{
  mainsnak: {
    snaktype: 'value',
    property: 'P1329',  // ← PID
    datavalue: {
      value: "+1-555-123-4567",  // ← Actual value
      type: 'string'  // ← Data type
    }
  },
  type: 'statement',
  references: [...]  // ← Provenance
}
```

### Claim Creation Methods

#### 1. String Claims (`createStringClaim`)

**Used for**: P1448 (name), P1329 (phone), P968 (email), P6375 (address), P2002 (Twitter), etc.

```typescript
// Input
crawlData.phone = "+1-555-123-4567"

// Process
createStringClaim('P1329', "+1-555-123-4567", business.url)

// Output: Claim JSON
{
  mainsnak: {
    snaktype: 'value',
    property: 'P1329',
    datavalue: {
      value: "+1-555-123-4567",  // ← Direct string value
      type: 'string'
    }
  },
  type: 'statement',
  references: [{
    snaks: {
      P854: [{ datavalue: { value: "https://acmecorp.com" } }],  // Reference URL
      P813: [{ datavalue: { value: { time: "+2024-01-15T00:00:00Z" } } }]  // Retrieved date
    }
  }]
}
```

#### 2. Item Claims (`createItemClaim`)

**Used for**: P31 (instance of), P452 (industry), P159 (headquarters), etc.

```typescript
// Input
// P31 is always set to Q4830453 (business)
// For P452, QID is resolved: "Technology" → "Q11650"

// Process
createItemClaim('P31', 'Q4830453', business.url)

// Output: Claim JSON
{
  mainsnak: {
    snaktype: 'value',
    property: 'P31',
    datavalue: {
      value: {
        'entity-type': 'item',
        id: 'Q4830453'  // ← QID (not string)
      },
      type: 'wikibase-entityid'
    }
  },
  type: 'statement',
  references: [...]
}
```

#### 3. Coordinate Claims (`createCoordinateClaim`)

**Used for**: P625 (coordinate location)

```typescript
// Input
crawlData.location.lat = 47.6062
crawlData.location.lng = -122.3321

// Process
createCoordinateClaim('P625', 47.6062, -122.3321, business.url)

// Output: Claim JSON
{
  mainsnak: {
    snaktype: 'value',
    property: 'P625',
    datavalue: {
      value: {
        latitude: 47.6062,
        longitude: -122.3321,
        precision: 0.0001,
        globe: 'http://www.wikidata.org/entity/Q2'  // ← Earth
      },
      type: 'globecoordinate'
    }
  },
  type: 'statement',
  references: [...]
}
```

#### 4. Time Claims (`createTimeClaim`)

**Used for**: P571 (inception/founded date)

```typescript
// Input
crawlData.founded = "2015"

// Process
createTimeClaim('P571', "2015", business.url)

// Output: Claim JSON
{
  mainsnak: {
    snaktype: 'value',
    property: 'P571',
    datavalue: {
      value: {
        time: "+2015-00-00T00:00:00Z",  // ← Wikidata time format
        precision: 9,  // ← Year precision (9 = year, 11 = day)
        timezone: 0,
        before: 0,
        after: 0,
        calendarmodel: 'http://www.wikidata.org/entity/Q1985727'  // ← Gregorian calendar
      },
      type: 'time'
    }
  },
  type: 'statement',
  references: [...]
}
```

**Time Format Conversion**:
- Input: `"2015"` (year only)
- Output: `"+2015-00-00T00:00:00Z"` with `precision: 9`
- Input: `"2015-03-15"` (full date)
- Output: `"+2015-03-15T00:00:00Z"` with `precision: 11`

#### 5. Quantity Claims (`createQuantityClaim`)

**Used for**: P1128 (number of employees)

```typescript
// Input
crawlData.businessDetails.employeeCount = 50

// Process
createQuantityClaim('P1128', 50, business.url, 'Q11573')  // Q11573 = person (unit)

// Output: Claim JSON
{
  mainsnak: {
    snaktype: 'value',
    property: 'P1128',
    datavalue: {
      value: {
        amount: "+50",  // ← String with + prefix
        unit: "Q11573"  // ← QID for "person" unit
      },
      type: 'quantity'
    }
  },
  type: 'statement',
  references: [...]
}
```

**Unit QIDs**:
- `"1"` = dimensionless (for counts without units)
- `"Q11573"` = person (for employee counts)
- Other units can be resolved via SPARQL if needed

#### 6. URL Claims (`createUrlClaim`)

**Used for**: P856 (official website)

```typescript
// Input
business.url = "https://acmecorp.com"

// Process
createUrlClaim('P856', "https://acmecorp.com")

// Output: Claim JSON
{
  mainsnak: {
    snaktype: 'value',
    property: 'P856',
    datavalue: {
      value: "https://acmecorp.com",  // ← URL as string
      type: 'string'  // ← URLs are stored as strings in Wikidata
    }
  },
  type: 'statement'
  // Note: P856 typically doesn't need references (self-referential)
}
```

#### 7. Social Media URL Parsing

**Used for**: P2002 (Twitter), P2013 (Facebook), P2003 (Instagram), P4264 (LinkedIn)

```typescript
// Input
crawlData.socialLinks.twitter = "https://twitter.com/acmecorp"

// Process
extractUsername("https://twitter.com/acmecorp", 'twitter')
// Returns: "acmecorp"

createStringClaim('P2002', "acmecorp", business.url)

// Output: Claim JSON
{
  mainsnak: {
    snaktype: 'value',
    property: 'P2002',
    datavalue: {
      value: "acmecorp",  // ← Extracted username (not full URL)
      type: 'string'
    }
  },
  type: 'statement',
  references: [...]
}
```

**URL Parsing Rules**:
- Twitter: `https://twitter.com/username` → `username`
- Facebook: `https://facebook.com/pages/name/123456` → `123456` (ID) or `username`
- Instagram: `https://instagram.com/username` → `username`
- LinkedIn: `https://linkedin.com/company/company-name` → `company-name`

---

## Step 5: Attaching References

### Reference Structure

Every claim (except P856) gets references for provenance:

```typescript
claim.references = [
  {
    snaks: {
      P854: [  // Reference URL
        {
          snaktype: 'value',
          property: 'P854',
          datavalue: {
            value: "https://acmecorp.com",  // ← Source URL
            type: 'string'
          }
        }
      ],
      P813: [  // Retrieved date
        {
          snaktype: 'value',
          property: 'P813',
          datavalue: {
            value: {
              time: "+2024-01-15T00:00:00Z",
              precision: 11,
              timezone: 0,
              before: 0,
              after: 0,
              calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
            },
            type: 'time'
          }
        }
      ],
      P1476: [  // Title (optional, if available from notability check)
        {
          snaktype: 'value',
          property: 'P1476',
          datavalue: {
            value: {
              text: "Acme Corporation - Official Website",
              language: 'en'
            },
            type: 'monolingualtext'
          }
        }
      ]
    }
  }
]
```

### Reference Sources

1. **Primary Reference**: `business.url` (official website)
2. **Notability References**: URLs from Google Search + LLM analysis (if available)
3. **Retrieved Date**: Current date (when data was retrieved)

---

## Step 6: Complete Example: crawlData → Action API JSON

### Input: crawlData

```typescript
crawlData = {
  name: "Acme Corporation",
  phone: "+1-555-123-4567",
  email: "contact@acmecorp.com",
  location: {
    address: "123 Main St, Seattle, WA",
    lat: 47.6062,
    lng: -122.3321
  },
  socialLinks: {
    twitter: "https://twitter.com/acmecorp",
    linkedin: "https://linkedin.com/company/acme-corp"
  },
  founded: "2015",
  businessDetails: {
    employeeCount: 50
  }
}
```

### Output: Entity JSON (for Action API)

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
          "value": {
            "entity-type": "item",
            "id": "Q4830453"
          },
          "type": "wikibase-entityid"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P856": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P856",
        "datavalue": {
          "value": "https://acmecorp.com",
          "type": "string"
        }
      },
      "type": "statement"
    }],
    "P1448": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P1448",
        "datavalue": {
          "value": "Acme Corporation",
          "type": "string"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P625": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P625",
        "datavalue": {
          "value": {
            "latitude": 47.6062,
            "longitude": -122.3321,
            "precision": 0.0001,
            "globe": "http://www.wikidata.org/entity/Q2"
          },
          "type": "globecoordinate"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P6375": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P6375",
        "datavalue": {
          "value": "123 Main St, Seattle, WA",
          "type": "string"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P1329": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P1329",
        "datavalue": {
          "value": "+1-555-123-4567",
          "type": "string"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P968": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P968",
        "datavalue": {
          "value": "contact@acmecorp.com",
          "type": "string"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P571": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P571",
        "datavalue": {
          "value": {
            "time": "+2015-00-00T00:00:00Z",
            "precision": 9,
            "timezone": 0,
            "before": 0,
            "after": 0,
            "calendarmodel": "http://www.wikidata.org/entity/Q1985727"
          },
          "type": "time"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P2002": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P2002",
        "datavalue": {
          "value": "acmecorp",
          "type": "string"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P4264": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P4264",
        "datavalue": {
          "value": "acme-corp",
          "type": "string"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }],
    "P1128": [{
      "mainsnak": {
        "snaktype": "value",
        "property": "P1128",
        "datavalue": {
          "value": {
            "amount": "+50",
            "unit": "Q11573"
          },
          "type": "quantity"
        }
      },
      "type": "statement",
      "references": [{
        "snaks": {
          "P854": [{"datavalue": {"value": "https://acmecorp.com", "type": "string"}}],
          "P813": [{"datavalue": {"value": {"time": "+2024-01-15T00:00:00Z", "precision": 11}, "type": "time"}}]
        }
      }]
    }]
  }
}
```

### Action API Request

```http
POST https://test.wikidata.org/w/api.php
Content-Type: application/x-www-form-urlencoded
Cookie: [session cookies]

action=wbeditentity
&new=item
&data={"labels":{...},"descriptions":{...},"claims":{...}}
&token=xyz789...
&format=json
&bot=1
&summary=Created via GEMflush
```

---

## Data Type Transformations Summary

| crawlData Type | Wikidata Type | Transformation | Example |
|---------------|--------------|-----------------|---------|
| `string` | `string` | Direct | `"Acme Corp"` → `"Acme Corp"` |
| `string` (URL) | `string` | Direct | `"https://acmecorp.com"` → `"https://acmecorp.com"` |
| `string` (date) | `time` | Format conversion | `"2015"` → `"+2015-00-00T00:00:00Z"` |
| `number` | `quantity` | Add unit QID | `50` → `{"amount": "+50", "unit": "Q11573"}` |
| `{lat, lng}` | `globecoordinate` | Structure conversion | `{47.6062, -122.3321}` → `{latitude: 47.6062, longitude: -122.3321, ...}` |
| `string` (item) | `wikibase-entityid` | QID resolution | `"Technology"` → `"Q11650"` |
| `string` (social URL) | `string` | Extract username | `"https://twitter.com/acmecorp"` → `"acmecorp"` |

---

## Key Implementation Files

1. **`lib/wikidata/entity-builder.ts`**
   - `buildClaims()` - Main parsing & mapping logic
   - `createStringClaim()` - String value claims
   - `createItemClaim()` - QID-based claims
   - `createTimeClaim()` - Date/time claims
   - `createQuantityClaim()` - Numeric claims with units
   - `createCoordinateClaim()` - Location coordinates
   - `extractUsername()` - Social media URL parsing

2. **`lib/wikidata/property-mapping.ts`**
   - `BUSINESS_PROPERTY_MAP` - PID definitions
   - `qidResolver` functions - QID resolution logic

3. **`lib/wikidata/tiered-entity-builder.ts`**
   - `buildEntity()` - Tier-based filtering
   - `getPropertiesForTier()` - Property set by tier

4. **`lib/wikidata/publisher.ts`**
   - `publishEntity()` - Action API publication
   - `validateEntityForWikidata()` - Pre-publication validation

---

## Validation & Error Handling

### Pre-Publication Validation

1. **Type Validation**: Ensures `datavalue.type` matches property mapping
2. **QID Format**: Validates QIDs start with "Q" and are numeric
3. **Value Validation**: Uses property validators (e.g., phone regex, email format)
4. **Structure Validation**: Ensures entity conforms to Wikibase JSON spec

### Common Errors

1. **Type Mismatch**: Property expects `item` but got `string` (or vice versa)
2. **Invalid QID**: QID doesn't exist in Wikidata
3. **Missing Required**: Required property (P31, P856, P1448) missing
4. **Invalid Format**: Date/phone/email doesn't match expected format

---

## Summary

The crawlData parsing and mapping process:

1. **Extracts** values from `crawlData` fields
2. **Maps** to PIDs using `BUSINESS_PROPERTY_MAP`
3. **Resolves** QIDs for item-type properties (via SPARQL)
4. **Transforms** values to Wikidata data types (time, quantity, coordinate)
5. **Creates** claims with proper structure (mainsnak, datavalue, type)
6. **Attaches** references for provenance (P854, P813, P1476)
7. **Filters** by tier (Free/Pro/Agency property sets)
8. **Validates** structure before publication
9. **Publishes** via Action API `wbeditentity` action

The result is a complete Wikidata entity JSON structure ready for publication, with all crawlData values properly parsed, typed, and referenced.



