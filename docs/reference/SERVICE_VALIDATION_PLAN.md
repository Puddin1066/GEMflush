# GEMflush Service Validation Plan

**Date:** November 10, 2025  
**Status:** 🔧 Build Fixed → Validating Services  
**Goal:** Ensure all backend services work correctly before UI integration

---

## ✅ Build Status: FIXED!

Now focusing on **service validation** before connecting UI to API.

**Smart Strategy:** Test services independently → Validate API routes → Then connect UI

---

## 🎯 Service Validation Checklist

### Phase 1: Core Services (Days 1-2)

#### 1. Web Crawler Service ✅

**Location:** `lib/crawler/index.ts`

**What it does:**
- Fetches HTML from business website
- Extracts structured data (name, address, phone, social links)
- Returns JSON with crawled data

**Test Plan:**

```bash
# Create test script
cat > scripts/test-crawler.ts << 'EOF'
import { webCrawler } from '@/lib/crawler';

async function testCrawler() {
  console.log('Testing Web Crawler Service\n');
  
  // Test 1: Simple static site
  console.log('Test 1: Static restaurant site');
  const result1 = await webCrawler.crawl('https://example-restaurant.com');
  console.log('Success:', result1.success);
  console.log('Data:', JSON.stringify(result1.data, null, 2));
  
  // Test 2: Site with JSON-LD
  console.log('\nTest 2: Site with structured data');
  const result2 = await webCrawler.crawl('https://example-with-jsonld.com');
  console.log('Success:', result2.success);
  console.log('Data:', JSON.stringify(result2.data, null, 2));
  
  // Test 3: Invalid URL (error handling)
  console.log('\nTest 3: Invalid URL');
  const result3 = await webCrawler.crawl('https://invalid-url-that-does-not-exist.com');
  console.log('Success:', result3.success);
  console.log('Error:', result3.error);
}

testCrawler().catch(console.error);
EOF

# Run test
npx tsx scripts/test-crawler.ts
```

**Expected Output:**
```
✅ Success: true
✅ Data contains: name, description, address, phone, etc.
✅ Error handling works for invalid URLs
```

**If crawler is in mock mode, that's OK for now!** Validate the interface works.

---

#### 2. LLM Fingerprinter Service 🔶

**Location:** `lib/llm/fingerprinter.ts`

**What it does:**
- Takes business object
- Queries multiple LLMs
- Analyzes responses
- Returns visibility score (0-100)

**Test Plan:**

```bash
# Test with mock mode first
cat > scripts/test-fingerprinter-mock.ts << 'EOF'
import { llmFingerprinter } from '@/lib/llm/fingerprinter';

async function testFingerprinter() {
  console.log('Testing LLM Fingerprinter Service (Mock Mode)\n');
  
  // Mock business
  const testBusiness = {
    id: 1,
    name: "Joe's Coffee Shop",
    url: "https://joescoffee.com",
    location: {
      city: "Seattle",
      state: "WA",
      country: "USA"
    },
    category: "Restaurant",
    crawlData: {
      description: "Best coffee in Seattle",
      address: "123 Main St, Seattle, WA 98101"
    }
  };
  
  console.log('Testing business:', testBusiness.name);
  
  const result = await llmFingerprinter.fingerprint(testBusiness);
  
  console.log('\n=== RESULTS ===');
  console.log('Visibility Score:', result.visibilityScore);
  console.log('LLM Results:', JSON.stringify(result.llmResults, null, 2));
  console.log('Benchmark:', JSON.stringify(result.competitiveBenchmark, null, 2));
}

testFingerprinter().catch(console.error);
EOF

# Run test
npx tsx scripts/test-fingerprinter-mock.ts
```

**Expected Output:**
```
✅ Visibility Score: 0-100 (number)
✅ LLM Results: Array of model responses
✅ No errors thrown
```

**Review the code:**
```bash
# Check if it's using mock data or real API
grep -n "MOCK\|mock\|OPENROUTER_API_KEY" lib/llm/fingerprinter.ts
grep -n "MOCK\|mock" lib/llm/openrouter.ts
```

