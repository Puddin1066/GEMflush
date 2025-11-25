# LLM Module Comprehensive Refactoring Plan - DRY & SOLID Principles

## Current Architecture Analysis

### Module Structure
```
lib/llm/
├── business-fingerprinter.ts    (551 lines) - Orchestrator
├── prompt-generator.ts          (342 lines) - Prompt generation
├── response-analyzer.ts         (718 lines) - Response analysis
├── parallel-processor.ts         (362 lines) - Parallel execution
├── openrouter-client.ts          (604 lines) - API client
├── types.ts                      (245 lines) - Type definitions
└── index.ts                      (109 lines) - Module exports
```

## SOLID & DRY Violations Across Module

### 1. Dependency Inversion Principle (DIP) Violations

**All services export singletons and use direct imports:**

- `business-fingerprinter.ts` (lines 28-29):
  - Directly imports `promptGenerator` and `parallelProcessor` as singletons
  - **Impact**: Test mocking failures (dependencies captured at module load time)

- `parallel-processor.ts` (lines 22-23):
  - Directly imports `openRouterClient` and `responseAnalyzer` as singletons
  - **Impact**: Cannot mock dependencies for testing

- `response-analyzer.ts`:
  - Exports singleton (line 718)
  - **Impact**: Cannot inject different analyzers

- `prompt-generator.ts`:
  - Exports singleton (line 342)
  - **Impact**: Cannot inject different generators

- `openrouter-client.ts`:
  - Exports singleton (line 604)
  - **Impact**: Cannot inject different clients

### 2. Single Responsibility Principle (SRP) Violations

**business-fingerprinter.ts** has 8+ responsibilities:
1. Session management
2. Query orchestration
3. Visibility metrics calculation (lines 216-292)
4. Competitive leaderboard generation (lines 334-417)
5. Score calculation (lines 297-329)
6. Entity conversion (lines 445-458)
7. Fallback creation (lines 463-500)
8. Logging (lines 505-530)

**response-analyzer.ts** is large but focused:
- All responsibilities relate to response analysis (acceptable)
- Could extract validation utilities

**openrouter-client.ts**:
- API client + Mock response generation (lines 73-178)
- Should extract `MockResponseGenerator` to separate class

### 3. DRY Violations

**Result Filtering Logic** duplicated 3+ times:
- `business-fingerprinter.ts` lines 175-180, 219-225, 338
- Should be extracted to shared utility

**Business-to-Context Conversion** duplicated:
- `business-fingerprinter.ts` lines 445-458
- `prompt-generator.ts` lines 174-186
- Should be extracted to shared utility

**Position Estimation** embedded:
- `business-fingerprinter.ts` lines 422-440
- Could be extracted to utility

**Score Calculation Formulas** embedded:
- `business-fingerprinter.ts` lines 297-329
- Should be extracted to service or constants

**Validation Logic** duplicated:
- `response-analyzer.ts` has multiple validation methods that could share utilities

## Proposed Refactoring Structure

### New Directory Structure

```
lib/llm/
├── core/
│   ├── business-fingerprinter.ts          # Orchestrator (simplified)
│   ├── parallel-processor.ts              # Parallel execution
│   └── openrouter-client.ts               # API client
├── services/
│   ├── prompt-generator.ts                # Prompt generation
│   ├── response-analyzer.ts               # Response analysis
│   ├── visibility-metrics-service.ts      # NEW: Visibility score calculation
│   └── leaderboard-service.ts             # NEW: Competitive leaderboard generation
├── utils/
│   ├── result-filter.ts                  # NEW: Shared filtering logic
│   ├── business-context.ts                # NEW: Business-to-context conversion
│   ├── score-calculator.ts                # NEW: Score calculation formulas
│   ├── position-estimator.ts              # NEW: Position estimation
│   └── mock-response-generator.ts         # NEW: Extracted from openrouter-client
├── types.ts                               # Type definitions
└── index.ts                               # Module exports (with factory functions)
```

## Detailed Refactoring Plan

### Phase 1: Extract Shared Utilities (DRY)

