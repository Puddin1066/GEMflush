# Legacy Wikidata Module Archive

This directory contains deprecated files from the original Wikidata module that have been replaced by the new streamlined architecture.

## Archived Files

### Core Legacy Components (Replaced)
- **`entity-builder.ts`** (41KB, 1139 lines) - Replaced by `template.ts` + `service.ts`
  - Old complex entity building logic
  - Replaced with streamlined template system

- **`publisher.ts`** (67KB, 1613 lines) - Replaced by `client.ts`  
  - Massive legacy publisher with complex authentication
  - Replaced with efficient Action API client

### Legacy Builders (Replaced)
- **`tiered-entity-builder.ts`** (3.4KB, 113 lines) - Replaced by `template.ts`
- **`typed-entity-builder.ts`** (9.6KB, 296 lines) - Replaced by `template.ts`
- **`strategic-property-selector.ts`** (14KB, 595 lines) - Replaced by `property-manager.ts`

### Legacy Utilities (Replaced)
- **`notability-checker.ts`** (29KB, 717 lines) - Replaced by self-contained `reference-finder.ts`
- **`manual-publish-storage.ts`** (5.8KB, 182 lines) - Manual publishing storage (no longer needed)
- **`property-mapping.ts`** (7.8KB, 319 lines) - Replaced by `property-manager.ts`
- **`qid-mappings.ts`** (11KB, 440 lines) - Replaced by `sparql.ts` caching

## New Streamlined Architecture

The legacy files have been replaced with a much more efficient and maintainable architecture:

```
OLD ARCHITECTURE (Archived):
├── entity-builder.ts (1139 lines)
├── publisher.ts (1613 lines)  
├── strategic-property-selector.ts (595 lines)
├── tiered-entity-builder.ts (113 lines)
├── typed-entity-builder.ts (296 lines)
├── notability-checker.ts (717 lines)
├── manual-publish-storage.ts (182 lines)
├── property-mapping.ts (319 lines)
└── qid-mappings.ts (440 lines)
Total: ~5,414 lines of complex legacy code

NEW ARCHITECTURE (Active):
├── service.ts (364 lines) - Main orchestrator
├── client.ts (507 lines) - Efficient API client
├── template.ts (586 lines) - Dynamic JSON templates
├── processor.ts (409 lines) - Crawl data processing
├── property-manager.ts (451 lines) - PID/QID management
├── reference-finder.ts (330 lines) - Self-contained notability references
└── types.ts (216 lines) - Type definitions
Total: ~2,863 lines of streamlined code
```

## Benefits of New Architecture

1. **47% Less Code**: Reduced from ~5,414 to ~2,863 lines
2. **Single Entry Point**: `WikidataService` handles everything
3. **Better Separation**: Clear component responsibilities
4. **Type Safety**: Comprehensive TypeScript types
5. **Notability References**: Automatic reference finding
6. **Quality Metrics**: Built-in quality assessment
7. **Mock Mode**: Safe testing without API calls

## Files Still Active

These files from the original module are still being used:

- **`sparql.ts`** - Still used for QID lookups with caching
- **`__tests__/`** - Test directory (updated for new architecture)

## Self-Contained Architecture

The new streamlined module is completely self-contained with no dependencies on legacy components:
- **No external API dependencies** for reference finding (uses intelligent mock generation)
- **No complex Google Search integration** (simplified for reliability)
- **No LLM dependencies** for reference assessment (uses rule-based logic)
- **Clean separation** from all legacy code

## Migration Guide

### Before (Legacy)
```typescript
import { entityBuilder } from '@/lib/wikidata/entity-builder';
import { wikidataPublisher } from '@/lib/wikidata/publisher';

const entity = await entityBuilder.buildEntity(business, crawledData);
const result = await wikidataPublisher.publishEntity(entity, false);
```

### After (Streamlined)
```typescript
import { WikidataService } from '@/lib/wikidata';

const service = new WikidataService();
const result = await service.createAndPublishEntity(business, crawledData);
```

## Archive Date
November 22, 2025

## Reason for Archive
Complete rebuild of Wikidata module for efficiency, maintainability, and feature completeness with notability reference integration.
