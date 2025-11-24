# API Routes Layer (`app/api/`) - TDD Development Guide

**Purpose**: Next.js API routes serving as backend endpoints for the SaaS platform  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement routes to satisfy them  
**Status**: 🟢 Active Development

---

## 📚 Overview

The `app/api/` directory contains all API route handlers following Next.js App Router conventions. Each `route.ts` file is a standalone serverless function that gets deployed independently to Vercel. All routes should be developed using **Test-Driven Development (TDD)**, where tests serve as executable specifications.

### Architecture Principles

1. **Tests ARE Specifications**: Write API contract tests first
2. **Route = Serverless Function**: Each `route.ts` is a separate function
3. **Authentication First**: All protected routes verify user session
4. **Validation Required**: All inputs validated with Zod schemas
5. **Error Handling**: Proper HTTP status codes and error messages
6. **Type Safety**: Full TypeScript coverage with request/response types

---

## 🏗️ Directory Structure

```
app/api/
├── business/           # Business CRUD operations
│   ├── route.ts       # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts   # GET, PUT, DELETE
│       ├── process/   # Process business (CFP workflow)
│       ├── fingerprint/ # Fingerprint operations
│       └── status/    # Status updates
├── crawl/             # Web crawling endpoints
├── fingerprint/       # Fingerprint analysis endpoints
├── wikidata/          # Wikidata publishing endpoints
│   ├── publish/       # Publish entity
│   └── entity/        # Entity management
├── job/               # Job status polling
├── dashboard/         # Dashboard data aggregation
├── stripe/            # Payment processing
│   ├── checkout/      # Checkout session creation
│   └── webhook/       # Webhook handler
├── team/              # Team management
├── user/              # User profile operations
├── cfp/               # CFP workflow orchestration
└── cron/              # Scheduled job endpoints
    ├── weekly-crawls/ # Weekly crawl automation
    └── monthly/       # Monthly processing
```

---

## 🎯 TDD Workflow for API Route Development

### Step 1: Write Specification (Test FIRST)

**Before writing any route code**, write a test that defines the API contract:

```typescript
/**
 * SPECIFICATION: Business Creation API
 * 
 * As a user
 * I want to create a new business via API
 * So that I can add businesses to my account
 * 
 * Acceptance Criteria:
 * - POST /api/business creates a business
 * - Returns 201 with business data on success
 * - Returns 401 if not authenticated
 * - Returns 400 if validation fails
 * - Returns 403 if user lacks permission
 */
describe('POST /api/business - Specification', () => {
  it('creates business and returns 201 with business data', async () => {
    // SPECIFICATION: Given an authenticated user
    const user = createTestUser();
    mockGetUser.mockResolvedValue(user);
    
    // SPECIFICATION: And valid business data
    const requestBody = {
      name: 'Test Business',
      url: 'https://example.com',
    };
    
    // SPECIFICATION: When POST request is made
    const response = await POST(
      new Request('http://localhost/api/business', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    
    // SPECIFICATION: Then response should be 201
    expect(response.status).toBe(201);
    
    // SPECIFICATION: And response should contain business data
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test Business');
    expect(data.status).toBe('pending');
  });
  
  it('returns 401 when not authenticated', async () => {
    // SPECIFICATION: Given no authenticated user
    mockGetUser.mockResolvedValue(null);
    
    // SPECIFICATION: When POST request is made
    const response = await POST(new Request('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', url: 'https://example.com' }),
    }));
    
    // SPECIFICATION: Then response should be 401
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toContain('Unauthorized');
  });
  
  it('returns 400 when validation fails', async () => {
    // SPECIFICATION: Given invalid request data
    mockGetUser.mockResolvedValue(createTestUser());
    
    // SPECIFICATION: When POST request with invalid data
    const response = await POST(new Request('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: '' }), // Missing required 'url'
    }));
    
    // SPECIFICATION: Then response should be 400
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toContain('validation');
  });
});
```

### Step 2: Run Test (RED - Expected Failure)

```bash
# Start TDD watch mode
pnpm tdd

# Or run specific test file
pnpm test app/api/business/__tests__/route.test.ts
```

