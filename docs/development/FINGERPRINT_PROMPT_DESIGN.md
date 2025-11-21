# Fingerprint Prompt Design: Customer Query Syntax & Objective Measurement

## Overview

The fingerprint prompts have been redesigned to:
1. **Emulate customer query syntax** - Natural language queries people actually use
2. **Enable objective measurement** - Responses that can be quantitatively analyzed
3. **Require crawled data** - Since input is only a URL, crawlData is **required** for effective prompts

### Critical Requirement: CrawlData

**crawlData is REQUIRED for fingerprinting** because:
- Input is only a URL (no business context)
- LLMs need business description, services, industry to recognize the business
- Without crawlData, prompts lack context and produce inaccurate results

**Flow:** Crawl → Fingerprint (crawlData required) → Publish

## Customer Query Syntax

### Real Customer Search Patterns

Customers search for local businesses using natural, conversational queries:

- **Direct lookup**: "tell me about [business name]"
- **Reputation check**: "is [business name] good?"
- **Local search**: "best [service] in [location]"
- **Reviews**: "[business name] reviews"

### Previous Approach (Too Formal)

```
❌ "What information do you have about Acme Corp located in Seattle, WA? 
    Please provide factual details about their services, reputation, 
    and any notable characteristics."
```

**Problems:**
- Too formal/analytical
- Doesn't match how customers actually search
- LLM may respond differently to formal vs. casual queries

### New Approach (Customer-Like)

```
✅ "Tell me about Acme Corp in Seattle, WA. What do you know about them?"
✅ "Is Acme Corp in Seattle, WA a good software company? 
    What are people saying about them?"
✅ "What are the best software companies in Seattle, WA? 
    List the top 5 and rank them 1-5."
```

**Benefits:**
- Matches real customer search behavior
- LLMs respond more naturally
- Better visibility measurement (customers search this way)

---

## Objective Measurement Design

### Measurable Response Elements

Each prompt is designed to produce responses with **quantifiable metrics**:

#### 1. Factual Prompt: "Tell me about [business]"

**Measures:**
- **Mention Detection**: Binary yes/no - is the business mentioned?
- **Knowledge Depth**: How much the LLM knows (response length, detail level)
- **Accuracy**: Does the LLM provide correct information?

**Example Response:**
```
"Yes, I know about Acme Corp in Seattle. They're a software company 
founded in 2015, specializing in project management tools..."
```

**Measurement:**
- ✅ Mentioned: Yes
- ✅ Sentiment: Neutral/Positive
- ✅ Accuracy: High (specific details)

#### 2. Opinion Prompt: "Is [business] good?"

**Measures:**
- **Reputation**: Positive/neutral/negative sentiment
- **Public Perception**: What "people are saying"
- **Recommendation Likelihood**: Would customers choose them?

**Example Response:**
```
"Acme Corp has generally positive reviews. Customers appreciate 
their user-friendly interface and responsive support..."
```

**Measurement:**
- ✅ Mentioned: Yes
- ✅ Sentiment: Positive
- ✅ Reputation Score: High

#### 3. Recommendation Prompt: "Best [service] in [location]"

**Measures:**
- **Ranking Position**: Where they rank (1-5)
- **Competitive Visibility**: Are they in the top recommendations?
- **Market Position**: Who else is mentioned (competitors)

**Example Response:**
```
"Top 5 software companies in Seattle, WA:
1. TechCorp - Leading enterprise solutions
2. Acme Corp - Best for project management
3. DataSystems - Strong analytics focus
..."
```

**Measurement:**
- ✅ Mentioned: Yes
- ✅ Rank Position: 2
- ✅ Competitive Context: 4 other companies mentioned

---

## Leveraging Crawled Data

### Enhanced Prompts with Context

When `crawlData` is available, prompts include credibility signals:

