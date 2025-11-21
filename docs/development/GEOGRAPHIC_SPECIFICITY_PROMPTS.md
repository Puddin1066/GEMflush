# Geographic Specificity in LLM Prompts

**Date:** Implementation complete  
**Issue:** Local businesses were being compared to national/international businesses, conflating the local aspect of the service

## Problem

The original prompts had several issues:

1. **Location was optional** - Prompts didn't always include location context
2. **No geographic boundaries** - Recommendation prompts didn't restrict to local businesses
3. **National/international comparisons** - Local businesses were compared to chains and international companies
4. **Conflated competitive analysis** - Leaderboard included businesses not in direct competition

**Impact:**
- ❌ Visibility scores were skewed by irrelevant comparisons
- ❌ Competitive leaderboard included non-local competitors
- ❌ Local businesses compared to national chains unfairly
- ❌ Geographic market focus was lost

## Solution

Updated all three prompt types to:
1. ✅ Always include location when available
2. ✅ Emphasize local/geographic context
3. ✅ Explicitly restrict to local businesses in recommendation prompts
4. ✅ Exclude national/international chains (unless significant local presence)

## Implementation

### Prompt 1: Factual Query

**Before:**
```
Tell me about ${business.name} ${locationQuery}. What do you know about them?
```

**After:**
```
Tell me about ${business.name}, a ${serviceContext} located ${locationQuery}. 
What do you know about this local business?
```

**Changes:**
- ✅ Always includes service context
- ✅ Emphasizes "located" for geographic specificity
- ✅ Uses "local business" language

### Prompt 2: Opinion Query

**Before:**
```
Is ${business.name} ${locationQuery} a good ${serviceContext}? What are people saying about them?
```

**After:**
```
Is ${business.name}, a ${serviceContext} located ${locationQuery}, a good option? 
What are people in ${location} saying about this local business?
```

**Changes:**
- ✅ Emphasizes location in question
- ✅ Asks about local community sentiment
- ✅ Uses "local business" language

### Prompt 3: Recommendation Query (Most Critical)

**Before:**
```
What are the best ${industryPlural} ${locationQuery}? List the top 5 and rank them 1-5.
```

**After (With Location):**
```
What are the top 5 LOCAL ${industryPlural} in the ${industryField} industry specifically in ${location}? 
Please only include businesses that operate in ${location} and rank them 1-5. 
Explain why you're recommending each one based on objective criteria such as quality of service, 
reputation, expertise, and customer satisfaction. Focus on businesses that serve customers in this 
specific geographic region, not national or international chains unless they have a significant 
local presence in ${location}.
```

**After (Without Location):**
```
What are the top 5 LOCAL ${industryPlural} in the ${industryField} industry similar to ${business.name}? 
Please only include businesses that operate in the same geographic region and rank them 1-5. 
Explain why you're recommending each one based on objective criteria such as quality of service, 
reputation, expertise, and customer satisfaction. Focus on businesses that serve customers in the 
same local or regional market, not national or international businesses.
```

**Changes:**
- ✅ Uses "LOCAL" keyword prominently
- ✅ Explicitly restricts to businesses in the same geographic region
- ✅ Excludes national/international chains (unless significant local presence)
- ✅ Emphasizes "serve customers in this specific geographic region"
- ✅ Includes industry/field context for objectivity

## Benefits

### 1. Accurate Competitive Analysis
- ✅ Only compares businesses in the same geographic market
- ✅ Excludes irrelevant national/international competitors
- ✅ Focuses on direct local competition

### 2. Fair Visibility Scoring
- ✅ Scores reflect local market position
- ✅ Not skewed by national brand recognition
- ✅ More relevant for local business owners

### 3. Better Leaderboard Quality
- ✅ Competitors are actually in competition
- ✅ Geographic boundaries are respected
- ✅ More actionable competitive intelligence

### 4. Geographic Market Focus
- ✅ Emphasizes local/regional market
- ✅ Aligns with service's local business focus
- ✅ More relevant recommendations

## Example Prompts

### Healthcare Provider in Providence, RI

**Factual:**
```
Tell me about Brown Physicians, Inc., a healthcare provider located in Providence, RI. 
Brown Physicians, Incorporated (BPI) is a community-based not-for-profit multi-specialty practice... 
What do you know about this local business?
```

**Opinion:**
```
Is Brown Physicians, Inc., a healthcare provider located in Providence, RI, a good option? 
Brown Physicians, Incorporated (BPI) is a community-based not-for-profit multi-specialty practice... 
What are people in Providence, RI saying about this local business?
```

**Recommendation:**
```
What are the top 5 LOCAL healthcare providers in the healthcare industry specifically in Providence, RI? 
Please only include businesses that operate in Providence, RI and rank them 1-5. 
Explain why you're recommending each one based on objective criteria such as quality of service, 
reputation, expertise, and customer satisfaction. Focus on businesses that serve customers in this 
specific geographic region, not national or international chains unless they have a significant 
local presence in Providence, RI.
```

## Code Changes

**File:** `lib/llm/fingerprinter.ts`

**Key Updates:**
1. Factual prompt always includes location and service context
2. Opinion prompt emphasizes local community sentiment
3. Recommendation prompt explicitly restricts to local businesses
4. All prompts use "local business" language when location is available

## Testing Recommendations

1. **Test with location:**
   - Verify location is included in all prompts
   - Verify "local" language is used
   - Verify geographic restrictions are clear

2. **Test without location:**
   - Verify prompts still work
   - Verify regional context is emphasized
   - Verify national/international exclusion

3. **Test competitive leaderboard:**
   - Verify only local businesses appear
   - Verify national chains are excluded (unless local presence)
   - Verify geographic boundaries are respected

4. **Test different industries:**
   - Healthcare providers
   - Restaurants
   - Legal services
   - Technology companies

## Impact on Competitive Leaderboard

The competitive leaderboard will now:
- ✅ Only include businesses in the same geographic region
- ✅ Exclude national/international chains (unless significant local presence)
- ✅ Provide more relevant competitive intelligence
- ✅ Reflect actual local market competition

## Files Changed

1. ✅ `lib/llm/fingerprinter.ts` - Updated all three prompt types

## Summary

✅ **Geographic Specificity:** All prompts emphasize location when available  
✅ **Local Focus:** Recommendation prompts explicitly restrict to local businesses  
✅ **Fair Comparisons:** Excludes national/international chains from local comparisons  
✅ **Better Leaderboard:** Competitive analysis focuses on actual local competitors  
✅ **Market Alignment:** Aligns with service's focus on local business visibility

