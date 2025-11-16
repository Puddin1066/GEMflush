# Wikidata JSON Output Specification

## Overview
The entity builder generates **Wikidata-compliant JSON** that can be directly submitted to the Wikidata Action API using the `wbeditentity` action.

## JSON Structure

### Top Level
```json
{
  "labels": { ... },
  "descriptions": { ... },
  "claims": { ... },
  "llmSuggestions": { ... }
}
```

### 1. Labels
**Purpose:** Entity name in multiple languages
**Wikidata API:** Maps directly to `labels` parameter

```json
{
  "labels": {
    "en": {
      "language": "en",
      "value": "Mother Earth Wellness"
    }
  }
}
```

### 2. Descriptions
**Purpose:** Brief entity description (250 char max)
**Wikidata API:** Maps directly to `descriptions` parameter

```json
{
  "descriptions": {
    "en": {
      "language": "en",
      "value": "Welcome to Mother Earth Wellness Dispensary in Providence..."
    }
  }
}
```

### 3. Claims (Properties)
**Purpose:** Structured facts about the entity
**Wikidata API:** Maps directly to `claims` parameter

Currently generates **8 property types**:

#### P31: Instance Of (Required)
Defines what type of entity this is.

```json
{
  "P31": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P31",
      "datavalue": {
        "value": {
          "entity-type": "item",
          "id": "Q4830453"  // business
        },
        "type": "wikibase-entityid"
      }
    },
    "type": "statement",
    "references": [...]
  }]
}
```

#### P856: Official Website
```json
{
  "P856": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P856",
      "datavalue": {
        "value": "https://motherearthri.com",
        "type": "string"
      }
    },
    "type": "statement"
  }]
}
```

#### P1448: Official Name
```json
{
  "P1448": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P1448",
      "datavalue": {
        "value": "Mother Earth Wellness",
        "type": "string"
      }
    },
    "type": "statement",
    "references": [...]
  }]
}
```

#### P2002: Twitter Username
```json
{
  "P2002": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P2002",
      "datavalue": {
        "value": "motherearthri",
        "type": "string"
      }
    },
    "type": "statement",
    "references": [...]
  }]
}
```

#### P2013: Facebook Username
```json
{
  "P2013": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P2013",
      "datavalue": {
        "value": "motherearthwellness",
        "type": "string"
      }
    },
    "type": "statement",
    "references": [...]
  }]
}
```

#### P4264: LinkedIn Company ID
```json
{
  "P4264": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P4264",
      "datavalue": {
        "value": "mother-earth-wellness",
        "type": "string"
      }
    },
    "type": "statement",
    "references": [...]
  }]
}
```

#### P452: Industry
Resolved via hybrid cache/SPARQL to Wikidata QIDs.

```json
{
  "P452": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P452",
      "datavalue": {
        "value": {
          "entity-type": "item",
          "id": "Q3197"  // Cannabis
        },
        "type": "wikibase-entityid"
      }
    },
    "type": "statement",
    "references": [...]
  }]
}
```

#### P159: Headquarters Location
Resolved via hybrid cache/SPARQL to Wikidata QIDs.

```json
{
  "P159": [{
    "mainsnak": {
      "snaktype": "value",
      "property": "P159",
      "datavalue": {
        "value": {
          "entity-type": "item",
          "id": "Q18383"  // Providence
        },
        "type": "wikibase-entityid"
      }
    },
    "type": "statement",
    "references": [...]
  }]
}
```

### 4. References
**Purpose:** Citation for each claim
**Wikidata API:** Embedded within each claim

Every claim includes references with:
- **P854**: Reference URL
- **P1476**: Title (if available)
- **P813**: Retrieved date

```json
{
  "references": [{
    "snaks": {
      "P854": [{
        "snaktype": "value",
        "property": "P854",
        "datavalue": {
          "value": "https://motherearthri.com",
          "type": "string"
        }
      }],
      "P1476": [{
        "snaktype": "value",
        "property": "P1476",
        "datavalue": {
          "value": {
            "text": "Medical Marijuana Dispensary Near Albion, RI",
            "language": "en"
          },
          "type": "monolingualtext"
        }
      }],
      "P813": [{
        "snaktype": "value",
        "property": "P813",
        "datavalue": {
          "value": {
            "time": "+2025-11-10T00:00:00Z",
            "precision": 11,
            "calendarmodel": "http://www.wikidata.org/entity/Q1985727"
          },
          "type": "time"
        }
      }]
    }
  }]
}
```

### 5. LLM Suggestions (Metadata - Not Published)
**Purpose:** Quality metrics and provenance tracking
**Wikidata API:** NOT sent to Wikidata (internal use only)

```json
{
  "llmSuggestions": {
    "suggestedProperties": [...],
    "suggestedReferences": [],
    "qualityScore": 67,
    "completeness": 31,
    "model": "openai/gpt-4-turbo",
    "generatedAt": "2025-11-10T..."
  }
}
```

## Wikidata Action API Publication

### Endpoint
```
POST https://test.wikidata.org/w/api.php
```
(Use `https://www.wikidata.org/w/api.php` for production)

### Parameters
```json
{
  "action": "wbeditentity",
  "format": "json",
  "new": "item",
  "data": "{...JSON from entity builder...}",
  "token": "csrf_token",
  "bot": false,
  "summary": "Created via KGaaS API"
}
```

