# CFP Process & Fingerprint LLM Response Scoring

## Overview: CFP (Crawl, Fingerprint, Publish)

The CFP pipeline is a **sequential 3-step process** that transforms a business URL into a published Wikidata entity with visibility metrics.

```
URL → [Crawl] → [Fingerprint] → [Publish] → Wikidata Entity
```

### Step 1: Crawl (C)

**Purpose**: Extract structured data from the business website

**Input**: Business URL (e.g., `https://example.com`)

**Process**:
1. Fetches HTML from URL using Firecrawl API (or Playwright/Fetch fallback)
2. Extracts structured data (JSON-LD, meta tags, OpenGraph)
3. Makes 1 LLM API call to enhance extraction (~1-2s)
4. Validates and stores `crawlData` in database

**Output**: `crawlData` object containing:
- `description`: Business description
- `services`: Array of services offered
- `phone`, `email`, `address`: Contact information
- `businessDetails`: Industry, sector, founded date, certifications, awards
- `llmEnhanced`: Business category, service offerings, target audience

**Status**: Business status changes to `'crawled'`

---

### Step 2: Fingerprint (F)

**Purpose**: Measure business visibility across multiple LLMs using customer-query-style prompts

**Input**: Business object with `crawlData` (REQUIRED)

**Process**:
1. Generates 3 customer-query-style prompts (factual, opinion, recommendation)
2. Queries 3 LLM models (GPT-4 Turbo, Claude 3 Opus, Gemini Pro) with each prompt
3. Executes 9 queries total (3 models × 3 prompts) in parallel (~3-5s)
4. Analyzes each response for:
   - **Mention detection**: Is the business mentioned? (yes/no)
   - **Sentiment**: Positive, neutral, or negative?
   - **Ranking position**: Where do they rank? (1-5, or null)
   - **Competitor mentions**: Who else is mentioned?

**Output**: `FingerprintAnalysis` containing:
- `visibilityScore`: Overall score (0-100)
- `mentionRate`: Percentage of queries where business was mentioned
- `sentimentScore`: Average sentiment (0-1)
- `accuracyScore`: Average accuracy of information
- `avgRankPosition`: Average ranking position (1-5, or null)
- `llmResults`: Array of 9 LLM query results
- `competitiveLeaderboard`: Competitor analysis

**Status**: Business status changes to `'generating'` → `'crawled'` (ready for publish)

---

### Step 3: Publish (P)

**Purpose**: Build and publish Wikidata entity to test.wikidata.org

**Input**: Business object with `crawlData` and `llmFingerprints`

**Process**:
1. Builds Wikidata entity using `tiered-entity-builder.ts`
2. Validates entity against Wikidata notability requirements
3. Publishes to test.wikidata.org (or production if approved)
4. Stores `wikidataQID` and `wikidataPublishedAt` in database

**Output**: Published Wikidata entity with QID (e.g., `Q123456`)

**Status**: Business status changes to `'published'`

---

## Fingerprint LLM Response Analysis

### Query Execution

**9 Queries Total** (3 models × 3 prompt types):

| Model | Prompt Type | Query |
|-------|------------|-------|
| GPT-4 Turbo | Factual | "Tell me about [Business] in [Location]. [Description]. What do you know about them?" |
| GPT-4 Turbo | Opinion | "Is [Business] in [Location] a good [Service]? [Description]. What are people saying about them?" |
| GPT-4 Turbo | Recommendation | "What are the best [Industry] in [Location]? List the top 5 and rank them 1-5." |
| Claude 3 Opus | Factual | (same as above) |
| Claude 3 Opus | Opinion | (same as above) |
| Claude 3 Opus | Recommendation | (same as above) |
| Gemini Pro | Factual | (same as above) |
| Gemini Pro | Opinion | (same as above) |
| Gemini Pro | Recommendation | (same as above) |

**Execution**: All 9 queries run in parallel (~3-5s total)

---

### Response Analysis

Each LLM response is analyzed to extract measurable metrics:

#### 1. Mention Detection

**Method**: Fuzzy name matching with multiple variants

```typescript
// Generates name variants:
- "Acme Corp"
- "Acme Corporation"
- "Acme"
- "acme corp" (case-insensitive)
- Removes common suffixes (LLC, Inc, Corp, Ltd)
- Extracts key words (removes "Dental", "Care", "Services")
```

**Result**: `mentioned: boolean` (true if business name detected in response)

