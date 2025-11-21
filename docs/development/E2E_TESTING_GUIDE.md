# End-to-End Testing Guide

## Overview

The E2E test suite provides comprehensive testing of the Gemflush platform's user experience, following SOLID and DRY principles for maintainable, iterative development.

## Test Structure

### 1. API-Based E2E Tests (`scripts/e2e-test.ts`)

Tests the complete CFP flow via API calls. Fast and reliable for CI/CD.

**Features:**
- Tests all CFP steps (Crawl → Fingerprint → Publish)
- Validates data integrity
- Checks error handling
- Verifies competitive intelligence metrics
- Automatic cleanup

**Usage:**
```bash
# Run with default test business
tsx scripts/e2e-test.ts

# Run with custom business URL
tsx scripts/e2e-test.ts --business-url=https://example.com

# Skip cleanup (keep test data)
tsx scripts/e2e-test.ts --skip-cleanup

# Verbose output
tsx scripts/e2e-test.ts --verbose
```

### 2. Browser-Based E2E Tests (`scripts/e2e-test-browser.ts`)

Template for browser automation tests. Tests actual UI interactions.

**Status:** Template (requires Playwright/Puppeteer setup)

**Future Implementation:**
- Navigate through UI
- Click buttons and fill forms
- Verify visual elements
- Test responsive design
- Screenshot comparison

## Test Coverage

### ✅ Core Functionality Tests

1. **Dashboard Loads**
   - Verifies dashboard API returns data
   - Checks required fields exist

2. **Business Creation**
   - Creates business via API
   - Validates response structure
   - Stores business ID for subsequent tests

3. **CFP Process Execution**
   - Triggers CFP process
   - Polls status until completion
   - Verifies final status (published/crawled)

4. **Status Indicators Accuracy**
   - Validates status values
   - Checks error messages when status is 'error'

5. **Fingerprint Data Exists**
   - Verifies fingerprint API returns data
   - Validates visibility score format

6. **Competitive Intelligence Data**
   - Validates competitor names (no action phrases)
   - Verifies market shares sum to ~100%
   - Checks for duplicate competitors

7. **Wikidata Publication**
   - Validates QID format if present
   - Checks entity structure

8. **Error Handling**
   - Tests invalid inputs
   - Verifies appropriate error responses

## SOLID Principles Applied

### Single Responsibility
- Each test function tests one specific aspect
- Test helpers have single, focused purposes
- Logger handles only logging concerns

### Open/Closed
- Easy to extend with new test cases
- Test structure is open for extension, closed for modification
- New tests can be added without changing existing ones

### Dependency Inversion
- Tests depend on abstractions (test helpers)
- Configuration is injected, not hardcoded
- Easy to mock dependencies for unit testing

## DRY Principles Applied

### Reusable Test Helpers
- `TestLogger`: Centralized logging
- `TestAssertions`: Reusable assertion methods
- `TestConfig`: Shared configuration

### Centralized Test Data
- `TEST_BUSINESSES`: Shared test business URLs
- Configuration parsed once, used throughout

### Shared Utilities
- Error handling patterns
- Timeout management
- Result aggregation

## Iterative Development Workflow

### 1. Run Tests Before Changes
```bash
tsx scripts/e2e-test.ts --verbose
```

### 2. Make Code Changes
- Implement feature/fix
- Follow SOLID and DRY principles

### 3. Run Tests After Changes
```bash
tsx scripts/e2e-test.ts --verbose
```

### 4. Debug Failures
- Check `test-results.json` for detailed results
- Review error messages
- Use `--verbose` flag for detailed logging

### 5. Iterate
- Fix issues
- Re-run tests
- Continue until all tests pass

## Test Results

Results are saved to `test-results.json` with:
- Test names and outcomes
- Error messages for failures
- Duration for each test
- Overall summary

## Debugging Tips

### 1. Use Verbose Mode
```bash
tsx scripts/e2e-test.ts --verbose
```
Shows detailed logging for each step.

### 2. Skip Cleanup
```bash
tsx scripts/e2e-test.ts --skip-cleanup
```
Keeps test data for manual inspection.

### 3. Check Test Results File
```bash
cat test-results.json | jq '.results[] | select(.passed == false)'
```
View only failed tests.

### 4. Test Individual Components
Modify the test file to run only specific tests:
```typescript
// Comment out other tests
await this.runTest('CFP Process Execution', () => this.testCFPProcess());
```

## Extending Tests

### Adding a New Test

1. Add test method to `E2ETestRunner`:
```typescript
async testNewFeature(): Promise<void> {
  // Test implementation
  TestAssertions.assert(condition, 'Error message');
}
```

2. Add to test sequence in `runAllTests()`:
```typescript
await this.runTest('New Feature', () => this.testNewFeature());
```

### Adding Browser Tests

1. Install Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

2. Extend `BrowserE2ETestRunner` with actual browser automation

3. Use page object pattern for maintainability

## Best Practices

1. **Keep Tests Independent**
   - Each test should be able to run in isolation
   - Use cleanup to remove test data

2. **Use Meaningful Assertions**
   - Clear error messages
   - Specific conditions checked

3. **Handle Timeouts Gracefully**
   - Long-running operations (like CFP) need longer timeouts
   - Poll for completion rather than fixed waits

4. **Test Error Cases**
   - Invalid inputs
   - Missing data
   - API failures

5. **Maintain Test Data**
   - Use realistic test data
   - Keep test businesses updated

## CI/CD Integration

Add to your CI pipeline:
```yaml
# .github/workflows/e2e.yml
- name: Run E2E Tests
  run: |
    npm run dev &
    sleep 10
    tsx scripts/e2e-test.ts
```

## Troubleshooting

### Tests Timeout
- Increase timeout for specific tests
- Check if dev server is running
- Verify API endpoints are accessible

### Tests Fail Intermittently
- Add retry logic for flaky operations
- Increase wait times
- Check for race conditions

### Cleanup Fails
- Use `--skip-cleanup` to debug
- Manually clean up test data
- Check database permissions

## Future Enhancements

1. **Visual Regression Testing**
   - Screenshot comparison
   - UI component testing

2. **Performance Testing**
   - Measure CFP execution time
   - Track API response times

3. **Accessibility Testing**
   - WCAG compliance
   - Screen reader compatibility

4. **Cross-Browser Testing**
   - Chrome, Firefox, Safari
   - Mobile browsers

5. **Load Testing**
   - Multiple concurrent users
   - Stress testing

