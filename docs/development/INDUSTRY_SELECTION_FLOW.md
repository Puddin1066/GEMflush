# Industry Selection Flow

## Overview

The platform determines the appropriate industry for an entity through a multi-stage extraction and classification process. This industry information is then used to generate industry-specific LLM prompts for fingerprinting, ensuring recommendations use appropriate terminology (e.g., "restaurants" instead of "businesses" for a pizza place).

## Industry Selection Pipeline

### Stage 1: Initial Data Extraction (During Crawl)

**Location:** `lib/crawler/index.ts` → `extractData()`

1. **Structured Data (JSON-LD) Extraction**
   - Extracts JSON-LD structured data from the page
   - Maps Schema.org `@type` values to industries:
     - `"Restaurant"` → `"restaurant"`
     - `"LegalService"` → `"legal"`
     - `"MedicalBusiness"` → `"healthcare"`
     - `"Store"` → `"retail"`
     - etc.
   - Extracts `servesCuisine` property (restaurants)
   - **Result:** Industry hint stored in `data.businessDetails.industry`

2. **Category Extraction**
   - Scans page content for industry-specific keywords
   - Checks meta tags (`og:type`, `category`, `article:section`)
   - **Result:** Categories array stored in `data.categories`

3. **LLM Enhancement**
   - Sends website content + extracted hints to LLM
   - LLM prompt includes:
     - Structured data hints (e.g., "Schema.org type: Restaurant")
     - Extracted categories (e.g., "Page categories detected: restaurant, food")
     - Website content (first 4000 chars)
   - LLM returns:
     - `businessDetails.industry` (standard industry term)
     - `businessDetails.sector` (broader sector classification)
     - `llmEnhanced.businessCategory` (LLM's classification)

**Priority Order for Industry:**
1. `businessDetails.industry` (from LLM or structured data)
2. `businessDetails.sector` (from LLM)
3. `llmEnhanced.businessCategory` (from LLM)
4. `category` (database field, user-provided)

### Stage 2: Industry Usage (During Fingerprint)

**Location:** `lib/llm/fingerprinter.ts` → `generatePrompts()`

1. **Industry Extraction**
   ```typescript
   industry = crawlData.businessDetails?.industry || 
              crawlData.businessDetails?.sector || 
              null;
   businessCategory = crawlData.llmEnhanced?.businessCategory || null;
   ```

2. **Industry-to-Plural Mapping**
   - Uses `getIndustryPlural()` function
   - Maps industry terms to appropriate plural forms:
     - `"restaurant"` → `"restaurants"`
     - `"legal"` → `"law firms"`
     - `"healthcare"` → `"healthcare providers"`
     - `"technology"` → `"tech companies"`
     - etc.
   - Handles partial matches and pluralization rules
   - **Fallback:** `"businesses"` if no match found

3. **Prompt Generation**
   - Recommendation prompts use industry-specific plural:
     - ✅ `"Can you recommend the top 5 restaurants in New York?"`
     - ❌ `"Can you recommend the top 5 businesses in New York?"`

## Data Flow Diagram

```
Website URL
    ↓
[Crawler] Extract HTML/Markdown
    ↓
[Structured Data] Extract JSON-LD (@type, servesCuisine)
    ↓ [Industry Hint: "restaurant"]
[Category Extraction] Scan for keywords
    ↓ [Categories: ["restaurant", "food"]]
[LLM Enhancement] Analyze with hints
    ↓
{
  businessDetails: { industry: "restaurant", sector: "Food & Beverage" },
  llmEnhanced: { businessCategory: "Restaurant" }
}
    ↓
[Database] Stored in business.crawlData
    ↓
[Fingerprint] Extract industry from crawlData
    ↓
[getIndustryPlural] Map "restaurant" → "restaurants"
    ↓
[Prompt] "Can you recommend the top 5 restaurants in New York?"
```

## Industry Classification Standards

### Industry Terms (Standardized)
- **Food & Hospitality:** `restaurant`, `cafe`, `bakery`, `bar`, `hotel`
- **Healthcare:** `healthcare`, `medical`, `dental`, `pharmacy`, `hospital`
- **Legal:** `legal`, `law`
- **Technology:** `technology`, `tech`, `software`, `saas`
- **Retail:** `retail`, `store`, `shop`
- **Professional Services:** `professional`, `consulting`, `accounting`, `financial`
- **Automotive:** `automotive`, `auto`
- **Real Estate:** `real estate`
- **Education:** `education`, `school`, `university`
- **Fitness:** `fitness`, `gym`, `wellness`

### Sector Terms (Broader Classification)
- `Food & Beverage`
- `Healthcare`
- `Legal Services`
- `Technology`
- `Retail`
- `Hospitality`
- `Automotive`
- `Education`
- `Wellness`
- `Professional Services`

## Improvements Made

1. **Structured Data Extraction**
   - Now extracts industry hints from JSON-LD `@type` and `servesCuisine`
   - Maps Schema.org types to industry terms

2. **Enhanced Category Extraction**
   - More sophisticated keyword matching
   - Checks meta tags for category information
   - Returns multiple category matches

3. **Improved LLM Prompt**
   - Includes extracted categories and structured data hints
   - Provides industry classification guidance
   - Uses standard industry terminology

4. **Industry-to-Plural Mapping**
   - Comprehensive mapping dictionary
   - Handles partial matches
   - Smart pluralization fallback

## Future Enhancements

1. **Wikidata Industry Classification**
   - Use Wikidata industry properties (P31, P452) if entity is published
   - Cross-reference with industry standards (NAICS, SIC codes)

2. **Machine Learning Classification**
   - Train a classifier on crawled data
   - Improve accuracy over time

3. **User Feedback Loop**
   - Allow users to correct industry classification
   - Use corrections to improve future extractions