**Example**:
```
Response: "Yes, I know about Acme Corp in Seattle. They're a software company..."
Result: mentioned = true ✅
```

---

#### 2. Sentiment Analysis

**Method**: Keyword-based sentiment detection

**Positive Keywords**: `excellent`, `great`, `best`, `recommend`, `trusted`, `reliable`, `professional`, `quality`, `reputable`, `outstanding`, `top`, `highly rated`, `popular`

**Negative Keywords**: `poor`, `bad`, `worst`, `avoid`, `unreliable`, `unprofessional`, `complaint`, `issue`, `problem`, `disappointed`, `negative`, `warning`

**Scoring**:
- Count positive keywords
- Count negative keywords
- If `positiveCount > negativeCount + 1` → `'positive'`
- If `negativeCount > positiveCount + 1` → `'negative'`
- Otherwise → `'neutral'`

**Result**: `sentiment: 'positive' | 'neutral' | 'negative'`

**Example**:
```
Response: "Acme Corp is an excellent software company with great reviews..."
Positive keywords: 2 (excellent, great)
Negative keywords: 0
Result: sentiment = 'positive' ✅
```

---

#### 3. Ranking Position Extraction

**Method**: Parse numbered lists from recommendation responses

**Patterns Matched**:
- `"1. Business Name"`
- `"1) Business Name"`
- `"Top 1: Business Name"`

**Result**: `rankPosition: number | null` (1-5 if ranked, null if not mentioned)

**Example**:
```
Response: "Top 5 software companies in Seattle:
1. TechCorp
2. Acme Corp
3. DataSystems"
Result: rankPosition = 2 ✅
```

---

#### 4. Competitor Extraction

**Method**: Extract business names from recommendation lists

**Process**:
1. Parse numbered list items from recommendation responses
2. Filter out:
   - Target business name (skip self)
   - Placeholder names (`"local business example"`, `"sample business"`, etc.)
   - Generic terms (`"quality services"`, `"premier services"`, etc.)
3. Clean up prefixes/suffixes (remove "The", "LLC", "Inc", etc.)
4. Validate: Must be at least 3 characters, not just numbers

**Result**: `competitorMentions: string[]` (array of competitor names)

**Example**:
```
Response: "Top 5:
1. TechCorp
2. Acme Corp
3. DataSystems
4. CloudSoft
5. DevTools"
Result: competitorMentions = ["TechCorp", "DataSystems", "CloudSoft", "DevTools"] ✅
```

---

## Visibility Score Calculation

The visibility score combines all metrics into a single 0-100 score.

### Formula

```typescript
visibilityScore = Math.round(
  (mentionRate * 0.4) +           // 40% weight on mention rate
  (avgSentiment * 30) +           // 30% weight on sentiment
  (avgAccuracy * 20) +            // 20% weight on accuracy
  (avgRankPosition ? Math.max(0, (6 - avgRankPosition) / 5 * 10) : 5) // 10% on ranking
);
```

### Component Calculations

#### 1. Mention Rate (40% weight)

```typescript
mentionRate = (mentionedCount / totalQueries) * 100
```

**Example**:
- 9 queries total
- 7 queries mentioned the business
- `mentionRate = (7 / 9) * 100 = 77.8%`
- **Score contribution**: `77.8 * 0.4 = 31.1 points`

---

#### 2. Sentiment Score (30% weight)

```typescript
sentimentScores = {
  positive: 1,
  neutral: 0.5,
  negative: 0,
};

avgSentiment = mentionedResults
  .reduce((sum, r) => sum + sentimentScores[r.sentiment], 0) 
  / mentionedCount;
```

**Example**:
- 7 mentioned results
- 5 positive, 2 neutral, 0 negative
- `avgSentiment = (5*1 + 2*0.5) / 7 = 6 / 7 = 0.857`
- **Score contribution**: `0.857 * 30 = 25.7 points`

---

#### 3. Accuracy Score (20% weight)

```typescript
avgAccuracy = mentionedResults
  .reduce((sum, r) => sum + r.accuracy, 0) 
  / mentionedCount;
```

**Note**: Currently `accuracy` is set to `0.7` if mentioned, `0` if not mentioned. This is a simplified implementation that can be enhanced with more sophisticated accuracy detection.

**Example**:
- 7 mentioned results
- All have `accuracy = 0.7`
- `avgAccuracy = (7 * 0.7) / 7 = 0.7`
- **Score contribution**: `0.7 * 20 = 14.0 points`

