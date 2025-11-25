# TDD Full Coverage Plan for `lib/` Directory

**Date**: January 2025  
**Goal**: Achieve 100% test coverage for all `lib/` modules using TDD  
**Status**: 🟢 **IN PROGRESS**  
**Approach**: TDD (RED → GREEN → REFACTOR) for each module

---

## 📊 Current Coverage Analysis

### Coverage by Module (from vitest coverage report)

| Module | Coverage | Status | Priority |
|--------|----------|--------|----------|
| **data** | 55.67% | 🟡 Partial | P1 |
| **db** | 75.63% | 🟡 Partial | P1 |
| **services** | 29.66% | 🔴 Low | P0 |
| **utils** | 36.55% | 🔴 Low | P1 |
| **validation** | 47.61% | 🔴 Low | P1 |
| **wikidata** | 1.61% | 🔴 Critical | P0 |
| **llm** | 6.86% | 🔴 Critical | P0 |
| **crawler** | 4.46% | 🔴 Critical | P0 |
| **auth** | Unknown | ⚪ Untested | P1 |
| **payments** | Unknown | ⚪ Untested | P1 |
| **email** | Unknown | ⚪ Untested | P2 |
| **hooks** | Unknown | ⚪ Untested | P2 |
| **subscription** | Unknown | ⚪ Untested | P2 |
| **gemflush** | 20% | 🔴 Low | P2 |
| **types** | Unknown | ⚪ Untested | P3 |

---

## 🎯 TDD Implementation Plan

### Phase 1: Critical Modules (P0) - Core Workflow
**Goal**: Test core CFP workflow components

1. ✅ **services** (29.66% → 100%)
   - `business-execution.ts` - Core business processing
   - `cfp-orchestrator.ts` - CFP workflow coordination
   - `scheduler-service-*.ts` - Scheduled automation

2. ✅ **wikidata** (1.61% → 100%)
   - `service.ts` - Main Wikidata service
   - `entity-builder.ts` - Entity construction
   - `client.ts` - Action API client
   - `processor.ts` - Data processing

3. ✅ **llm** (6.86% → 100%)
   - `business-fingerprinter.ts` - Main fingerprinting
   - `parallel-processor.ts` - Parallel processing
   - `response-analyzer.ts` - Response parsing
   - `prompt-generator.ts` - Prompt generation

4. ✅ **crawler** (4.46% → 100%)
   - `index.ts` - Main crawler
   - `firecrawl-client.ts` - Firecrawl integration

### Phase 2: High Priority (P1) - Supporting Infrastructure
**Goal**: Test supporting modules

5. ✅ **data** (55.67% → 100%)
   - `business-dto.ts` - Business DTO
   - `crawl-dto.ts` - Crawl DTO
   - `fingerprint-dto.ts` - Fingerprint DTO
   - `status-dto.ts` - Status DTO
   - `wikidata-dto.ts` - Wikidata DTO

6. ✅ **db** (75.63% → 100%)
   - `queries.ts` - Database queries
   - `drizzle.ts` - Database setup

7. ✅ **utils** (36.55% → 100%)
   - `error-handling.ts` - Error utilities
   - `logger.ts` - Logging
   - `format.ts` - Formatting
   - `idempotency.ts` - Idempotency

8. ✅ **validation** (47.61% → 100%)
   - `business.ts` - Business validation
   - `crawl-data.ts` - Crawl validation
   - `entity-builder.ts` - Entity validation
   - `wikidata.ts` - Wikidata validation

9. ✅ **auth** (0% → 100%)
   - `session.ts` - Session management
   - `middleware.ts` - Auth middleware

10. ✅ **payments** (0% → 100%)
    - `stripe.ts` - Stripe integration
    - `actions.ts` - Payment actions

### Phase 3: Medium Priority (P2) - Supporting Features
**Goal**: Test remaining modules

11. ✅ **email** (0% → 100%)
    - `send.ts` - Email sending
    - `resend.ts` - Resend client

12. ✅ **hooks** (0% → 100%)
    - All React hooks

13. ✅ **subscription** (0% → 100%)
    - `upgrade-config.ts` - Upgrade configuration

14. ✅ **gemflush** (20% → 100%)
    - `permissions.ts` - Permission checking
    - `plans.ts` - Plan definitions

### Phase 4: Low Priority (P3) - Types & Contracts
**Goal**: Test type contracts

15. ✅ **types** (0% → 100%)
    - All contract files

---

## 🚀 Implementation Strategy

