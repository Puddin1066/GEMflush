# Web Crawler Upgrade Proposal: Firecrawl vs Playwright

**Date:** November 19, 2025  
**Status:** Proposal (Updated with Firecrawl)  
**Priority:** High  
**Current Issue:** Cheerio-based crawler fails on JavaScript-rendered content and JSON APIs

---

## Executive Summary

The current Cheerio-based crawler (`lib/crawler/index.ts`) has significant limitations that prevent it from effectively crawling modern websites. This proposal recommends **Firecrawl** as the primary solution (managed API service) with **Playwright** as a self-hosted alternative. Both solutions handle HTML and JSON content, execute JavaScript, and work seamlessly with our existing TypeScript/Next.js stack.

**Primary Recommendation: Firecrawl** - Managed service that handles all the hard problems (anti-bot, proxies, dynamic content) with minimal infrastructure overhead.

---

## Current Implementation Issues

### 1. **JavaScript-Rendered Content Failure**
- **Problem:** Cheerio only parses static HTML. Modern SPAs (React, Vue, Angular) render content client-side.
- **Impact:** Crawler returns empty or incomplete data for JavaScript-heavy sites.
- **Example:** A business website built with Next.js or React will show no content to Cheerio.

### 2. **No JSON API Support**
- **Problem:** Current crawler only fetches HTML. Many modern sites expose data via JSON APIs.
- **Impact:** Cannot extract data from REST APIs, GraphQL endpoints, or JSON responses.
- **Example:** A business listing API (`/api/business/123`) cannot be crawled.

### 3. **Limited Error Handling**
- **Problem:** Basic fetch with 10-second timeout. No retry logic, no handling of rate limits.
- **Impact:** Fails on slow-loading sites or sites with anti-bot measures.

### 4. **No Browser Context**
- **Problem:** Cannot handle cookies, sessions, or authentication flows.
- **Impact:** Cannot access protected content or sites requiring login.

---

## Proposed Solutions

### 🏆 **Primary Recommendation: Firecrawl**

