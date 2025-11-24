/**
 * Example integrations showing how to use email service in your app
 * 
 * MOCK DATA NOTES: 
 * - These are example implementations
 * - Replace with actual data from your database/APIs
 * - Error handling is included for production use
 */

import { sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionEmail, sendVisibilityReportEmail } from './send';

/**
 * Example: Send welcome email after user signup
 * 
 * Integration point: app/(login)/actions.ts -> signUp action
 */
export async function onUserSignup(email: string, name?: string) {
  try {
    await sendWelcomeEmail(email, name);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    // Don't block signup if email fails
    console.error('Failed to send welcome email:', error);
  }
}

/**
 * Example: Send password reset email
 * 
 * Integration point: password reset flow (needs to be created)
 */
export async function onPasswordResetRequest(email: string, name?: string) {
  try {
    // Generate secure reset token (implement in your auth service)
    const resetToken = generateSecureToken(); // TODO: Implement this
    
    // Store token in database with expiry
    await storeResetToken(email, resetToken, '1 hour'); // TODO: Implement this
    
    // Send email
    await sendPasswordResetEmail(email, resetToken, name);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error; // This should block the reset flow if email fails
  }
}

/**
 * Example: Send subscription email after Stripe payment
 * 
 * Integration point: app/api/stripe/webhook/route.ts
 */
export async function onSubscriptionCreated(
  email: string,
  planName: string,
  planPrice: number,
  name?: string
) {
  try {
    // Get plan features based on plan name
    const features = getPlanFeatures(planName);
    
    await sendSubscriptionEmail(
      email,
      planName,
      `$${planPrice}/month`,
      features,
      true, // isUpgrade = true for new subscriptions
      name
    );
    console.log(`Subscription email sent to ${email} for ${planName}`);
  } catch (error) {
    console.error('Failed to send subscription email:', error);
    // Don't block payment flow
  }
}

/**
 * Example: Send subscription updated email
 * 
 * Integration point: app/api/stripe/webhook/route.ts
 */
export async function onSubscriptionUpdated(
  email: string,
  oldPlanName: string,
  newPlanName: string,
  planPrice: number,
  name?: string
) {
  try {
    const features = getPlanFeatures(newPlanName);
    const isUpgrade = isPlanUpgrade(oldPlanName, newPlanName);
    
    await sendSubscriptionEmail(
      email,
      newPlanName,
      `$${planPrice}/month`,
      features,
      isUpgrade,
      name
    );
    console.log(`Subscription update email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send subscription update email:', error);
  }
}

/**
 * Example: Send visibility report email after fingerprint completes
 * 
 * Integration point: After AI fingerprint job completes
 */
export async function onFingerprintComplete(
  email: string,
  businessName: string,
  score: number,
  insights: string[]
) {
  try {
    await sendVisibilityReportEmail(email, businessName, score, insights);
    console.log(`Visibility report sent to ${email} for ${businessName}`);
  } catch (error) {
    console.error('Failed to send visibility report:', error);
  }
}

// Helper functions - Implemented via TDD

/**
 * Generate a secure random token for password reset
 * Uses crypto.randomUUID() which generates a UUID v4 (36 characters)
 * 
 * @returns Secure random token string
 */
export function generateSecureToken(): string {
  // Use crypto.randomUUID() for secure token generation
  // UUID v4 is 36 characters (32 hex + 4 hyphens)
  return crypto.randomUUID();
}

/**
 * Store password reset token in database with expiry
 * 
 * @param email - User email address
 * @param token - Reset token to store
 * @param expiry - Duration string (e.g., "1 hour", "30 minutes", "1 day")
 */
export async function storeResetToken(email: string, token: string, expiry: string): Promise<void> {
  const { db } = await import('@/lib/db/drizzle');
  const { users } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');
  
  // Parse duration string and calculate expiry timestamp
  const expiryDate = parseDuration(expiry);
  
  // Update user record with reset token and expiry
  // Note: Type assertion needed until TypeScript picks up schema changes
  await db
    .update(users)
    .set({
      resetToken: token,
      resetTokenExpiry: expiryDate,
    } as any)
    .where(eq(users.email, email));
}

/**
 * Parse duration string and return expiry timestamp
 * 
 * @param duration - Duration string (e.g., "1 hour", "30 minutes", "1 day")
 * @returns Date object representing expiry time
 */
function parseDuration(duration: string): Date {
  const now = new Date();
  const match = duration.match(/^(\d+)\s*(hour|hours|minute|minutes|day|days)$/i);
  
  if (!match) {
    // Default to 1 hour if parsing fails
    return new Date(now.getTime() + 60 * 60 * 1000);
  }
  
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  let milliseconds: number;
  if (unit.startsWith('hour')) {
    milliseconds = amount * 60 * 60 * 1000;
  } else if (unit.startsWith('minute')) {
    milliseconds = amount * 60 * 1000;
  } else if (unit.startsWith('day')) {
    milliseconds = amount * 24 * 60 * 60 * 1000;
  } else {
    // Default to 1 hour
    milliseconds = 60 * 60 * 1000;
  }
  
  return new Date(now.getTime() + milliseconds);
}

function getPlanFeatures(planName: string): string[] {
  const planFeatures: Record<string, string[]> = {
    'Free': [
      '1 business',
      'Monthly AI fingerprints',
      'Benchmarking included',
    ],
    'Pro': [
      'Wikidata Publishing',
      '5 businesses',
      'Weekly AI fingerprints',
      'Priority support',
    ],
    'Agency': [
      '25 businesses',
      'Daily AI fingerprints',
      'API access',
      'White-label reports',
      'Multi-client dashboard',
    ],
  };
  
  return planFeatures[planName] || planFeatures['Free'];
}

function isPlanUpgrade(oldPlan: string, newPlan: string): boolean {
  const planHierarchy = ['Free', 'Pro', 'Agency'];
  const oldIndex = planHierarchy.indexOf(oldPlan);
  const newIndex = planHierarchy.indexOf(newPlan);
  return newIndex > oldIndex;
}

