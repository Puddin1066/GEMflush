# LLM Fingerprinting Performance Optimization

## Overview
The LLM fingerprinter queries **5 different LLM models** with **3 different prompt types**, resulting in **15 total API calls** per business. This document explains the performance optimization from sequential to parallel execution.

## Performance Comparison

| Execution Mode | Time | Speedup | Use Case |
|----------------|------|---------|----------|
| **Sequential (Old)** | 45s | 1x (baseline) | ❌ Deprecated |
| **Batched (5)** | 9s | 5x faster | ⚠️ Rate-limited scenarios |
| **Parallel (New Default)** | 3s | **15x faster** | ✅ Production |

### Why the Speedup?
**Sequential:** Each API call waits for the previous one to complete.
```
Query 1 → [3s] → Query 2 → [3s] → Query 3 → ... → Query 15
Total: 15 × 3s = 45s
```

**Parallel:** All API calls execute simultaneously.
```
Query 1 → [3s] ↓
Query 2 → [3s] ↓
Query 3 → [3s] ↓
...           ↓
Query 15 → [3s] ↓
Total: max(3s) = 3s
```

## Implementation

### Before (Sequential)
```typescript
for (const model of models) {
  for (const [promptType, prompt] of Object.entries(prompts)) {
    const response = await openRouterClient.query(model, prompt);
    // Process response...
  }
}
// Time: 45 seconds
```

### After (Parallel)
```typescript
const tasks = models.flatMap(model =>
  Object.entries(prompts).map(([promptType, prompt]) => ({
    model,
    promptType,
    prompt,
  }))
);

const results = await Promise.allSettled(
  tasks.map(task => this.executeQuery(task, businessName))
);
// Time: 3 seconds
```

## Usage Examples

### 1. Parallel (Default - Recommended)
```typescript
import { LLMFingerprinter } from '@/lib/llm/fingerprinter';

const fingerprinter = new LLMFingerprinter();
const analysis = await fingerprinter.fingerprint(business);
```
- **Speed:** ~3-5 seconds
- **Use:** Production, real-time analysis
- **Pros:** Fastest execution
- **Cons:** May hit rate limits on some providers

### 2. Batched (Rate-Limited)
```typescript
const analysis = await fingerprinter.fingerprint(business, {
  parallel: true,
  batchSize: 5,
});
```
- **Speed:** ~9 seconds (5 queries at a time, 3 batches)
- **Use:** High-volume processing, strict rate limits
- **Pros:** Controlled concurrency, prevents throttling
- **Cons:** Slower than full parallel

### 3. Sequential (Legacy)
```typescript
const analysis = await fingerprinter.fingerprint(business, {
  parallel: false,
});
```
- **Speed:** ~45-60 seconds
- **Use:** Development/debugging only
- **Pros:** Easier to debug individual queries
- **Cons:** 15x slower than parallel

## Technical Details

### Error Handling
Uses `Promise.allSettled()` instead of `Promise.all()` to ensure individual query failures don't break the entire analysis:

```typescript
const results = await Promise.allSettled(
  tasks.map(task => this.executeQuery(task, businessName))
);

// Each result is either:
// { status: 'fulfilled', value: LLMResult }
// { status: 'rejected', reason: Error }
```

### Batching Strategy
For rate-limited scenarios, queries are split into batches:

```typescript
for (let i = 0; i < tasks.length; i += batchSize) {
  const batch = tasks.slice(i, i + batchSize);
  await Promise.allSettled(
    batch.map(task => this.executeQuery(task, businessName))
  );
}
```

With `batchSize: 5` and 15 total queries:
- **Batch 1:** Queries 1-5 (parallel) → 3s
- **Batch 2:** Queries 6-10 (parallel) → 3s
- **Batch 3:** Queries 11-15 (parallel) → 3s
- **Total:** 9s

### Performance Logging
The fingerprinter now logs execution details:

```
Starting LLM fingerprint for business: Mother Earth Wellness
Mode: Parallel, Batch size: 15
Total queries: 15 (5 models × 3 prompts)
Executing all 15 queries in parallel...
✓ Completed in 3.2s
```

## Models Tested

1. **openai/gpt-4-turbo** - OpenAI's latest GPT-4
2. **anthropic/claude-3-opus** - Anthropic's Claude 3
3. **google/gemini-pro** - Google's Gemini
4. **meta-llama/llama-3-70b-instruct** - Meta's Llama 3
5. **perplexity/pplx-70b-online** - Perplexity's online model

## Prompt Types

1. **Factual**: "What information do you have about {business}?"
2. **Opinion**: "Would you say {business} is reputable?"
3. **Recommendation**: "Recommend top 5 {category} in {location}"

## Cost Analysis

| Execution Mode | Time | Cost (est.) | Cost per Second |
|----------------|------|-------------|-----------------|
| Sequential | 45s | $0.50 | $0.011/s |
| Batched (5) | 9s | $0.50 | $0.056/s |
| Parallel | 3s | $0.50 | $0.167/s |

**Note:** Total API cost remains the same (~$0.50 per fingerprint), but parallel execution reduces wall-clock time by 93%.

## Real-World Impact

### Before Optimization
- **Single fingerprint:** 45 seconds
- **10 businesses:** 7.5 minutes
- **100 businesses:** 75 minutes (1.25 hours)

### After Optimization
- **Single fingerprint:** 3 seconds
- **10 businesses:** 30 seconds
- **100 businesses:** 5 minutes

**Result:** 15x faster, enabling real-time analysis at scale.

## Rate Limiting Considerations

### No Rate Limits (Default)
Most LLM providers (OpenAI, Anthropic, etc.) support high concurrent request rates for paid tiers:
```typescript
await fingerprinter.fingerprint(business); // parallel: true (default)
```

### With Rate Limits
If you encounter `429 Too Many Requests` errors, use batching:
```typescript
await fingerprinter.fingerprint(business, { batchSize: 5 });
```

### Provider-Specific Limits
- **OpenAI:** 3,500 requests/minute (tier 4)
- **Anthropic:** 4,000 requests/minute (tier 3)
- **Google:** 1,000 requests/minute
- **Meta/Perplexity:** Varies by tier

**Recommendation:** Start with parallel (default), only add batching if you hit rate limits.

## Testing

Run the performance comparison demo:
```bash
pnpm tsx scripts/demo-llm-performance.ts
```

This demonstrates:
1. Sequential execution (45s)
2. Parallel execution (3s)
3. Batched execution (9s)
4. Side-by-side performance comparison

## Backward Compatibility

✅ **Fully backward compatible**
- Parallel execution is the default
- Existing code continues to work
- No breaking changes

```typescript
// Old code (still works, now 15x faster!)
const analysis = await fingerprinter.fingerprint(business);
```

## Recommendations

### ✅ Use Parallel (Default)
For most use cases, stick with the default parallel execution:
```typescript
await fingerprinter.fingerprint(business);
```

### ⚠️ Use Batched for Scale
If processing hundreds of businesses, consider batching:
```typescript
for (const business of businesses) {
  await fingerprinter.fingerprint(business, { batchSize: 5 });
}
```

### ❌ Avoid Sequential
Only use sequential mode for debugging:
```typescript
// Only for development/debugging
await fingerprinter.fingerprint(business, { parallel: false });
```

## Summary

The LLM fingerprinter now uses **parallel execution by default**, reducing fingerprinting time from **45 seconds to 3 seconds** — a **15x speedup**. This enables real-time business visibility analysis at scale.

**Key Takeaways:**
- 🚀 15x faster with parallel execution
- ✅ Backward compatible (no breaking changes)
- ⚡ Production-ready for real-time analysis
- 🎯 Optional batching for rate-limited scenarios
- 🧪 Comprehensive error handling with Promise.allSettled()

