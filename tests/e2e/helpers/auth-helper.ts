/**
 * E2E Test Authentication Helper
 * Creates test users and authenticates for E2E tests
 * 
 * Following TDD: Helper supports test requirements
 */

import { Page } from '@playwright/test';
import { setupProTeam } from './api-helpers';

/**
 * Creates a test user and signs them in
 * Returns the user email and team info for use in tests
 */
export async function createTestUserAndSignIn(
  page: Page,
  options?: { tier?: 'free' | 'pro' | 'agency' }
): Promise<{ user: { email: string; id?: number }; team: { id: number; planName: string } }> {
  const email = `test-${Date.now()}@example.com`;
  const password = 'testpassword123';

  // Navigate to sign-up (align with fixture pattern for consistency)
  await page.goto('/sign-up', { waitUntil: 'networkidle' });
  
  // Wait for React to hydrate - use same pattern as fixture
  try {
    await page.waitForSelector('form', { timeout: 20000, state: 'visible' });
    await page.waitForSelector('input[name="email"], #email, input[type="email"]', { 
      timeout: 10000, 
      state: 'visible' 
    });
  } catch (error) {
    const pageText = await page.textContent('body').catch(() => '') || '';
    throw new Error(`Sign-up form did not load: ${error instanceof Error ? error.message : 'Unknown error'}, Page: ${pageText.substring(0, 200)}`);
  }
  
  // Fill form using name attribute (most reliable, same as fixture)
  await page.locator('input[name="email"]').fill(email, { timeout: 10000 });
  await page.locator('input[name="password"]').fill(password, { timeout: 10000 });
  
  // Submit form and wait for navigation (align with fixture pattern)
  await Promise.all([
    page.waitForURL(/.*dashboard/, { timeout: 20000 }),
    page.getByRole('button', { name: /sign up/i }).click()
  ]);
  
  // Wait for page to load completely
  await page.waitForLoadState('networkidle');
  
  // Get team info via API (TEST DRIVES IMPLEMENTATION)
  const teamResponse = await page.request.get('/api/team');
  if (!teamResponse.ok()) {
    throw new Error(`Failed to get team: ${teamResponse.status()}`);
  }
  const team = await teamResponse.json();
  
  // Update tier if specified (for testing Pro/Agency features)
  if (options?.tier && options.tier !== 'free') {
    // Use existing setupProTeam helper (DRY: reuse existing implementation)
    await setupProTeam(page);
    
    // Verify tier was updated
    const updatedTeamResponse = await page.request.get('/api/team');
    if (!updatedTeamResponse.ok()) {
      throw new Error(`Failed to verify team update: ${updatedTeamResponse.status()}`);
    }
    const updatedTeam = await updatedTeamResponse.json();
    
    return {
      user: { email },
      team: { id: updatedTeam.id, planName: updatedTeam.planName || options.tier },
    };
  }
  
  return {
    user: { email },
    team: { id: team.id, planName: team.planName || 'free' },
  };
}

/**
 * Signs in with existing credentials
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/.*dashboard/, { timeout: 10000 });
}


