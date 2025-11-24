# LLM Module - Business Fingerprinting System

## Overview

The LLM module provides efficient, multi-dimensional business visibility analysis using OpenRouter API across 3 leading language models (GPT-4, Claude, and Gemini). It's designed for parallel execution with the crawler module and seamless integration with the database and frontend.

## Architecture

### Core Components

1. **OpenRouter Client** (`openrouter-client.ts`)
   - Pure OpenRouter API integration
   - Parallel request handling with intelligent batching
   - Development caching for cost efficiency
   - Graceful error handling with mock fallbacks
   - Smart retry logic with exponential backoff

2. **Business Fingerprinter** (`business-fingerprinter.ts`)
   - Orchestrates complete business visibility analysis
   - Multi-model parallel processing
   - Comprehensive metrics calculation
   - Competitive positioning insights

3. **Prompt Generator** (`prompt-generator.ts`)
   - Context-aware prompt generation
   - Industry-specific customization
   - Natural, customer-like query patterns
   - Template-based system with variable substitution

4. **Response Analyzer** (`response-analyzer.ts`)
   - Advanced mention detection with fuzzy matching
   - Multi-dimensional sentiment analysis
   - Competitive ranking extraction
   - Confidence scoring for all analyses

5. **Parallel Processor** (`parallel-processor.ts`)
   - Intelligent batching for optimal performance
   - Integrated response analysis
   - Performance monitoring and optimization
   - Rate limiting and cost optimization

## Features

### Multi-Model Analysis
- **GPT-4 Turbo**: Best for factual analysis and accuracy
- **Claude 3 Opus**: Best for nuanced sentiment analysis  
- **Gemini Pro**: Best for competitive analysis and rankings

### Prompt Types
- **Factual**: Information-seeking queries about the business
- **Opinion**: Assessment queries about reputation and quality
- **Recommendation**: Competitive queries for market positioning

### Analysis Dimensions
- **Visibility Score**: 0-100 overall visibility rating
- **Mention Rate**: Percentage of queries where business was mentioned
- **Sentiment Score**: Average sentiment across all mentions
- **Confidence Level**: Average confidence across all results
- **Competitive Positioning**: Rankings and competitor analysis

## Usage

### Basic Fingerprinting

```typescript
import { businessFingerprinter } from '@/lib/llm';

// Fingerprint a business
const analysis = await businessFingerprinter.fingerprint(business);

console.log(`Visibility Score: ${analysis.visibilityScore}`);
console.log(`Mention Rate: ${Math.round(analysis.mentionRate * 100)}%`);
console.log(`Competitors: ${analysis.competitiveLeaderboard.competitors.length}`);
```

### With Custom Context

```typescript
import { businessFingerprinter } from '@/lib/llm';

const context = {
  name: 'Acme Coffee',
  url: 'https://acmecoffee.com',
  category: 'restaurant',
  location: { city: 'San Francisco', state: 'CA' },
  crawlData: { /* enriched data from crawler */ }
};

const analysis = await businessFingerprinter.fingerprintWithContext(context);
```

### Direct API Usage

```typescript
import { openRouterClient } from '@/lib/llm';

// Single query
const response = await openRouterClient.query(
  'openai/gpt-4-turbo',
  'What do you know about Acme Coffee in San Francisco?'
);

// Parallel queries
const queries = [
  { model: 'openai/gpt-4-turbo', prompt: 'Factual query', promptType: 'factual' },
  { model: 'anthropic/claude-3-opus', prompt: 'Opinion query', promptType: 'opinion' },
  { model: 'google/gemini-pro', prompt: 'Recommendation query', promptType: 'recommendation' }
];

const responses = await openRouterClient.queryParallel(queries);
```

## Configuration

### Environment Variables

```bash
# Required for production
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional
BASE_URL=https://yourapp.com  # For API headers
LOG_LEVEL=debug               # For development
NODE_ENV=development          # Enables caching
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  models: [
    'openai/gpt-4-turbo',
    'anthropic/claude-3-opus', 
    'google/gemini-pro'
  ],
  parallelism: {
    enabled: true,
    batchSize: 9,           // 3 models × 3 prompts
    maxConcurrency: 3       // Process 3 models in parallel
  },
  caching: {
    enabled: NODE_ENV !== 'production',
    ttl: 24 * 60 * 60      // 24 hours
  },
  retries: {
    maxAttempts: 3,
    backoffMs: 1000
  },
  temperature: 0.7,
  maxTokens: 2000
};
```

