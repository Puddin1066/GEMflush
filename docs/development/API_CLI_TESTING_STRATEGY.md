# API & CLI Testing & Debugging Strategy

**Date:** January 2025  
**Purpose:** Comprehensive guide on when and how to use real APIs vs mocks, and how to leverage CLIs for debugging  
**Status:** 🟢 Active Reference

---

## 🎯 Core Principle

**Use real APIs for integration testing and debugging. Mock only when necessary for speed, cost, or determinism.**

---

## 📊 API Usage Decision Matrix

| API/Service | Unit Tests | Integration Tests | E2E Tests | Debugging | CLI Tool |
|-------------|-----------|-------------------|-----------|-----------|----------|
| **PostgreSQL/Supabase** | ❌ Mock | ✅ **REAL** | ✅ **REAL** | ✅ **REAL** | ✅ `psql`, `supabase` CLI |
| **Stripe** | ❌ Mock | ⚠️ Test Mode | ⚠️ Test Mode | ✅ **Test Mode** | ✅ `stripe` CLI |
| **Wikidata Action API** | ❌ Mock | ⚠️ test.wikidata.org | ⚠️ test.wikidata.org | ✅ **test.wikidata.org** | ✅ `wikidata` CLI (if available) |
| **OpenRouter** | ❌ Mock | ⚠️ Conditional | ⚠️ Conditional | ✅ **REAL** | ❌ No CLI |
| **Firecrawl** | ❌ Mock | ⚠️ Conditional | ⚠️ Conditional | ✅ **REAL** | ❌ No CLI |
| **Internal APIs** | ❌ Mock | ✅ **REAL** | ✅ **REAL** | ✅ **REAL** | N/A |

**Legend:**
- ✅ **REAL**: Use real API/CLI
- ⚠️ **Conditional**: Use real in debug mode, mock in normal tests
- ❌ **Mock**: Always mock in tests

---

## 🔍 When to Use Real APIs

### ✅ Use Real APIs For:

1. **Integration Testing**
   - Validates actual API contracts
   - Catches integration bugs early
   - Tests error handling with real responses

2. **Debugging**
   - Reproduce real-world issues
   - Test edge cases that mocks might miss
   - Verify API behavior changes

3. **E2E Workflow Validation**
   - Complete user journeys
   - Real data flow validation
   - Production-like scenarios

4. **API Contract Verification**
   - Validate request/response formats
   - Test authentication flows
   - Verify rate limits and errors

---

## 🚫 When to Mock APIs

### ❌ Mock APIs For:

1. **Unit Tests**
   - Fast execution
   - Deterministic results
   - No external dependencies

2. **Paid Services (Cost Control)**
   - Stripe (use test mode instead)
   - OpenRouter (mock to avoid costs)
   - Google Search API (mock to avoid costs)

3. **Slow Services**
   - Long-running operations
   - Network latency issues
   - Rate limit concerns

4. **Unreliable Services**
   - Flaky external services
   - Test environment stability
   - CI/CD reliability

---

## 🛠️ CLI Tools for Testing & Debugging

### PostgreSQL/Supabase

#### CLI Tools Available:
- `psql` - PostgreSQL command-line client
- `supabase` CLI - Supabase management
- `drizzle-kit` - Drizzle ORM CLI

#### Use Cases:

**1. Direct Database Inspection**
```bash
# Connect to database
psql $DATABASE_URL

# Or use Supabase CLI
supabase db connect

# Query businesses
SELECT * FROM businesses LIMIT 10;

# Check recent fingerprints
SELECT id, business_id, visibility_score, created_at 
FROM llm_fingerprints 
ORDER BY created_at DESC 
LIMIT 5;
```

**2. Database Setup/Reset**
```bash
# Push schema changes
pnpm db:push

# Generate migrations
pnpm db:generate

# Open Drizzle Studio (GUI)
pnpm db:studio
```

**3. Data Seeding**
```bash
# Run seed script
pnpm db:seed

# Or custom seed for testing
psql $DATABASE_URL -f scripts/seed-test-data.sql
```

**4. Debug Database Issues**
```bash
# Check connection
psql $DATABASE_URL -c "SELECT version();"

# Check table structure
psql $DATABASE_URL -c "\d businesses"

# Check indexes
psql $DATABASE_URL -c "\di"
```

#### Integration Test Example:

```typescript
/**
 * Integration test using real PostgreSQL CLI for verification
 */
describe('Database Integration Test', () => {
  it('stores business data correctly', async () => {
    // Arrange: Create business via API
    const response = await fetch('/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Business' }),
    });
    const business = await response.json();
    
    // Act: Verify via direct database query (using CLI-like query)
    const { db } = await import('@/lib/db/drizzle');
    const stored = await db.query.businesses.findFirst({
      where: eq(businesses.id, business.id),
    });
    
    // Assert: Data matches (real database verification)
    expect(stored?.name).toBe('Test Business');
    
    // Debug: Can also verify via psql CLI
    // psql $DATABASE_URL -c "SELECT * FROM businesses WHERE id = $1" $business.id
  });
});
```

---

### Stripe

#### CLI Tools Available:
- `stripe` CLI - Stripe command-line tool

#### Use Cases:

**1. Test Mode Setup**
```bash
# Login to Stripe CLI
stripe login

# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed

# List products
stripe products list

# Create test customer
stripe customers create --email test@example.com
```

**2. Test Payment Flows**
```bash
# Create test checkout session
stripe checkout sessions create \
  --success-url http://localhost:3000/success \
  --cancel-url http://localhost:3000/cancel \
  --line-items '[{"price": "price_xxx", "quantity": 1}]'

# Create test payment intent
stripe payment intents create \
  --amount 4900 \
  --currency usd \
  --customer cus_xxx
```

**3. Debug Webhook Issues**
```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# View webhook logs
stripe logs tail

# Replay webhook events
stripe events resend evt_xxx
```

#### Integration Test Example:

```typescript
/**
 * Integration test using Stripe test mode
 */
describe('Stripe Payment Integration', () => {
  beforeEach(() => {
    // Use Stripe test mode (not mocks)
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY;
  });

  it('creates checkout session in Stripe test mode', async () => {
    // Arrange: Test setup
    const userId = 123;
    const priceId = 'price_test_pro_monthly';
    
    // Act: Create checkout (real Stripe test API)
    const { createCheckoutSession } = await import('@/lib/payments/stripe');
    const session = await createCheckoutSession(userId, priceId);
    
    // Assert: Real Stripe session created (verify via Stripe CLI)
    expect(session.url).toContain('checkout.stripe.com');
    expect(session.id).toMatch(/^cs_test_/); // Test mode prefix
    
    // Debug: Verify via Stripe CLI
    // stripe checkout sessions retrieve $session.id
  });
});
```

---

### Wikidata Action API

#### CLI Tools Available:
- Wikidata API can be tested via `curl` or custom scripts

#### Use Cases:

**1. Test Publishing Flow**
```bash
# Test login (test.wikidata.org)
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=login" \
  -d "lgname=YourBot" \
  -d "lgpassword=YourPassword" \
  -d "format=json"

# Create test entity
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=wbcreateentity" \
  -d "new=item" \
  -d "data={...}" \
  -d "format=json"
```

**2. Query SPARQL**
```bash
# Test SPARQL query
curl -G https://query.wikidata.org/sparql \
  --data-urlencode "query=SELECT * WHERE { ?s ?p ?o } LIMIT 10" \
  --header "Accept: application/sparql-results+json"
```

#### Integration Test Example:

```typescript
/**
 * Integration test using test.wikidata.org
 */
describe('Wikidata Publishing Integration', () => {
  beforeEach(() => {
    // Use test.wikidata.org (not production)
    process.env.WIKIDATA_API_URL = 'https://test.wikidata.org/w/api.php';
    process.env.WIKIDATA_USERNAME = process.env.WIKIDATA_TEST_USERNAME;
  });

  it('publishes entity to test.wikidata.org', async () => {
    // Arrange: Business ready to publish
    const business = await createTestBusiness();
    
    // Act: Publish (real test.wikidata.org API)
    const { publishToWikidata } = await import('@/lib/wikidata/service');
    const result = await publishToWikidata(business.id);
    
    // Assert: Entity created on test.wikidata.org
    expect(result.qid).toMatch(/^Q\d+$/);
    
    // Debug: Verify via API query
    // curl "https://test.wikidata.org/wiki/Special:EntityData/$qid.json"
  });
});
```

---

### OpenRouter API

#### CLI Tools: None (use `curl` or scripts)

#### Use Cases:

**1. Test API Calls Directly**
```bash
# Test API call
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

**2. Debug Response Formats**
```bash
# Save response for inspection
curl ... > test-response.json