### TDD Workflow for Each Module

1. **RED**: Write failing test (specification)
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code while keeping tests green
4. **Repeat**: Until module has 100% coverage

### Test File Naming Convention

- **TDD Tests**: `*.tdd.test.ts` (new tests following TDD)
- **Existing Tests**: `*.test.ts` (legacy tests)

### Priority Order

1. **Core Workflow** (P0) - Services, Wikidata, LLM, Crawler
2. **Data Layer** (P1) - DTOs, Database, Utils, Validation
3. **Infrastructure** (P1) - Auth, Payments
4. **Supporting** (P2) - Email, Hooks, Subscription, Gemflush
5. **Types** (P3) - Type contracts

---

## 📋 Module-by-Module Plan

### 1. Services Module (P0 - Critical)

**Current**: 29.66% coverage  
**Target**: 100% coverage

#### Files to Test:
- ✅ `automation-service.ts` - Already has TDD tests
- ✅ `cfp-automation-service.ts` - Already has TDD tests
- ✅ `dashboard-service-output.tdd.test.ts` - Already has TDD tests
- ⏳ `business-execution.ts` - **NEEDS TESTS**
- ⏳ `cfp-orchestrator.ts` - **NEEDS TESTS**
- ⏳ `scheduler-service-decision.ts` - **NEEDS TESTS**
- ⏳ `scheduler-service-execution.ts` - **NEEDS TESTS**
- ⏳ `business-decisions.ts` - **NEEDS TESTS**

#### TDD Tests to Write:
1. `business-execution.tdd.test.ts` - Business execution workflow
2. `cfp-orchestrator.tdd.test.ts` - CFP orchestration
3. `scheduler-service-decision.tdd.test.ts` - Scheduling decisions
4. `scheduler-service-execution.tdd.test.ts` - Scheduled execution
5. `business-decisions.tdd.test.ts` - Business decision logic

---

### 2. Wikidata Module (P0 - Critical)

**Current**: 1.61% coverage  
**Target**: 100% coverage

#### Files to Test:
- ⏳ `service.ts` - **NEEDS TESTS** (3.22% coverage)
- ⏳ `entity-builder.ts` - **NEEDS TESTS** (0.25% coverage)
- ⏳ `client.ts` - **NEEDS TESTS** (1.61% coverage)
- ⏳ `processor.ts` - **NEEDS TESTS** (0% coverage)
- ⏳ `notability-checker.ts` - **NEEDS TESTS** (2.17% coverage)
- ⏳ `property-manager.ts` - **NEEDS TESTS** (1.98% coverage)
- ⏳ `property-mapping.ts` - **NEEDS TESTS** (3.84% coverage)
- ⏳ `reference-finder.ts` - **NEEDS TESTS** (0% coverage)
- ⏳ `sparql.ts` - **NEEDS TESTS** (1.93% coverage)
- ⏳ `template.ts` - **NEEDS TESTS** (2.05% coverage)
- ⏳ `utils.ts` - **NEEDS TESTS** (0% coverage)
- ⏳ `manual-publish-storage.ts` - **NEEDS TESTS** (0% coverage)

#### TDD Tests to Write:
1. `wikidata-service.tdd.test.ts` - Main service orchestration
2. `entity-builder.tdd.test.ts` - Entity construction
3. `client-action-api.tdd.test.ts` - Action API client
4. `processor.tdd.test.ts` - Data processing
5. `notability-checker.tdd.test.ts` - Notability assessment
6. `property-manager.tdd.test.ts` - Property management
7. `sparql-service.tdd.test.ts` - SPARQL queries
8. `reference-finder.tdd.test.ts` - Reference finding

---

### 3. LLM Module (P0 - Critical)

**Current**: 6.86% coverage  
**Target**: 100% coverage

#### Files to Test:
- ⏳ `business-fingerprinter.ts` - **NEEDS TESTS** (3.36% coverage)
- ⏳ `parallel-processor.ts` - **NEEDS TESTS** (2.77% coverage)
- ⏳ `response-analyzer.ts` - **NEEDS TESTS** (3.41% coverage)
- ⏳ `prompt-generator.ts` - **NEEDS TESTS** (6.17% coverage)
- ✅ `openrouter-client.ts` - Has some tests (13.81% coverage)
- ✅ `types.ts` - 100% coverage

#### TDD Tests to Write:
1. `business-fingerprinter.tdd.test.ts` - Main fingerprinting logic
2. `parallel-processor.tdd.test.ts` - Parallel LLM processing
3. `response-analyzer.tdd.test.ts` - Response parsing
4. `prompt-generator.tdd.test.ts` - Prompt generation

