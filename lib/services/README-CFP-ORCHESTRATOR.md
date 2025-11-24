# CFP Orchestrator Service

The CFP Orchestrator provides automated **Crawl → Fingerprint → Publish** flow that takes a single URL input and produces a complete JSON entity by orchestrating the `@crawler`, `@llm`, and `@wikidata` services.

## Overview

```
URL → [Crawl + Fingerprint] → [Entity Creation] → [Publish] → JSON Entity
```

The orchestrator runs crawl and fingerprint operations in parallel for maximum efficiency, then creates a rich Wikidata entity with up to 10 PIDs and 10 QIDs, and optionally publishes it to Wikidata.

## Features

- **Single URL Input**: Just provide a business website URL
- **Parallel Processing**: Crawl and fingerprint run simultaneously
- **Complete Entity Creation**: Rich JSON entities with claims, references, and metadata
- **Optional Publishing**: Can create entities without publishing or publish to test/production
- **Progress Tracking**: Real-time progress callbacks with detailed status
- **Error Handling**: Comprehensive error handling with partial results
- **Mock Data Support**: Fallback to mock data for development/testing
- **Timeout Management**: Configurable timeouts with sensible defaults

## Usage

### Basic Usage

```typescript
import { executeCFPFlow } from '@/lib/services/cfp-orchestrator';

// Simple entity creation (no publishing)
const result = await executeCFPFlow('https://example.com');

if (result.success && result.entity) {
  console.log('Entity created:', result.entity.id);
  console.log('Processing time:', result.processingTime + 'ms');
}
```

### Advanced Usage with Options

```typescript
import { executeCFPFlow } from '@/lib/services/cfp-orchestrator';

const result = await executeCFPFlow('https://example.com', {
  publishTarget: 'test',           // 'test' or 'production'
  includeFingerprint: true,        // Include LLM analysis
  shouldPublish: true,             // Actually publish to Wikidata
  timeout: 90000,                  // 90 second timeout
  allowMockData: true              // Use mock data if available
});
```

### With Progress Tracking

```typescript
import { executeCFPFlow } from '@/lib/services/cfp-orchestrator';

const result = await executeCFPFlow('https://example.com', {
  shouldPublish: true
}, (progress) => {
  console.log(`${progress.stage}: ${progress.progress}% - ${progress.message}`);
});
```

### Convenience Functions

```typescript
import { 
  createEntityFromUrl,           // Entity creation only
  crawlFingerprintAndPublish     // Full flow with publishing
} from '@/lib/services/cfp-orchestrator';

// Just create entity (no publishing)
const entity = await createEntityFromUrl('https://example.com');

// Full flow with publishing
const result = await crawlFingerprintAndPublish('https://example.com', {
  publishTarget: 'test'
});
```

## API Endpoint

The orchestrator is also available via HTTP API:

```bash
# POST /api/cfp
curl -X POST http://localhost:3000/api/cfp \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "shouldPublish": false,
      "includeFingerprint": true
    }
  }'
```

## Demo Script

Run the interactive demo to test the CFP flow:

```bash
# Basic demo
npm run demo:cfp https://example.com

# With publishing
npm run demo:cfp https://example.com --publish --target=test

# JSON output only
npm run demo:cfp https://example.com --json-only

# Verbose progress
npm run demo:cfp https://example.com --verbose

# Different demo modes
npm run demo:cfp https://example.com --demo=1  # Entity creation only
npm run demo:cfp https://example.com --demo=2  # Full CFP flow (default)
npm run demo:cfp https://example.com --demo=3  # Publishing focus
```

## Response Format

```typescript
interface CFPResult {
  success: boolean;
  url: string;
  entity: WikidataEntity | null;
  publishResult?: PublishResult;
  
  // Processing results
  crawlData?: CrawledData;
  fingerprintAnalysis?: FingerprintAnalysis;
  
  // Metadata
  processingTime: number;
  timestamp: Date;
  
  // Error information
  error?: string;
  partialResults?: {
    crawlSuccess: boolean;
    fingerprintSuccess: boolean;
    entityCreationSuccess: boolean;
    publishSuccess: boolean;
  };
}
```

## Processing Stages

1. **Crawling (10-40%)**: Multi-page website crawl with LLM extraction
2. **Fingerprinting (40-60%)**: Parallel LLM visibility analysis (optional)
3. **Entity Creation (60-85%)**: Wikidata entity generation with claims and references
4. **Publishing (85-100%)**: Optional publishing to Wikidata (optional)

## Error Handling

The orchestrator provides comprehensive error handling:

- **Partial Success**: Returns partial results even if some stages fail
- **Timeouts**: Configurable timeouts for each operation
- **Fallbacks**: Mock data fallbacks for development
- **Detailed Errors**: Specific error messages for each stage

## Integration with Existing Services

The CFP Orchestrator integrates seamlessly with existing services:

- **@crawler**: Uses `webCrawler.crawl()` for multi-page extraction
- **@llm**: Uses `businessFingerprinter.fingerprintWithContext()` for analysis
- **@wikidata**: Uses `wikidataService.createAndPublishEntity()` for publishing

## Configuration

Default configuration:

```typescript
{
  publishTarget: 'test',        // Safe default
  includeFingerprint: true,     // Full analysis
  shouldPublish: false,         // Create only, don't publish
  timeout: 60000,               // 60 second timeout
  allowMockData: true           // Development friendly
}
```

## Performance

Typical processing times:

- **Entity Creation Only**: 5-15 seconds
- **Full CFP Flow**: 15-30 seconds
- **With Publishing**: 20-40 seconds

The parallel execution of crawl and fingerprint operations significantly reduces total processing time compared to sequential execution.

## Development

The orchestrator includes comprehensive logging and development features:

- **Progress Callbacks**: Real-time progress updates
- **Mock Data Support**: Fallback data for testing
- **Detailed Logging**: Comprehensive logging at each stage
- **Error Context**: Rich error information for debugging

## Examples

See `scripts/demo-cfp-orchestrator.ts` for comprehensive examples and the `/api/cfp` endpoint for HTTP API usage.

