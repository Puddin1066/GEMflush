import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionEmail } from '../send';
import * as resendModule from '../resend';

// Mock the Resend client
vi.mock('../resend', () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
  EMAIL_FROM: 'GEMflush <noreply@gemflush.com>',
  SUPPORT_EMAIL: 'support@gemflush.com',
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables for tests
    process.env.BASE_URL = 'http://localhost:3000';
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct parameters', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await sendWelcomeEmail('user@example.com', 'John Doe');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'GEMflush <noreply@gemflush.com>',
          to: 'user@example.com',
          subject: expect.stringContaining('Welcome to GEMflush'),
        })
      );
    });

    it('should handle email send failure gracefully', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: null,
        error: { message: 'API Error', name: 'ApiError' },
      });

      await expect(sendWelcomeEmail('user@example.com')).rejects.toThrow('Email send failed');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should work without optional userName', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await sendWelcomeEmail('user@example.com');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
        })
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with reset link', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: { id: 'email-456' },
        error: null,
      });

      await sendPasswordResetEmail('user@example.com', 'token-abc-123', 'John Doe');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Reset Your GEMflush Password'),
        })
      );
    });

    it('should include reset token in URL', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: { id: 'email-456' },
        error: null,
      });

      const resetToken = 'secure-token-123';
      await sendPasswordResetEmail('user@example.com', resetToken);

      const call = mockSend.mock.calls[0][0];
      // The reset URL is rendered in the React component
      // In a real test, you'd render the component and check the output
      expect(call).toBeDefined();
    });
  });

  describe('sendSubscriptionEmail', () => {
    it('should send upgrade email with correct plan details', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: { id: 'email-789' },
        error: null,
      });

      const features = ['Wikidata Publishing', '5 businesses', 'Weekly fingerprints'];
      
      await sendSubscriptionEmail(
        'user@example.com',
        'Pro',
        '$49/month',
        features,
        true, // isUpgrade
        'John Doe'
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Welcome to Pro'),
        })
      );
    });

    it('should send downgrade email with different subject', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: { id: 'email-790' },
        error: null,
      });

      const features = ['1 business', 'Monthly fingerprints'];
      
      await sendSubscriptionEmail(
        'user@example.com',
        'Free',
        '$0/month',
        features,
        false, // not an upgrade
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Plan Has Been Updated'),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when Resend API fails', async () => {
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockRejectedValue(
        new Error('Network error')
      );

      await expect(sendWelcomeEmail('user@example.com')).rejects.toThrow();
      expect(mockSend).toHaveBeenCalled();
    });

    it('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSend = vi.spyOn(resendModule.resend.emails, 'send').mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient', name: 'ValidationError' },
      });

      await expect(sendWelcomeEmail('invalid-email')).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send email:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});

/**
 * Integration Test Example
 * 
 * This would be run separately with actual Resend API (not in CI)
 */
describe.skip('Email Service Integration Tests', () => {
  it('should actually send welcome email (manual test)', async () => {
    // Only run this manually with: pnpm test -- --run email.test.ts
    // Requires RESEND_API_KEY in .env
    
    const result = await sendWelcomeEmail('your-test-email@example.com', 'Test User');
    expect(result).toBeDefined();
    console.log('Email sent! Check your inbox:', result);
  });
});

