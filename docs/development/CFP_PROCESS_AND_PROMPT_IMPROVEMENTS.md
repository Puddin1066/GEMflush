# CFP Process and Fingerprint Prompt Improvements

## CFP Process Overview

**CFP** stands for **Crawl → Fingerprint → Publish**, the core automated workflow that processes businesses from website data to Wikidata publication.

### Current CFP Flow

```
1. CRAWL (C)
   ├─ Fetches website HTML via Firecrawl API
   ├─ Extracts structured data (JSON-LD, meta tags)
   ├─ Uses LLM to enhance extraction (~1-2s)
   └─ Produces: crawlData (description, phone, email, social links, business details)

2. FINGERPRINT (F) - Runs in parallel with crawl
   ├─ Queries 3 LLM models (GPT-4, Claude, Gemini)
   ├─ Uses 3 prompt types (factual, opinion, recommendation)
   ├─ Makes 9 parallel queries (~3-5s)
   └─ Produces: visibility score, mention rate, sentiment, competitive data

3. PUBLISH (P) - Runs after crawl completes
   ├─ Builds Wikidata entity from business + crawlData
   ├─ Checks notability requirements
   ├─ Publishes to test.wikidata.org
   └─ Produces: Wikidata QID, published entity
```

### Key Insight: Fingerprint Runs Independently

The fingerprint step currently **does NOT use crawlData** - it only uses:
- `business.name`
- `business.url`
- `business.category`
- `business.location`

This means fingerprinting can run immediately on business creation, but it's missing rich context from the crawl.

---

## Current Prompt Generation

### Existing Prompts (Basic)

```typescript
factual: "What information do you have about {name} located in {location}? 
          Please provide factual details about their services, reputation, 
          and any notable characteristics."

opinion: "I'm considering using the services of {name} located in {location}. 
          Based on what you know, would you say they are a reputable and 
          reliable {category}? Explain your reasoning."

recommendation: "Can you recommend the top 5 {industryPlural} in {location}? 
                 Please rank them and explain why you're recommending each one."
```

### Problems with Current Approach

1. **Minimal Context**: Only uses name, location, category
2. **No Crawled Data**: Ignores rich crawlData (description, services, founded date, etc.)
3. **Generic Prompts**: Don't leverage business-specific details
4. **Missed Opportunities**: 
   - No mention of specific services/products
   - No use of founding date for historical context
   - No use of awards/certifications for credibility
   - No use of social links for verification

---

## Available Crawled Data (Underutilized)

The crawler extracts extensive data that could enhance prompts:

### Basic Information
- `description` - Business description from website
- `phone` - Contact phone number
- `email` - Contact email
- `address` - Physical address
- `founded` - Year or date founded

### Rich Business Details
- `businessDetails.industry` - Specific industry classification
- `businessDetails.sector` - Business sector
- `businessDetails.founded` - Founding date
- `businessDetails.employeeCount` - Company size
- `businessDetails.revenue` - Revenue information
- `businessDetails.products` - Product list
- `businessDetails.services` - Service offerings
- `businessDetails.awards` - Awards and recognition
- `businessDetails.certifications` - Certifications (ISO, B Corp, etc.)
- `businessDetails.ceo` - CEO/Founder name
- `businessDetails.parentCompany` - Parent organization
- `businessDetails.stockSymbol` - If publicly traded

### Social & Web Presence
- `socialLinks.facebook` - Facebook page
- `socialLinks.instagram` - Instagram account
- `socialLinks.linkedin` - LinkedIn company page
- `socialLinks.twitter` - Twitter/X account

### Enhanced LLM Extraction
- `llmEnhanced.serviceOfferings` - LLM-extracted services
- `llmEnhanced.keyDifferentiators` - Unique selling points
- `llmEnhanced.targetAudience` - Target market

---

## Improved Prompt Strategy

### Strategy 1: Context-Rich Prompts (When CrawlData Available)

When `crawlData` exists, enhance prompts with specific details:

```typescript
// Enhanced Factual Prompt
factual: `What information do you have about ${business.name}${locationContext}?
          ${description ? `They describe themselves as: "${description}"` : ''}
          ${founded ? `Founded in ${founded}.` : ''}
          ${services ? `They offer: ${services.join(', ')}.` : ''}
          ${awards ? `They have received: ${awards.join(', ')}.` : ''}
          Please provide factual details about their services, reputation, 
          industry standing, and any notable characteristics.`

// Enhanced Opinion Prompt  
opinion: `I'm considering using ${business.name}${locationContext}${services ? 
          ` for ${services[0]}` : ''}. 
          ${description ? `Their website says: "${description.substring(0, 200)}..."` : ''}
          ${founded ? `They've been operating since ${founded}.` : ''}
          ${certifications ? `They are certified: ${certifications.join(', ')}.` : ''}
          Based on what you know, would you say they are a reputable and reliable 
          ${business.category || 'business'}? Explain your reasoning, including 
          any industry recognition or notable achievements.`

// Enhanced Recommendation Prompt
recommendation: `${location ? `In ${location},` : 'Can you'} recommend the top 5 
                 ${industryPlural}${services ? ` that offer ${services[0]}` : ''}?
                 ${business.name}${founded ? ` (founded ${founded})` : ''}${description ? 
                 ` - ${description.substring(0, 100)}...` : ''} should be considered.
                 Please rank them and explain why you're recommending each one, 
                 including any notable distinctions.`
```

### Strategy 2: Fallback to Basic Prompts (When No CrawlData)

When `crawlData` is missing, use current basic prompts as fallback.

### Strategy 3: Progressive Enhancement

1. **First Fingerprint** (no crawlData): Use basic prompts
2. **After Crawl** (with crawlData): Re-run fingerprint with enhanced prompts
3. **Result**: More accurate visibility scores after crawl completes

---

## Implementation Approach

### Option A: Enhance Prompts When CrawlData Exists

Modify `generatePrompts()` to check for `crawlData` and build richer prompts:

```typescript
private generatePrompts(business: Business): Record<string, string> {
  const crawlData = business.crawlData as CrawledData | undefined;
  const hasCrawlData = !!crawlData;
  
  // Extract rich context from crawlData
  const description = crawlData?.description;
  const founded = crawlData?.founded || crawlData?.businessDetails?.founded;
  const services = crawlData?.services || crawlData?.businessDetails?.services || [];
  const products = crawlData?.businessDetails?.products || [];
  const awards = crawlData?.businessDetails?.awards || [];
  const certifications = crawlData?.businessDetails?.certifications || [];
  const ceo = crawlData?.businessDetails?.ceo;
  const employeeCount = crawlData?.businessDetails?.employeeCount;
  
  // Build context strings
  const serviceContext = services.length > 0 
    ? ` They offer: ${services.slice(0, 3).join(', ')}${services.length > 3 ? ' and more' : ''}.`
    : '';
    
  const credibilityContext = [
    founded ? `Founded in ${founded}` : null,
    employeeCount ? `${employeeCount} employees` : null,
    certifications.length > 0 ? `Certified: ${certifications.join(', ')}` : null,
    awards.length > 0 ? `Awards: ${awards.slice(0, 2).join(', ')}` : null,
  ].filter(Boolean).join('. ');
  
  // Enhanced prompts with crawled context
  if (hasCrawlData && (description || serviceContext || credibilityContext)) {
    return {
      factual: `What information do you have about ${business.name}${locationContext}?
                ${description ? `They describe themselves as: "${description.substring(0, 300)}"` : ''}
                ${serviceContext}
                ${credibilityContext ? `${credibilityContext}.` : ''}
                Please provide factual details about their services, reputation, 
                industry standing, and any notable characteristics.`,
      
      opinion: `I'm considering ${business.name}${locationContext}${services.length > 0 ? 
                ` for ${services[0]}` : ''}. 
                ${description ? `Their website: "${description.substring(0, 200)}..."` : ''}
                ${credibilityContext ? `${credibilityContext}.` : ''}
                Based on what you know, would you say they are a reputable and reliable 
                ${business.category || 'business'}? Explain your reasoning.`,
      
      recommendation: `${location ? `In ${location},` : 'Can you'} recommend the top 5 
                       ${industryPlural}${services.length > 0 ? ` that offer ${services[0]}` : ''}?
                       ${business.name}${founded ? ` (founded ${founded})` : ''}${description ? 
                       ` - ${description.substring(0, 100)}...` : ''} should be considered.
                       Please rank them and explain why.`,
    };
  }
  
  // Fallback to basic prompts
  return { /* current basic prompts */ };
}
```