**Expected**: Test fails (RED) ✅  
**Why**: Route handler doesn't exist yet or doesn't satisfy the specification.

### Step 3: Implement Route to Satisfy Specification (GREEN)

Write minimal route code to make the test pass:

```typescript
// app/api/business/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/session';
import { businessCreateSchema } from '@/lib/validation/business';
import { createBusiness } from '@/lib/db/queries';
import { BusinessDTO } from '@/lib/data/business-dto';

export async function POST(request: NextRequest) {
  // SPECIFICATION: Authenticate user
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // SPECIFICATION: Validate request body
    const body = await request.json();
    const validated = businessCreateSchema.parse(body);
    
    // SPECIFICATION: Create business
    const business = await createBusiness({
      ...validated,
      teamId: user.teamId,
      status: 'pending',
    });
    
    // SPECIFICATION: Return 201 with business data
    return NextResponse.json(
      BusinessDTO.fromDatabase(business),
      { status: 201 }
    );
  } catch (error) {
    // SPECIFICATION: Return 400 on validation error
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    throw error;
  }
}
```

**Expected**: Test passes (GREEN) ✅

### Step 4: Refactor (Keep Specification Valid)

Improve route code while keeping tests passing:

```typescript
// Refactored route
export async function POST(request: NextRequest) {
  // Extract authentication
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return authResult.response;
  }
  
  // Extract and validate body
  const validationResult = await validateRequestBody(
    request,
    businessCreateSchema
  );
  if (!validationResult.success) {
    return validationResult.response;
  }
  
  // Create business
  const business = await createBusinessService({
    ...validationResult.data,
    teamId: authResult.user.teamId,
  });
  
  return NextResponse.json(
    BusinessDTO.fromDatabase(business),
    { status: 201 }
  );
}
```

**Expected**: Test still passes ✅

---

## 📦 Core API Endpoints

### 1. Business Operations (`app/api/business/`)

**Purpose**: CRUD operations for business entities

**Routes:**
- `GET /api/business` - List all businesses for user's team
- `POST /api/business` - Create new business
- `GET /api/business/[id]` - Get business details
- `PUT /api/business/[id]` - Update business
- `DELETE /api/business/[id]` - Delete business
- `POST /api/business/[id]/process` - Trigger CFP workflow

**TDD Example:**
```typescript
// Write test first
describe('POST /api/business', () => {
  it('creates business and returns 201', async () => {
    // Test defines API contract
  });
});

// Then implement route
```

**Testing**: See `app/api/business/__tests__/` for examples

---

### 2. Crawl Operations (`app/api/crawl/`)

**Purpose**: Web crawling job management

**Routes:**
- `POST /api/crawl` - Trigger crawl job for business

**TDD Example:**
```typescript
// Write test first
describe('POST /api/crawl', () => {
  it('creates crawl job and returns job ID', async () => {
    const response = await POST(new Request('http://localhost/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 123 }),
    }));
    
    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data.jobId).toBeDefined();
    expect(data.status).toBe('pending');
  });
});
```

**Testing**: See `app/api/crawl/__tests__/` for examples

---

### 3. Fingerprint Operations (`app/api/fingerprint/`)

**Purpose**: Fingerprint analysis job management

**Routes:**
- `POST /api/fingerprint` - Trigger fingerprint job for business
- `GET /api/fingerprint/[id]` - Get fingerprint results

**TDD Example:**
```typescript
// Write test first
describe('POST /api/fingerprint', () => {
  it('creates fingerprint job and returns job ID', async () => {
    // Test defines API contract
  });
});
```

**Testing**: See `app/api/fingerprint/__tests__/` for examples

---

### 4. Wikidata Operations (`app/api/wikidata/`)

**Purpose**: Wikidata publishing and entity management

**Routes:**
- `POST /api/wikidata/publish` - Publish business to Wikidata
- `GET /api/wikidata/entity/[businessId]` - Get Wikidata entity for business

**TDD Example:**
```typescript
// Write test first
describe('POST /api/wikidata/publish', () => {
  it('publishes entity and returns QID', async () => {
    // Test defines API contract
  });
});
```

