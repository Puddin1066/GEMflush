# Publishing Development - Quick Reference

**Quick commands and references for systematic publishing development**

---

## 🚀 Quick Start Commands

### Run Critical Test
```bash
npx playwright test tests/e2e/publishing-flow-critical.spec.ts --reporter=line
```

### Analyze Terminal Logs
```bash
# Save terminal output to file first, then:
pnpm tsx scripts/analyze-terminal-logs.ts terminal-output.log --output error-report.md
```

### Track Progress
```bash
pnpm tsx scripts/track-publishing-progress.ts --save
```

---

## 🔧 Common Fixes

### Fix Authentication Issues
1. Check environment variables:
   ```bash
   echo $WIKIDATA_BOT_USERNAME
   echo $WIKIDATA_BOT_PASSWORD
   ```

2. Set in `.env` file:
   ```bash
   WIKIDATA_BOT_USERNAME=YourBot@YourBot
   WIKIDATA_BOT_PASSWORD=your_bot_password
   ```

3. Restart dev server

### Fix Database Constraint Issues
```bash
# Run migrations
pnpm drizzle-kit push

# Restart server
pnpm dev
```

### Fix Entity Conflicts
- See `docs/development/P0_FIXES_IMPLEMENTATION.md` - Fix #3

---

## 📊 Error Categories

### Category A (P0) - Publishing Blockers
- Wikidata authentication failures
- Database constraint errors
- Entity creation conflicts

### Category B (P1) - Data Quality
- LLM JSON parsing errors
- Property extraction failures
- Missing required properties

### Category C (P2) - UX Polish
- Status message errors
- UI component bugs

---

## 📁 Key Files

### Tests
- `tests/e2e/publishing-flow-critical.spec.ts` - Critical E2E test
- `tests/e2e/wikidata-publishing-flow.spec.ts` - Full publishing flow

### Services
- `lib/wikidata/client.ts` - Wikidata API client
- `lib/wikidata/service.ts` - Publishing service
- `lib/wikidata/sparql.ts` - QID resolution

### Scripts
- `scripts/analyze-terminal-logs.ts` - Log analyzer
- `scripts/track-publishing-progress.ts` - Progress tracker

---

## 🐛 Common Errors & Solutions

### "Login failed: Failed"
- **Cause:** Missing/invalid credentials
- **Fix:** Set `WIKIDATA_BOT_USERNAME` and `WIKIDATA_BOT_PASSWORD`

### "ON CONFLICT specification"
- **Cause:** Database constraint missing
- **Fix:** Run `pnpm drizzle-kit push` and restart server

### "Item already has label"
- **Cause:** Entity exists in Wikidata
- **Fix:** Implement existing entity detection (Fix #3)

### "Unexpected token 'I', not valid JSON"
- **Cause:** LLM response not JSON
- **Fix:** Improve JSON parsing (P1 fix)

---

## 📈 Progress Tracking

### Check Commercial Readiness
```bash
pnpm tsx scripts/track-publishing-progress.ts
```

### View Progress Report
```bash
cat docs/development/PUBLISHING_PROGRESS.md
```

---

## 🔄 Development Workflow

1. **Run test** → Identify error
2. **Analyze logs** → Get suggested fix
3. **Implement fix** → One at a time
4. **Verify** → Run test again
5. **Track** → Update progress

---

## 📚 Documentation

- **Full Strategy:** `docs/development/SYSTEMATIC_PUBLISHING_DEVELOPMENT_STRATEGY.md`
- **Implementation Guide:** `docs/development/P0_FIXES_IMPLEMENTATION.md`
- **Ideal Data Flow:** `docs/architecture/IDEAL_DATA_FLOW.md`
- **Quick Start:** `docs/development/PUBLISHING_DEVELOPMENT_QUICK_START.md`

---

**Last Updated:** January 2025