---

#### 4. Ranking Score (10% weight)

```typescript
// Only from recommendation queries (3 queries)
rankedResults = llmResults.filter(r => r.rankPosition !== null);
avgRankPosition = rankedResults.length > 0
  ? rankedResults.reduce((sum, r) => sum + r.rankPosition, 0) / rankedResults.length
  : null;

// Convert rank to score (1 = best, 5 = worst)
rankingScore = avgRankPosition 
  ? Math.max(0, (6 - avgRankPosition) / 5 * 10)  // 1 → 10, 2 → 8, 3 → 6, 4 → 4, 5 → 2
  : 5;  // Default to 5 if not ranked
```

**Example**:
- 3 recommendation queries
- Rank positions: 2, 3, null (not mentioned in one)
- `avgRankPosition = (2 + 3) / 2 = 2.5`
- `rankingScore = (6 - 2.5) / 5 * 10 = 7.0`
- **Score contribution**: `7.0 * 0.1 = 0.7 points` (10% weight)

---

### Complete Example

**Business**: "Acme Corp" (software company in Seattle)

**LLM Results**:
- 9 queries total
- 7 mentioned (77.8% mention rate)
- Sentiment: 5 positive, 2 neutral → `avgSentiment = 0.857`
- Accuracy: All 0.7 → `avgAccuracy = 0.7`
- Ranking: Positions 2, 3, null → `avgRankPosition = 2.5` → `rankingScore = 7.0`

**Calculation**:
```
visibilityScore = Math.round(
  (77.8 * 0.4) +      // 31.1
  (0.857 * 30) +      // 25.7
  (0.7 * 20) +        // 14.0
  (7.0 * 0.1)         // 0.7
) = Math.round(71.5) = 72
```

**Final Visibility Score: 72/100** ✅

---

## Competitive Leaderboard

The competitive leaderboard shows which competitors are mentioned most often alongside the target business.

### Data Source

**Only uses recommendation queries** (3 queries total, one per model)

**Why?** Recommendation queries ask "What are the best [industry] in [location]?" which naturally produces competitive lists.

---

### Building the Leaderboard

#### Step 1: Extract Competitor Mentions

For each recommendation query result:
1. Extract `competitorMentions` array (already parsed during response analysis)
2. Track position in list (1-based index)

**Example**:
```
Query 1 (GPT-4): competitorMentions = ["TechCorp", "DataSystems", "CloudSoft"]
Query 2 (Claude): competitorMentions = ["TechCorp", "DevTools", "DataSystems"]
Query 3 (Gemini): competitorMentions = ["CloudSoft", "TechCorp"]
```

#### Step 2: Count Mentions

```typescript
competitorCounts = new Map<string, { count: number; positions: number[] }>();

// For each competitor mention:
competitorCounts.set(competitor, {
  count: count + 1,
  positions: [...positions, positionInList]
});
```

**Example**:
```
TechCorp: { count: 3, positions: [1, 1, 2] }
DataSystems: { count: 2, positions: [2, 3] }
CloudSoft: { count: 2, positions: [3, 1] }
DevTools: { count: 1, positions: [2] }
```

#### Step 3: Calculate Metrics

For each competitor:
- **mentionCount**: Total number of times mentioned
- **avgPosition**: Average position in lists
- **appearsWithTarget**: Number of times mentioned alongside target business

```typescript
competitors = Array.from(competitorCounts.entries())
  .map(([name, stats]) => ({
    name,
    mentionCount: stats.count,
    avgPosition: stats.positions.reduce((sum, p) => sum + p, 0) / stats.positions.length,
    appearsWithTarget: stats.count, // All mentions are alongside target
  }))
  .sort((a, b) => {
    // Sort by mention count (descending), then by avg position (ascending)
    if (b.mentionCount !== a.mentionCount) {
      return b.mentionCount - a.mentionCount;
    }
    return a.avgPosition - b.avgPosition;
  });
```

**Example**:
```
TechCorp: { mentionCount: 3, avgPosition: 1.33, appearsWithTarget: 3 }
DataSystems: { mentionCount: 2, avgPosition: 2.5, appearsWithTarget: 2 }
CloudSoft: { mentionCount: 2, avgPosition: 2.0, appearsWithTarget: 2 }
DevTools: { mentionCount: 1, avgPosition: 2.0, appearsWithTarget: 1 }
```