---

### 4. Crawler Module (P0 - Critical)

**Current**: 4.46% coverage  
**Target**: 100% coverage

#### Files to Test:
- ⏳ `index.ts` - **NEEDS TESTS** (4.46% coverage)
- ⏳ `firecrawl-client.ts` - **NEEDS TESTS** (8.65% coverage)

#### TDD Tests to Write:
1. `web-crawler.tdd.test.ts` - Main crawler implementation
2. `firecrawl-client.tdd.test.ts` - Firecrawl client

---

### 5. Data Module (P1 - High Priority)

**Current**: 55.67% coverage  
**Target**: 100% coverage

#### Files to Test:
- ✅ `activity-dto.ts` - Has TDD tests (77.22% coverage)
- ✅ `analytics-dto.ts` - Has TDD tests (95.38% coverage)
- ✅ `business-list-dto.ts` - Has TDD tests (63.15% coverage)
- ✅ `dashboard-dto.ts` - Has tests (needs improvement)
- ⏳ `business-dto.ts` - **NEEDS TESTS**
- ⏳ `crawl-dto.ts` - **NEEDS TESTS**
- ⏳ `fingerprint-dto.ts` - **NEEDS TESTS**
- ⏳ `status-dto.ts` - **NEEDS TESTS**
- ⏳ `wikidata-dto.ts` - **NEEDS TESTS** (0% coverage)

#### TDD Tests to Write:
1. `business-dto.tdd.test.ts` - Business DTO transformation
2. `crawl-dto.tdd.test.ts` - Crawl DTO transformation
3. `fingerprint-dto.tdd.test.ts` - Fingerprint DTO transformation
4. `status-dto.tdd.test.ts` - Status DTO transformation
5. `wikidata-dto.tdd.test.ts` - Wikidata DTO transformation

---

### 6. Database Module (P1 - High Priority)

**Current**: 75.63% coverage  
**Target**: 100% coverage

#### Files to Test:
- ✅ `kgaas-integration.ts` - Has TDD tests (83.33% coverage)
- ✅ `kgaas-queries.ts` - Has TDD tests (66.66% coverage)
- ✅ `drizzle.ts` - Has tests (83.33% coverage)
- ⏳ `queries.ts` - **NEEDS TESTS**
- ⏳ `schema.ts` - Has some coverage (75.8%)
- ⏳ `seed.ts` - **NEEDS TESTS**
- ⏳ `setup.ts` - **NEEDS TESTS**

#### TDD Tests to Write:
1. `queries.tdd.test.ts` - Database query functions
2. `seed.tdd.test.ts` - Database seeding
3. `setup.tdd.test.ts` - Database setup

---

### 7. Utils Module (P1 - High Priority)

**Current**: 36.55% coverage  
**Target**: 100% coverage

#### Files to Test:
- ⏳ `error-handling.ts` - **NEEDS TESTS** (42.37% coverage)
- ⏳ `logger.ts` - **NEEDS TESTS** (61.53% coverage)
- ⏳ `format.ts` - **NEEDS TESTS** (needs improvement)
- ⏳ `idempotency.ts` - **NEEDS TESTS**
- ⏳ `business-name-extractor.ts` - **NEEDS TESTS**
- ⏳ `dto-logger.ts` - **NEEDS TESTS**
- ⏳ `firecrawl-mock.ts` - **NEEDS TESTS** (5.12% coverage)
- ⏳ `mock-crawl-data.ts` - **NEEDS TESTS** (4.34% coverage)
- ✅ `cn.ts` - Has tests

#### TDD Tests to Write:
1. `error-handling.tdd.test.ts` - Error handling utilities
2. `logger.tdd.test.ts` - Logging utilities
3. `format.tdd.test.ts` - Formatting utilities
4. `idempotency.tdd.test.ts` - Idempotency helpers
5. `business-name-extractor.tdd.test.ts` - Name extraction

---

### 8. Validation Module (P1 - High Priority)

**Current**: 47.61% coverage  
**Target**: 100% coverage

#### Files to Test:
- ⏳ `business.ts` - **NEEDS TESTS**
- ⏳ `common.ts` - **NEEDS TESTS**
- ⏳ `crawl-data.ts` - **NEEDS TESTS**
- ⏳ `crawl.ts` - **NEEDS TESTS**
- ⏳ `entity-builder.ts` - **NEEDS TESTS**
- ⏳ `wikidata.ts` - **NEEDS TESTS** (47.61% coverage)

