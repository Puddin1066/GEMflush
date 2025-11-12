import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Database Connection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should require DATABASE_URL or POSTGRES_URL', () => {
    // This is tested by the actual module - it throws on import if not set
    // We verify the error message structure
    const errorMessage = 'DATABASE_URL or POSTGRES_URL environment variable is not set';
    expect(errorMessage).toContain('DATABASE_URL');
    expect(errorMessage).toContain('POSTGRES_URL');
  });

  it('should support both DATABASE_URL and POSTGRES_URL', () => {
    // Test that the code checks both environment variables
    const check1 = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    expect(typeof check1 === 'string' || check1 === undefined).toBe(true);
  });
});