---

#### 3. Wikidata Entity Builder 🔶

**Location:** `lib/wikidata/entity-builder.ts`

**What it does:**
- Takes business data
- Generates Wikidata-compliant entity JSON
- Validates PIDs (property IDs) and QIDs (entity IDs)
- Returns entity ready for publishing

**Test Plan:**

```bash
# Use existing test script (you already have this!)
npx tsx scripts/test-wikidata-entity.ts
```

**Review Output:**
```
✅ Entity has required properties (P31, P625, etc.)
✅ Coordinates formatted correctly
✅ Claims structure valid
✅ No validation errors
```

**If entity builder looks good, test the publisher:**

```bash
cat > scripts/test-wikidata-publisher.ts << 'EOF'
import { wikidataPublisher } from '@/lib/wikidata/publisher';
import { wikidataEntityBuilder } from '@/lib/wikidata/entity-builder';

async function testPublisher() {
  console.log('Testing Wikidata Publisher\n');
  
  const testBusiness = {
    name: "Test Coffee Shop",
    location: {
      city: "Seattle",
      state: "WA",
      country: "USA",
      coordinates: { lat: 47.6062, lng: -122.3321 }
    },
    category: "Restaurant",
    crawlData: {
      description: "Test description",
      address: "123 Test St",
      phone: "+1-555-0100"
    }
  };
  
  // Build entity
  console.log('Building entity...');
  const entity = wikidataEntityBuilder.buildEntity(testBusiness);
  console.log('Entity built:', JSON.stringify(entity, null, 2));
  
  // Try to publish (test.wikidata.org)
  console.log('\nPublishing to test.wikidata.org...');
  const result = await wikidataPublisher.publish(entity, 'test');
  
  console.log('\n=== RESULTS ===');
  console.log('Success:', result.success);
  console.log('QID:', result.qid);
  console.log('URL:', result.url);
  console.log('Error:', result.error);
}

testPublisher().catch(console.error);
EOF

npx tsx scripts/test-wikidata-publisher.ts
```

**Expected (Mock Mode):**
```
✅ Returns mock QID (Q99999999)
✅ No errors
```

**Expected (Real Mode):**
```
⚠️ Might fail if no Wikidata bot credentials
✅ Should return proper error message
```

---

### Phase 2: API Routes Testing (Day 2-3)

Once services work, test API routes **independently** (no UI needed).

#### Test API Routes with curl/Postman

**1. Test Database Connection First:**

```bash
# Start dev server
pnpm dev

# In another terminal, test if you can sign in
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"admin123"}'

# Save the session cookie from response
```

**2. Create a Business (POST /api/business):**

