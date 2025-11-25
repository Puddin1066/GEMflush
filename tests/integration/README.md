# Integration Tests: Services + Components + Dashboard

## Overview

This directory contains integration tests that specify the behavior necessary for integrating services, components, and dashboard pages to provide GEMflush value proposition delivery.

## Test Structure

### Main Test File

**`services-components-dashboard.tdd.test.ts`**

Comprehensive integration tests following TDD principles that specify:

1. **Business Creation Flow Integration**
   - Complete CFP flow (URL → Crawl → Fingerprint → Publish)
   - Crawl service integration with DTO transformation
   - Fingerprint service integration with DTO transformation

2. **Dashboard Data Display Integration**
   - Dashboard overview with aggregated statistics
   - Business detail page with fingerprint and entity data
   - Business list with status from services

3. **Real-Time Updates Integration**
   - Status polling and DTO updates
   - Fingerprint progress updates

4. **Error Handling Integration**
   - Service error propagation
   - Partial failure handling

5. **Component Data Flow Integration**
   - DTO structure matching component props
   - Loading state integration

6. **Automation Integration**
   - Auto-crawl triggers
   - Auto-publish triggers

## Test Philosophy

These tests follow the **TRUE TDD Process**:

1. **RED**: Tests are written FIRST to specify behavior
2. **GREEN**: Minimal implementation to satisfy tests
3. **REFACTOR**: Improve code while keeping tests green

Tests specify **behavior**, not implementation details.

## Integration Points Tested

```
Services (lib/services/)
  ↓ (orchestrate business logic)
Domain Objects
  ↓ (transform to DTOs)
DTOs (lib/data/)
  ↓ (fetch via API routes)
Hooks (lib/hooks/)
  ↓ (provide to components)
Components (components/)
  ↓ (display in pages)
Dashboard Pages (app/(dashboard)/)
```

## Running Tests

```bash
# Run all integration tests
pnpm test tests/integration

# Run specific test file
pnpm test tests/integration/services-components-dashboard.tdd.test.ts

# Watch mode for TDD
pnpm test:watch tests/integration
```

## Clarifying Questions

See **`CLARIFYING_QUESTIONS.md`** for questions about:
- Page structure and component composition
- Data flow patterns
- Real-time updates strategy
- Error handling approach
- Value proposition delivery

These questions help refine test specifications to match actual requirements.

## Test Coverage

### ✅ Covered

- Service orchestration and execution
- DTO transformation and data flow
- Component prop structure validation
- Error handling and partial failures
- Real-time updates and polling
- Automation triggers

### 🔄 Needs Clarification

- Specific page layouts and component composition
- Polling intervals and strategies
- Error display patterns
- Loading state coordination
- Data caching strategies

See `CLARIFYING_QUESTIONS.md` for detailed questions.

## Next Steps

1. **Answer clarifying questions** in `CLARIFYING_QUESTIONS.md`
2. **Refine test specifications** based on answers
3. **Implement services/components** to satisfy tests (TDD cycle)
4. **Add more integration tests** as features are identified

## Related Documentation

- **TDD Process**: `docs/development/TRUE_TDD_PROCESS.md`
- **Services README**: `lib/services/README.md`
- **Components README**: `components/README.md`
- **Dashboard Structure**: `app/(dashboard)/README.md` (if exists)