**Testing**: See `app/api/wikidata/__tests__/` for examples

---

### 5. Job Status (`app/api/job/`)

**Purpose**: Poll job status for long-running operations

**Routes:**
- `GET /api/job/[jobId]` - Get job status

**TDD Example:**
```typescript
// Write test first
describe('GET /api/job/[jobId]', () => {
  it('returns job status', async () => {
    // Test defines API contract
  });
});
```

**Testing**: See `app/api/job/__tests__/` for examples

---

### 6. Dashboard (`app/api/dashboard/`)

**Purpose**: Aggregated dashboard data

**Routes:**
- `GET /api/dashboard` - Get dashboard summary data

**TDD Example:**
```typescript
// Write test first
describe('GET /api/dashboard', () => {
  it('returns dashboard data with business summaries', async () => {
    // Test defines API contract
  });
});
```

---

### 7. Payment Processing (`app/api/stripe/`)

**Purpose**: Stripe checkout and webhook handling

**Routes:**
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

**TDD Example:**
```typescript
// Write test first
describe('POST /api/stripe/checkout', () => {
  it('creates checkout session and returns URL', async () => {
    // Test defines API contract
  });
});
```

**Testing**: See `app/api/stripe/__tests__/` for examples

---

### 8. CFP Workflow (`app/api/cfp/`)

**Purpose**: End-to-end CFP workflow orchestration

**Routes:**
- `POST /api/cfp` - Trigger complete CFP workflow (Crawl → Fingerprint → Publish)

**TDD Example:**
```typescript
// Write test first
describe('POST /api/cfp', () => {
  it('executes complete CFP workflow', async () => {
    // Test defines API contract
  });
});
```

---

### 9. Cron Jobs (`app/api/cron/`)

**Purpose**: Scheduled automation tasks

**Routes:**
- `GET /api/cron/weekly-crawls` - Process weekly crawls (called by Vercel Cron)
- `GET /api/cron/monthly` - Process monthly batch jobs (called by Vercel Cron)

**TDD Example:**
```typescript
// Write test first
describe('GET /api/cron/weekly-crawls', () => {
  it('processes all due weekly crawls', async () => {
    // Test defines API contract
  });
});
```

**Testing**: See `app/api/cron/__tests__/` for examples

---

## 🔄 Request/Response Flow

```
Client Request
    ↓
Next.js API Route (app/api/*/route.ts)
    ↓
1. Authentication (lib/auth/session.ts)
    ↓
2. Authorization (lib/gemflush/permissions.ts)
    ↓
3. Validation (lib/validation/*.ts)
    ↓
4. Business Logic (lib/services/*.ts)
    ↓
5. Database Operations (lib/db/queries.ts)
    ↓
6. DTO Transformation (lib/data/*-dto.ts)
    ↓
HTTP Response (JSON)
```

---

## 📝 TDD Best Practices for API Routes

### 1. Write API Contract Tests First

**✅ GOOD:**
```typescript
// Test defines API contract FIRST
it('returns 201 when business is created', async () => {
  const response = await POST(request);
  expect(response.status).toBe(201);
  const data = await response.json();
  expect(data.id).toBeDefined();
});
```

**❌ BAD:**
```typescript
// Route written first
export async function POST(request: NextRequest) {
  // ... implementation
}

// Test written after (just verifying route)
it('POST works', () => {
  // Test just verifies route exists
});
```

### 2. Test All Status Codes

**✅ GOOD:**
```typescript
describe('POST /api/business', () => {
  it('returns 201 on success', async () => { /* ... */ });
  it('returns 401 when not authenticated', async () => { /* ... */ });
  it('returns 400 when validation fails', async () => { /* ... */ });
  it('returns 403 when user lacks permission', async () => { /* ... */ });
  it('returns 500 on server error', async () => { /* ... */ });
});
```

### 3. Mock Dependencies

**✅ GOOD:**
```typescript
vi.mock('@/lib/auth/session', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  createBusiness: vi.fn(),
}));
```

**❌ BAD:**
```typescript
// Making real database calls in tests
const business = await createBusiness({ ... });
```

### 4. Test Request/Response Contracts

