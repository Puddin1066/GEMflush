import * as React from 'react';
import { resend, EMAIL_FROM } from './resend';
import { WelcomeEmail } from './templates/welcome';
import { PasswordResetEmail } from './templates/password-reset';
import { SubscriptionUpdatedEmail } from './templates/subscription-updated';
import { VisibilityReportEmail } from './templates/visibility-report';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}

/**
 * Send an email using Resend
 * 
 * MOCKING NOTE: This is a real API call. In tests, mock this function.
 */
export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      react,
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Email send failed: ${error.message}`);
    }

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  to: string,
  userName?: string
) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  return sendEmail({
    to,
    subject: 'Welcome to GEMflush - Your AI Visibility Journey Starts Now! 💎',
    react: WelcomeEmail({
      userName,
      loginUrl: `${baseUrl}/sign-in`,
    }),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  userName?: string
) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to,
    subject: 'Reset Your GEMflush Password',
    react: PasswordResetEmail({
      userName,
      resetUrl,
      expiresIn: '1 hour',
    }),
  });
}

/**
 * Send subscription updated/upgraded email
 */
export async function sendSubscriptionEmail(
  to: string,
  planName: string,
  planPrice: string,
  features: string[],
  isUpgrade: boolean,
  userName?: string
) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  return sendEmail({
    to,
    subject: isUpgrade 
      ? `🎉 Welcome to ${planName} - You're All Set!`
      : `Your GEMflush Plan Has Been Updated`,
    react: SubscriptionUpdatedEmail({
      userName,
      planName,
      planPrice,
      features,
      dashboardUrl: `${baseUrl}/dashboard`,
      isUpgrade,
    }),
  });
}

/**
 * Send business visibility report email
 */
export async function sendVisibilityReportEmail(
  to: string,
  businessName: string,
  score: number,
  insights: string[]
) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/dashboard`;
  
  return sendEmail({
    to,
    subject: `${businessName} AI Visibility Score: ${score}/100 💎`,
    react: VisibilityReportEmail({
      businessName,
      score,
      insights,
      dashboardUrl,
    }),
  });
}