[Firecrawl](https://docs.firecrawl.dev/introduction) is a managed API service that converts websites into LLM-ready markdown and structured data. It's specifically designed to solve the exact problems we're facing.

#### ✅ **Why Firecrawl is Superior**

**1. Handles All Our Pain Points Out-of-the-Box**
- ✅ **JavaScript-Rendered Content:** Executes JavaScript, handles SPAs automatically
- ✅ **JSON API Support:** Can extract structured data via JSON mode
- ✅ **Anti-Bot Mechanisms:** Built-in handling for proxies, rate limits, CAPTCHAs
- ✅ **Dynamic Content:** Waits for content to load, handles infinite scroll
- ✅ **Structured Data Extraction:** Built-in JSON-LD, schema.org extraction

**2. Zero Infrastructure Overhead**
- ✅ **Managed Service:** No browser instances to manage, no memory concerns
- ✅ **Scalable:** Handles high-throughput automatically
- ✅ **Reliable:** Built for production, handles edge cases
- ✅ **Fast:** Optimized infrastructure, results in seconds

**3. Perfect for Our Use Case**
- ✅ **Node.js SDK:** `@mendable/firecrawl-js` - TypeScript-native
- ✅ **Multiple Formats:** Returns markdown, HTML, structured JSON, screenshots
- ✅ **Actions Support:** Can click, scroll, input, wait (like Playwright)
- ✅ **Media Parsing:** Handles PDFs, docx, images automatically

**4. Cost-Effective**
- ✅ **Pay-per-use:** Only pay for what you crawl
- ✅ **No Infrastructure Costs:** No servers, no browser management
- ✅ **Time Savings:** No need to build/maintain crawler infrastructure

#### 📋 **Firecrawl Implementation**

```typescript
import Firecrawl from '@mendable/firecrawl-js';
import { CrawledData, CrawlResult } from '@/lib/types/gemflush';

export class WebCrawler {
  private firecrawl: Firecrawl;
  
  constructor() {
    this.firecrawl = new Firecrawl({ 
      apiKey: process.env.FIRECRAWL_API_KEY 
    });
  }
  
  async crawl(url: string): Promise<CrawlResult> {
    try {
      // Scrape with multiple formats
      const doc = await this.firecrawl.scrape(url, {
        formats: ['markdown', 'html', 'json'], // Get structured data
        actions: [
          // Optional: Wait for dynamic content
          { type: 'wait', milliseconds: 2000 }
        ]
      });
      
      // Extract structured data
      const structuredData = doc.json || this.extractFromMarkdown(doc.markdown);
      
      // Convert to our CrawledData format
      const crawledData: CrawledData = {
        name: structuredData.name || this.extractName(doc.markdown),
        description: structuredData.description || doc.metadata?.description,
        phone: structuredData.phone,
        email: structuredData.email,
        location: this.extractLocation(structuredData, doc.metadata),
        socialLinks: this.extractSocialLinks(doc.markdown),
        imageUrl: doc.metadata?.ogImage,
        // ... map other fields
      };
      
      return {
        success: true,
        data: crawledData,
        url,
        crawledAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, url);
    }
  }
  
  // For JSON API endpoints
  async crawlJsonApi(url: string): Promise<CrawlResult> {
    try {
      const doc = await this.firecrawl.scrape(url, {
        formats: ['json'],
        jsonMode: true, // Extract structured data
      });
      
      return {
        success: true,
        data: doc.json,
        url,
        crawledAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, url);
    }
  }
}
```

**Installation:**
```bash
npm install @mendable/firecrawl-js
```

**Environment Variable:**
```env
FIRECRAWL_API_KEY=fc-YOUR-API-KEY
```

**Pricing:** [See Firecrawl pricing](https://firecrawl.dev/pricing) - starts at $20/month for 50k credits

---

### 🔧 **Alternative: Playwright-Based Crawler (Self-Hosted)**

If you prefer self-hosted or want to avoid API costs, Playwright is an excellent alternative.

### Why Playwright?

#### ✅ **1. Already in the Project**
- **Current Status:** Playwright is already installed (`@playwright/test: ^1.56.1`)
- **Benefit:** No additional dependencies needed. Zero installation overhead.
- **Usage:** Currently used for E2E tests, can be leveraged for crawling.

#### ✅ **2. Handles Both HTML and JSON**
```typescript
// HTML crawling
const page = await browser.newPage();
await page.goto(url);
const html = await page.content();
const jsonLd = await page.evaluate(() => {
  const script = document.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent) : null;
});

// Direct JSON API fetching
const response = await page.request.get('https://api.example.com/business/123');
const jsonData = await response.json();
```

#### ✅ **3. JavaScript Execution**
- **Capability:** Executes JavaScript, waits for dynamic content, handles SPAs.
- **Benefit:** Works with React, Vue, Angular, and other modern frameworks.
- **Example:** Can wait for `data-loaded` events or specific DOM elements.

#### ✅ **4. TypeScript Native**
- **Benefit:** Full TypeScript support, excellent IDE integration.
- **Type Safety:** Strong typing for requests, responses, and DOM manipulation.

#### ✅ **5. Advanced Features**
- **Network Interception:** Can intercept and modify requests/responses.
- **Screenshot/Debugging:** Built-in debugging tools for troubleshooting.
- **Multiple Browsers:** Supports Chromium, Firefox, WebKit.
- **Headless Mode:** Efficient for server-side crawling.

#### ✅ **6. Production-Ready**
- **Performance:** Optimized for production use, not just testing.
- **Reliability:** Handles timeouts, retries, and error recovery.
- **Scalability:** Can be configured for high-throughput crawling.

---

## Solution Comparison

| Feature | Firecrawl | Playwright | Cheerio (Current) |
|---------|-----------|------------|-------------------|
| **JavaScript Execution** | ✅ Yes | ✅ Yes | ❌ No |
| **JSON API Support** | ✅ Yes | ✅ Yes | ❌ No |
| **Anti-Bot Handling** | ✅ Built-in | ⚠️ Manual | ❌ No |
| **Infrastructure** | ✅ Managed | ⚠️ Self-hosted | ✅ None |
| **Cost** | 💰 Pay-per-use | ✅ Free | ✅ Free |
| **Setup Complexity** | ✅ Low | ⚠️ Medium | ✅ Low |
| **Maintenance** | ✅ None | ⚠️ Required | ✅ Low |
| **Scalability** | ✅ Automatic | ⚠️ Manual | ❌ Limited |
| **Structured Data** | ✅ Built-in | ⚠️ Manual | ⚠️ Manual |
| **TypeScript SDK** | ✅ Yes | ✅ Yes | ✅ Yes |

### Recommendation Matrix

**Choose Firecrawl if:**
- ✅ You want zero infrastructure overhead
- ✅ You need reliable anti-bot handling
- ✅ You want built-in structured data extraction
- ✅ You prefer managed services
- ✅ Budget allows for API costs (~$20-100/month)

**Choose Playwright if:**
- ✅ You want full control over crawling
- ✅ You want to avoid API costs
- ✅ You have infrastructure to manage browsers
- ✅ You need custom browser automation

**Keep Cheerio if:**
- ❌ You only crawl simple static sites (not recommended)
- ❌ You don't need JavaScript execution (rare in 2025)

## Alternative Solutions Considered

### ❌ **Puppeteer**
- **Pros:** Similar to Playwright, good performance.
- **Cons:** Not already in project, would require new dependency.
- **Decision:** Playwright is already installed, making it the better choice.

### ❌ **Axios + Cheerio (Enhanced)**
- **Pros:** Lightweight, fast for static sites.
- **Cons:** Still can't handle JavaScript-rendered content or JSON APIs effectively.
- **Decision:** Doesn't solve the core problems.

### ❌ **Scrapy (Python)**
- **Pros:** Powerful, feature-rich.
- **Cons:** Requires Python microservice, adds complexity, not TypeScript-native.
- **Decision:** Overkill for our use case, adds architectural complexity.

### ❌ **Apify SDK**
- **Pros:** Full-featured scraping platform.
- **Cons:** External dependency, potential vendor lock-in, additional costs.
- **Decision:** Unnecessary for our needs, Playwright is sufficient.

---

## Implementation Strategy

### Phase 1: Hybrid Approach (Recommended)
**Keep Cheerio for simple sites, use Playwright for complex ones.**

```typescript
export class WebCrawler {
  async crawl(url: string): Promise<CrawlResult> {
    // Try lightweight Cheerio first (fast path)
    const cheerioResult = await this.tryCheerioCrawl(url);
    if (cheerioResult.success && this.hasSubstantialContent(cheerioResult.data)) {
      return cheerioResult;
    }
    
    // Fallback to Playwright for JavaScript-heavy sites
    return await this.playwrightCrawl(url);
  }
  
  private async playwrightCrawl(url: string): Promise<CrawlResult> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Navigate and wait for content
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Extract HTML
      const html = await page.content();
      
      // Extract JSON-LD
      const jsonLd = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        return Array.from(scripts).map(s => JSON.parse(s.textContent || '{}'));
      });
      
      // Try to fetch JSON API if detected
      const jsonApiData = await this.tryJsonApi(url, page);
      
      // Parse with Cheerio (reuse existing extraction logic)
      const $ = cheerio.load(html);
      const crawledData = await this.extractData($, url, jsonLd, jsonApiData);
      
      return { success: true, data: crawledData, url, crawledAt: new Date() };
    } finally {
      await browser.close();
    }
  }
}
```

**Benefits:**
- Fast path for simple sites (Cheerio)
- Full capability for complex sites (Playwright)
- Reuses existing extraction logic
- Gradual migration path

### Phase 2: Full Playwright Migration
**Replace Cheerio entirely with Playwright for consistency.**

---

## Technical Specifications

### Dependencies
```json
{
  "@playwright/test": "^1.56.1"  // Already installed ✅
}
```

### New Methods Required

1. **`playwrightCrawl(url: string)`**
   - Launches headless browser
   - Navigates to URL
   - Waits for content to load
   - Extracts HTML and JSON

2. **`tryJsonApi(url: string, page: Page)`**
   - Detects JSON API endpoints from page
   - Attempts to fetch JSON data
   - Returns structured data if available

3. **`detectContentType(url: string)`**
   - Determines if site requires JavaScript
   - Routes to appropriate crawler (Cheerio vs Playwright)

4. **`extractJsonFromPage(page: Page)`**
   - Extracts JSON-LD from rendered page
   - Fetches JSON APIs discovered in page
   - Returns combined structured data

### Performance Considerations

**Playwright Overhead:**
- **Startup:** ~500ms per browser instance
- **Page Load:** ~1-3 seconds (depends on site)
- **Memory:** ~50-100MB per browser instance

**Optimization Strategies:**
1. **Browser Pooling:** Reuse browser instances across requests
2. **Parallel Crawling:** Run multiple pages concurrently
3. **Smart Routing:** Use Cheerio for known-static sites
4. **Caching:** Cache results to avoid re-crawling

---

## Migration Plan

### Step 1: Add Playwright Support (Week 1)
- [ ] Install Playwright browser binaries (if not already installed)
- [ ] Create `playwrightCrawl()` method
- [ ] Add hybrid routing logic
- [ ] Write unit tests

### Step 2: JSON API Support (Week 1)
- [ ] Implement `tryJsonApi()` method
- [ ] Add JSON API detection logic
- [ ] Update data extraction to handle JSON responses
- [ ] Write integration tests

### Step 3: Testing & Validation (Week 2)
- [ ] Test against JavaScript-heavy sites (React, Vue, Angular)
- [ ] Test JSON API crawling
- [ ] Performance benchmarking
- [ ] Error handling validation

### Step 4: Production Deployment (Week 2)
- [ ] Deploy to staging environment
- [ ] Monitor performance and errors
- [ ] Optimize browser pooling
- [ ] Gradual rollout to production

---

## Success Metrics

### Functional Requirements
- ✅ Successfully crawls JavaScript-rendered sites (SPAs)
- ✅ Successfully crawls JSON API endpoints
- ✅ Maintains compatibility with existing static HTML sites
- ✅ Handles errors gracefully (timeouts, 404s, rate limits)

### Performance Requirements
- ⚡ Average crawl time < 5 seconds (including Playwright overhead)
- ⚡ Success rate > 95% for valid URLs
- ⚡ Memory usage < 200MB per concurrent crawl

### Quality Requirements
- ✅ Extracts same or better data quality than current crawler
- ✅ Handles edge cases (redirects, authentication, cookies)
- ✅ Comprehensive error logging and monitoring

---

## Risk Assessment

### Low Risk ✅
- **Dependency:** Playwright already installed
- **Compatibility:** TypeScript-native, works with existing codebase
- **Testing:** Can be tested incrementally alongside current crawler

### Medium Risk ⚠️
- **Performance:** Playwright is slower than Cheerio (mitigated by hybrid approach)
- **Resource Usage:** Higher memory/CPU usage (mitigated by browser pooling)
- **Complexity:** More complex than Cheerio (mitigated by good abstraction)

### Mitigation Strategies
1. **Hybrid Approach:** Use Cheerio for simple sites, Playwright for complex ones
2. **Browser Pooling:** Reuse browser instances to reduce overhead
3. **Timeout Management:** Aggressive timeouts to prevent hanging
4. **Fallback Logic:** Always fall back to Cheerio if Playwright fails

---

## Code Example: Complete Implementation

```typescript
import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { CrawledData, CrawlResult } from '@/lib/types/gemflush';

export class WebCrawler {
  private browser: Browser | null = null;
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  
  async crawl(url: string): Promise<CrawlResult> {
    try {
      // Try lightweight Cheerio first (fast path for static sites)
      const cheerioResult = await this.tryCheerioCrawl(url);
      if (cheerioResult.success && this.hasSubstantialContent(cheerioResult.data)) {
        return cheerioResult;
      }
      
      // Fallback to Playwright for JavaScript-heavy sites
      return await this.playwrightCrawl(url);
    } catch (error) {
      return this.handleError(error, url);
    }
  }
  
  private async tryCheerioCrawl(url: string): Promise<CrawlResult> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const html = await response.text();
      const $ = cheerio.load(html);
      const data = await this.extractData($, url);
      
      return { success: true, data, url, crawledAt: new Date() };
    } catch (error) {
      return { success: false, error: String(error), url, crawledAt: new Date() };
    }
  }
  
  private async playwrightCrawl(url: string): Promise<CrawlResult> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    
    const page = await this.browser.newPage();
    
    try {
      // Navigate and wait for content
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Extract HTML
      const html = await page.content();
      
      // Extract JSON-LD from rendered page
      const jsonLd = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        return Array.from(scripts).map(s => {
          try {
            return JSON.parse(s.textContent || '{}');
          } catch {
            return null;
          }
        }).filter(Boolean);
      });
      
      // Try to fetch JSON API if detected
      const jsonApiData = await this.tryJsonApi(url, page);
      
      // Parse with Cheerio (reuse existing extraction logic)
      const $ = cheerio.load(html);
      const data = await this.extractData($, url, jsonLd, jsonApiData);
      
      return { success: true, data, url, crawledAt: new Date() };
    } finally {
      await page.close();
    }
  }
  
  private async tryJsonApi(url: string, page: Page): Promise<any> {
    try {
      // Detect JSON API endpoints from page
      const apiEndpoints = await page.evaluate(() => {
        // Look for API calls in network requests or page data
        const scripts = Array.from(document.querySelectorAll('script'));
        const apiPattern = /api\/[^"']+/g;
        const endpoints: string[] = [];
        
        scripts.forEach(script => {
          const matches = script.textContent?.match(apiPattern);
          if (matches) endpoints.push(...matches);
        });
        
        return [...new Set(endpoints)];
      });
      
      // Try to fetch JSON from detected endpoints
      for (const endpoint of apiEndpoints.slice(0, 3)) { // Limit to 3 attempts
        try {
          const apiUrl = new URL(endpoint, url).toString();
          const response = await page.request.get(apiUrl);
          if (response.ok()) {
            return await response.json();
          }
        } catch {
          // Continue to next endpoint
        }
      }
    } catch {
      // Return null if JSON API detection fails
    }
    
    return null;
  }
  
  private hasSubstantialContent(data: CrawledData): boolean {
    // Check if we got meaningful data (not just empty/placeholder content)
    return !!(data.name && data.name !== 'Unknown Business' && 
              (data.description || data.phone || data.location));
  }
  
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

---

## Conclusion

### 🏆 **Primary Recommendation: Firecrawl**

**Firecrawl is the optimal solution** for upgrading our web crawler because:

1. ✅ **Solves All Problems:** Handles JavaScript, JSON APIs, anti-bot, dynamic content
2. ✅ **Zero Infrastructure:** Managed service, no browser management needed
3. ✅ **Built-in Features:** Structured data extraction, markdown conversion, screenshots
4. ✅ **TypeScript SDK:** Perfect fit for our stack (`@mendable/firecrawl-js`)
5. ✅ **Production Ready:** Battle-tested, reliable, scalable out-of-the-box
6. ✅ **Cost-Effective:** Pay-per-use, no infrastructure costs

**Implementation:** Simple API integration, minimal code changes, maximum capability.

### 🔧 **Alternative: Playwright (Self-Hosted)**

**Playwright is an excellent alternative** if you prefer self-hosted:

1. ✅ **Already Installed:** No new dependencies needed
2. ✅ **Full Control:** Complete control over crawling behavior
3. ✅ **No API Costs:** Free to use (infrastructure costs only)
4. ✅ **TypeScript Native:** Perfect fit for our stack
5. ⚠️ **Infrastructure Required:** Need to manage browser instances

**Implementation:** More complex, requires browser pooling, error handling, but gives full control.

### 📊 **Final Recommendation**

**For immediate implementation:** Start with **Firecrawl** for rapid deployment and maximum capability. If API costs become prohibitive or you need more control, migrate to Playwright.

**Hybrid Approach (Optional):**
- Use Firecrawl for complex sites (JavaScript, anti-bot)
- Keep Cheerio for known-static sites (cost optimization)
- Use Playwright as fallback if Firecrawl fails

**Recommendation:** Proceed with **Firecrawl implementation** immediately for fastest time-to-value.

---

## Next Steps

### Option A: Firecrawl (Recommended)
1. **Sign up:** Get API key from [firecrawl.dev](https://firecrawl.dev)
2. **Install SDK:** `npm install @mendable/firecrawl-js`
3. **Implementation:** Integrate Firecrawl API (1-2 days)
4. **Testing:** Test against real-world sites (1 day)
5. **Deployment:** Deploy to production (1 day)

**Estimated Timeline:** 3-4 days for full implementation and testing.

### Option B: Playwright (Self-Hosted)
1. **Review & Approval:** Get stakeholder approval for this proposal
2. **Implementation:** Begin Phase 1 development (1 week)
3. **Testing:** Comprehensive testing against real-world sites (1 week)
4. **Deployment:** Gradual rollout to production

**Estimated Timeline:** 2 weeks for full implementation and testing.

## References

- [Firecrawl Documentation](https://docs.firecrawl.dev/introduction)
- [Firecrawl Node.js SDK](https://docs.firecrawl.dev/sdks/node)
- [Firecrawl Pricing](https://firecrawl.dev/pricing)
- [Playwright Documentation](https://playwright.dev)

