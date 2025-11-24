# Crawler Test Suite

## Overview

Comprehensive test suite for the WebCrawler with Firecrawl integration, following DRY and SOLID principles.

## Test Structure

### Unit Tests (`firecrawl.test.ts`)
Tests Firecrawl API integration in isolation:
- Firecrawl API calls and configuration
- Metadata extraction priority
- Error handling and fallback behavior
- API key configuration

### Integration Tests (`firecrawl.integration.test.ts`)
Tests complete crawler flow with Firecrawl:
- End-to-end crawl pipeline
- LLM enhancement integration
- Caching behavior
- Error recovery

### Test Helpers (`test-helpers.ts`)
DRY: Shared utilities to avoid duplication:
- `createMockFirecrawlResponse()` - Mock Firecrawl API responses
- `createMockLLMResponse()` - Mock LLM enhancement responses
- `mockFetchResponse()` - Mock fetch API responses
- `mockFirecrawlApiKey()` - Mock environment variables

## Running Tests

```bash
# Run all crawler tests
pnpm test lib/crawler/__tests__

# Run only Firecrawl unit tests
pnpm test lib/crawler/__tests__/firecrawl.test.ts

# Run only integration tests
pnpm test lib/crawler/__tests__/firecrawl.integration.test.ts

# Run with coverage
pnpm test lib/crawler/__tests__ --coverage
```

## Test Principles

### DRY (Don't Repeat Yourself)
- ✅ Shared test helpers in `test-helpers.ts`
- ✅ Reusable mock functions
- ✅ Common setup/teardown patterns

### SOLID (Single Responsibility)
- ✅ Each test file has a single responsibility
- ✅ Tests behavior, not implementation details
- ✅ Clear separation of unit vs integration tests

### Not Over-Fitted
- ✅ Tests behavior, not internal methods
- ✅ Focuses on outcomes, not implementation
- ✅ Tests critical paths, not every edge case

## Test Coverage

### Firecrawl Integration
- ✅ Successful API calls
- ✅ Metadata extraction (title, description, og:*)
- ✅ Caching with maxAge parameter
- ✅ Error handling (rate limits, API errors)
- ✅ Missing API key fallback

### Metadata Extraction Priority
- ✅ Firecrawl metadata.title → HTML h1/title
- ✅ Firecrawl og:title → HTML parsing
- ✅ Firecrawl og:description → HTML meta tags
- ✅ Firecrawl og:image extraction

### Error Handling
- ✅ Rate limit errors (429)
- ✅ API errors (400, 500)
- ✅ Missing API key
- ✅ Empty content fallback
- ✅ LLM enhancement failures

### Integration Flow
- ✅ Complete crawl → LLM enhancement → Result
- ✅ Caching behavior
- ✅ Markdown-only responses
- ✅ Fallback strategies

## Notes

- Tests use mocked fetch to avoid real API calls
- Environment variables are mocked per-test
- LLM responses are mocked to avoid real API costs
- Tests focus on behavior, not internal implementation