```bash
# Create test-api.sh script
cat > scripts/test-api.sh << 'EOF'
#!/bin/bash

echo "=== Testing GEMflush API Routes ==="
echo ""

# Base URL
BASE_URL="http://localhost:3000"

# 1. Sign in first (to get session cookie)
echo "1. Signing in..."
SIGNIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"admin123"}')

echo "Response: $SIGNIN_RESPONSE"
echo ""

# 2. Create business
echo "2. Creating business..."
CREATE_RESPONSE=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/business" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Coffee Shop",
    "url": "https://testcoffee.com",
    "category": "Restaurant",
    "location": {
      "city": "Seattle",
      "state": "WA",
      "country": "USA"
    }
  }')

echo "Response: $CREATE_RESPONSE"
BUSINESS_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "Business ID: $BUSINESS_ID"
echo ""

# 3. Trigger crawl
echo "3. Triggering crawl..."
CRAWL_RESPONSE=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/crawl" \
  -H "Content-Type: application/json" \
  -d "{\"businessId\": $BUSINESS_ID}")

echo "Response: $CRAWL_RESPONSE"
JOB_ID=$(echo $CRAWL_RESPONSE | grep -o '"jobId":[0-9]*' | grep -o '[0-9]*')
echo "Job ID: $JOB_ID"
echo ""

# 4. Poll job status
echo "4. Checking job status..."
sleep 2
STATUS_RESPONSE=$(curl -s -b cookies.txt "$BASE_URL/api/job/$JOB_ID")
echo "Response: $STATUS_RESPONSE"
echo ""

# 5. Trigger fingerprint
echo "5. Triggering fingerprint..."
FINGERPRINT_RESPONSE=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/fingerprint" \
  -H "Content-Type: application/json" \
  -d "{\"businessId\": $BUSINESS_ID}")

echo "Response: $FINGERPRINT_RESPONSE"
echo ""

echo "=== API Testing Complete ==="
EOF

chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

**Expected Results:**
```
✅ Sign in returns 200
✅ Create business returns 200 with businessId
✅ Crawl returns 200 with jobId
✅ Job status shows 'queued' → 'processing' → 'completed'
✅ Fingerprint returns 200 with jobId
```

**If any fail:**
- Check server logs in terminal running `pnpm dev`
- Check database connection
- Verify authentication working

---

#### Test with Postman (Visual Testing)

Create a Postman collection:

```json
{
  "info": {
    "name": "GEMflush API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Sign In",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@test.com\",\"password\":\"admin123\"}"
        },
        "url": "http://localhost:3000/api/auth/sign-in"
      }
    },
    {
      "name": "2. Create Business",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"name\":\"Test Shop\",\"url\":\"https://test.com\",\"category\":\"Restaurant\",\"location\":{\"city\":\"Seattle\",\"state\":\"WA\",\"country\":\"USA\"}}"
        },
        "url": "http://localhost:3000/api/business"
      }
    },
    {
      "name": "3. Trigger Crawl",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"businessId\": 1}"
        },
        "url": "http://localhost:3000/api/crawl"
      }
    },
    {
      "name": "4. Check Job Status",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/job/1"
      }
    }
  ]
}
```

Save as `postman_collection.json` and import into Postman.

---

### Phase 3: Service Refinement (Day 3-4)

Based on testing, fix any issues found:

#### Common Issues & Fixes

**Issue 1: Web Crawler Times Out**

```typescript
// lib/crawler/index.ts
// Add timeout to fetch
const response = await fetch(url, {
  signal: AbortSignal.timeout(10000) // 10 second timeout
});
```

**Issue 2: LLM Fingerprinter Returns Invalid Score**

```typescript
// lib/llm/fingerprinter.ts
// Ensure score is always 0-100
const clampedScore = Math.max(0, Math.min(100, calculatedScore));
```

**Issue 3: Wikidata Entity Builder Missing Required Fields**

```typescript
// lib/wikidata/entity-builder.ts
// Validate entity before returning
function validateEntity(entity: any) {
  if (!entity.claims['P31']) throw new Error('Missing instance-of (P31)');
  if (!entity.claims['P625']) throw new Error('Missing coordinates (P625)');
  // ... more validations
}
```

**Issue 4: API Route Returns 500 Instead of Helpful Error**

```typescript
// app/api/crawl/route.ts
catch (error) {
  console.error('Crawl error:', error);
  
  // Return specific error messages
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid input', details: error.errors },
      { status: 400 }
    );
  }
  
  if (error.message.includes('timeout')) {
    return NextResponse.json(
      { error: 'Website took too long to respond' },
      { status: 504 }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error', message: error.message },
    { status: 500 }
  );
}
```

---

### Phase 4: Mock to Real API Transition (Day 5-7)

Once services work with mocks, transition to real APIs.

#### Setup OpenRouter (Real LLM Calls)

**1. Create OpenRouter Account:**
```bash
# Visit https://openrouter.ai/
# Sign up
# Add $20 credit
# Get API key
```

**2. Add to Environment:**
```bash
# .env.local
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**3. Test Real LLM Calls:**
```bash
cat > scripts/test-real-llm.ts << 'EOF'
import { openRouterClient } from '@/lib/llm/openrouter';

async function testRealLLM() {
  console.log('Testing Real LLM Calls\n');
  
  const prompt = "What do you know about Pike Place Market in Seattle?";
  
  // Test 1: GPT-4
  console.log('Test 1: GPT-4 Turbo');
  const gpt4 = await openRouterClient.query(prompt, 'openai/gpt-4-turbo');
  console.log('Response:', gpt4.response.substring(0, 200) + '...');
  console.log('Cost:', gpt4.cost);
  
  // Test 2: Claude
  console.log('\nTest 2: Claude Haiku');
  const claude = await openRouterClient.query(prompt, 'anthropic/claude-3-haiku');
  console.log('Response:', claude.response.substring(0, 200) + '...');
  console.log('Cost:', claude.cost);
  
  console.log('\nTotal cost:', gpt4.cost + claude.cost);
}

testRealLLM().catch(console.error);
EOF

npx tsx scripts/test-real-llm.ts
```