#### 1.1 Create `utils/result-filter.ts`
```typescript
export function filterValidResults<T extends { error?: string }>(
  results: (T | null | undefined)[]
): T[] {
  return results.filter(r => {
    if (!r || typeof r !== 'object') return false;
    if (!('model' in r) || !('promptType' in r)) return false;
    if (r.error) return false;
    return true;
  }) as T[];
}
```

#### 1.2 Create `utils/business-context.ts`
```typescript
export function businessToContext(business: Business): BusinessContext {
  return {
    businessId: business.id,
    name: business.name,
    url: business.url,
    category: business.category || undefined,
    location: business.location ? {
      city: business.location.city,
      state: business.location.state,
      country: business.location.country
    } : undefined,
    crawlData: business.crawlData || undefined
  };
}
```

#### 1.3 Create `utils/score-calculator.ts`
```typescript
export const SCORE_WEIGHTS = {
  MENTION: 40,
  SENTIMENT: 25,
  CONFIDENCE: 20,
  RANKING: 15,
  SUCCESS_PENALTY: 10
};

export function calculateVisibilityScore(metrics: {
  mentionRate: number;
  sentimentScore: number;
  confidenceLevel: number;
  avgRankPosition: number | null;
  successfulQueries: number;
  totalQueries: number;
}): number {
  // Extract calculation logic from business-fingerprinter.ts
}
```

#### 1.4 Create `utils/position-estimator.ts`
```typescript
export function estimateCompetitorPosition(
  response: string, 
  competitorName: string
): number | null {
  // Extract from business-fingerprinter.ts lines 422-440
}
```

#### 1.5 Create `utils/mock-response-generator.ts`
```typescript
export class MockResponseGenerator {
  // Extract from openrouter-client.ts lines 73-178
}
```

### Phase 2: Extract Services (SRP)

#### 2.1 Create `services/visibility-metrics-service.ts`
```typescript
export interface IVisibilityMetricsService {
  calculateMetrics(results: LLMResult[]): BusinessVisibilityMetrics;
}

export class VisibilityMetricsService implements IVisibilityMetricsService {
  constructor(
    private scoreCalculator: ScoreCalculator = new ScoreCalculator()
  ) {}
  
  calculateMetrics(results: LLMResult[]): BusinessVisibilityMetrics {
    // Move logic from business-fingerprinter.ts lines 216-292
  }
}
```

#### 2.2 Create `services/leaderboard-service.ts`
```typescript
export interface ILeaderboardService {
  generateLeaderboard(
    results: LLMResult[], 
    businessName: string
  ): CompetitiveLeaderboard;
}

export class LeaderboardService implements ILeaderboardService {
  constructor(
    private positionEstimator: PositionEstimator = new PositionEstimator()
  ) {}
  
  generateLeaderboard(
    results: LLMResult[], 
    businessName: string
  ): CompetitiveLeaderboard {
    // Move logic from business-fingerprinter.ts lines 334-417
  }
}
```

### Phase 3: Implement Dependency Injection (DIP)

#### 3.1 Refactor `business-fingerprinter.ts`
```typescript
export class BusinessFingerprinter implements IBusinessFingerprinter {
  constructor(
    private promptGenerator: IPromptGenerator = promptGenerator,
    private parallelProcessor: IParallelProcessor = parallelProcessor,
    private visibilityService: IVisibilityMetricsService = new VisibilityMetricsService(),
    private leaderboardService: ILeaderboardService = new LeaderboardService()
  ) {}
  
  // Use injected dependencies instead of direct imports
}
```

#### 3.2 Refactor `parallel-processor.ts`
```typescript
export class ParallelProcessor implements IParallelProcessor {
  constructor(
    private openRouterClient: IOpenRouterClient = openRouterClient,
    private responseAnalyzer: IResponseAnalyzer = responseAnalyzer
  ) {}
  
  // Use injected dependencies instead of direct imports
}
```

