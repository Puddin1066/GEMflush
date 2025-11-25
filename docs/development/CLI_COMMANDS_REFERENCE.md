# CLI Commands Reference

**Date:** January 2025  
**Purpose:** Quick reference for CLI tools used in testing and debugging  
**Status:** 🟢 Active Reference

---

## 📊 Quick Reference

### PostgreSQL/Supabase

```bash
# Connect to database
psql $DATABASE_URL

# Connect via Supabase CLI
supabase db connect

# Execute SQL query
psql $DATABASE_URL -c "SELECT * FROM businesses LIMIT 10"

# Open Drizzle Studio (GUI)
pnpm db:studio

# Push schema changes
pnpm db:push

# Generate migrations
pnpm db:generate

# Check database version
psql $DATABASE_URL -c "SELECT version();"

# List all tables
psql $DATABASE_URL -c "\dt"

# Describe table structure
psql $DATABASE_URL -c "\d businesses"

# List indexes
psql $DATABASE_URL -c "\di"
```

### Stripe

```bash
# Login to Stripe CLI
stripe login

# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated

# List resources
stripe products list
stripe customers list
stripe prices list

# Create test resources
stripe customers create --email test@example.com
stripe products create --name "Pro Plan"
stripe prices create --product prod_xxx --unit-amount 4900 --currency usd

# View webhook logs
stripe logs tail

# Replay webhook event
stripe events resend evt_xxx
```

### Wikidata

```bash
# Test login (test.wikidata.org)
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=login" \
  -d "lgname=YourBot" \
  -d "lgpassword=YourPassword" \
  -d "format=json"

# Create test entity
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=wbcreateentity" \
  -d "new=item" \
  -d "data={\"labels\":{\"en\":{\"language\":\"en\",\"value\":\"Test Entity\"}}}" \
  -d "format=json"

# Query entity
curl "https://test.wikidata.org/wiki/Special:EntityData/Q12345.json"

# SPARQL query
curl -G https://query.wikidata.org/sparql \
  --data-urlencode "query=SELECT * WHERE { ?s ?p ?o } LIMIT 10" \
  --header "Accept: application/sparql-results+json"
```

### OpenRouter (via curl)

```bash
# Test API call
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4",
    "messages": [{"role": "user", "content": "Test"}]
  }'

# Save response
curl ... > response.json

# Format JSON response
curl ... | jq '.'
```

---

## 🧪 Testing Workflows

### Database Debugging

```bash
# 1. Connect and inspect
psql $DATABASE_URL

# 2. Check recent data
SELECT * FROM businesses ORDER BY created_at DESC LIMIT 5;

# 3. Check fingerprints
SELECT id, business_id, visibility_score 
FROM llm_fingerprints 
ORDER BY created_at DESC 
LIMIT 10;

# 4. Check crawl jobs
SELECT id, business_id, status, error_message 
FROM crawl_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Stripe Testing

```bash
# 1. Start webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 2. In another terminal, run your app
pnpm dev

# 3. Trigger test events as needed
stripe trigger checkout.session.completed

# 4. Check webhook logs
stripe logs tail
```

### Wikidata Testing

```bash
# 1. Test login
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=login&lgname=$USERNAME&lgpassword=$PASSWORD&format=json"

# 2. Verify entity exists
curl "https://test.wikidata.org/wiki/Special:EntityData/Q12345.json" | jq

# 3. Query SPARQL
curl -G https://query.wikidata.org/sparql \
  --data-urlencode "query=SELECT ?item WHERE { ?item wdt:P31 wd:Q4830453 } LIMIT 10"
```

---

## 🔧 Development Workflows

### Database Management

```bash
# View schema in GUI
pnpm db:studio

# Push schema changes
pnpm db:push

# Generate migration from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

### Environment Setup

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variables
echo $DATABASE_URL
echo $STRIPE_SECRET_KEY
echo $OPENROUTER_API_KEY

# Check Stripe CLI login
stripe config --list
```

---

## 🐛 Debugging Scenarios

### Scenario 1: Database Connection Issue

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection string format
echo $DATABASE_URL | grep -E "postgresql://"

# Test with different connection
psql "postgresql://user:pass@host:port/db"

# Check Supabase connection pooler
# Use port 6543 for pooler, 5432 for direct
```

### Scenario 2: Stripe Webhook Not Received

```bash
# Check webhook listener is running
stripe listen --forward-to localhost:3000/api/stripe/webhook

# View webhook logs
stripe logs tail

# Trigger test event
stripe trigger checkout.session.completed

# Check server logs for incoming requests
```

### Scenario 3: Wikidata Publishing Failure

```bash
# Test login credentials
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=login&lgname=$USER&lgpassword=$PASS"

# Check entity exists
curl "https://test.wikidata.org/wiki/Special:EntityData/Q12345.json"

# Test entity creation manually
curl -X POST https://test.wikidata.org/w/api.php \
  -d "action=wbcreateentity&new=item&data={...}"
```

---

## 📚 Related Documentation

- **API_CLI_TESTING_STRATEGY.md** - Complete API/CLI testing strategy
- **TEST_DATABASE_STRATEGY.md** - Database testing approach

---

**Quick Access:** Bookmark this page for quick CLI command reference during development and debugging.


