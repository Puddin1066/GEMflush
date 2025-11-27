import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Playwright Configuration for E2E Tests
 */

// Load .env file to ensure DATABASE_URL is available
dotenv.config();

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/, // Only load Playwright spec files, exclude Vitest .test.ts files
  testIgnore: ['**/_archive/**', '**/node_modules/**'], // Ignore archived tests
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

  webServer: process.env.SKIP_WEBSERVER === 'true' ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // Increased to 3 minutes for slower startup
    // Note: healthCheck is not a standard Playwright webServer option
    // Server readiness is handled by Playwright's built-in health check mechanism
    env: {
      // CRITICAL: Pass all required environment variables to Next.js server for E2E tests
      // Without these, sign-up and all database operations fail
      DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
      POSTGRES_URL: process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
      // Pass other required vars (Next.js needs these too)
      AUTH_SECRET: process.env.AUTH_SECRET || '',
      BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
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
      // Force Firecrawl to use mock responses during E2E tests
      // This prevents external API calls and speeds up tests
      USE_MOCK_FIRECRAWL: 'true',
      // IDEAL: Use mock mode for E2E tests - we're testing the flow, not actual Wikidata publishing
      // Mock mode returns a mock QID immediately, allowing tests to verify the complete flow
      // Set WIKIDATA_PUBLISH_MODE=real in .env if you want to test real API integration
      WIKIDATA_PUBLISH_MODE: process.env.WIKIDATA_PUBLISH_MODE || 'mock',
    },
  },
});