```typescript
// With crawled data
"Tell me about Acme Corp in Seattle, WA (operating since 2015, 
certified ISO 27001 and SOC 2). What do you know about them?"

// Without crawled data
"Tell me about Acme Corp in Seattle, WA. What do you know about them?"
```

### Context Elements Used

1. **Founded Date**: "operating since 2015" - establishes credibility
2. **Certifications**: "certified ISO 27001 and SOC 2" - trust signals
3. **Awards**: "awarded Best Place to Work 2023" - recognition
4. **Services**: Used to make queries more specific

### Benefits of Context

- **Better Recognition**: LLMs more likely to know established businesses
- **Higher Accuracy**: Specific details help LLMs provide correct information
- **Improved Ranking**: Credibility signals may improve competitive position

---

## Prompt Structure

### Factual Prompt (Direct Search)

**Format:**
```
"Tell me about {businessName} {locationQuery}{credibilityContext}. 
What do you know about them?"
```

**Customer Query Equivalent:**
- "tell me about [business]"
- "[business name] [location]"
- "what is [business]"

**Measurable Output:**
- Mention: Yes/No
- Knowledge: Response detail level
- Accuracy: Factual correctness

### Opinion Prompt (Reputation Check)

**Format:**
```
"Is {businessName} {locationQuery} a good {serviceContext}? 
What are people saying about them?"
```

**Customer Query Equivalent:**
- "is [business] good?"
- "[business] reviews"
- "[business] reputation"

**Measurable Output:**
- Mention: Yes/No
- Sentiment: Positive/Neutral/Negative
- Reputation: Public perception

### Recommendation Prompt (Local Search)

**Format:**
```
"What are the best {industryPlural} {locationQuery}? 
List the top 5 and rank them 1-5."
```

**Customer Query Equivalent:**
- "best [service] in [location]"
- "top [service] near me"
- "[service] recommendations [location]"

**Measurable Output:**
- Mention: Yes/No
- Rank Position: 1-5 (or null if not mentioned)
- Competitors: List of other businesses mentioned

---

## Measurement Methodology

### 1. Mention Detection

**Objective**: Binary yes/no - is the business mentioned?

**Method:**
- Fuzzy name matching (handles variations, partial names)
- Case-insensitive search
- Handles common suffixes (LLC, Inc, etc.)

**Example:**
```
Response: "Acme Corp is a well-known software company..."
Result: ✅ Mentioned = true
```

### 2. Ranking Position

**Objective**: Where does the business rank (1-5)?

**Method:**
- Parse numbered lists: "1. Business Name"
- Extract position from recommendation responses
- Null if not in top 5

**Example:**
```
Response: "Top 5:
1. TechCorp
2. Acme Corp
3. DataSystems"
Result: ✅ Rank Position = 2
```

### 3. Sentiment Analysis

**Objective**: Positive, neutral, or negative?

**Method:**
- Keyword analysis (positive/negative word counts)
- Context-aware sentiment detection
- Weighted scoring

**Example:**
```
Response: "Acme Corp has excellent reviews and is highly recommended..."
Result: ✅ Sentiment = Positive
```

### 4. Competitive Context

**Objective**: Who else is mentioned (competitors)?

**Method:**
- Extract business names from recommendation lists
- Filter out generic/placeholder names
- Count mentions alongside target business

**Example:**
```
Response: "Top 5: TechCorp, Acme Corp, DataSystems, CloudSoft, DevTools"
Result: ✅ Competitors = [TechCorp, DataSystems, CloudSoft, DevTools]
```

---

## Visibility Score Calculation

The visibility score combines all measurable elements:

```
Visibility Score = 
  (Mention Rate × 40%) +           // How often mentioned
  (Sentiment Score × 30%) +        // Reputation quality
  (Accuracy Score × 20%) +         // Information correctness
  (Ranking Score × 10%)            // Competitive position
```

### Example Calculation

**Business mentioned in:**
- 8/9 queries (89% mention rate)
- Average sentiment: 0.85 (positive)
- Average accuracy: 0.75
- Average rank: 2.5 (when mentioned)

