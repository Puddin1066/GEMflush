# Wikidata Contracts and Schemas

This document describes how the Wikidata module leverages contracts and schemas based on official Wikibase specifications.

## Official Specifications (Contextual Contracts)

Wikidata provides several specifications that function as **contextual contracts** for bots, editors, and machine-generated statements. These are the equivalent of MCP contracts - they define what your agent must output and how it must behave.

The Wikidata module follows these official specifications as contracts:

### 1. Wikibase Data Model (WDM) - Core Schema Contract
**URL**: https://www.mediawiki.org/wiki/Wikibase/DataModel

The core data specification defining how items, properties, statements, qualifiers, and references are structured. This is the fundamental "schema contract" for all Wikidata interactions - essentially the "schema contract" that all Wikidata interactions must follow.

**Implementation**:
- Entity structure (labels, descriptions, claims)
- Claim structure (mainsnak, type, rank, references)
- Snak structure (snaktype, property, datavalue)
- Datavalue types (wikibase-entityid, string, time, quantity, monolingualtext, globecoordinate)

### 2. Wikibase JSON Specification
**URL**: https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html

Defines the exact JSON format that must be produced when writing via the Action API (`wbeditentity`).

**Implementation**:
- `lib/validation/wikidata.ts` - Zod schemas based on JSON spec
- `lib/wikidata/entity-builder.ts` - Creates entities matching JSON spec
- `lib/wikidata/publisher.ts` - Validates entities before sending to API

### 3. Wikidata Action API Protocol
**URL**: https://www.wikidata.org/wiki/Wikidata:Data_access

Defines the protocol for bots including:
- Authentication (bot passwords, tokens, cookies)
- Token management (login tokens, CSRF tokens)
- Edit operations (wbeditentity)
- Rate limits and error structures

**Implementation**:
- `lib/wikidata/publisher.ts` - Implements authentication and API calls
- `docs/features/wikidata/WIKIDATA_AUTH_DETAILED.md` - Detailed auth documentation

### 4. Wikidata Bot Policy - Behavioral Protocol
**URL**: https://www.wikidata.org/wiki/Wikidata:Bots

Behavioral protocol defining what bots are allowed to do. This is the behavioral protocol that agents/bots must follow.

**Implementation**:
- Respects rate limits
- Uses proper User-Agent headers
- Follows authentication best practices
- Only publishes to test.wikidata.org in development

### 5. Wikidata Ontology (schema.org-derived concepts)
**URL**: https://www.wikidata.org/wiki/Wikidata:Glossary

Defines relationships between items, properties, and classes. Not exactly MCP, but it defines what your agent must output - the conceptual relationships and structure.

**Implementation**:
- Property mappings (`lib/wikidata/property-mapping.ts`) align with Wikidata ontology
- Entity types (Q4830453 for business, etc.) follow Wikidata's classification system
- Property relationships (P31 for instance of, P856 for website, etc.) follow Wikidata conventions

### 6. ORES + Edit Quality Models - Quality Constraints
**URL**: https://www.mediawiki.org/wiki/ORES

Wikimedia runs ML models for edit quality. No direct MCP interface, but it defines constraints you must respect to avoid reverts or bans. This is the quality protocol that edits must meet.

**Implementation**:
- Notability checking (`lib/wikidata/notability-checker.ts`) ensures entities meet quality standards
- Reference requirements ensure claims have proper citations
- Entity completeness scoring helps ensure high-quality edits

## Internal Contracts

### Service Contracts (`lib/types/service-contracts.ts`)

#### IWikidataEntityBuilder
```typescript
interface IWikidataEntityBuilder {
  buildEntity(business: Business | any): WikidataEntityData;
  validateEntity(entity: WikidataEntityData): boolean;
}
```

**Implementation**: `lib/wikidata/entity-builder.ts`
- ✅ Implements contract
- ✅ Uses Zod schema validation
- ✅ Validates entities before returning

