import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sendModule from '@/lib/email/send';
import * as examplesModule from '@/lib/email/examples';

// Mock Resend
vi.mock('@/lib/email/resend', () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
  EMAIL_FROM: 'GEMflush <noreply@gemflush.com>',
}));

describe('Email E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'http://localhost:3000';
  });

  describe('Complete Email Flows', () => {
    it('should complete welcome email flow', async () => {
      const { resend } = await import('@/lib/email/resend');

      vi.mocked(resend.emails.send).mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendModule.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(result).toMatchObject({ id: 'email-123' });
      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Welcome'),
        })
      );
    });

    it('should complete password reset email flow', async () => {
      const { resend } = await import('@/lib/email/resend');

      vi.mocked(resend.emails.send).mockResolvedValue({
        data: { id: 'email-reset' },
        error: null,
      });

      const resetToken = 'secure-token-123';
      const result = await sendModule.sendPasswordResetEmail(
        'user@example.com',
        resetToken,
        'John Doe'
      );

      expect(result).toMatchObject({ id: 'email-reset' });
      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Reset'),
        })
      );
    });

    it('should complete subscription email flow', async () => {
      const { resend } = await import('@/lib/email/resend');

      vi.mocked(resend.emails.send).mockResolvedValue({
        data: { id: 'email-sub' },
        error: null,
      });

      const result = await sendModule.sendSubscriptionEmail(
        'user@example.com',
        'Pro',
        '$49/month',
        ['Feature 1', 'Feature 2'],
        true,
        'John Doe'
      );

      expect(result).toMatchObject({ id: 'email-sub' });
      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Pro'),
        })
      );
    });

    it('should complete visibility report email flow', async () => {
      const { resend } = await import('@/lib/email/resend');

      vi.mocked(resend.emails.send).mockResolvedValue({
        data: { id: 'email-vis' },
        error: null,
      });

      const result = await sendModule.sendVisibilityReportEmail(
        'user@example.com',
        'Acme Corp',
        78,
        ['Insight 1', 'Insight 2']
      );

      expect(result).toMatchObject({ id: 'email-vis' });
      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Acme Corp'),
        })
      );
    });
  });

  describe('Example Integration Flows', () => {
    it('should handle user signup email flow', async () => {
      vi.spyOn(sendModule, 'sendWelcomeEmail').mockResolvedValue({ id: 'email-123' } as any);

      await examplesModule.onUserSignup('user@example.com', 'John Doe');

      expect(sendModule.sendWelcomeEmail).toHaveBeenCalledWith('user@example.com', 'John Doe');
    });

    it('should handle password reset request flow', async () => {
      vi.spyOn(sendModule, 'sendPasswordResetEmail').mockResolvedValue({ id: 'email-reset' } as any);

      await examplesModule.onPasswordResetRequest('user@example.com', 'John Doe');

      expect(sendModule.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        'John Doe'
      );
    });
  });
});

