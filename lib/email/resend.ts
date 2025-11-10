import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_FROM = process.env.EMAIL_FROM || 'GEMflush <noreply@gemflush.com>';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@gemflush.com';