**Score:**
```
(89 × 0.4) + (85 × 0.3) + (75 × 0.2) + (70 × 0.1) = 84.1
```

**Visibility Score: 84/100** ✅ High visibility

---

## Benefits of Customer Query Syntax

### 1. More Accurate Visibility Measurement

**Why:** LLMs respond differently to customer queries vs. analytical queries

- **Customer queries**: Natural, conversational → realistic responses
- **Analytical queries**: Formal, structured → may overstate knowledge

### 2. Better Competitive Analysis

**Why:** "Best [service] in [location]" matches real search behavior

- Customers actually search this way
- LLMs provide realistic competitive rankings
- More accurate market position assessment

### 3. Improved Mention Detection

**Why:** Natural queries produce natural responses

- LLMs more likely to mention businesses they actually know
- Less "hallucination" of generic responses
- Better distinction between known vs. unknown businesses

### 4. Real-World Relevance

**Why:** Measures visibility as customers experience it

- If customers search "best pizza in NYC", we test the same query
- Results reflect actual customer discovery patterns
- Visibility score correlates with real search visibility

---

## Implementation Details

### Prompt Generation Logic

```typescript
// Extract location context
locationQuery = location ? `in ${city}, ${state}` : '';

// Extract credibility from crawlData
credibilityContext = [
  founded ? `operating since ${founded}` : null,
  certifications ? `certified ${certifications.join(', ')}` : null,
  awards ? `awarded ${awards[0]}` : null,
].filter(Boolean).join(', ');

// Build customer-like queries
factual: `Tell me about ${name} ${locationQuery}${credibility ? ` (${credibility})` : ''}. What do you know about them?`
opinion: `Is ${name} ${locationQuery} a good ${service}? What are people saying about them?`
recommendation: `What are the best ${industry} ${locationQuery}? List the top 5 and rank them 1-5.`
```

### Response Analysis

```typescript
// Objective measurements
mentioned: detectMention(response, businessName)  // Boolean
sentiment: analyzeSentiment(response)             // Positive/Neutral/Negative
rankPosition: extractRankPosition(response)      // 1-5 or null
competitors: extractCompetitorMentions(response) // Array of names
```

---

## Example: Before vs. After

### Before (Formal/Analytical)

**Prompt:**
```
"What information do you have about Joe's Pizza located in New York, NY? 
Please provide factual details about their services, reputation, and any 
notable characteristics."
```

**Response:**
```
"Joe's Pizza is a restaurant establishment in New York. Based on available 
information, they appear to be a reputable local establishment..."
```

**Measurement:**
- Mentioned: ✅ Yes
- Sentiment: Neutral (generic response)
- Accuracy: Low (generic, no specific details)

### After (Customer Query Syntax)

**Prompt:**
```
"Tell me about Joe's Pizza in New York, NY (operating since 1975). 
What do you know about them?"
```

**Response:**
```
"Yes, I know about Joe's Pizza! They're a legendary New York pizza place 
that's been serving authentic slices since 1975. They're famous for their 
classic New York style pizza and have been featured in multiple food 
publications. Located in Greenwich Village, they're considered one of the 
best pizza spots in the city..."
```

**Measurement:**
- Mentioned: ✅ Yes
- Sentiment: Positive (specific, enthusiastic)
- Accuracy: High (specific details, correct information)
- Knowledge Depth: High (detailed response)

---

## Key Takeaways

1. **Customer Query Syntax**: Prompts now match how customers actually search
2. **Objective Measurement**: Responses enable quantitative visibility analysis
3. **Crawled Data Integration**: Credibility signals improve prompt effectiveness
4. **Real-World Relevance**: Visibility scores reflect actual customer discovery
5. **Better Accuracy**: Natural queries produce more accurate LLM responses

The redesigned prompts provide a more accurate, measurable assessment of local business visibility by emulating real customer search behavior.

