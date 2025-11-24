# LLM Suggestions for PID and QID in Publication

## Overview

**Yes, the publication process accepts and publishes LLM suggestions for PIDs (Property IDs) and QIDs (Item IDs).** The LLM-suggested properties are converted to claims, validated, and included in the published entity. Only the metadata about the suggestions (`llmSuggestions`) is removed before publishing.

---

## How LLM Suggestions Are Processed

### 1. LLM Suggests Properties

**Source**: `lib/wikidata/entity-builder.ts` → `suggestAdditionalProperties()`

The LLM analyzes business data and suggests Wikidata properties:

```typescript
// LLM suggests properties with PIDs and values
const suggestions = [
  {
    pid: 'P452',              // ← LLM suggests Property ID
    value: 'Software Development',  // ← Text value (not QID yet)
    dataType: 'item',
    confidence: 0.95,
    reasoning: 'Website clearly states software development company'
  },
  {
    pid: 'P571',              // ← LLM suggests Property ID
    value: '2015',            // ← Date value
    dataType: 'time',
    confidence: 0.90,
    reasoning: 'Founded date found on website'
  }
];
```

### 2. QID Resolution for Item-Type Properties

**Source**: `lib/wikidata/entity-builder.ts` → `convertSuggestionsToClaims()`

For item-type properties (like P452 - industry), the system resolves text values to QIDs:

```typescript
// Before QID resolution
{
  pid: 'P452',
  value: 'Software Development',  // ← Text value
  dataType: 'item'
}

// After QID resolution
{
  pid: 'P452',
  value: 'Q11650',  // ← Resolved QID (Software)
  dataType: 'item'
}
```

**QID Resolution Process**:
1. Check if property requires QID (`dataType === 'item'`)
2. Use `qidResolver` from `BUSINESS_PROPERTY_MAP` (SPARQL lookup)
3. Validate QID format (must start with "Q")
4. Skip property if QID not found

### 3. Conversion to Claims

**Source**: `lib/wikidata/entity-builder.ts` → `createClaimFromSuggestion()`

LLM suggestions are converted to Wikidata claims:

```typescript
// LLM suggestion → Wikidata claim
{
  pid: 'P452',
  value: 'Q11650'  // ← Resolved QID
}
↓
{
  mainsnak: {
    property: 'P452',
    snaktype: 'value',
    datavalue: {
      value: {
        'entity-type': 'item',
        id: 'Q11650'  // ← QID in claim
      },
      type: 'wikibase-entityid'
    }
  },
  type: 'statement',
  references: [...]
}
```

### 4. Merging with Basic Claims

**Source**: `lib/wikidata/entity-builder.ts` → `mergeClaims()`

LLM-suggested claims are merged with basic claims:

```typescript
const allClaims = {
  // Basic claims (from crawlData)
  P31: [...],   // instance of
  P856: [...],  // official website
  P1448: [...], // official name
  
  // LLM-suggested claims
  P452: [...],  // industry (from LLM)
  P571: [...],  // inception (from LLM)
  P1128: [...], // employees (from LLM)
};
```

### 5. Publication

**Source**: `lib/wikidata/publisher.ts` → `cleanEntityForWikidata()`

Before publishing:
- ✅ **LLM-suggested claims ARE included** (merged into `claims`)
- ❌ **LLM suggestions metadata is removed** (`llmSuggestions` field)

```typescript
// Entity before cleaning
{
  labels: {...},
  descriptions: {...},
  claims: {
    P31: [...],      // Basic
    P452: [...],     // ← LLM-suggested (INCLUDED)
    P571: [...],     // ← LLM-suggested (INCLUDED)
  },
  llmSuggestions: {  // ← Metadata (REMOVED)
    suggestedProperties: [...],
    qualityScore: 85,
  }
}

// Entity after cleaning (published to Wikidata)
{
  labels: {...},
  descriptions: {...},
  claims: {
    P31: [...],      // Basic
    P452: [...],     // ← LLM-suggested (PRESERVED)
    P571: [...],     // ← LLM-suggested (PRESERVED)
  }
  // llmSuggestions removed
}
```

---

## Example: Complete Flow

### Input: Business Data

```typescript
business = {
  name: "Acme Corp",
  url: "https://acmecorp.com"
}

crawlData = {
  description: "Software company",
  businessDetails: {
    industry: "Technology",
    employeeCount: 50
  }
}
```

### Step 1: LLM Suggests Properties

```typescript
// LLM analyzes data and suggests:
suggestions = [
  {
    pid: 'P452',              // ← LLM suggests PID
    value: 'Technology',      // ← Text value
    dataType: 'item',
    confidence: 0.95
  },
  {
    pid: 'P1128',             // ← LLM suggests PID
    value: 50,                // ← Numeric value
    dataType: 'quantity',
    confidence: 0.90
  }
];
```

