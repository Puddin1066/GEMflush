import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sendModule from '../send';
import * as examplesModule from '../examples';

// Mock email send functions
vi.mock('../send', () => ({
  sendWelcomeEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendSubscriptionEmail: vi.fn(),
  sendVisibilityReportEmail: vi.fn(),
}));

describe('Email Examples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('onUserSignup', () => {
    it('should send welcome email on signup', async () => {
      vi.mocked(sendModule.sendWelcomeEmail).mockResolvedValue({ id: 'email-123' } as any);

      await examplesModule.onUserSignup('user@example.com', 'John Doe');

      expect(sendModule.sendWelcomeEmail).toHaveBeenCalledWith('user@example.com', 'John Doe');
    });

    it('should not throw error if email fails', async () => {
      vi.mocked(sendModule.sendWelcomeEmail).mockRejectedValue(new Error('Email failed'));

      // Should not throw
      await expect(examplesModule.onUserSignup('user@example.com')).resolves.not.toThrow();
    });
  });

  describe('onPasswordResetRequest', () => {
    it('should send password reset email', async () => {
      vi.mocked(sendModule.sendPasswordResetEmail).mockResolvedValue({ id: 'email-456' } as any);

      await examplesModule.onPasswordResetRequest('user@example.com', 'John Doe');

      expect(sendModule.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String), // token
        'John Doe'
      );
    });

    it('should throw error if email fails', async () => {
      vi.mocked(sendModule.sendPasswordResetEmail).mockRejectedValue(new Error('Email failed'));

      await expect(examplesModule.onPasswordResetRequest('user@example.com')).rejects.toThrow();
    });
  });

  describe('onSubscriptionCreated', () => {
    it('should send subscription email for new subscription', async () => {
      vi.mocked(sendModule.sendSubscriptionEmail).mockResolvedValue({ id: 'email-789' } as any);

      await examplesModule.onSubscriptionCreated('user@example.com', 'Pro', 49, 'John Doe');

      expect(sendModule.sendSubscriptionEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Pro',
        '$49/month',
        expect.any(Array), // features
        true, // isUpgrade
        'John Doe'
      );
    });

    it('should not throw error if email fails', async () => {
      vi.mocked(sendModule.sendSubscriptionEmail).mockRejectedValue(new Error('Email failed'));

      await expect(
        examplesModule.onSubscriptionCreated('user@example.com', 'Pro', 49)
      ).resolves.not.toThrow();
    });
  });

  describe('onFingerprintComplete', () => {
    it('should send visibility report email', async () => {
      vi.mocked(sendModule.sendVisibilityReportEmail).mockResolvedValue({ id: 'email-vis' } as any);

      await examplesModule.onFingerprintComplete(
        'user@example.com',
        'Acme Corp',
        78,
        ['Insight 1', 'Insight 2']
      );

      expect(sendModule.sendVisibilityReportEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Acme Corp',
        78,
        ['Insight 1', 'Insight 2']
      );
    });

    it('should not throw error if email fails', async () => {
      vi.mocked(sendModule.sendVisibilityReportEmail).mockRejectedValue(new Error('Email failed'));

      await expect(
        examplesModule.onFingerprintComplete('user@example.com', 'Business', 50, [])
      ).resolves.not.toThrow();
    });
  });
});