**Expected Output:**
```
✅ GPT-4 returns response (costs ~$0.005)
✅ Claude returns response (costs ~$0.0001)
✅ Total cost: ~$0.0051
```

**4. Update Fingerprinter to Use Real LLMs:**

Check current mode:
```bash
grep -A 10 "OPENROUTER_API_KEY" lib/llm/fingerprinter.ts
```

If using mock mode, remove mock logic:
```typescript
// lib/llm/fingerprinter.ts
// Remove: if (!process.env.OPENROUTER_API_KEY) { return mockData; }
// Use: await openRouterClient.query(...) always
```

---

#### Setup Real Web Crawler

**Test on diverse sites:**

```bash
cat > scripts/test-real-crawler.ts << 'EOF'
import { webCrawler } from '@/lib/crawler';

async function testRealCrawler() {
  console.log('Testing Real Web Crawler\n');
  
  const testURLs = [
    'https://www.starbucks.com/store-locator/store/10011',
    'https://www.example-restaurant.com',
    'https://invalid-url-404.com', // Should fail gracefully
  ];
  
  for (const url of testURLs) {
    console.log(`\n=== Testing: ${url} ===`);
    const result = await webCrawler.crawl(url);
    console.log('Success:', result.success);
    if (result.success) {
      console.log('Data:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('Error:', result.error);
    }
  }
}

testRealCrawler().catch(console.error);
EOF

npx tsx scripts/test-real-crawler.ts
```

**Improve crawler based on results:**
- Add user-agent header (some sites block scrapers)
- Handle redirects
- Extract JSON-LD structured data
- Fallback to OpenGraph tags

---

### Phase 5: Integration Testing (Day 7-8)

**End-to-end workflow test with real services:**

