# Location in LLM Prompts - Analysis

**Question:** Do prompts receive location from crawlData?

## Current Implementation

### Location Source

**In Fingerprinter (lib/llm/fingerprinter.ts:533):**
```typescript
if (business.location && business.location.city && business.location.state) {
  // Uses business.location (NOT crawlData.location directly)
  const city = business.location.city !== 'Unknown' ? business.location.city : '';
  const state = business.location.state !== 'Unknown' ? business.location.state : '';
  // ... builds locationQuery
}
```

### Data Flow

```
Crawl
  ↓
Extract location from crawlData
  ↓
Update business.location in database
  ↓
Business refreshed from DB
  ↓
Fingerprint uses business.location ✅
  ↓
Prompts include locationQuery ✅
```

## Answer: **YES, but indirectly**

1. **Crawl extracts location** from crawlData (structured data, meta tags, HTML)
2. **Location updates business.location** in database (business-processing.ts:307)
3. **Fingerprint uses business.location** (not crawlData.location directly)
4. **Prompts include location** if business.location exists

### Example Prompts with Location

**With Location:**
```
"Tell me about Brown Physicians in Providence, RI. They offer..."
"Is Brown Physicians in Providence, RI a good healthcare provider?..."
"What are the best healthcare providers in Providence, RI? List the top 5..."
```

**Without Location:**
```
"Tell me about Brown Physicians. They offer..."
"Is Brown Physicians a good healthcare provider?..."
"What are the best healthcare providers similar to Brown Physicians? List the top 5..."
```

## Potential Issue

**Location might not be extracted from crawlData if:**
- Structured data doesn't have address
- Meta tags don't have location
- HTML parsing fails
- Location extraction logic has bugs

**Current location extraction happens in:**
- `lib/crawler/index.ts` - extractData method
- Uses JSON-LD structured data (priority 1)
- Uses meta tags (priority 2)
- Uses URL parsing (priority 3)

## Verification

To verify location is being extracted and used:

1. **Check crawlData has location:**
   ```typescript
   console.log('CrawlData location:', business.crawlData?.location);
   ```

2. **Check business.location is updated:**
   ```typescript
   console.log('Business location:', business.location);
   ```

3. **Check prompts include location:**
   ```typescript
   // In fingerprinter.ts, log the prompts
   console.log('Factual prompt:', prompts.factual);
   // Should include "in City, State" if location exists
   ```

## Recommendation

**Add logging to verify location flow:**
```typescript
// In fingerprinter.ts, add logging:
log.debug('Location check for prompts', {
  businessId: business.id,
  hasBusinessLocation: !!business.location,
  businessLocation: business.location,
  hasCrawlDataLocation: !!(business.crawlData as any)?.location,
  crawlDataLocation: (business.crawlData as any)?.location,
  locationQuery: locationQuery || 'none',
});
```

This will help verify:
- Is location extracted from crawl?
- Is location saved to business.location?
- Is location used in prompts?

