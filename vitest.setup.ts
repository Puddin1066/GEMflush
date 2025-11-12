import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Set up test environment variables
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key-for-testing-only-must-be-at-least-32-characters-long';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Mock server-only package for tests
vi.mock('server-only', () => ({}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend Vitest matchers with jest-dom
expect.extend({});

