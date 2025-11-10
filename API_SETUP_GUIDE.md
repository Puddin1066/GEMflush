# API Setup Guide for GEMflush

This guide helps you configure the external APIs needed for full GEMflush functionality.

## Current Status

✅ **Configured:**
- PostgreSQL Database
- Stripe Payments
- Resend Email
- Google Search API Key

⚠️ **Missing:**
- OpenRouter API Key (for LLM queries)
- Google Search Engine ID (for notability checks)

---

## 1. OpenRouter API (Required for LLM Features)

**What it enables:**
- LLM-enhanced web crawling (extract 20-30 business fields)
- LLM-suggested Wikidata properties (15-25 properties vs 5-6)
- LLM fingerprinting (visibility scoring across 5 LLMs)
- Quality scoring and completeness analysis

**Setup:**

1. Go to https://openrouter.ai/
2. Sign up/login
3. Go to "Keys" tab
4. Create a new API key
5. Add to `.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Cost:**
- ~$0.08-0.12 per business (crawl + entity building + fingerprinting)
- GPT-4 Turbo: ~$0.01 per 1K tokens
- Claude 3 Opus: ~$0.015 per 1K tokens
- Usage is pay-as-you-go, no monthly fees

**Models used:**
- GPT-4 Turbo (OpenAI) - main entity building
- Claude 3 Opus (Anthropic) - fingerprinting
- Gemini Pro (Google) - fingerprinting
- Llama 3 70B (Meta) - fingerprinting
- Perplexity 70B - fingerprinting

---

## 2. Google Custom Search Engine ID (Required for Notability)

**What it enables:**
- Notability checking for Wikidata publishing
- Find 3+ "serious" references per Wikidata policy
- LLM-assessed reference quality
- Compliance with Wikidata inclusion standards

**Setup:**

### Step 1: Create Custom Search Engine

1. Go to https://programmablesearchengine.google.com/
2. Click "Add" or "Create"
3. Configure:
   - **Sites to search:** Leave empty or add `*` for entire web
   - **Name:** GEMflush Business Notability Checker
   - **Language:** English
4. Click "Create"
5. Copy the **Search engine ID** (looks like `a1b2c3d4e5f6g7h8i`)

### Step 2: Add to Environment

Add to `.env`:

```bash
GOOGLE_SEARCH_ENGINE_ID=your-cx-id-here
```

**Notes:**
- You already have `GOOGLE_SEARCH_API_KEY` configured ✅
- Free tier: 100 queries/day
- Paid: $5 per 1,000 queries (after free tier)
- Cost per business: ~3-5 queries = $0.015-0.025

---

## 3. Complete `.env` Configuration

Your `.env` should include:

```bash
# Database
POSTGRES_URL=postgresql://JJR@localhost:5432/saas_starter

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
BASE_URL=http://localhost:3000
AUTH_SECRET=...

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM=GEMflush <noreply@gemflush.com>
SUPPORT_EMAIL=support@gemflush.com

# LLM Services (ADD THESE)
OPENROUTER_API_KEY=sk-or-v1-...           # ← ADD THIS

# Google Search (ADD ENGINE ID)
GOOGLE_SEARCH_API_KEY=AIzaSyBsEXNDk6n05faaJXbA6dq4oIMQ8Mzt190  # ✅ Already set
GOOGLE_SEARCH_ENGINE_ID=...               # ← ADD THIS
```

---

## Testing

### Test with Mock Data (Current)

```bash
pnpm tsx scripts/test-real-data-flow.ts https://stripe.com
```

### Test with Real APIs (After Setup)

```bash
pnpm tsx scripts/test-real-data-flow.ts https://openai.com
```

**Expected output with all APIs:**
- ✅ Phase 1: Real web crawling with LLM extraction
- ✅ Phase 2: Entity building with 15-25 properties
- ✅ Phase 3: Notability checking with Google Search
- ✅ Phase 4: LLM fingerprinting across 5 models

---

## Cost Estimates

### Per Business (Full Pipeline)

| Service | Queries | Cost/Query | Total |
|---------|---------|------------|-------|
| OpenRouter (Crawl) | 1 | $0.03 | $0.03 |
| OpenRouter (Entity) | 1 | $0.02 | $0.02 |
| OpenRouter (Notability) | 1 | $0.02 | $0.02 |
| OpenRouter (Fingerprint) | 15 | $0.003 | $0.045 |
| Google Search | 3-5 | $0.005 | $0.015-0.025 |
| **TOTAL** | | | **$0.13-0.16** |

### Monthly (100 businesses)

- **OpenRouter:** ~$11.50
- **Google Search:** ~$2.00
- **Total:** ~$13.50/month

### Free Tier Options

- **OpenRouter:** $5 free credit on signup
- **Google Search:** 100 queries/day free (3,000/month)
- **Can process ~30-33 businesses/month entirely free**

---

## Security Best Practices

1. **Never commit `.env` to git** (already in `.gitignore`)
2. **Use environment variables in production** (Vercel auto-loads them)
3. **Rotate keys regularly** (every 90 days recommended)
4. **Monitor usage** via dashboard:
   - OpenRouter: https://openrouter.ai/activity
   - Google: https://console.cloud.google.com/apis/dashboard

---

## Troubleshooting

### OpenRouter Not Working

```bash
# Test the key
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

Should return list of available models.

### Google Search Not Working

```bash
# Test the API
curl "https://www.googleapis.com/customsearch/v1?key=$GOOGLE_SEARCH_API_KEY&cx=$GOOGLE_SEARCH_ENGINE_ID&q=test"
```

Should return search results JSON.

### Still Using Mocks?

Check the console output:
- `[OpenRouter] API key not configured. Using mock responses.` = Missing key
- `[Google Search] Missing credentials` = Missing Engine ID

---

## Next Steps

1. **Add OpenRouter key** → Enable LLM features
2. **Add Google Search Engine ID** → Enable notability checks
3. **Run test script** → Verify everything works
4. **Deploy to Vercel** → Add keys to Vercel environment variables
5. **Monitor usage** → Track costs via API dashboards

---

## Questions?

- **OpenRouter docs:** https://openrouter.ai/docs
- **Google Search docs:** https://developers.google.com/custom-search/v1/overview
- **Wikidata notability:** https://www.wikidata.org/wiki/Wikidata:Notability

