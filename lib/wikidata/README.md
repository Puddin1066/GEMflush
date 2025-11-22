# Streamlined Wikidata Module

A modern, efficient, and streamlined Wikidata entity creation system that uses crawl data to dynamically populate JSON templates capable of creating rich Wikidata entities with descriptions, statements, and up to 10 PIDs and 10 QIDs published via the Action API.

## Features

- **Dynamic JSON Templates**: Flexible template system for rich entity creation
- **Notability Reference Finding**: Automatic discovery and validation of references for entity notability
- **Multiple Reference Types**: Combines source URLs with external notability references
- **Crawl Data Integration**: Seamlessly processes crawl data for entity population
- **Property Management**: Intelligent selection of up to 10 PIDs and 10 QIDs
- **Efficient API Client**: Streamlined Wikidata Action API client with authentication
- **Quality Scoring**: Automatic quality assessment and optimization
- **Mock Mode Support**: Safe testing without actual API calls
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Architecture

```
WikidataService (Main Orchestrator)
├── EntityTemplate (Dynamic JSON Templates)
├── CrawlDataProcessor (Data Processing & Enhancement)
├── PropertyManager (PID/QID Selection & Validation)
├── ReferenceFinder (Notability Reference Discovery)
└── WikidataClient (Action API Client)
```

## Quick Start

```typescript
import { WikidataService } from '@/lib/wikidata';

const service = new WikidataService();

// Create and publish a rich entity
const result = await service.createAndPublishEntity(
  business,
  crawledData,
  { target: 'test', maxProperties: 10 }
);

console.log(`Published entity: ${result.result.qid}`);
```

## Core Components

### 1. WikidataService

Main orchestrator that combines all components:

```typescript
// Create and publish entity
const result = await service.createAndPublishEntity(business, crawledData, {
  target: 'test',
  maxProperties: 10,
  maxQIDs: 10,
  includeReferences: true
});

// Preview entity without publishing
const preview = await service.previewEntity(business, crawledData);

// Update existing entity
const updateResult = await service.updateEntity('Q123456', business, crawledData);
```

### 2. EntityTemplate

Dynamic JSON template system:

```typescript
import { EntityTemplate } from '@/lib/wikidata/template';

const entity = await EntityTemplate.generateEntity(crawlData, {
  maxProperties: 10,
  includeReferences: true,
  qualityThreshold: 0.7
});
```

### 3. CrawlDataProcessor

Processes and enhances crawl data:

```typescript
import { CrawlDataProcessor } from '@/lib/wikidata/processor';

// Process crawl data
const processed = CrawlDataProcessor.processCrawlData(business, crawledData);

// Enhance data quality
const enhanced = CrawlDataProcessor.enhanceCrawlData(processed);

// Extract metrics
const metrics = CrawlDataProcessor.extractMetrics(enhanced);
```

### 4. PropertyManager

Manages PID/QID selection:

```typescript
import { PropertyManager } from '@/lib/wikidata/property-manager';

const selection = await PropertyManager.selectProperties(crawlData, {
  maxPIDs: 10,
  maxQIDs: 10,
  qualityThreshold: 0.7
});
```

### 5. ReferenceFinder

Discovers and validates notability references:

```typescript
import { ReferenceFinder } from '@/lib/wikidata/reference-finder';

const referenceResult = await ReferenceFinder.findNotabilityReferences(crawlData, {
  maxReferences: 5,
  requireSerious: true,
  minConfidence: 0.7
});

console.log(`Found ${referenceResult.references.length} references`);
console.log(`Notable: ${referenceResult.isNotable}`);
```

### 6. WikidataClient

Efficient Action API client:

```typescript
import { WikidataClient } from '@/lib/wikidata/client';

const client = new WikidataClient({
  apiUrl: 'https://test.wikidata.org/w/api.php',
  timeout: 30000,
  retryAttempts: 3
});

const result = await client.publishEntity(entity, { target: 'test' });
```

