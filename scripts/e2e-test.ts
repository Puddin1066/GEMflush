#!/usr/bin/env tsx
/**
 * End-to-End User Experience Test
 * 
 * Tests the complete CFP (Crawl → Fingerprint → Publish) flow and UI interactions.
 * Designed for iterative development and debugging.
 * 
 * SOLID Principles:
 * - Single Responsibility: Each test function tests one aspect
 * - Open/Closed: Easy to extend with new test cases
 * - Dependency Inversion: Uses abstractions (test helpers)
 * 
 * DRY Principles:
 * - Reusable test helpers
 * - Centralized assertions
 * - Shared test data
 * 
 * Usage:
 *   tsx scripts/e2e-test.ts [--business-url=<url>] [--skip-cleanup] [--verbose] [--session-cookie=<cookie>]
 * 
 * Examples:
 *   # Run without authentication (tests will be skipped)
 *   tsx scripts/e2e-test.ts
 *   
 *   # Run with authentication (full E2E test)
 *   tsx scripts/e2e-test.ts --session-cookie=<cookie-from-browser>
 *   
 *   # Or set environment variable
 *   E2E_TEST_SESSION_COOKIE=<cookie> tsx scripts/e2e-test.ts
 *   
 *   # Custom business URL
 *   tsx scripts/e2e-test.ts --business-url=https://brownphysicians.org
 *   
 *   # Skip cleanup and verbose output
 *   tsx scripts/e2e-test.ts --skip-cleanup --verbose
 * 
 * Authentication:
 *   To get a session cookie:
 *   1. Log in to the app in your browser
 *   2. Open DevTools → Application → Cookies
 *   3. Copy the 'session' cookie value
 *   4. Use: --session-cookie=<value>
 *   
 *   Or use the auth helper:
 *   tsx scripts/e2e-test-auth-helper.ts
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Support both CommonJS and ES modules
let __dirname: string;
try {
  // Try CommonJS first
  if (typeof require !== 'undefined' && require.main) {
    __dirname = dirname(require.main.filename || process.argv[1] || __filename || '');
  } else {
    throw new Error('Not CommonJS');
  }
} catch {
  // Fall back to ES modules
  const __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
}

// ============================================================================
// Configuration & Types
// ============================================================================

interface TestConfig {
  baseUrl: string;
  businessUrl: string;
  skipCleanup: boolean;
  verbose: boolean;
  timeout: number;
  sessionCookie?: string; // Optional session cookie for authenticated requests
}

interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  error?: string;
  duration: number;
  details?: Record<string, any>;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

// ============================================================================
// Test Helpers (DRY: Reusable utilities)
// ============================================================================

class TestLogger {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  log(message: string, data?: any) {
    if (this.verbose || data) {
      console.log(`[LOG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  info(message: string) {
    console.log(`ℹ️  ${message}`);
  }

  success(message: string) {
    console.log(`✅ ${message}`);
  }

  error(message: string, error?: any) {
    console.error(`❌ ${message}`, error ? error.message : '');
  }

  warn(message: string) {
    console.warn(`⚠️  ${message}`);
  }

  section(title: string) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${title}`);
    console.log('='.repeat(80));
  }
}

class TestAssertions {
  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  static assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: Expected ${expected}, got ${actual}${message ? ` - ${message}` : ''}`
      );
    }
  }

  static assertContains(text: string, substring: string, message?: string): void {
    if (!text.includes(substring)) {
      throw new Error(
        `Assertion failed: "${text}" does not contain "${substring}"${message ? ` - ${message}` : ''}`
      );
    }
  }

  static assertExists(value: any, message?: string): void {
    if (value === null || value === undefined) {
      throw new Error(`Assertion failed: Value is null/undefined${message ? ` - ${message}` : ''}`);
    }
  }
}

// ============================================================================
// Test Data (DRY: Centralized test data)
// ============================================================================

const TEST_BUSINESSES = {
  default: 'https://brownphysicians.org',
  medical: 'https://brownphysicians.org',
  // Add more test businesses as needed
};

// ============================================================================
// Test Functions (SOLID: Single Responsibility)
// ============================================================================

class E2ETestRunner {
  private config: TestConfig;
  private logger: TestLogger;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.logger = new TestLogger(config.verbose);
  }

  /**
   * Run a single test with error handling
   */
  async runTest(
    name: string,
    testFn: () => Promise<void>,
    timeout: number = this.config.timeout
  ): Promise<TestResult> {
    const startTime = Date.now();
    this.logger.info(`Running: ${name}`);

    try {
      await Promise.race([
        testFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
        ),
      ]);

      const duration = Date.now() - startTime;
      this.logger.success(`${name} (${duration}ms)`);
      const result: TestResult = { name, passed: true, duration };
      this.results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if test was skipped (auth required or missing prerequisites)
      if (errorMessage.includes('SKIPPED:') || errorMessage.includes('requires authentication') || errorMessage.includes('Skipping')) {
        this.logger.warn(`${name} - SKIPPED`);
        if (this.config.verbose) {
          this.logger.log(`  Reason: ${errorMessage}`);
        }
        const result: TestResult = { name, passed: true, skipped: true, error: errorMessage.replace('SKIPPED: ', ''), duration };
        this.results.push(result);
        return result;
      }
      
      this.logger.error(`${name}`, error);
      const result: TestResult = { name, passed: false, error: errorMessage, duration };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Get fetch options with authentication if available
   */
  private getFetchOptions(additionalHeaders: Record<string, string> = {}): RequestInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (this.config.sessionCookie) {
      headers['Cookie'] = `session=${this.config.sessionCookie}`;
    }

    return { headers };
  }

  /**
   * Test: Dashboard loads correctly
   */
  async testDashboardLoads(): Promise<void> {
    const response = await fetch(
      `${this.config.baseUrl}/api/dashboard`,
      this.getFetchOptions()
    );
    
    if (response.status === 401) {
      // Authentication required - this is expected for E2E test without session
      throw new Error('SKIPPED: Dashboard API requires authentication (expected for E2E test without session)');
    }
    
    TestAssertions.assert(response.ok, `Dashboard API should return 200, got ${response.status}`);
    
    const data = await response.json();
    TestAssertions.assertExists(data, 'Dashboard data should exist');
    TestAssertions.assertExists(data.totalBusinesses, 'Should have totalBusinesses count');
  }

  /**
   * Test: Business creation flow
   */
  async testBusinessCreation(): Promise<void> {
    // Create business via API
    const response = await fetch(`${this.config.baseUrl}/api/business`, {
      method: 'POST',
      ...this.getFetchOptions(),
      body: JSON.stringify({
        url: this.config.businessUrl,
        name: 'E2E Test Business',
      }),
    });

    if (response.status === 401) {
      (this as any).testBusinessId = null;
      (this as any).authRequired = true;
      throw new Error('SKIPPED: Business creation requires authentication (expected for E2E test without session)');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Business creation failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    TestAssertions.assertExists(data.business, 'Response should contain business');
    TestAssertions.assertExists(data.business.id, 'Business should have ID');

    // Store business ID for cleanup
    (this as any).testBusinessId = data.business.id;
    (this as any).authRequired = false;
  }

  /**
   * Test: CFP process execution
   */
  async testCFPProcess(): Promise<void> {
    const businessId = (this as any).testBusinessId;
    const authRequired = (this as any).authRequired;
    
    if (authRequired || !businessId) {
      throw new Error('SKIPPED: CFP process test requires authenticated session and business');
    }

    // Trigger CFP process
    const response = await fetch(
      `${this.config.baseUrl}/api/business/${businessId}/process`,
      {
        method: 'POST',
        ...this.getFetchOptions(),
      }
    );

    TestAssertions.assert(response.ok, 'CFP trigger should succeed');
    
    // Wait for CFP to complete (poll status)
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    let status = 'pending';

    while (attempts < maxAttempts && (status === 'pending' || status === 'crawling' || status === 'generating')) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(
        `${this.config.baseUrl}/api/business/${businessId}`,
        this.getFetchOptions()
      );
      if (!statusResponse.ok) {
        throw new Error(`Failed to fetch business status: ${statusResponse.status}`);
      }
      const business = await statusResponse.json();
      status = business.status;
      
      this.logger.log(`CFP Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
    }

    TestAssertions.assert(
      status === 'published' || status === 'crawled',
      `CFP should complete successfully, got status: ${status}`
    );
  }

  /**
   * Test: Status indicators accuracy
   */
  async testStatusIndicators(): Promise<void> {
    const businessId = (this as any).testBusinessId;
    if (!businessId) {
      throw new Error('SKIPPED: Status indicators test requires business ID');
    }

    const response = await fetch(
      `${this.config.baseUrl}/api/business/${businessId}`,
      this.getFetchOptions()
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch business: ${response.status}`);
    }
    const business = await response.json();

    // Verify status is valid
    const validStatuses = ['pending', 'crawling', 'crawled', 'generating', 'published', 'error'];
    TestAssertions.assert(
      validStatuses.includes(business.status),
      `Status should be one of: ${validStatuses.join(', ')}, got: ${business.status}`
    );

    // If error, should have error message
    if (business.status === 'error') {
      TestAssertions.assertExists(
        business.errorMessage,
        'Error status should have errorMessage'
      );
    }
  }

  /**
   * Test: Fingerprint data exists
   */
  async testFingerprintData(): Promise<void> {
    const businessId = (this as any).testBusinessId;
    if (!businessId) {
      throw new Error('SKIPPED: Fingerprint data test requires business ID');
    }

    const response = await fetch(
      `${this.config.baseUrl}/api/fingerprint/business/${businessId}`,
      this.getFetchOptions()
    );
    
    if (response.status === 404) {
      // Fingerprint might not exist yet if CFP is still running
      this.logger.warn('Fingerprint not found (may still be processing)');
      return;
    }

    TestAssertions.assert(response.ok, 'Fingerprint API should return 200');
    const data = await response.json();
    TestAssertions.assertExists(data.visibilityScore, 'Should have visibility score');
    TestAssertions.assert(
      typeof data.visibilityScore === 'number',
      'Visibility score should be a number'
    );
  }

  /**
   * Test: Competitive intelligence data
   */
  async testCompetitiveIntelligence(): Promise<void> {
    const businessId = (this as any).testBusinessId;
    if (!businessId) {
      throw new Error('SKIPPED: Competitive intelligence test requires business ID');
    }

    const response = await fetch(
      `${this.config.baseUrl}/api/fingerprint/business/${businessId}`,
      this.getFetchOptions()
    );
    
    if (response.status === 404) {
      this.logger.warn('Fingerprint not found (skipping competitive intelligence test)');
      return;
    }

    const data = await response.json();
    
    if (data.competitiveLeaderboard) {
      const leaderboard = data.competitiveLeaderboard;
      
      // Verify competitor names are valid (not action phrases)
      if (leaderboard.competitors) {
        const invalidPatterns = [
          'checking',
          'asking for',
          'verifying',
          'comparing',
          'looking for',
        ];
        
        for (const competitor of leaderboard.competitors) {
          const nameLower = competitor.name.toLowerCase();
          for (const pattern of invalidPatterns) {
            TestAssertions.assert(
              !nameLower.startsWith(pattern) && !nameLower.includes(` ${pattern} `),
              `Competitor name should not be action phrase: "${competitor.name}"`
            );
          }
        }
      }

      // Verify market shares sum to ~100% (allow small rounding errors)
      if (leaderboard.competitors && leaderboard.competitors.length > 0) {
        const totalMarketShare = leaderboard.competitors.reduce(
          (sum: number, comp: any) => sum + (comp.marketShare || 0),
          0
        );
        const targetShare = leaderboard.targetBusiness?.marketShare || 0;
        const total = totalMarketShare + targetShare;
        
        TestAssertions.assert(
          total >= 95 && total <= 105, // Allow 5% rounding error
          `Market shares should sum to ~100%, got: ${total.toFixed(1)}%`
        );
      }
    }
  }

  /**
   * Test: Wikidata publication
   */
  async testWikidataPublication(): Promise<void> {
    const businessId = (this as any).testBusinessId;
    if (!businessId) {
      throw new Error('SKIPPED: Wikidata publication test requires business ID');
    }

    const response = await fetch(
      `${this.config.baseUrl}/api/business/${businessId}`,
      this.getFetchOptions()
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch business: ${response.status}`);
    }
    const business = await response.json();

    // If business has QID, verify it's valid format
    if (business.wikidataQID) {
      TestAssertions.assert(
        /^Q\d+$/.test(business.wikidataQID),
        `Wikidata QID should be in format Q123, got: ${business.wikidataQID}`
      );
    }
  }

  /**
   * Test: Error handling
   */
  async testErrorHandling(): Promise<void> {
    // Test invalid business ID
    const response = await fetch(
      `${this.config.baseUrl}/api/business/999999`,
      this.getFetchOptions()
    );
    
    // May return 401 (unauthorized) or 404 (not found) - both are valid error responses
    TestAssertions.assert(
      response.status === 404 || response.status === 401,
      `Invalid business ID should return 404 or 401, got ${response.status}`
    );
  }

  /**
   * Cleanup: Remove test business
   */
  async cleanup(): Promise<void> {
    if (this.config.skipCleanup) {
      this.logger.warn('Skipping cleanup (--skip-cleanup flag set)');
      return;
    }

    const businessId = (this as any).testBusinessId;
    if (!businessId) {
      this.logger.warn('No test business ID to clean up');
      return;
    }

    try {
      // Use the cleanup script if available
      const cleanupScript = join(__dirname, 'remove-most-recent-business.ts');
      // For now, just log - actual cleanup would require database access
      this.logger.info(`Would clean up business ID: ${businessId}`);
    } catch (error) {
      this.logger.warn('Cleanup failed (non-critical)', error);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestSuite> {
    const startTime = Date.now();
    this.logger.section('E2E Test Suite - Gemflush Platform');

    // Test sequence
    await this.runTest('Dashboard Loads', () => this.testDashboardLoads());
    await this.runTest('Business Creation', () => this.testBusinessCreation());
    await this.runTest('CFP Process Execution', () => this.testCFPProcess(), 300000); // 5 min timeout
    await this.runTest('Status Indicators Accuracy', () => this.testStatusIndicators());
    await this.runTest('Fingerprint Data Exists', () => this.testFingerprintData());
    await this.runTest('Competitive Intelligence Data', () => this.testCompetitiveIntelligence());
    await this.runTest('Wikidata Publication', () => this.testWikidataPublication());
    await this.runTest('Error Handling', () => this.testErrorHandling());

    // Cleanup
    await this.cleanup();

    const duration = Date.now() - startTime;
    const passed = this.results.filter(r => r.passed && !r.skipped).length;
    const failed = this.results.filter(r => !r.passed).length;
    const skipped = this.results.filter(r => r.skipped).length;

    return {
      name: 'E2E Test Suite',
      results: this.results,
      passed,
      failed,
      skipped,
      duration,
    };
  }

  /**
   * Print test results summary
   */
  printSummary(suite: TestSuite): void {
    this.logger.section('Test Results Summary');

    console.log(`\nTotal Tests: ${suite.results.length}`);
    console.log(`✅ Passed: ${suite.passed}`);
    console.log(`⏭️  Skipped: ${suite.skipped}`);
    console.log(`❌ Failed: ${suite.failed}`);
    console.log(`⏱️  Duration: ${(suite.duration / 1000).toFixed(2)}s\n`);

    if (suite.skipped > 0) {
      console.log('\nSkipped Tests (require authentication):');
      suite.results
        .filter(r => r.skipped)
        .forEach(result => {
          console.log(`  ⏭️  ${result.name}`);
          console.log(`     Reason: ${result.error}\n`);
        });
    }

    if (suite.failed > 0) {
      console.log('\nFailed Tests:');
      suite.results
        .filter(r => !r.passed && !r.skipped)
        .forEach(result => {
          console.log(`  ❌ ${result.name}`);
          console.log(`     Error: ${result.error}`);
          console.log(`     Duration: ${result.duration}ms\n`);
        });
    }

    // Save results to file
    const resultsFile = join(__dirname, '../test-results.json');
    writeFileSync(
      resultsFile,
      JSON.stringify(suite, null, 2),
      'utf-8'
    );
    this.logger.info(`Results saved to: ${resultsFile}`);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config: TestConfig = {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    businessUrl: args.find(arg => arg.startsWith('--business-url='))?.split('=')[1] || TEST_BUSINESSES.default,
    skipCleanup: args.includes('--skip-cleanup'),
    verbose: args.includes('--verbose'),
    timeout: 30000, // 30 seconds default
    sessionCookie: process.env.E2E_TEST_SESSION_COOKIE || 
                   args.find(arg => arg.startsWith('--session-cookie='))?.split('=')[1],
  };

  const runner = new E2ETestRunner(config);
  
  try {
    const suite = await runner.runAllTests();
    runner.printSummary(suite);

    // Exit with error code if tests failed (not if only skipped)
    // Skipped tests are expected when running without authentication
    const exitCode = suite.failed > 0 ? 1 : 0;
    
    if (suite.skipped > 0 && suite.failed === 0) {
      console.log('\n⚠️  Note: Some tests were skipped because they require authentication.');
      console.log('   To run full E2E tests, ensure you have an authenticated session.');
      console.log('   For API-only testing, skipped tests are expected.\n');
    }
    
    process.exit(exitCode);
  } catch (error) {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  }
}

// Run if executed directly
// Support both CommonJS and ES modules
const isMainModule = 
  (typeof require !== 'undefined' && require.main === module) ||
  (typeof import.meta !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) ||
  process.argv[1]?.endsWith('e2e-test.ts');

if (isMainModule) {
  main().catch(console.error);
}

export { E2ETestRunner, TestConfig, TestResult, TestSuite };