```bash
cat > scripts/test-full-workflow.ts << 'EOF'
import { db } from '@/lib/db/drizzle';
import { businesses, crawlJobs, llmFingerprints } from '@/lib/db/schema';
import { webCrawler } from '@/lib/crawler';
import { llmFingerprinter } from '@/lib/llm/fingerprinter';
import { eq } from 'drizzle-orm';

async function testFullWorkflow() {
  console.log('=== FULL WORKFLOW TEST ===\n');
  
  // Step 1: Create business
  console.log('Step 1: Creating business...');
  const [business] = await db.insert(businesses).values({
    teamId: 1, // Assuming test team exists
    name: "Pike Place Market Coffee",
    url: "https://pikeplacemarket.com",
    category: "Restaurant",
    location: {
      city: "Seattle",
      state: "WA",
      country: "USA"
    },
    status: 'pending'
  }).returning();
  
  console.log('✅ Business created:', business.id);
  
  // Step 2: Crawl website
  console.log('\nStep 2: Crawling website...');
  const crawlResult = await webCrawler.crawl(business.url);
  
  if (crawlResult.success) {
    await db.update(businesses)
      .set({ 
        crawlData: crawlResult.data,
        status: 'crawled',
        lastCrawledAt: new Date()
      })
      .where(eq(businesses.id, business.id));
    console.log('✅ Crawl successful');
  } else {
    console.log('❌ Crawl failed:', crawlResult.error);
    return;
  }
  
  // Step 3: Run fingerprint
  console.log('\nStep 3: Running LLM fingerprint...');
  const updatedBusiness = await db.select().from(businesses)
    .where(eq(businesses.id, business.id))
    .then(rows => rows[0]);
  
  const fingerprintResult = await llmFingerprinter.fingerprint(updatedBusiness);
  
  // Step 4: Save fingerprint
  console.log('\nStep 4: Saving fingerprint...');
  const [fingerprint] = await db.insert(llmFingerprints).values({
    businessId: business.id,
    visibilityScore: fingerprintResult.visibilityScore,
    llmResults: fingerprintResult.llmResults,
    competitiveBenchmark: fingerprintResult.competitiveBenchmark
  }).returning();
  
  console.log('✅ Fingerprint saved:', fingerprint.id);
  
  // Step 5: Display results
  console.log('\n=== RESULTS ===');
  console.log('Business:', business.name);
  console.log('Visibility Score:', fingerprintResult.visibilityScore);
  console.log('Crawl Data:', JSON.stringify(crawlResult.data, null, 2));
  console.log('LLM Results:', JSON.stringify(fingerprintResult.llmResults, null, 2));
  
  console.log('\n✅ Full workflow successful!');
}

testFullWorkflow().catch(console.error);
EOF

npx tsx scripts/test-full-workflow.ts
```

**This tests:**
1. Database operations
2. Web crawler
3. LLM fingerprinter
4. Data storage
5. Complete flow from start to finish

**Expected:**
```
✅ Business created
✅ Crawl successful
✅ Fingerprint calculated
✅ Data saved to database
✅ Full workflow successful
```

---

## 📊 Service Validation Checklist

### Before Connecting UI:

- [ ] **Web Crawler**
  - [ ] Successfully fetches HTML from real URLs
  - [ ] Extracts structured data correctly
  - [ ] Handles errors gracefully (404, timeout, etc.)
  - [ ] Returns consistent data format

- [ ] **LLM Fingerprinter**
  - [ ] Works in mock mode
  - [ ] Works with real OpenRouter API
  - [ ] Returns visibility score 0-100
  - [ ] Handles API errors gracefully
  - [ ] Cost per fingerprint is acceptable (~$0.005)

- [ ] **Wikidata Entity Builder**
  - [ ] Generates valid entity JSON
  - [ ] Includes all required properties
  - [ ] Validates PIDs and QIDs
  - [ ] Coordinates formatted correctly

- [ ] **Wikidata Publisher**
  - [ ] Connects to test.wikidata.org (or mocks)
  - [ ] Returns QID on success
  - [ ] Handles errors gracefully

- [ ] **API Routes**
  - [ ] Authentication works (getUser)
  - [ ] POST /api/business creates record
  - [ ] POST /api/crawl starts job and executes
  - [ ] POST /api/fingerprint starts job and executes
  - [ ] GET /api/job/[id] returns status
  - [ ] All routes validate input (Zod)
  - [ ] All routes check permissions

- [ ] **Database Operations**
  - [ ] Can create businesses
  - [ ] Can update businesses
  - [ ] Can create crawl jobs
  - [ ] Can create fingerprints
  - [ ] Queries are type-safe (Drizzle)

---

## 🚀 When Services Are Validated

Once all services work correctly:

### 1. Document Service Status