## Property Selection

The system intelligently selects up to 10 properties based on:

1. **Priority**: Essential properties (P31, P856, P1448) are always included
2. **Availability**: Only properties with valid data are selected
3. **Quality**: Properties are validated before inclusion
4. **Limits**: Respects PID (10) and QID (10) limits

### Supported Properties

| PID | Property | Type | Priority | Description |
|-----|----------|------|----------|-------------|
| P31 | instance of | item | 1 | Always "business" (Q4830453) |
| P856 | official website | string | 2 | Business URL |
| P1448 | official name | string | 3 | Business name |
| P625 | coordinate location | coordinate | 4 | GPS coordinates |
| P6375 | street address | string | 5 | Physical address |
| P131 | located in | item | 6 | Administrative entity |
| P17 | country | item | 7 | Country (default: US) |
| P452 | industry | item | 8 | Business industry |
| P1329 | phone number | string | 9 | Contact phone |
| P968 | email address | string | 10 | Contact email |

## Configuration

### Environment Variables

```bash
# Authentication (required for real API calls)
WIKIDATA_BOT_USERNAME=YourBot@YourBot
WIKIDATA_BOT_PASSWORD=your_bot_password

# Publishing mode
WIKIDATA_PUBLISH_MODE=mock  # or 'real'

# Production publishing (use with caution)
WIKIDATA_ENABLE_PRODUCTION=false
```

### Service Configuration

```typescript
const service = new WikidataService({
  apiUrl: 'https://test.wikidata.org/w/api.php',
  userAgent: 'MyApp/1.0',
  timeout: 30000,
  retryAttempts: 3,
  maxProperties: 10,
  enableCaching: true,
  validateEntities: true
});
```

## Data Flow

1. **Input Processing**: Business and crawl data are processed and validated
2. **Property Selection**: Up to 10 properties are intelligently selected
3. **Entity Generation**: Dynamic JSON template creates rich entity structure
4. **Quality Assessment**: Entity quality is scored and validated
5. **API Publishing**: Entity is published via Wikidata Action API
6. **Result Processing**: Success/failure results are processed and returned

## Quality Metrics

The system calculates several quality metrics:

- **Completeness**: How much of the available data is used (0-1)
- **Quality**: Overall data quality score (0-1)
- **Richness**: Entity richness with references and details (0-1)
- **Property Count**: Number of properties included

## Error Handling

The system includes comprehensive error handling:

- **Validation Errors**: Invalid data structure or values
- **Network Errors**: API connectivity issues with retry logic
- **Authentication Errors**: Login or token issues
- **Publishing Errors**: Wikidata API errors with detailed messages

## Testing

```bash
# Run tests
npm test lib/wikidata

# Run with coverage
npm run test:coverage lib/wikidata
```

### Mock Mode

For safe testing without API calls:

```typescript
process.env.WIKIDATA_PUBLISH_MODE = 'mock';

const result = await service.createAndPublishEntity(business, crawledData);
// Returns mock QID without actual API call
```

## Migration from Legacy Module

The new streamlined module is designed to replace the existing complex wikidata system:

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

## Performance

- **Processing Time**: Typically 100-500ms for entity creation
- **API Calls**: Single API call per entity (optimized)
- **Memory Usage**: Minimal memory footprint with efficient data structures
- **Caching**: Built-in caching for QID resolution and property types

## Best Practices

1. **Use Mock Mode**: Always test with mock mode first
2. **Validate Data**: Use preview mode to validate entities before publishing
3. **Monitor Quality**: Check quality scores and metrics
4. **Handle Errors**: Implement proper error handling for production use
5. **Rate Limiting**: Respect Wikidata's rate limits
6. **Authentication**: Use proper bot credentials for real API calls

## Support

For issues or questions about the streamlined Wikidata module, please refer to the codebase documentation or create an issue in the project repository.
