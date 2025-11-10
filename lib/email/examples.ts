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

// Helper functions (TODO: Implement these based on your schema)

function generateSecureToken(): string {
  // TODO: Implement secure random token generation
  return crypto.randomUUID();
}

async function storeResetToken(email: string, token: string, expiry: string): Promise<void> {
  // TODO: Store in database with expiry timestamp
  console.log(`TODO: Store reset token for ${email}`);
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