# Format JSON response
curl ... | jq '.'
```

#### Debugging Test Example:

```typescript
/**
 * Debug test using real OpenRouter API (conditional)
 */
describe('OpenRouter API Debugging', () => {
  // Only run if DEBUG_OPENROUTER env var is set
  const shouldUseRealAPI = process.env.DEBUG_OPENROUTER === 'true';

  it.skipIf(!shouldUseRealAPI)('tests real OpenRouter API response', async () => {
    // Arrange: Real API key
    expect(process.env.OPENROUTER_API_KEY).toBeDefined();
    
    // Act: Real API call
    const { queryModel } = await import('@/lib/llm/openrouter-client');
    const response = await queryModel('gpt-4', 'Test prompt');
    
    // Assert: Verify response structure (for debugging)
    expect(response).toHaveProperty('choices');
    console.log('Real API response:', JSON.stringify(response, null, 2));
  });
});
```

---

## 🔧 Test Environment Configuration

### Environment Variable Strategy

```bash
# .env.test - Test environment
DATABASE_URL=postgresql://...  # Test database
STRIPE_SECRET_KEY=sk_test_...  # Stripe test mode
OPENROUTER_API_KEY=           # Empty = use mocks
WIKIDATA_PUBLISH_MODE=mock    # mock | test | real
USE_MOCK_FIRECRAWL=true       # true | false
```

### Conditional API Usage

```typescript
/**
 * Helper to determine if real API should be used
 */
export function shouldUseRealAPI(service: string): boolean {
  const env = process.env.NODE_ENV;
  const debugMode = process.env.DEBUG_APIS === 'true';
  
  // Always use real APIs in production
  if (env === 'production') return true;
  
  // Use real APIs if explicitly enabled for debugging
  if (debugMode) return true;
  
  // Service-specific overrides
  const overrides: Record<string, boolean> = {
    database: true,        // Always use real DB in integration tests
    stripe: env === 'test', // Use Stripe test mode
    wikidata: process.env.WIKIDATA_PUBLISH_MODE === 'test',
    openrouter: false,     // Mock by default (paid)
    firecrawl: false,      // Mock by default
  };
  
  return overrides[service] ?? false;
}
```

---

## 📋 Testing Strategy by Test Type

### Unit Tests

**Strategy:** Mock all external APIs

```typescript
// Unit test - all APIs mocked
describe('Business Service Unit Test', () => {
  beforeEach(() => {
    vi.mock('@/lib/db/queries');
    vi.mock('@/lib/llm/openrouter-client');
    vi.mock('@/lib/wikidata/client');
  });
  
  it('processes business', async () => {
    // All dependencies mocked
  });
});
```

### Integration Tests

**Strategy:** Use real database, mock paid APIs

```typescript
// Integration test - real DB, mocked paid APIs
describe('Business Integration Test', () => {
  beforeEach(async () => {
    // Use real database
    await cleanupTestData();
    
    // Mock paid APIs
    vi.mock('@/lib/llm/openrouter-client');
  });
  
  it('stores business in database', async () => {
    // Real database operations
    const business = await createBusiness({ name: 'Test' });
    expect(business.id).toBeDefined();
  });
});
```

### E2E Tests

**Strategy:** Use real internal APIs, mock external paid services

```typescript
// E2E test - real internal APIs, mocked external
test('complete user workflow', async ({ page }) => {
  // Real database, real internal APIs
  // Mocked: Stripe, OpenRouter (paid)
  // Real: test.wikidata.org (free test API)
  
  await page.goto('/dashboard');
  // ... test with real APIs
});
```

### Debug Tests

**Strategy:** Use all real APIs with test credentials

```typescript
// Debug test - all real APIs
describe('API Debugging', () => {
  beforeAll(() => {
    // Use real APIs for debugging
    process.env.DEBUG_APIS = 'true';
    process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_TEST_KEY;
    process.env.WIKIDATA_PUBLISH_MODE = 'test';
  });
  
  it.only('debug real API responses', async () => {
    // Real API calls for debugging
  });
});
```

---

## 🐛 Debugging Workflows

### Workflow 1: Debug Database Issues

```bash
# 1. Check connection
psql $DATABASE_URL -c "SELECT 1"

# 2. Inspect data
psql $DATABASE_URL -c "SELECT * FROM businesses WHERE id = 123"

# 3. Run test with real DB
DEBUG_APIS=true pnpm test tests/integration/business.test.ts