**✅ GOOD:**
```typescript
it('accepts valid business creation request', async () => {
  const request = new Request('http://localhost/api/business', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Business',
      url: 'https://example.com',
    }),
  });
  
  const response = await POST(request);
  expect(response.status).toBe(201);
});
```

### 5. Test Error Handling

**✅ GOOD:**
```typescript
it('returns 400 with error message when validation fails', async () => {
  const response = await POST(requestWithInvalidData);
  expect(response.status).toBe(400);
  
  const data = await response.json();
  expect(data.error).toBeDefined();
  expect(data.error).toContain('validation');
});
```

---

## 🚀 Running Tests

### Watch Mode (Recommended for TDD)

```bash
# Start Vitest watch mode
pnpm tdd

# Or explicit watch command
pnpm test:watch
```

**Watch mode automatically re-runs tests when files change** - perfect for RED → GREEN → REFACTOR cycle.

### Single Run

```bash
# Run all tests once
pnpm test:run

# Run specific file
pnpm test app/api/business/__tests__/route.test.ts

# Run with pattern
pnpm test --grep "business creation"
```

### Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Coverage for specific route
pnpm test:coverage app/api/business/__tests__/route.test.ts
```

---

## 🔒 Security Best Practices

### 1. Always Authenticate First

```typescript
export async function POST(request: NextRequest) {
  // ✅ GOOD: Authenticate first
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // ... rest of handler
}
```

### 2. Validate All Inputs

```typescript
export async function POST(request: NextRequest) {
  // ✅ GOOD: Validate request body
  const body = await request.json();
  const validated = businessCreateSchema.parse(body);
  
  // ... use validated data
}
```

### 3. Check Permissions

```typescript
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser();
  const business = await getBusinessById(Number(params.id));
  
  // ✅ GOOD: Check ownership
  if (business.teamId !== user.teamId) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  // ... delete business
}
```

### 4. Sanitize Error Messages

```typescript
// ✅ GOOD: Don't leak internal errors
catch (error) {
  logger.error('Internal error', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## 📋 TDD Checklist for API Routes

When developing a new API route:

- [ ] **Write test FIRST** (API contract before route code)
- [ ] **Test defines behavior** (what API should do, not how)
- [ ] **Test all status codes** (200, 201, 400, 401, 403, 500)
- [ ] **Test authentication** (401 when not authenticated)
- [ ] **Test authorization** (403 when user lacks permission)
- [ ] **Test validation** (400 when input invalid)
- [ ] **Test success case** (200/201 with correct response)
- [ ] **Test error handling** (500 with proper error message)
- [ ] **Mock dependencies** (database, services, external APIs)
- [ ] **Run test** (verify it fails - RED)
- [ ] **Write minimal route** (satisfy API contract)
- [ ] **Run test** (verify it passes - GREEN)
- [ ] **Refactor route** (improve while keeping test passing)
- [ ] **Test still passes** (API contract still satisfied)

---

## 🔗 Related Documentation

- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`
- **TDD Getting Started**: `docs/development/TDD_GETTING_STARTED.md`
- **TDD Specification Example**: `docs/development/TDD_SPECIFICATION_EXAMPLE.md`
- **Library Layer**: `lib/README.md`
- **API Endpoints**: `docs/architecture/ENDPOINTS_AND_SERVICES.md`
- **Vercel Architecture**: `docs/architecture/VERCEL_ARCHITECTURE_GUIDE.md`

---

## 🎓 Key Principles

1. **Tests ARE Specifications**: Tests define API contracts, routes satisfy them
2. **Write Tests First**: Before any route implementation
3. **Test API Contracts**: Request/response formats, status codes, error messages
4. **Mock Dependencies**: Don't make real database/API calls in tests
5. **Security First**: Always authenticate, validate, and check permissions
6. **Error Handling**: Proper HTTP status codes and error messages
7. **Type Safety**: Full TypeScript coverage with request/response types
8. **DRY**: Shared helpers for authentication, validation, error handling

---

**Remember**: In TDD, tests are not verification—they are the specification that drives development. Write API contract tests first, then implement routes to satisfy them.