#### Step 4: Target Business Stats

```typescript
targetMentionCount = recommendationResults.filter(r => r.mentioned).length;
targetBusinessRank = avgRankPosition; // From visibility score calculation
```

**Example**:
```
Target Business (Acme Corp):
- mentionCount: 2 (mentioned in 2 out of 3 recommendation queries)
- rank: 2.5 (average rank position)
- avgPosition: 2.5
```

---

### Final Leaderboard Structure

```typescript
{
  targetBusiness: {
    name: "Acme Corp",
    rank: 2.5,
    mentionCount: 2,
    avgPosition: 2.5,
  },
  competitors: [
    { name: "TechCorp", mentionCount: 3, avgPosition: 1.33, appearsWithTarget: 3 },
    { name: "DataSystems", mentionCount: 2, avgPosition: 2.5, appearsWithTarget: 2 },
    { name: "CloudSoft", mentionCount: 2, avgPosition: 2.0, appearsWithTarget: 2 },
    { name: "DevTools", mentionCount: 1, avgPosition: 2.0, appearsWithTarget: 1 },
  ],
  totalRecommendationQueries: 3,
}
```

---

## Key Insights

### 1. Why 9 Queries?

**3 Models × 3 Prompt Types = 9 Queries**

- **Model Diversity**: Different LLMs have different training data and knowledge
- **Prompt Diversity**: Different query types measure different aspects of visibility
- **Reliability**: Multiple data points reduce noise and provide confidence

### 2. Why Sequential (Crawl → Fingerprint)?

**crawlData is REQUIRED** for fingerprinting because:
- Input is only a URL (no business context)
- Prompts need business description, services, industry to be effective
- Without crawlData, LLMs can't recognize the business accurately

### 3. Why Customer Query Syntax?

**Matches real search behavior**:
- Customers search "best [service] in [location]"
- LLMs respond more naturally to customer queries
- Results reflect actual customer discovery patterns

### 4. Why Weighted Scoring?

**40% Mention Rate**: Most important - are you known?
**30% Sentiment**: Reputation matters - what do people think?
**20% Accuracy**: Information quality - is the LLM correct?
**10% Ranking**: Competitive position - where do you rank?

This weighting reflects that **being mentioned** is more important than ranking position.

---

## Example: Complete Flow

### Input
```
URL: https://acmecorp.com
Location: Seattle, WA
```

### Step 1: Crawl
```
crawlData = {
  description: "Software company specializing in project management tools",
  services: ["project planning", "team collaboration", "analytics"],
  businessDetails: {
    industry: "Technology",
    founded: "2015",
    certifications: ["ISO 27001", "SOC 2"],
  }
}
```

### Step 2: Fingerprint

**9 LLM Queries**:
1. GPT-4 Factual: "Tell me about Acme Corp in Seattle, WA. Software company specializing in project management tools. They offer project planning, team collaboration, analytics. (operating since 2015, certified ISO 27001 and SOC 2). What do you know about them?"
2. GPT-4 Opinion: "Is Acme Corp in Seattle, WA a good project planning? [context]. What are people saying about them?"
3. GPT-4 Recommendation: "What are the best software companies in Seattle, WA? List the top 5 and rank them 1-5."
4. Claude 3 Opus: (same 3 prompts)
5. Gemini Pro: (same 3 prompts)

**Results**:
- 7/9 mentioned (77.8%)
- 5 positive, 2 neutral
- Rank positions: 2, 3, null

**Visibility Score**: 72/100

**Competitive Leaderboard**:
- TechCorp: 3 mentions, avg position 1.33
- DataSystems: 2 mentions, avg position 2.5
- CloudSoft: 2 mentions, avg position 2.0

### Step 3: Publish
```
Wikidata Entity Published: Q123456
Status: 'published'
```

---

## Summary

The CFP process transforms a URL into a published Wikidata entity with comprehensive visibility metrics:

1. **Crawl** extracts business data from the website
2. **Fingerprint** measures visibility across 9 LLM queries (3 models × 3 prompts)
3. **Publish** creates and publishes the Wikidata entity

The fingerprint analysis produces:
- **Visibility Score** (0-100): Weighted combination of mention rate, sentiment, accuracy, and ranking
- **Competitive Leaderboard**: Shows which competitors are mentioned most often alongside the target business

All metrics are derived from **objective analysis** of LLM responses, enabling quantitative measurement of local business visibility.