### Required Steps
1. **Authenticate:** Obtain OAuth or login token
2. **Get CSRF Token:** `action=query&meta=tokens`
3. **Create Entity:** `action=wbeditentity&new=item`
4. **Submit JSON:** Pass the `labels`, `descriptions`, and `claims` sections

### What Gets Published
✅ **Published to Wikidata:**
- `labels` → Entity name
- `descriptions` → Entity description
- `claims` → All properties (P31, P856, P1448, P2002, P2013, P4264, P452, P159)
- `references` → Citation for each claim

❌ **Not Published (Internal Only):**
- `llmSuggestions` → Quality metrics and metadata

## Current Capabilities

### ✅ What It Can Do
1. **Generate 8+ Properties** (PIDs) per entity
2. **Resolve QIDs** via hybrid cache/SPARQL
   - Cities → Wikidata place QIDs (e.g., Providence → Q18383)
   - Industries → Wikidata concept QIDs (e.g., Cannabis → Q3197)
   - Legal forms → Wikidata organization type QIDs
3. **Extract Social Media** usernames from URLs
4. **Add References** with URL, title, and retrieved date
5. **Quality Scoring** (0-100 scale)
6. **Completeness Tracking** (% of recommended properties filled)

### 📊 Typical Output Stats
- **Properties:** 8 PIDs
- **Quality Score:** 60-75/100
- **Completeness:** 25-40%
- **References:** 1-3 per claim

### 🚀 Properties Supported
| PID | Property | Type | Source |
|-----|----------|------|--------|
| P31 | Instance of | Item | Hardcoded (Q4830453 = business) |
| P856 | Official website | URL | Business.url |
| P1448 | Official name | String | Crawled data |
| P1329 | Phone number | String | Crawled data |
| P968 | Email | String | Crawled data |
| P571 | Inception | Date | Crawled data |
| P2002 | Twitter | String | Crawled social links |
| P2013 | Facebook | String | Crawled social links |
| P2003 | Instagram | String | Crawled social links |
| P4264 | LinkedIn | String | Crawled social links |
| P452 | Industry | Item | LLM + SPARQL/mappings |
| P159 | Headquarters | Item | SPARQL/mappings |
| P1128 | Employees | Quantity | Crawled data |
| P625 | Coordinates | Globe | Business.location |

### 🔮 Future Enhancements
Potential to add:
- P1329: Phone number (if extracted)
- P968: Email (if extracted)
- P571: Founding date (if extracted)
- P1128: Employee count (if extracted)
- P3040: Soundex
- P2003: Instagram
- More references from notability checker

## Quality Validation

### Before Publication
The JSON is validated for:
1. **Notability:** ≥3 serious references required
2. **Completeness:** Minimum PIDs threshold
3. **QID Resolution:** All item references must resolve
4. **Reference Quality:** URLs must be accessible
5. **Wikidata Compliance:** Follows entity schema

### Quality Metrics
- **Quality Score:** 0-100 (based on property count, reference quality)
- **Completeness:** % of recommended properties filled
- **Confidence:** LLM assessment of data accuracy

## Example: Mother Earth Wellness

### Input
```bash
pnpm tsx scripts/test-url-only.ts https://motherearthri.com
```

### Output
```json
{
  "labels": {
    "en": { "language": "en", "value": "Mother Earth Wellness" }
  },
  "descriptions": {
    "en": { "language": "en", "value": "Welcome to Mother Earth Wellness Dispensary in Providence..." }
  },
  "claims": {
    "P31": [{ "mainsnak": { "datavalue": { "value": { "id": "Q4830453" } } }, "references": [...] }],
    "P856": [{ "mainsnak": { "datavalue": { "value": "https://motherearthri.com" } } }],
    "P1448": [{ "mainsnak": { "datavalue": { "value": "Mother Earth Wellness" } }, "references": [...] }],
    "P2002": [{ "mainsnak": { "datavalue": { "value": "motherearthri" } }, "references": [...] }],
    "P2013": [{ "mainsnak": { "datavalue": { "value": "motherearthwellness" } }, "references": [...] }],
    "P4264": [{ "mainsnak": { "datavalue": { "value": "mother-earth-wellness" } }, "references": [...] }],
    "P452": [{ "mainsnak": { "datavalue": { "value": { "id": "Q3197" } } }, "references": [...] }],
    "P159": [{ "mainsnak": { "datavalue": { "value": { "id": "Q18383" } } }, "references": [...] }]
  }
}
```

### Result
- ✅ **8 Properties** generated
- ✅ **2 QIDs** resolved (Cannabis, Providence)
- ✅ **3 Social Media** platforms extracted
- ✅ **Notable:** 5/3 serious references
- ✅ **Quality:** 67/100
- ✅ **Ready for:** `wbeditentity` API call

## Testing
```bash
# Show complete JSON output
pnpm tsx scripts/test-url-only.ts https://motherearthri.com

# Test different URLs
pnpm tsx scripts/test-url-only.ts https://brownphysicians.org
pnpm tsx scripts/test-url-only.ts https://stripe.com
```

## Summary
The JSON output is **fully compliant** with Wikidata's entity format and ready for publication via the Action API. It includes proper references, QID resolution, and quality validation, making it suitable for creating new Wikidata items programmatically.