#### IWikidataPublisher
```typescript
interface IWikidataPublisher {
  publish(
    entity: WikidataEntityData,
    target: 'test' | 'production'
  ): Promise<WikidataPublishResult>;
}
```

**Implementation**: `lib/wikidata/publisher.ts`
- ✅ Implements contract
- ✅ Wraps `publishEntity` method for contract compliance
- ✅ Validates entities before publishing

## Validation Schemas

### Zod Schemas (`lib/validation/wikidata.ts`)

Based on Wikibase JSON specification, provides runtime validation:

1. **wikidataLabelSchema** - Validates label structure
2. **wikidataDescriptionSchema** - Validates description structure (250 char limit)
3. **wikidataDatavalueSchema** - Validates datavalue types
4. **wikidataSnakSchema** - Validates snak structure
5. **wikidataReferenceSchema** - Validates reference structure
6. **wikidataClaimSchema** - Validates claim structure
7. **wikidataEntityDataSchema** - Validates complete entity

**Usage**:
```typescript
import { validateWikidataEntity } from '@/lib/validation/wikidata';

const validation = validateWikidataEntity(entity);
if (!validation.success) {
  // Handle validation errors
}
```

### Runtime Validation (`lib/wikidata/publisher.ts`)

Additional runtime validation beyond Zod schemas:
- Type mismatch detection (QID vs string)
- Property format validation
- Reference snak validation
- Quantity unit validation

## Contract Compliance Checklist

### ✅ Entity Builder
- [x] Implements `IWikidataEntityBuilder` contract
- [x] `buildEntity` returns `WikidataEntityData`
- [x] `validateEntity` validates entity structure
- [x] Uses Zod schema validation
- [x] Validates entities before returning
- [x] Follows Wikibase Data Model
- [x] Produces JSON matching Wikibase JSON spec

### ✅ Publisher
- [x] Implements `IWikidataPublisher` contract
- [x] `publish` method matches contract signature
- [x] Validates entities before publishing
- [x] Uses Zod schema validation
- [x] Follows Action API protocol
- [x] Implements authentication per WIKIDATA_AUTH_DETAILED.md
- [x] Respects bot policy (test environment only)

### ✅ Validation
- [x] Zod schemas based on Wikibase JSON spec
- [x] Runtime validation for Wikibase-specific constraints
- [x] Type mismatch detection
- [x] Property format validation
- [x] Reference validation

## Data Flow

```
Business Data
    ↓
Entity Builder (buildEntity)
    ↓
WikidataEntityData (validated with Zod schema)
    ↓
Publisher (publishEntity)
    ↓
Validation (Zod + runtime checks)
    ↓
Wikibase JSON (cleaned, llmSuggestions removed)
    ↓
Wikidata Action API (wbeditentity)
```

## Contract Hierarchy

These specifications form a hierarchy of contracts:

1. **Wikibase Data Model (WDM)** - Core schema contract (what data structures look like)
2. **Wikibase JSON Specification** - Context format contract (how to serialize for API)
3. **Wikidata Action API Protocol** - Communication contract (how to interact with API)
4. **Wikidata Ontology** - Conceptual contract (what relationships mean)
5. **Wikidata Bot Policy** - Behavioral contract (what bots can do)
6. **ORES + Edit Quality** - Quality contract (what makes a good edit)

Together, these form a complete "contextual contract" system similar to MCP contracts - they define what your agent must output, how it must behave, and what quality standards it must meet.

## References

- [Wikibase Data Model](https://www.mediawiki.org/wiki/Wikibase/DataModel) - Core schema contract
- [Wikibase JSON Specification](https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html) - Context format contract
- [Wikidata Action API](https://www.wikidata.org/wiki/Wikidata:Data_access) - Communication protocol contract
- [Wikidata Bot Policy](https://www.wikidata.org/wiki/Wikidata:Bots) - Behavioral protocol contract
- [Wikidata Glossary](https://www.wikidata.org/wiki/Wikidata:Glossary) - Ontology and conceptual contract
- [ORES Edit Quality](https://www.mediawiki.org/wiki/ORES) - Quality constraints contract

