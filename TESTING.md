# Testing Guide - GEMFlush

This project uses **Vitest** for unit and integration testing.

## 🚀 Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode (auto-rerun on changes)
pnpm test:watch

# Run tests with UI dashboard
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

## 📁 Test Structure

Tests are co-located with the code they test in `__tests__` directories:

```
lib/
├── wikidata/
│   ├── entity-builder.ts
│   └── __tests__/
│       └── entity-builder.test.ts
├── llm/
│   ├── fingerprinter.ts
│   └── __tests__/
│       └── fingerprinter.test.ts
├── gemflush/
│   ├── permissions.ts
│   └── __tests__/
│       └── permissions.test.ts
└── validation/
    ├── business.ts
    └── __tests__/
        └── business.test.ts
```

## ✅ Test Coverage

Current test coverage for GEMFlush core logic:

### Wikidata Entity Builder (`lib/wikidata/entity-builder.test.ts`)
- ✅ Entity building with complete and partial data
- ✅ Label and description generation
- ✅ Wikidata property (PID) claim generation:
  - P31 (instance of)
  - P856 (official website)
  - P625 (coordinates)
  - P1448 (official name)
  - P1329 (phone number)
  - P969 (street address)
- ✅ Reference (P854) attachment
- ✅ Notability validation
- ✅ Edge cases (missing fields, invalid data)

**17 tests** covering the complete Wikidata entity generation pipeline.

### LLM Fingerprinter (`lib/llm/fingerprinter.test.ts`)
- ✅ Prompt generation (factual, opinion, recommendation)
- ✅ Business name mention detection
- ✅ Sentiment analysis (positive, neutral, negative)
- ✅ Rank position extraction from LLM responses
- ✅ Visibility score calculation (0-100)
- ✅ Metric aggregation (mention rate, sentiment, accuracy)
- ✅ Edge cases (zero mentions, missing location)

**20 tests** covering the LLM fingerprinting analysis system.

### Permissions System (`lib/gemflush/permissions.test.ts`)
- ✅ Wikidata publishing permissions by plan
- ✅ Business limits (Free: 1, Pro: 5, Agency: 25)
- ✅ Historical data access control
- ✅ Progressive enrichment permissions
- ✅ API access control (Agency only)
- ✅ Fingerprint frequency settings
- ✅ Business limit checks
- ✅ User-facing limit messages

**26 tests** covering all permission checks across the three subscription tiers.

### Validation Schemas (`lib/validation/business.test.ts`)
- ✅ Business schema validation
- ✅ Name validation (length, required)
- ✅ URL validation (format)
- ✅ Category validation (enum)
- ✅ Location validation (city, state, country required)
- ✅ Coordinate validation (lat: -90 to 90, lng: -180 to 180)
- ✅ Optional fields handling

**11 tests** ensuring all input validation works correctly.

---

**Total: 74 tests** covering the core GEMFlush business logic.

## 🎯 What's Tested

### ✅ Core Logic (Unit Tests)
- Entity builder
- LLM fingerprinter
- Permission system
- Input validation

### 🚧 Not Yet Tested
- API routes (requires database mocking)
- React components (requires React Testing Library setup)
- Database queries (requires test database)
- External API integrations (crawler, OpenRouter, Wikidata)

## 🔧 Configuration

### `vitest.config.ts`
- **Environment**: jsdom (for React component testing support)
- **Setup file**: `vitest.setup.ts` (extends matchers with jest-dom)
- **Coverage**: v8 provider with text/json/html reporters
- **Path alias**: `@/` → project root

### Test Utilities
- **Vitest**: Test runner
- **@testing-library/react**: React component testing (ready for future use)
- **@testing-library/jest-dom**: DOM matchers
- **jsdom**: Browser environment simulation

## 📝 Writing Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from '../module';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should do something specific', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      const result = functionToTest(edgeCaseInput);
      expect(result).toBeDefined();
    });
  });
});
```

### Best Practices

1. **Test behavior, not implementation**
   - Focus on inputs and outputs
   - Don't test internal implementation details

2. **Use descriptive test names**
   - Good: `should return false for free plan`
   - Bad: `test permissions`

3. **Test edge cases**
   - Empty strings, null, undefined
   - Boundary values (min, max)
   - Invalid input

4. **Keep tests isolated**
   - Each test should be independent
   - Use `beforeEach` for setup
   - Mock external dependencies

5. **Use type safety**
   - Create proper TypeScript types for test data
   - Leverage type checking in tests

## 🎨 Running Tests in CI/CD

Vercel automatically detects and runs tests in CI if you have a `test` script:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

Tests will run:
- ✅ On every push
- ✅ On pull requests
- ✅ Before deployment

## 📊 Coverage Reports

Generate coverage reports:

```bash
pnpm test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/coverage-final.json` - JSON data
- Console output shows summary

Coverage is **excluded** for:
- `node_modules/`
- `.next/`
- `scripts/` (demo scripts)
- `*.config.{ts,js}` files
- `lib/db/migrations/`

## 🔍 Debugging Tests

### VS Code
Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test:watch"],
  "console": "integratedTerminal"
}
```

### Command Line
```bash
# Run specific test file
pnpm test entity-builder.test.ts

# Run tests matching pattern
pnpm test:watch permissions

# Run with verbose output
pnpm test -- --reporter=verbose
```

## 🚀 Next Steps

### Recommended Test Additions

1. **API Route Tests**
   - POST `/api/crawl`
   - POST `/api/fingerprint`
   - POST `/api/wikidata/publish`

2. **Component Tests**
   - Business list page
   - New business form
   - Dashboard layout

3. **Integration Tests**
   - Full crawl → entity generation → publication flow
   - Complete fingerprint analysis workflow
   - Subscription upgrade/downgrade flows

4. **E2E Tests** (Playwright)
   - User signup → add business → run fingerprint
   - Upgrade to Pro → publish to Wikidata
   - Full user journey

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
- [Coverage Guide](https://vitest.dev/guide/coverage.html)

---

**Last Updated:** November 9, 2025

