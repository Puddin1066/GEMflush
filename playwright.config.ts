import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 */

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/, // Only load Playwright spec files, exclude Vitest .test.ts files
  fullyParallel: false, // Run tests sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts
  timeout: 30 * 1000, // 30 seconds per test (prevent hanging)
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000, // 10 seconds for actions (prevent hanging)
    navigationTimeout: 15 * 1000, // 15 seconds for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Only test on Chromium for faster feedback
    // Uncomment for cross-browser testing:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // Force OpenRouter to use mock responses during E2E tests
      // Setting to empty string ensures OpenRouter client checks `if (!apiKey)` which is true
      // This prevents expensive API calls and speeds up tests significantly
      // NOTE: This overrides any OPENROUTER_API_KEY from .env file
      OPENROUTER_API_KEY: '',
      // Also set NODE_ENV to test to help with mocking (if needed)
      NODE_ENV: 'test',
      // Force mock mode for Google Search in e2e tests
      // Setting to empty string ensures notability checker uses mock references
      // This allows real notability logic to run without external API calls
      GOOGLE_SEARCH_API_KEY: '',
      GOOGLE_SEARCH_ENGINE_ID: '',
      // Explicit flag (backup) - but primary check is empty API key + test env
      USE_MOCK_GOOGLE_SEARCH: 'true',
      // Playwright test indicator (most reliable - unlikely to be in .env)
      PLAYWRIGHT_TEST: 'true',
      // Use real test.wikidata.org Action API calls to capture real Wikidata API behavior
      // This tests the actual API integration while using the safe test environment
      // Requires WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD env vars for authentication
      // Set to 'mock' to bypass real API calls (for faster tests without credentials)
      WIKIDATA_PUBLISH_MODE: process.env.WIKIDATA_PUBLISH_MODE || 'real',
    },
  },
});

