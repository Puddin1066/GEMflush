# Crawler Module (`lib/crawler/`)

**Purpose**: Web crawling service for extracting business data from websites (C in CFP workflow)  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `crawler/` module provides comprehensive web crawling capabilities using Firecrawl API. It extracts structured business data from websites, including multi-page crawling with LLM-powered extraction for rich data collection.

### Architecture Principles

1. **Multi-Page Crawling**: Crawls multiple relevant pages (about, services, contact, etc.)
2. **LLM Extraction**: Uses Firecrawl's built-in LLM for structured data extraction
3. **Caching**: Intelligent caching to reduce API calls and improve performance
4. **Error Handling**: Graceful fallbacks and retry logic
5. **Type Safety**: Full TypeScript coverage with contracts

---

## 🏗️ Module Structure

```
lib/crawler/
├── index.ts              # Main crawler implementation (EnhancedWebCrawler)
├── firecrawl-client.ts  # Firecrawl API client
├── fixtures/            # Test fixtures (HTML samples)
└── __tests__/           # TDD test specifications
```

---

## 🔑 Core Components

### 1. Enhanced Web Crawler (`index.ts`)

**Purpose**: Main crawler service implementing `IWebCrawler` contract

**Key Features:**
- Multi-page crawling (up to 8 pages, depth 2)
- Intelligent page selection (about, services, contact, etc.)
- Caching (24-hour TTL, max 100 entries)
- Job progress tracking
- Structured data extraction

**Usage:**

```typescript
import { webCrawler } from '@/lib/crawler';

// Basic crawl
const result = await webCrawler.crawl('https://example.com');

// With job tracking
const result = await webCrawler.crawl('https://example.com', crawlJobId);

console.log(result.success); // true/false
console.log(result.data); // CrawledData object
console.log(result.error); // Error message if failed
```

**Crawl Result Structure:**

```typescript
interface CrawlResult {
  success: boolean;
  data?: CrawledData;
  error?: string;
  cached?: boolean;
}

interface CrawledData {
  url: string;
  title?: string;
  description?: string;
  content?: string;
  metadata?: Record<string, any>;
  // ... extracted business data
}
```

---

### 2. Firecrawl Client (`firecrawl-client.ts`)

**Purpose**: Direct integration with Firecrawl API

**Key Features:**
- Multi-page crawl with LLM extraction
- Rate limiting (7 seconds between requests)
- Automatic retry with exponential backoff
- Mock fallback for development/testing
- Job status polling for async operations

**Usage:**

```typescript
import { firecrawlClient } from '@/lib/crawler/firecrawl-client';

// Crawl with LLM extraction
const response = await firecrawlClient.crawlWithLLMExtraction(
  'https://example.com',
  {
    maxDepth: 2,
    limit: 8,
    includes: ['**/about*', '**/services*'],
    excludes: ['**/blog*', '**/news*'],
  }
);

console.log(response.success); // true/false
console.log(response.data); // Array of page data
console.log(response.id); // Job ID if async
```

**Configuration:**

```typescript
// Environment variables
FIRECRAWL_API_KEY=your_api_key_here
USE_MOCK_FIRECRAWL=false  // Set to true to use mocks
```

---

## 🔄 Crawling Workflow

```
1. URL Input
   ↓
2. Check Cache (24-hour TTL)
   ↓ (if not cached)
3. Firecrawl API Call
   - Multi-page crawl
   - LLM extraction
   - Structured data
   ↓
4. Process Results
   - Aggregate multi-page data
   - Extract business information
   - Update crawl job status
   ↓
5. Return CrawlResult
   - Success/failure
   - Structured data
   - Error messages
```

---

## 📋 Page Selection Strategy

### Included Pages (Relevant)
- `**/about*` - About pages
- `**/services*` - Services pages
- `**/contact*` - Contact pages
- `**/team*` - Team pages
- `**/products*` - Product pages
- `**/solutions*` - Solutions pages
- `**/company*` - Company pages

