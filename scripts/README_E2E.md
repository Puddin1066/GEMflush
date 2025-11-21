# E2E Test Quick Reference

## Quick Start

```bash
# Make sure dev server is running first
npm run dev

# In another terminal, run the E2E test
npm run test:e2e:api

# With verbose output
npm run test:e2e:api:verbose

# Keep test data for inspection
npm run test:e2e:api:skip-cleanup
```

## What It Tests

1. ✅ Dashboard API loads
2. ✅ Business creation via API
3. ✅ CFP process (Crawl → Fingerprint → Publish)
4. ✅ Status indicators accuracy
5. ✅ Fingerprint data exists
6. ✅ Competitive intelligence (validates competitor names, market shares)
7. ✅ Wikidata publication
8. ✅ Error handling

## Test Results

Results are saved to `test-results.json` in the project root.

View failed tests:
```bash
cat test-results.json | jq '.results[] | select(.passed == false)'
```

## Debugging

### Test is failing?
1. Check if dev server is running: `http://localhost:3000`
2. Use `--verbose` flag for detailed logs
3. Use `--skip-cleanup` to inspect test data
4. Check `test-results.json` for error details

### Test times out?
- CFP process can take 1-5 minutes
- Test automatically waits up to 5 minutes for CFP completion
- Check terminal logs for CFP progress

### Need to test specific business?
```bash
tsx scripts/e2e-test.ts --business-url=https://your-business.com
```

## Iterative Development Workflow

1. **Before making changes:**
   ```bash
   npm run test:e2e:api:verbose
   ```

2. **Make your code changes**

3. **After changes:**
   ```bash
   npm run test:e2e:api:verbose
   ```

4. **Debug failures:**
   - Review `test-results.json`
   - Check error messages
   - Fix issues
   - Re-run tests

5. **Repeat until all tests pass**

## Extending Tests

See `docs/development/E2E_TESTING_GUIDE.md` for detailed documentation on:
- Adding new test cases
- Browser automation setup
- CI/CD integration
- Best practices

