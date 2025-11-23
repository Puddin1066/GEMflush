# Publishing Development - Quick Start Guide

**Priority:** 🔴 **CRITICAL - Publishing Flow Must Work**

This guide provides a quick start for the systematic, programmatic development approach to fix the publishing flow.

---

## 🎯 Goal

**Automate the complete CFP flow (Crawl → Fingerprint → Publish) with 100% reliability for Pro tier users.**

---

## 🚀 Quick Start

### Step 1: Run Critical E2E Test

```bash
# Run the critical publishing flow test
npx playwright test tests/e2e/publishing-flow-critical.spec.ts --reporter=line
```

**Expected Result**: Test should pass. If it fails, note the error messages.

### Step 2: Analyze Terminal Logs

If tests fail, analyze terminal logs to identify errors:

```bash
# Analyze terminal logs (save output to file)
pnpm tsx scripts/analyze-terminal-logs.ts terminal-output.log --output error-report.md
```

**Output**: `error-report.md` with:
- Error categories (A/B/C)
- Priority levels (P0/P1/P2/P3)
- Suggested fixes
- Test cases to validate fixes

### Step 3: Fix Blockers (Category A - P0)

Fix errors in priority order:

1. **Wikidata Authentication** (P0)
   - Check `WIKIDATA_BOT_USERNAME` and `WIKIDATA_BOT_PASSWORD` environment variables
   - Add credential validation
   - Implement retry logic

2. **Database Constraints** (P0)
   - Verify `qid_cache` table has unique constraint
   - Run migrations if needed
   - Restart server

3. **Entity Conflicts** (P0)
   - Add existing entity detection
   - Implement update logic instead of create

### Step 4: Verify Fix

After each fix:

```bash
# Run unit tests for specific fix
npx playwright test tests/e2e/publishing-flow-critical.spec.ts

# Run full E2E suite
npx playwright test tests/e2e/
```

### Step 5: Track Progress

```bash
# Track publishing progress
pnpm tsx scripts/track-publishing-progress.ts --save
```

**Output**: 
- Progress report in `docs/development/PUBLISHING_PROGRESS.md`
- Commercial readiness percentage
- Test pass/fail counts

---

## 📋 Daily Workflow

1. **Morning**: Run E2E test suite
2. **Identify**: Top 3 blockers from test results
3. **Fix**: Implement fixes one at a time
4. **Verify**: Run tests after each fix
5. **Track**: Update progress tracker
6. **Evening**: Run full suite, measure progress

---

## 🔍 Error Categories

### Category A: Publishing Blockers (Fix First)
- Wikidata authentication failures
- Database constraint errors
- Entity creation conflicts
- Critical API failures

### Category B: Data Quality (Fix Second)
- LLM parsing errors
- Property extraction failures
- Missing required properties
- Low property counts

### Category C: UX Polish (Fix Third)
- Status message errors
- UI component bugs
- Data display issues

---

## 📊 Success Criteria

✅ **Publishing Flow Works**: 100% success rate for Pro tier users  
✅ **All Tests Pass**: E2E, integration, and unit tests  
✅ **Commercial Ready**: Platform ready for production launch

---

## 📚 Documentation

- **Full Strategy**: `docs/development/SYSTEMATIC_PUBLISHING_DEVELOPMENT_STRATEGY.md`
- **Ideal Data Flow**: `docs/architecture/IDEAL_DATA_FLOW.md`
- **Progress Tracking**: `docs/development/PUBLISHING_PROGRESS.md`

---

## 🛠️ Tools

- **Log Analyzer**: `scripts/analyze-terminal-logs.ts`
- **Progress Tracker**: `scripts/track-publishing-progress.ts`
- **Critical Test**: `tests/e2e/publishing-flow-critical.spec.ts`

---

## 🆘 Troubleshooting

### Test Fails: "Login failed"
- Check environment variables: `WIKIDATA_BOT_USERNAME`, `WIKIDATA_BOT_PASSWORD`
- Verify credentials are valid
- Check network connectivity to Wikidata

### Test Fails: "ON CONFLICT" error
- Run database migrations: `pnpm drizzle-kit push`
- Restart development server
- Verify `qid_cache` table has unique constraint

### Test Fails: "Entity already exists"
- Implement existing entity detection
- Use `updateEntity()` instead of `createEntity()`

---

## 📞 Next Steps

1. Read the full strategy document
2. Run the critical E2E test
3. Analyze any failures
4. Fix blockers in priority order
5. Track progress daily

**Goal**: Reach 100% commercial readiness for publishing flow.