#### 3.3 Refactor `openrouter-client.ts`
```typescript
export class OpenRouterClient implements IOpenRouterClient {
  constructor(
    private mockGenerator: MockResponseGenerator = new MockResponseGenerator()
  ) {}
  
  // Use injected mock generator
}
```

### Phase 4: Update Module Exports

#### 4.1 Update `index.ts` with Factory Functions
```typescript
// Export classes for dependency injection
export { BusinessFingerprinter } from './core/business-fingerprinter';
export { ParallelProcessor } from './core/parallel-processor';
export { OpenRouterClient } from './core/openrouter-client';
export { PromptGenerator } from './services/prompt-generator';
export { ResponseAnalyzer } from './services/response-analyzer';
export { VisibilityMetricsService } from './services/visibility-metrics-service';
export { LeaderboardService } from './services/leaderboard-service';

// Export singleton instances for backward compatibility
export const businessFingerprinter = new BusinessFingerprinter();
export const parallelProcessor = new ParallelProcessor();
export const promptGenerator = new PromptGenerator();
export const responseAnalyzer = new ResponseAnalyzer();
export const openRouterClient = new OpenRouterClient();
```

## Implementation Order

### Step 1: Extract Utilities (Low Risk)
1. Create `utils/result-filter.ts`
2. Create `utils/business-context.ts`
3. Create `utils/score-calculator.ts`
4. Create `utils/position-estimator.ts`
5. Create `utils/mock-response-generator.ts`
6. Update existing files to use utilities

### Step 2: Extract Services (Medium Risk)
1. Create `services/visibility-metrics-service.ts`
2. Create `services/leaderboard-service.ts`
3. Update `business-fingerprinter.ts` to use services

### Step 3: Implement Dependency Injection (Higher Risk)
1. Refactor `business-fingerprinter.ts` constructor
2. Refactor `parallel-processor.ts` constructor
3. Refactor `openrouter-client.ts` constructor
4. Update `index.ts` exports

### Step 4: Update Tests
1. Update all tests to use constructor injection
2. Verify mocks work correctly
3. Run full test suite

## Benefits

### 1. Testability
- ✅ Dependencies can be easily mocked via constructor injection
- ✅ Each service can be tested in isolation
- ✅ No more singleton capture issues

### 2. Maintainability
- ✅ Each service has a single, clear responsibility
- ✅ Shared logic extracted to utilities (DRY)
- ✅ Clear separation of concerns

### 3. Reusability
- ✅ Services can be used independently
- ✅ Utilities can be shared across services
- ✅ Easy to swap implementations

### 4. SOLID Compliance
- ✅ **S**ingle Responsibility: Each service has one job
- ✅ **O**pen/Closed: Services can be extended without modification
- ✅ **L**iskov Substitution: Interfaces allow substitution
- ✅ **I**nterface Segregation: Focused interfaces
- ✅ **D**ependency Inversion: Depend on abstractions, not concretions

### 5. DRY Compliance
- ✅ No duplicated filtering logic
- ✅ No duplicated business-to-context conversion
- ✅ Shared utilities for common operations

## Migration Strategy

### Backward Compatibility
- Keep singleton exports in `index.ts` for existing code
- New code can use constructor injection
- Gradual migration path

### Testing Strategy
- Update tests incrementally
- Use constructor injection in tests
- Verify all existing tests still pass

## Estimated Impact

- **Files Created**: 8 new files (utils + services)
- **Files Modified**: 6 existing files
- **Lines of Code**: ~200 lines extracted, ~100 lines added (net reduction)
- **Test Updates**: All test files need constructor injection updates
- **Breaking Changes**: None (backward compatible via singletons)

## Risk Assessment

- **Low Risk**: Utility extraction (pure functions, easy to test)
- **Medium Risk**: Service extraction (requires careful dependency management)
- **Higher Risk**: Dependency injection (requires test updates, but fixes current issues)

## Success Criteria

1. ✅ All tests pass with constructor injection
2. ✅ No breaking changes to public API
3. ✅ Code coverage maintained or improved
4. ✅ All SOLID principles followed
5. ✅ No DRY violations
6. ✅ Test mocking issues resolved
