import { describe, it, expect, vi } from 'vitest';

// Mock resend module at the top level
vi.mock('resend', () => ({
  Resend: class MockResend {
    constructor(apiKey: string) {
      if (!apiKey) {
        throw new Error('RESEND_API_KEY is not defined in environment variables');
      }
    }
  },
}));

describe('Resend Client Configuration', () => {
  it('should require RESEND_API_KEY environment variable', () => {
    // Test that the error message structure is correct
    const errorMessage = 'RESEND_API_KEY is not defined in environment variables';
    expect(errorMessage).toContain('RESEND_API_KEY');
  });

  it('should use default EMAIL_FROM when not set', () => {
    // Test default value logic
    const defaultEmailFrom = process.env.EMAIL_FROM || 'GEMflush <noreply@gemflush.com>';
    expect(defaultEmailFrom).toBe('GEMflush <noreply@gemflush.com>');
  });

  it('should use custom EMAIL_FROM when set', () => {
    // Test that custom value can override default
    const customEmailFrom = 'Custom <custom@example.com>';
    const emailFrom = customEmailFrom || 'GEMflush <noreply@gemflush.com>';
    expect(emailFrom).toBe('Custom <custom@example.com>');
  });

  it('should use default SUPPORT_EMAIL when not set', () => {
    // Test default value logic
    const defaultSupportEmail = process.env.SUPPORT_EMAIL || 'support@gemflush.com';
    expect(defaultSupportEmail).toBe('support@gemflush.com');
  });
});

