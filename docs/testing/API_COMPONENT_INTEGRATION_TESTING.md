# API → Component Integration Testing Guide

## Problem Statement

Individual businesses within an account may not have consistent or accurate connections between:
- API routes (`app/api/`)
- Hooks (`lib/hooks/`)
- Components (`components/`)
- Pages (`app/(dashboard)/`)

## Root Causes Identified

### 1. Type Inconsistencies

**Issue**: Different endpoints return different ID types
- `/api/business` returns `id: number`
- `/api/dashboard` returns `id: string` (converted in DTO)
- Hooks expect `id: number`
- Components may receive either

**Impact**: Type mismatches cause runtime errors or incorrect data display

### 2. Location Structure Mismatch

**Issue**: Location data structure varies
- `/api/business` returns `location: { city, state, country }` (object)
- `/api/dashboard` returns `location: "City, State"` (string)
- Components expect object structure

**Impact**: Components may fail to display location or crash

### 3. Missing Contract Validation

**Issue**: No tests verify that:
- API responses match hook expectations
- Hook outputs match component prop requirements
- Data transformations are consistent

**Impact**: Breaking changes go undetected

## Solution: Integration Test Suite

### Test Structure

```
tests/integration/
├── api-component-integration.test.ts    # Full data flow tests
├── api-route-contracts.test.ts          # API contract validation
└── hook-component-contracts.test.ts     # Hook/component alignment
```

### Test Categories

#### 1. API Route Contracts

**Purpose**: Verify API routes return expected structures

**Tests**:
- ✅ `/api/business` returns businesses with `id: number`
- ✅ `/api/business/[id]` returns single business with correct structure
- ✅ `/api/dashboard` returns DashboardDTO with `id: string`
- ✅ Error responses have consistent structure

**Example**:
```typescript
it('should return businesses array with correct structure', () => {
  const response = await fetch('/api/business');
  const data = await response.json();
  
  expect(data.businesses).toBeArray();
  expect(data.businesses[0].id).toBeTypeOf('number');
  expect(data.businesses[0].location).toBeTypeOf('object');
});
```

#### 2. Hook-API Alignment

**Purpose**: Verify hooks correctly consume API responses

**Tests**:
- ✅ `useBusinesses()` handles `/api/business` response
- ✅ `useBusinessDetail()` handles `/api/business/[id]` response
- ✅ `useDashboard()` handles `/api/dashboard` response
- ✅ Type transformations are correct

**Example**:
```typescript
it('should transform API response to hook format', () => {
  const apiResponse = { businesses: [{ id: 1, name: 'Test' }] };
  const hookData = useBusinesses();
  
  expect(hookData.businesses[0].id).toBeTypeOf('number');
});
```

#### 3. Component-Data Alignment

**Purpose**: Verify components receive correct data structures

**Tests**:
- ✅ `BusinessListCard` receives business with `id: number`
- ✅ Dashboard handles `id: string` from DTO
- ✅ Location parsing works for both object and string formats
- ✅ Missing data handled gracefully

**Example**:
```typescript
it('should handle dashboard business DTO structure', () => {
  const dashboardBusiness = {
    id: '1', // string
    location: 'SF, CA', // string
  };
  
  // Component should parse correctly
  const businessId = parseInt(dashboardBusiness.id);
  expect(businessId).toBe(1);
});
```

#### 4. End-to-End Data Flow

**Purpose**: Verify complete data flow from API to UI

**Tests**:
- ✅ Create business → appears in list
- ✅ Business detail loads correctly
- ✅ Dashboard shows correct business count
- ✅ Data updates propagate correctly

## Implementation

### Step 1: Create Contract Tests

```typescript
// tests/integration/api-route-contracts.test.ts
describe('API Route Contracts', () => {
  describe('GET /api/business', () => {
    it('should return businesses with number IDs', () => {
      // Test implementation
    });
  });
});
```

### Step 2: Create Integration Tests

```typescript
// tests/integration/api-component-integration.test.ts
describe('API → Hook → Component Flow', () => {
  it('should flow data correctly from API to component', () => {
    // Test implementation
  });
});
```

### Step 3: Add Type Guards

```typescript
// lib/utils/type-guards.ts
export function isBusinessListResponse(data: any): data is BusinessListResponse {
  return (
    Array.isArray(data.businesses) &&
    data.businesses.every(b => typeof b.id === 'number')
  );
}
```

### Step 4: Fix Type Inconsistencies

1. **Standardize ID types**:
   - Keep database IDs as `number`
   - Only convert to `string` in DTOs when necessary
   - Update hooks to handle both if needed

2. **Standardize location structure**:
   - Keep API responses as objects
   - Convert to string only in DashboardDTO
   - Update components to handle both

## Running Tests

```bash
# Run integration tests
pnpm test tests/integration

# Run with coverage
pnpm test:coverage tests/integration

# Run specific test file
pnpm test tests/integration/api-component-integration.test.ts
```

## Test Coverage Goals

- ✅ 100% API route contract coverage
- ✅ 100% hook-API alignment coverage
- ✅ 80% component-data alignment coverage
- ✅ 100% error handling coverage

## Continuous Integration

Add to CI pipeline:
```yaml
- name: Run Integration Tests
  run: pnpm test tests/integration
```

## Monitoring

Track these metrics:
- API response structure changes
- Type mismatches
- Component prop mismatches
- Data transformation errors

## Next Steps

1. ✅ Create contract test files
2. ⏳ Implement API route contract tests
3. ⏳ Implement hook-API alignment tests
4. ⏳ Implement component-data alignment tests
5. ⏳ Fix identified inconsistencies
6. ⏳ Add to CI pipeline
7. ⏳ Monitor for regressions

---

*These tests ensure data consistency across the entire application stack.*