## Integration

### With Crawler Module

The LLM module is designed to work seamlessly with crawled business data:

```typescript
// Business with crawl data gets richer prompts
const business = await getBusinessById(id);
if (business.crawlData) {
  // Uses services, description, industry data for better prompts
  const analysis = await businessFingerprinter.fingerprint(business);
}
```

### With Database

Results are automatically stored in the `llm_fingerprints` table:

```typescript
// API route handles storage
const analysis = await businessFingerprinter.fingerprint(business);

await db.insert(llmFingerprints).values({
  businessId: business.id,
  visibilityScore: analysis.visibilityScore,
  mentionRate: analysis.mentionRate,
  sentimentScore: analysis.sentimentScore,
  llmResults: analysis.llmResults,
  competitiveLeaderboard: analysis.competitiveLeaderboard
});
```

### With Frontend

The module provides clean DTOs for frontend consumption:

```typescript
// API endpoint returns structured data
GET /api/fingerprint/[id]
{
  "visibilityScore": 85,
  "mentionRate": 0.67,
  "sentimentScore": 0.8,
  "competitiveLeaderboard": {
    "targetBusiness": { "rank": 2, "mentionCount": 6 },
    "competitors": [...]
  },
  "llmResults": [...]
}
```

## Development Features

### Mock Mode
When `OPENROUTER_API_KEY` is not configured, the module automatically uses intelligent mock responses:

- Generates realistic business responses
- Maintains consistent behavior patterns
- Supports all prompt types
- Useful for development and testing

### Caching
Development caching reduces API costs:

- 24-hour TTL for responses
- MD5-based cache keys
- Automatic cache cleanup
- File-based storage in `.cache/llm/`

### Comprehensive Logging
Structured logging for monitoring and debugging:

```typescript
// Performance tracking
log.info('Fingerprint analysis completed', {
  businessName: 'Acme Coffee',
  visibilityScore: 85,
  processingTime: 3200,
  queryStats: { successCount: 9, mentionRate: 0.67 }
});

// Model performance breakdown
log.debug('Model performance', {
  model: 'openai/gpt-4-turbo',
  queries: 3,
  mentions: 2,
  avgConfidence: 0.9
});
```

## Testing

### Unit Tests
Comprehensive test coverage for all components:

```bash
npm test lib/llm/__tests__/
```

### Integration Tests
Test with real API calls (requires API key):

```bash
OPENROUTER_API_KEY=your_key npm test lib/llm/__tests__/ -- --integration
```

### Mock Testing
Test without API key (uses mock responses):

```bash
npm test lib/llm/__tests__/
```

## Performance

### Optimization Features
- **Parallel Processing**: 3 models processed simultaneously
- **Intelligent Batching**: Optimal request grouping
- **Rate Limiting**: Respectful API usage
- **Caching**: Development cost reduction
- **Retry Logic**: Resilient error handling

### Typical Performance
- **Single Business**: ~3-5 seconds (9 LLM queries)
- **Batch Processing**: Scales linearly with batching
- **Cache Hit**: ~50ms response time
- **Mock Mode**: ~100ms response time

## Error Handling

### Graceful Degradation
- API failures fall back to mock responses
- Partial results are processed normally
- Comprehensive error logging
- No crashes on LLM failures

### Retry Strategy
- Exponential backoff for transient errors
- 3 retry attempts with increasing delays
- Different strategies for different error types
- Fallback to mock responses after exhaustion

## Health Check

```typescript
import { healthCheck } from '@/lib/llm';

const health = await healthCheck();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
```

## Module Information

```typescript
import { getModuleInfo } from '@/lib/llm';

const info = getModuleInfo();
console.log(info.version);      // '2.0.0'
console.log(info.models);       // ['openai/gpt-4-turbo', ...]
console.log(info.capabilities); // { models: [...], cachingEnabled: true }
```

## Migration from v1

The new module is backward compatible with existing API endpoints and database schemas. Key improvements:

- **3x faster** parallel processing
- **Better accuracy** with advanced analysis
- **Cost efficient** with intelligent caching
- **More reliable** with comprehensive error handling
- **Easier testing** with mock mode

Legacy imports are supported:
```typescript
// Still works
import { llmFingerprinter } from '@/lib/llm';

// New preferred way
import { businessFingerprinter } from '@/lib/llm';
```

