# TDD Full Coverage Plan

**Goal**: Achieve comprehensive test coverage (unit, integration, E2E) for entire codebase  
**Status**: 🟢 In Progress  
**Approach**: Systematic TDD iteration until all code paths are tested

---

## 📊 Current Test Status

### ✅ Passing Test Suites (97+)
- API Routes: 13 suites
- Components: 6 suites  
- Services: 8 suites
- Integration: 3 suites
- API Clients: 2 suites (OpenRouter, Firecrawl)

### 🔄 In Progress
- Wikibase Action API tests (fixing mocks)
- BusinessFingerprinter API tests
- EnhancedWebCrawler API tests

---

## 🎯 Coverage Targets

### 1. API Routes (22 routes total)

#### ✅ Tested (13 routes)
- ✅ GET /api/business
- ✅ POST /api/business
- ✅ GET /api/business/[id]
- ✅ PUT /api/business/[id]
- ✅ DELETE /api/business/[id]
- ✅ POST /api/business/[id]/process
- ✅ GET /api/business/[id]/status
- ✅ GET /api/dashboard
- ✅ GET /api/job/[jobId]
- ✅ POST /api/crawl
- ✅ POST /api/fingerprint
- ✅ GET /api/fingerprint/[id]
- ✅ GET /api/business/[id]/fingerprint/history

#### 🔄 Needs Tests (9 routes)
- ⏳ POST /api/wikidata/publish (fixing)
- ⏳ GET /api/wikidata/entity/[businessId]
- ⏳ POST /api/cfp
- ⏳ GET /api/cfp
- ⏳ POST /api/business/[id]/reset-fingerprint
- ⏳ GET /api/fingerprint/business/[businessId]
- ⏳ GET /api/cron/weekly-crawls
- ⏳ GET /api/cron/monthly
- ⏳ GET /api/team
- ⏳ GET /api/user

### 2. React Components

#### ✅ Tested (6 components)
- ✅ UrlOnlyForm
- ✅ BusinessListCard
- ✅ EmptyState
- ✅ SuccessMessage
- ✅ ActionButton
- ✅ TierBadge
- ✅ BusinessLimitDisplay

#### 🔄 Needs Tests (20+ components)
- ⏳ BusinessStatusIndicator
- ⏳ BusinessDetailCard
- ⏳ FingerprintResults
- ⏳ WikidataPublishButton
- ⏳ All dashboard components
- ⏳ All onboarding components
- ⏳ All settings components

### 3. Service Layer

#### ✅ Tested (8 services)
- ✅ BusinessExecutionService
- ✅ CFPOrchestrator
- ✅ SchedulerService
- ✅ AutomationService

#### 🔄 Needs Tests (5+ services)
- ⏳ WikidataService (partial)
- ⏳ BusinessFingerprinter (partial)
- ⏳ EnhancedWebCrawler (partial)
- ⏳ All utility services

### 4. Integration Tests

#### ✅ Tested (3 suites)
- ✅ Core data flow (10 tests)
- ✅ Ideal platform operation (6 tests)
- ✅ API routes integration (partial)

#### 🔄 Needs Tests
- ⏳ Complete CFP workflow
- ⏳ Business lifecycle
- ⏳ Subscription flow
- ⏳ Permission matrix

### 5. E2E Tests (Playwright)

#### ✅ Tested
- ✅ Subscription flows
- ✅ Wikidata publishing
- ✅ Fingerprint workflows

#### 🔄 Needs Tests
- ⏳ Complete user journey
- ⏳ Error recovery flows
- ⏳ Multi-user scenarios

---

## 🚀 Implementation Plan

### Phase 1: Fix Current Failures (Priority 1)
1. ✅ Fix OpenRouter API tests
2. ✅ Fix Firecrawl API tests
3. 🔄 Fix Wikibase Action API tests
4. 🔄 Fix publish route test

### Phase 2: Complete API Route Coverage (Priority 2)
1. Add tests for remaining 9 API routes
2. Ensure all routes have:
   - Authentication tests
   - Authorization tests
   - Validation tests
   - Success case tests
   - Error handling tests

### Phase 3: Component Coverage (Priority 3)
1. Add tests for all dashboard components
2. Add tests for all business components
3. Add tests for all form components
4. Ensure all components have:
   - Rendering tests
   - Interaction tests
   - Loading state tests
   - Error state tests

### Phase 4: Service Layer Coverage (Priority 4)
1. Complete WikidataService tests
2. Complete BusinessFingerprinter tests
3. Complete EnhancedWebCrawler tests
4. Add tests for all utility services

### Phase 5: Integration Tests (Priority 5)
1. Complete CFP workflow integration
2. Business lifecycle integration
3. Subscription flow integration
4. Permission matrix integration

### Phase 6: E2E Tests (Priority 6)
1. Complete user journey E2E
2. Error recovery E2E
3. Multi-user scenarios E2E

---

## 📝 TDD Workflow

For each new test:

1. **RED**: Write test first (specification)
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code while keeping tests passing
4. **WATCH**: Add to vitest watch once passing

---

## 🔄 Vitest Watch Configuration

As tests pass, update `vitest.config.ts` to include them in watch mode:

```typescript
export default defineConfig({
  test: {
    // Watch all test files
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // Exclude E2E (handled by Playwright)
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
```

---

## 📈 Progress Tracking

- **Total Routes**: 22
- **Tested Routes**: 13 (59%)
- **Total Components**: 30+
- **Tested Components**: 7 (23%)
- **Total Services**: 15+
- **Tested Services**: 8 (53%)

**Overall Coverage**: ~45%

**Target**: 90%+ coverage

---

## ✅ Success Criteria

1. All API routes have tests (100%)
2. All critical components have tests (80%+)
3. All service layer functions have tests (90%+)
4. Integration tests cover all major workflows
5. E2E tests cover critical user journeys
6. Vitest watch includes all passing tests
7. All tests pass consistently

---

**Status**: Phase 1 in progress - fixing current failures, then systematic coverage expansion.