```bash
cat > SERVICE_STATUS.md << 'EOF'
# GEMflush Service Status

**Date:** [Today's date]
**Status:** ✅ All Services Validated

## Service Status

### Web Crawler
- ✅ Tested on 10+ real URLs
- ✅ Extracts structured data
- ✅ Error handling working
- **Mode:** Real (using Cheerio)

### LLM Fingerprinter
- ✅ Tested with OpenRouter
- ✅ Returns accurate scores
- ✅ Cost: ~$0.005 per fingerprint
- **Mode:** Real (using GPT-4, Claude, Gemini)

### Wikidata Entity Builder
- ✅ Generates valid entities
- ✅ All required properties included
- **Mode:** Real

### Wikidata Publisher
- ⏳ Using mock (waiting for bot approval)
- ✅ Returns mock QIDs
- **Mode:** Mock (will switch to real when ready)

### API Routes
- ✅ All routes tested with curl/Postman
- ✅ Authentication working
- ✅ Error handling correct
- ✅ Input validation working

## Ready for UI Integration: YES ✅

Next step: Connect UI components to validated API routes.
EOF
```

### 2. Move to UI Integration Phase

Once services validated, proceed to:
- Connect buttons to API routes
- Add loading states
- Display results in UI
- Handle errors gracefully

---

## 💡 Pro Tips

### Testing Best Practices

**1. Test Services in Isolation First**
```typescript
// Good: Test service directly
const result = await webCrawler.crawl(url);

// Later: Test via API route
const response = await fetch('/api/crawl', { method: 'POST', ... });
```

**2. Use console.log Liberally**
```typescript
console.log('DEBUG: About to crawl URL:', url);
const result = await webCrawler.crawl(url);
console.log('DEBUG: Crawl result:', result);
```

**3. Test Error Cases**
```typescript
// Test invalid URL
const result = await webCrawler.crawl('https://invalid-url-404.com');
// Should return: { success: false, error: '...' }
```

**4. Monitor Costs**
```typescript
// Track OpenRouter costs
let totalCost = 0;
const result = await openRouterClient.query(prompt, model);
totalCost += result.cost;
console.log('Total cost so far:', totalCost);
```

### Service Development Order

1. **Start with mocks** - Get interface working
2. **Add real implementation** - Connect to actual APIs
3. **Test edge cases** - What breaks?
4. **Add error handling** - Graceful degradation
5. **Optimize** - Speed and cost
6. **Document** - How it works, what it costs

---

## 📚 Useful Commands

```bash
# Test individual service
npx tsx scripts/test-crawler.ts
npx tsx scripts/test-fingerprinter-mock.ts
npx tsx scripts/test-wikidata-entity.ts

# Test API routes
./scripts/test-api.sh

# Check environment variables
cat .env.local | grep -E "OPENROUTER|DATABASE"

# Check database state
psql $DATABASE_URL
\dt  # List tables
SELECT * FROM businesses;
SELECT * FROM crawl_jobs;

# Monitor dev server logs
pnpm dev
# Watch for errors, API calls, etc.

# Test build (ensure no TypeScript errors)
pnpm build
```

---

## 🎯 Definition of "Services Validated"

Services are ready for UI integration when:

### Functional Requirements
- [ ] All services return expected data format
- [ ] No TypeScript errors
- [ ] No runtime errors on happy path
- [ ] Error cases handled gracefully
- [ ] Response times acceptable (< 30s)

### Quality Requirements
- [ ] Services tested independently
- [ ] API routes tested with curl/Postman
- [ ] Database operations confirmed working
- [ ] Authentication/authorization working
- [ ] Input validation working (Zod schemas)

### Documentation Requirements
- [ ] Service status documented
- [ ] Known issues documented
- [ ] Cost per operation known
- [ ] Mock vs real mode clarified

---

## 🚀 Next Steps After Validation

Once services validated:

1. **Update INTEGRATION_STATUS.md**
   - Mark services as validated
   - Document any issues found
   - Update percentage complete

2. **Create UI Integration Plan**
   - Which pages to update first
   - What components need creating
   - Loading/error states needed

3. **Start UI Connection**
   - Business detail page first
   - Add action buttons
   - Connect to validated APIs
   - Display results

---

**You're on the right track! Test services thoroughly before UI integration.** 🎯

**Current Priority:** Validate each service works correctly in isolation.

**Next Priority:** Test API routes with curl/Postman.

**Then:** Connect UI to validated services.

Let me know which service you want to validate first! 🚀

