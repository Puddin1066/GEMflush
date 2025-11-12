# Testing Setup

Simple, behavior-focused tests that verify API responses without overfitting to implementation details.

## Test Structure

### Unit Tests
- **Location**: `app/api/**/__tests__/`
- **Framework**: Vitest
- **Focus**: Test API route behavior (status codes, response data)
- **Mocking**: Mock at module level, not implementation details

### Integration Tests
- **Location**: `tests/integration/`
- **Framework**: Vitest
- **Focus**: Test with real database connections

### E2E Tests
- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Focus**: Test user-visible behavior in browser

## Running Tests

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# All tests
pnpm test:all
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock at module level
vi.mock('@/lib/db/queries');

describe('GET /api/business', () => {
  it('returns 401 when not authenticated', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/business');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
```

## Principles

1. **Test behavior, not implementation**: Focus on what the API returns, not how it works internally
2. **Keep tests simple**: Avoid complex mock setups
3. **Mock at module level**: Don't mock internal function calls
4. **Test user-visible outcomes**: Verify status codes and response data
5. **Avoid overfitting**: Don't test every edge case or implementation detail

## Test Coverage

Tests verify:
- Authentication requirements (401 responses)
- Successful operations (200/201 responses)
- Validation errors (400 responses)
- Authorization errors (403 responses)
- Not found errors (404 responses)

Tests do NOT verify:
- Internal function calls
- Exact mock parameters
- Implementation details
- Every possible edge case