### Option B: Re-run Fingerprint After Crawl

Since fingerprint runs in parallel with crawl, consider:

1. **Initial Fingerprint**: Run with basic prompts (immediate)
2. **Enhanced Fingerprint**: Re-run after crawl completes with enhanced prompts
3. **Update Visibility Score**: Use the better result

This provides immediate feedback while improving accuracy after crawl.

---

## Benefits of Enhanced Prompts

### 1. More Accurate Visibility Assessment

**Current**: LLM has minimal context → generic responses
**Enhanced**: LLM has specific details → more accurate recognition

Example:
- **Basic**: "What do you know about Joe's Pizza in New York?"
- **Enhanced**: "What do you know about Joe's Pizza in New York? They describe themselves as 'Serving authentic New York slices since 1975'. Founded in 1975. They offer: pizza, calzones, salads. Please provide factual details..."

### 2. Better Competitive Analysis

**Current**: Generic industry recommendations
**Enhanced**: Service-specific recommendations with context

Example:
- **Basic**: "Recommend top 5 restaurants in Seattle"
- **Enhanced**: "Recommend top 5 restaurants in Seattle that offer farm-to-table dining. The Farmhouse (founded 2010) - 'Locally sourced ingredients, seasonal menu' should be considered..."

### 3. Improved Sentiment Analysis

**Current**: Generic opinion questions
**Enhanced**: Specific service/credibility context

Example:
- **Basic**: "Is Joe's Pizza reputable?"
- **Enhanced**: "I'm considering Joe's Pizza for authentic New York pizza. Their website: 'Serving since 1975, featured in Food Network'. Founded in 1975. Based on what you know, would you say they are reputable?"

### 4. Better Mention Detection

With more context, LLMs are more likely to:
- Recognize the business from specific details
- Provide accurate information
- Give meaningful competitive comparisons

---

## Recommended Implementation

### Phase 1: Enhance Prompts When CrawlData Exists

1. Modify `generatePrompts()` to extract crawlData context
2. Build enhanced prompts with:
   - Description (truncated to 300 chars)
   - Services/products (top 3)
   - Founded date
   - Awards/certifications (if available)
3. Keep basic prompts as fallback

### Phase 2: Optional Re-fingerprint After Crawl

1. Run initial fingerprint with basic prompts (immediate feedback)
2. After crawl completes, optionally re-run fingerprint with enhanced prompts
3. Update visibility score if enhanced result is better

### Phase 3: Smart Context Selection

Only include relevant context:
- **Description**: Always include if available (most valuable)
- **Services**: Include if helps differentiate
- **Founded**: Include for established businesses (5+ years)
- **Awards/Certifications**: Include for credibility
- **CEO**: Include for well-known founders

---

## Example: Before vs After

### Before (Current)
```
Factual: "What information do you have about Acme Corp located in Seattle, WA?"
```

### After (Enhanced)
```
Factual: "What information do you have about Acme Corp located in Seattle, WA?
          They describe themselves as: 'Leading provider of cloud-based 
          project management solutions for enterprise teams since 2015.'
          They offer: project management software, team collaboration tools, 
          analytics dashboards.
          Founded in 2015. 50-100 employees. Certified: ISO 27001, SOC 2.
          Please provide factual details about their services, reputation, 
          industry standing, and any notable characteristics."
```

The enhanced prompt gives the LLM:
- **Specific context** about what the business does
- **Credibility signals** (founded date, certifications)
- **Service details** for better recognition
- **Industry positioning** for competitive analysis

---

## Key Takeaways

1. **Current State**: Fingerprint prompts are basic and don't use crawlData
2. **Opportunity**: CrawlData contains rich context (description, services, awards, etc.)
3. **Improvement**: Enhance prompts with crawlData when available
4. **Benefit**: More accurate visibility scores, better competitive analysis, improved mention detection
5. **Implementation**: Progressive enhancement - basic prompts first, enhanced after crawl

The fingerprint step can be significantly improved by leveraging the rich data already being extracted during the crawl phase.