### Step 2: QID Resolution

```typescript
// For P452 (industry), resolve "Technology" → QID
const qid = await resolveIndustryQID('Technology');
// Returns: "Q11650" (Software)

// Final value for P452
value = 'Q11650';  // ← Resolved QID
```

### Step 3: Convert to Claims

```typescript
claims = {
  P452: [{
    mainsnak: {
      property: 'P452',
      datavalue: {
        value: { id: 'Q11650' },  // ← QID from LLM suggestion
        type: 'wikibase-entityid'
      }
    },
    type: 'statement'
  }],
  P1128: [{
    mainsnak: {
      property: 'P1128',
      datavalue: {
        value: { amount: '+50', unit: 'Q11573' },
        type: 'quantity'
      }
    },
    type: 'statement'
  }]
};
```

### Step 4: Merge with Basic Claims

```typescript
allClaims = {
  P31: [...],    // Basic
  P856: [...],   // Basic
  P1448: [...],  // Basic
  P452: [...],   // ← LLM-suggested (merged)
  P1128: [...],  // ← LLM-suggested (merged)
};
```

### Step 5: Publish to Wikidata

```json
{
  "labels": {...},
  "descriptions": {...},
  "claims": {
    "P31": [...],
    "P856": [...],
    "P1448": [...],
    "P452": [{  // ← LLM-suggested property (PUBLISHED)
      "mainsnak": {
        "property": "P452",
        "datavalue": {
          "value": {"id": "Q11650"},  // ← LLM-suggested QID (PUBLISHED)
          "type": "wikibase-entityid"
        }
      }
    }],
    "P1128": [{  // ← LLM-suggested property (PUBLISHED)
      "mainsnak": {
        "property": "P1128",
        "datavalue": {
          "value": {"amount": "+50", "unit": "Q11573"},
          "type": "quantity"
        }
      }
    }]
  }
  // llmSuggestions metadata removed
}
```

---

## Validation and Safety

### 1. Confidence Threshold

Only suggestions with `confidence >= 0.7` are accepted:

```typescript
if (suggestion.confidence < 0.7) continue;  // Skip low-confidence suggestions
```

### 2. QID Validation

QIDs are validated before use:

```typescript
// Validate QID format
if (typeof value !== 'string' || !value.startsWith('Q')) {
  console.warn(`Invalid QID format: ${value}`);
  continue;  // Skip invalid QIDs
}
```

### 3. Property Mapping Validation

Only properties in `BUSINESS_PROPERTY_MAP` are accepted:

```typescript
const mapping = BUSINESS_PROPERTY_MAP[suggestion.pid];
if (!mapping) continue;  // Skip unknown properties
```

### 4. Data Type Validation

Values are validated against property data types:

```typescript
// Validate value matches dataType
if (mapping.validator && !mapping.validator(value)) {
  console.warn(`Invalid value for ${suggestion.pid}: ${value}`);
  continue;  // Skip invalid values
}
```

### 5. Entity Structure Validation

Final entity is validated before publication:

```typescript
this.validateEntity(entity);  // Validates Wikibase JSON structure
```

---

## What Gets Published

### ✅ Published (Included in Action API)

- **All claims from LLM suggestions** (PIDs and QIDs)
- **Basic claims** (from crawlData)
- **Labels and descriptions**
- **References** (attached to claims)

### ❌ Not Published (Removed)

- **`llmSuggestions` metadata** (internal tracking only)
  - `suggestedProperties` array
  - `qualityScore`
  - `completeness`
  - `model`
  - `generatedAt`

---

## Summary

**Yes, LLM suggestions for PIDs and QIDs are accepted and published:**

1. ✅ **LLM suggests PIDs** (e.g., P452 for industry)
2. ✅ **LLM suggests values** (e.g., "Technology" for industry)
3. ✅ **System resolves QIDs** (e.g., "Technology" → "Q11650")
4. ✅ **Suggestions converted to claims** (validated and typed)
5. ✅ **Claims merged with basic claims** (all included in entity)
6. ✅ **Claims published to Wikidata** (via Action API)
7. ❌ **Metadata removed** (`llmSuggestions` field only)

**The actual property claims from LLM suggestions are fully included in the published entity.** Only the metadata about the suggestions (for internal tracking) is removed before publication.

---

## Code References

- **LLM Suggestion**: `lib/wikidata/entity-builder.ts:554-600`
- **QID Resolution**: `lib/wikidata/entity-builder.ts:688-743`
- **Claim Conversion**: `lib/wikidata/entity-builder.ts:750-785`
- **Claim Merging**: `lib/wikidata/entity-builder.ts:858-872`
- **Entity Cleaning**: `lib/wikidata/publisher.ts:1098-1115`
- **Property Mapping**: `lib/wikidata/property-mapping.ts`