# 4. Use Drizzle Studio for GUI
pnpm db:studio
```

### Workflow 2: Debug Stripe Integration

```bash
# 1. Listen to webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 2. Trigger test event
stripe trigger checkout.session.completed

# 3. Run test with Stripe test mode
STRIPE_SECRET_KEY=sk_test_... pnpm test tests/integration/payments.test.ts

# 4. Check Stripe dashboard
# https://dashboard.stripe.com/test/logs
```

### Workflow 3: Debug Wikidata Publishing

```bash
# 1. Test login
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=login&lgname=$USERNAME&lgpassword=$PASSWORD"

# 2. Run test with test.wikidata.org
WIKIDATA_PUBLISH_MODE=test pnpm test tests/integration/wikidata.test.ts

# 3. Check entity on test.wikidata.org
# https://test.wikidata.org/wiki/Q12345
```

### Workflow 4: Debug LLM Responses

```bash
# 1. Test API directly
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{"model": "gpt-4", "messages": [...]}'

# 2. Run debug test
DEBUG_OPENROUTER=true pnpm test tests/debug/llm-responses.test.ts

# 3. Inspect responses in test output
```

---

## 🎯 Recommended Test Configuration

### Test Suite Structure

```
tests/
├── unit/              # All APIs mocked
│   └── *.test.ts
├── integration/       # Real DB, mocked paid APIs
│   └── *.test.ts
├── e2e/              # Real internal APIs, mocked external
│   └── *.spec.ts
└── debug/            # All real APIs (conditional)
    └── *.test.ts
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:debug": "DEBUG_APIS=true vitest run tests/debug",
    "test:debug:openrouter": "DEBUG_OPENROUTER=true vitest run tests/debug/llm",
    "db:cli": "psql $DATABASE_URL",
    "db:studio": "drizzle-kit studio",
    "stripe:listen": "stripe listen --forward-to localhost:3000/api/stripe/webhook"
  }
}
```

---

## ✅ Best Practices

### 1. Use Real APIs for Integration Testing

**✅ Good:**
```typescript
// Integration test with real database
it('stores business in database', async () => {
  const business = await createBusiness({ name: 'Test' });
  const stored = await getBusinessById(business.id);
  expect(stored).toBeDefined();
});
```

**❌ Bad:**
```typescript
// Over-mocked integration test
vi.mock('@/lib/db/queries');
it('stores business', async () => {
  // Not really testing integration
});
```

### 2. Mock Only External Paid Services

**✅ Good:**
```typescript
// Mock paid API, use real DB
vi.mock('@/lib/llm/openrouter-client'); // Paid API
// Use real database
const business = await createBusiness({ ... });
```

**❌ Bad:**
```typescript
// Over-mocking everything
vi.mock('@/lib/db/queries'); // Don't mock internal DB
vi.mock('@/lib/services/*'); // Don't mock internal services
```

### 3. Use CLIs for Manual Debugging

**✅ Good:**
```bash
# Manual debugging with CLI
psql $DATABASE_URL -c "SELECT * FROM businesses"
stripe customers list
```

**❌ Bad:**
```bash
# Creating test data manually in code instead of using CLI
# Use CLI tools when available
```

### 4. Conditional Debug Mode

**✅ Good:**
```typescript
const useRealAPI = process.env.DEBUG_APIS === 'true';
if (useRealAPI) {
  // Use real API for debugging
} else {
  // Use mocks for normal testing
}
```

---

## 📊 Summary Matrix

| Scenario | Database | Stripe | Wikidata | OpenRouter | Firecrawl |
|----------|----------|--------|----------|------------|-----------|
| **Unit Tests** | Mock | Mock | Mock | Mock | Mock |
| **Integration Tests** | ✅ Real | Test Mode | test.wikidata.org | Mock | Mock |
| **E2E Tests** | ✅ Real | Test Mode | test.wikidata.org | Mock | Mock |
| **Debug Tests** | ✅ Real | Test Mode | test.wikidata.org | ✅ Real | ✅ Real |
| **Production** | ✅ Real | ✅ Real | ✅ Real | ✅ Real | ✅ Real |

---

## 🔗 Related Documentation

- **TEST_DATABASE_STRATEGY.md** - Database testing approach
- **TDD_IMPLEMENTATION_PLAN.md** - Complete TDD plan
- **API_MOCKING_STATUS.md** - Current mocking status

---

**Remember:** Use real APIs for integration testing and debugging. Mock only when necessary for speed, cost, or determinism.