#### TDD Tests to Write:
1. `business-validation.tdd.test.ts` - Business validation schemas
2. `crawl-validation.tdd.test.ts` - Crawl validation schemas
3. `entity-builder-validation.tdd.test.ts` - Entity validation
4. `wikidata-validation.tdd.test.ts` - Wikidata validation

---

### 9. Auth Module (P1 - High Priority)

**Current**: Unknown (likely 0%)  
**Target**: 100% coverage

#### Files to Test:
- ⏳ `session.ts` - **NEEDS TESTS**
- ⏳ `middleware.ts` - **NEEDS TESTS**

#### TDD Tests to Write:
1. `session.tdd.test.ts` - Session management
2. `middleware.tdd.test.ts` - Auth middleware

---

### 10. Payments Module (P1 - High Priority)

**Current**: Unknown (likely 0%)  
**Target**: 100% coverage

#### Files to Test:
- ⏳ `stripe.ts` - **NEEDS TESTS**
- ⏳ `actions.ts` - **NEEDS TESTS**
- ⏳ `gemflush-products.ts` - **NEEDS TESTS**
- ⏳ `setup-products.ts` - **NEEDS TESTS**
- ⏳ `types.ts` - **NEEDS TESTS**

#### TDD Tests to Write:
1. `stripe.tdd.test.ts` - Stripe integration
2. `payment-actions.tdd.test.ts` - Payment actions
3. `gemflush-products.tdd.test.ts` - Product configuration

---

### 11-15. Remaining Modules (P2-P3)

**Email, Hooks, Subscription, Gemflush, Types** - Will be addressed after P0/P1 modules

---

## 🎯 Implementation Order

### Week 1: Core Workflow (P0)
1. Services module (business-execution, cfp-orchestrator, schedulers)
2. Wikidata module (service, entity-builder, client, processor)
3. LLM module (fingerprinter, processor, analyzer, generator)
4. Crawler module (index, firecrawl-client)

### Week 2: Data & Infrastructure (P1)
5. Data module (remaining DTOs)
6. Database module (queries, seed, setup)
7. Utils module (error-handling, logger, format, idempotency)
8. Validation module (all validation schemas)
9. Auth module (session, middleware)
10. Payments module (stripe, actions)

### Week 3: Supporting Features (P2-P3)
11. Email module
12. Hooks module
13. Subscription module
14. Gemflush module
15. Types module

---

## 📝 TDD Test Template

Each test file should follow this structure:

```typescript
/**
 * TDD Test: [Module Name] - Tests Drive Implementation
 * 
 * SPECIFICATION: [What this module does]
 * 
 * As a [user/system]
 * I want [functionality]
 * So that [benefit]
 * 
 * Acceptance Criteria:
 * 1. [Criterion 1]
 * 2. [Criterion 2]
 * 3. [Criterion 3]
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

describe('🔴 RED: [Module] Specification', () => {
  /**
   * SPECIFICATION 1: [First behavior]
   * 
   * Given: [Context]
   * When: [Action]
   * Then: [Expected result]
   */
  it('[describes the behavior]', async () => {
    // Arrange: Set up test data
    const business = BusinessTestFactory.create();
    
    // Act: Call the function (TEST DRIVES IMPLEMENTATION)
    const result = await someFunction(business);
    
    // Assert: Verify behavior (specification)
    expect(result).toMatchObject({
      // Expected structure
    });
  });
});
```

---

## ✅ Success Criteria

### Coverage Goals
- **Phase 1 (P0)**: 100% coverage for core workflow modules
- **Phase 2 (P1)**: 100% coverage for supporting infrastructure
- **Phase 3 (P2-P3)**: 100% coverage for remaining modules
- **Overall**: 100% coverage for entire `lib/` directory

### Quality Goals
- ✅ All tests written using TDD (tests first)
- ✅ All tests follow TDD principles (RED → GREEN → REFACTOR)
- ✅ All tests are readable specifications
- ✅ All tests use proper mocking (no real API calls)
- ✅ All tests use test factories (DRY)

---

## 🚀 Starting Implementation

**Next Steps**:
1. Start with Services module (highest priority)
2. Write TDD tests for `business-execution.ts`
3. Follow RED → GREEN → REFACTOR cycle
4. Move to next module when current is 100% covered

---

**Status**: 🟢 **READY TO START** - Plan complete, ready for TDD implementation