### Excluded Pages (Noise)
- `**/blog*` - Blog posts
- `**/news*` - News articles
- `**/events*` - Events
- `**/careers*` - Careers
- `**/privacy*` - Privacy policy
- `**/terms*` - Terms of service
- `**/cookie*` - Cookie policy
- `**/legal*` - Legal pages

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Web Crawler
 * 
 * As a system
 * I want to crawl business websites
 * So that I can extract structured business data
 * 
 * Acceptance Criteria:
 * - Crawl returns success status
 * - Crawl returns structured data
 * - Crawl handles errors gracefully
 * - Crawl uses cache when available
 */
describe('Web Crawler - Specification', () => {
  it('crawls website and returns structured data', async () => {
    // SPECIFICATION: Given a business URL
    const url = 'https://example.com';
    
    // SPECIFICATION: When crawl is executed
    const result = await webCrawler.crawl(url);
    
    // SPECIFICATION: Then result should contain structured data
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.url).toBe(url);
    expect(result.data?.content).toBeDefined();
  });
  
  it('uses cache for recently crawled URLs', async () => {
    const url = 'https://example.com';
    
    // First crawl
    await webCrawler.crawl(url);
    
    // Second crawl (should use cache)
    const result = await webCrawler.crawl(url);
    
    expect(result.cached).toBe(true);
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/crawler/__tests__/crawler.test.ts

# With coverage
pnpm test:coverage lib/crawler/
```

---

## ⚙️ Configuration

### Environment Variables

**Required:**
- `FIRECRAWL_API_KEY`: Firecrawl API key (get from https://firecrawl.dev)

**Optional:**
- `USE_MOCK_FIRECRAWL`: Set to `'true'` to use mock data (development/testing)
- `NODE_ENV`: Set to `'development'` for development mode

### Rate Limiting

- **Minimum Request Interval**: 7 seconds between Firecrawl API calls
- **Cache TTL**: 24 hours
- **Max Cache Size**: 100 entries

---

## 🔄 Integration with CFP Workflow

The crawler is the **C** (Crawl) step in the CFP workflow:

```
Crawl (this module)
  ↓
Fingerprint (lib/llm/)
  ↓
Publish (lib/wikidata/)
```

**Usage in Business Execution:**

```typescript
// lib/services/business-execution.ts
import { webCrawler } from '@/lib/crawler';

// Execute crawl job
const crawlResult = await webCrawler.crawl(business.url, crawlJob.id);

if (crawlResult.success && crawlResult.data) {
  // Proceed to fingerprinting
  await executeFingerprint(business.id, crawlResult.data);
}
```

---

## 🛠️ Error Handling

### Error Types

1. **Network Errors**: Retry with exponential backoff
2. **API Errors**: Return error in result, don't throw
3. **Invalid URLs**: Validate before crawling
4. **Rate Limiting**: Respect 7-second interval

### Error Response Format

```typescript
{
  success: false,
  error: 'Error message here',
  data: undefined
}
```

---

## 📊 Performance Considerations

### Caching Strategy

- **Cache TTL**: 24 hours
- **Cache Key**: URL (normalized)
- **Cache Size**: Max 100 entries (LRU eviction)

### Multi-Page Crawling

- **Max Pages**: 8 pages per crawl
- **Max Depth**: 2 levels deep
- **Page Selection**: Intelligent filtering (includes/excludes)

### Rate Limiting

- **Firecrawl API**: 7 seconds between requests
- **Automatic Retry**: Exponential backoff on failures

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Service Contracts**: `lib/types/service-contracts.ts` (IWebCrawler)
- **Firecrawl Contract**: `lib/types/firecrawl-contract.ts`
- **Business Execution**: `lib/services/business-execution.ts`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Single Responsibility**: Focused on web crawling only
2. **Type Safety**: Full TypeScript coverage with contracts
3. **Error Handling**: Graceful failures, never throw unhandled errors
4. **Caching**: Intelligent caching to reduce API calls
5. **TDD Development**: Write tests first as specifications
6. **SOLID Principles**: Follows interface contracts, dependency injection

---

## ⚠️ Important Notes

### Mock vs Real API

- **Development**: Can use mocks (`USE_MOCK_FIRECRAWL=true`)
- **Production**: Should use real Firecrawl API
- **Testing**: Use mocks in unit tests, real API in integration tests

### API Key Management

- Never commit API keys to version control
- Use environment variables for configuration
- Rotate keys periodically in production

---

**Remember**: The crawler is the foundation of the CFP workflow. Write tests first, handle errors gracefully, and always validate extracted data.

