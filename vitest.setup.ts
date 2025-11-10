import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock server-only package for tests
vi.mock('server-only', () => ({}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend Vitest matchers with jest-dom
expect.extend({});

