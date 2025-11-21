# Recommendation Prompt Improvement

**Date:** Implementation complete  
**Issue:** Recommendation prompt was not adequately objective and should use industry/field from crawlData

## Problem

The original recommendation prompt was:
```
What are the best ${industryPlural} ${locationQuery}? List the top 5 and rank them 1-5.
```

**Issues:**
1. ❌ Not explicitly using industry/field from crawlData
2. ❌ Lacks objective criteria for ranking
3. ❌ Doesn't specify what field/industry is being evaluated
4. ❌ Missing context about what makes a good recommendation

## Solution

Updated the recommendation prompt to:
1. ✅ Explicitly use industry/field from crawlData
2. ✅ Include objective criteria for ranking
3. ✅ Specify the industry context
4. ✅ Request explanations based on objective criteria

## Implementation

### Updated Prompt

**With Location:**
```
What are the top 5 ${industryPlural} in the ${industryField} industry ${locationQuery}? 
Please rank them 1-5 and explain why you're recommending each one based on objective 
criteria such as quality of service, reputation, expertise, and customer satisfaction.
```

**Without Location:**
```
What are the top 5 ${industryPlural} in the ${industryField} industry similar to ${business.name}? 
Please rank them 1-5 and explain why you're recommending each one based on objective 
criteria such as quality of service, reputation, expertise, and customer satisfaction.
```

### Industry/Field Extraction

The prompt now explicitly uses industry/field from crawlData in priority order:

1. `crawlData.businessDetails?.industry` (primary source)
2. `crawlData.businessDetails?.sector` (fallback)
3. `crawlData.llmEnhanced?.businessCategory` (LLM-enhanced)
4. `business.category` (database fallback)

### Code Changes

**File:** `lib/llm/fingerprinter.ts`

**Before:**
```typescript
const recommendation = location
  ? `What are the best ${industryPlural} ${locationQuery}? List the top 5 and rank them 1-5.`
  : `What are the best ${industryPlural} similar to ${business.name}? List the top 5 and rank them 1-5.`;
```

**After:**
```typescript
// Ensure we use the industry/field from crawlData for objective ranking
const industryField = industry || businessCategory || business.category;

// Build objective recommendation prompt with explicit industry/field context
const industryContext = industryField 
  ? ` in the ${industryField} industry`
  : '';

const recommendation = location
  ? `What are the top 5 ${industryPlural}${industryContext} ${locationQuery}? Please rank them 1-5 and explain why you're recommending each one based on objective criteria such as quality of service, reputation, expertise, and customer satisfaction.`
  : `What are the top 5 ${industryPlural}${industryContext} similar to ${business.name}? Please rank them 1-5 and explain why you're recommending each one based on objective criteria such as quality of service, reputation, expertise, and customer satisfaction.`;
```

## Benefits

### 1. More Objective
- ✅ Explicitly requests objective criteria
- ✅ Specifies what factors to consider (quality, reputation, expertise, satisfaction)
- ✅ Reduces subjective bias in recommendations

### 2. Industry-Specific
- ✅ Uses actual industry/field from crawlData
- ✅ Provides context about what industry is being evaluated
- ✅ More relevant and accurate recommendations

### 3. Better Ranking Quality
- ✅ Asks for explanations, not just rankings
- ✅ Encourages LLM to consider multiple objective factors
- ✅ More useful competitive intelligence

## Example Prompts

### Healthcare Provider
**Before:**
```
What are the best healthcare providers in Providence, RI? List the top 5 and rank them 1-5.
```

**After:**
```
What are the top 5 healthcare providers in the healthcare industry in Providence, RI? 
Please rank them 1-5 and explain why you're recommending each one based on objective 
criteria such as quality of service, reputation, expertise, and customer satisfaction.
```

### Restaurant
**Before:**
```
What are the best restaurants in San Francisco, CA? List the top 5 and rank them 1-5.
```

**After:**
```
What are the top 5 restaurants in the restaurant industry in San Francisco, CA? 
Please rank them 1-5 and explain why you're recommending each one based on objective 
criteria such as quality of service, reputation, expertise, and customer satisfaction.
```

## Testing Recommendations

1. **Test with different industries:**
   - Healthcare providers
   - Restaurants
   - Legal services
   - Technology companies

2. **Test with/without location:**
   - Verify location context is included correctly
   - Verify fallback when location is missing

3. **Test industry extraction:**
   - Verify industry from crawlData is used
   - Verify fallback to businessCategory or category works
   - Verify prompt still works when industry is missing

4. **Verify objective criteria:**
   - Check that LLM responses include objective criteria
   - Verify rankings are based on stated criteria
   - Confirm explanations are provided

## Files Changed

1. ✅ `lib/llm/fingerprinter.ts` - Updated recommendation prompt generation

## Summary

✅ **More Objective:** Explicitly requests objective criteria for ranking  
✅ **Industry-Specific:** Uses industry/field from crawlData  
✅ **Better Quality:** Asks for explanations based on objective factors  
✅ **Maintains Compatibility:** Works with existing fingerprint analysis logic

