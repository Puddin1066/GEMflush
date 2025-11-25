# Utilities Module (`lib/utils/`)

**Purpose**: Shared utility functions and helpers  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `utils/` module provides shared utility functions used across the application. It includes error handling, logging, formatting, idempotency helpers, and mock data generators.

### Architecture Principles

1. **DRY**: Reusable utility functions
2. **SOLID**: Single responsibility per utility
3. **Type Safety**: Full TypeScript coverage
4. **Pure Functions**: Most utilities are pure (no side effects)
5. **Error Handling**: Consistent error handling patterns

---

## 🏗️ Module Structure

```
lib/utils/
├── error-handling.ts      # Error handling utilities
├── logger.ts              # Logging utilities
├── format.ts              # Formatting utilities
├── idempotency.ts         # Idempotency helpers
├── cn.ts                  # Class name utility (Tailwind)
├── firecrawl-mock.ts     # Firecrawl mock data generators
├── mock-crawl-data.ts    # Mock crawl data generators
├── business-name-extractor.ts # Business name extraction
├── dto-logger.ts         # DTO logging utilities
└── __tests__/           # TDD test specifications
```

---

## 🔑 Core Utilities

### 1. Error Handling (`error-handling.ts`)

**Purpose**: Centralized error handling with retry logic

**Key Functions:**

```typescript
// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

// Processing error class
export class ProcessingError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly context: ErrorContext;
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T>

// Wrap error with context
export function wrapError(
  error: Error,
  context: ErrorContext
): ProcessingError
```

**Usage:**

```typescript
import { retryWithBackoff, ProcessingError } from '@/lib/utils/error-handling';

try {
  const result = await retryWithBackoff(
    () => apiCall(),
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    }
  );
} catch (error) {
  if (error instanceof ProcessingError && error.retryable) {
    // Handle retryable error
  }
}
```

---

### 2. Logger (`logger.ts`)

**Purpose**: Structured logging utilities

**Key Functions:**

```typescript
export const loggers = {
  processing: createLogger('processing'),
  crawler: createLogger('crawler'),
  llm: createLogger('llm'),
  wikidata: createLogger('wikidata'),
  // ... more loggers
};

// Usage
loggers.processing.info('Processing started', { businessId: 1 });
loggers.crawler.error('Crawl failed', { error, url });
```

**Usage:**

```typescript
import { loggers } from '@/lib/utils/logger';

loggers.processing.info('Business processing started', {
  businessId: 1,
  status: 'pending',
});

loggers.crawler.error('Crawl failed', {
  error: error.message,
  url: 'https://example.com',
  attempt: 2,
});
```

---

### 3. Formatting (`format.ts`)

**Purpose**: Data formatting utilities

**Key Functions:**

```typescript
// Format date
export function formatDate(date: Date): string

// Format currency
export function formatCurrency(amount: number, currency: string): string

// Format percentage
export function formatPercentage(value: number): string

// Format business name
export function formatBusinessName(name: string): string
```

**Usage:**

```typescript
import { formatDate, formatCurrency } from '@/lib/utils/format';

const formattedDate = formatDate(new Date());
const formattedPrice = formatCurrency(49.99, 'USD');
```

---

### 4. Idempotency (`idempotency.ts`)

**Purpose**: Idempotency helpers for API operations

**Key Functions:**

```typescript
// Generate idempotency key
export function generateIdempotencyKey(
  operation: string,
  params: Record<string, any>
): string

// Check if operation is idempotent
export function isIdempotent(
  key: string,
  cache: Map<string, any>
): boolean
```

**Usage:**

```typescript
import { generateIdempotencyKey } from '@/lib/utils/idempotency';

const key = generateIdempotencyKey('createBusiness', {
  name: 'Test Business',
  url: 'https://example.com',
});
```

---

### 5. Class Names (`cn.ts`)

**Purpose**: Tailwind CSS class name utility

**Usage:**

```typescript
import { cn } from '@/lib/utils/cn';

const className = cn(
  'base-class',
  condition && 'conditional-class',
  anotherCondition ? 'class-a' : 'class-b'
);
```

---

### 6. Mock Data Generators

**Purpose**: Generate mock data for testing

**Key Functions:**

```typescript
// Firecrawl mock data
export function generateMockFirecrawlCrawlResponse(
  url: string
): FirecrawlCrawlResponse

// Crawl data mock
export function generateMockCrawlData(
  url?: string
): CrawledData
```

**Usage:**

```typescript
import { generateMockCrawlData } from '@/lib/utils/mock-crawl-data';

const mockData = generateMockCrawlData('https://example.com');
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Error Handling
 * 
 * As a developer
 * I want error handling utilities
 * So that errors are handled consistently
 * 
 * Acceptance Criteria:
 * - retryWithBackoff retries on failure
 * - retryWithBackoff uses exponential backoff
 * - ProcessingError includes context
 */
describe('Error Handling - Specification', () => {
  it('retries with exponential backoff', async () => {
    // SPECIFICATION: Given a function that fails then succeeds
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) throw new Error('Failed');
      return 'success';
    };
    
    // SPECIFICATION: When retrying
    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    });
    
    // SPECIFICATION: Then should succeed after retries
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/utils/__tests__/error-handling.test.ts

# With coverage
pnpm test:coverage lib/utils/
```

---

## 📋 Utility Patterns

### 1. Pure Functions

**Purpose**: Functions without side effects

```typescript
// ✅ GOOD: Pure function
export function formatDate(date: Date): string {
  return date.toISOString();
}

// ❌ BAD: Side effect
export function formatDate(date: Date): string {
  console.log('Formatting date'); // Side effect
  return date.toISOString();
}
```

### 2. Error Wrapping

**Purpose**: Add context to errors

```typescript
try {
  await operation();
} catch (error) {
  throw wrapError(error, {
    operation: 'processBusiness',
    businessId: 1,
  });
}
```

### 3. Retry Logic

**Purpose**: Retry operations with exponential backoff

```typescript
const result = await retryWithBackoff(
  () => apiCall(),
  {
    maxAttempts: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
  }
);
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Error Handling Guide**: `docs/development/ERROR_HANDLING.md`
- **Logging Guide**: `docs/development/LOGGING.md`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **DRY**: Reusable utility functions
2. **SOLID**: Single responsibility per utility
3. **Type Safety**: Full TypeScript coverage
4. **Pure Functions**: Most utilities are pure
5. **Error Handling**: Consistent error handling
6. **TDD Development**: Write tests first as specifications

---

## ⚠️ Important Notes

### Mock Data

- Mock data generators are for testing only
- Don't use mocks in production code
- Keep mocks realistic and up-to-date

### Error Handling

- Always wrap errors with context
- Use retry logic for transient failures
- Log errors with appropriate levels

### Logging

- Use structured logging
- Include relevant context
- Don't log sensitive data

---

**Remember**: Utilities should be focused, reusable, and well-tested. Keep them pure when possible, and always handle errors gracefully.


