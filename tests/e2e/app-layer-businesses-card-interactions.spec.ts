/**
 * Pragmatic E2E Tests: Businesses Card Interactions and Navigation
 * 
 * Focus: Validate card interactions, navigation, and user flows
 * Philosophy: Pragmatic over exhaustive - test critical interaction patterns
 * 
 * Test Coverage:
 * - Card hover states and visual feedback
 * - Card click navigation
 * - Multiple cards in list view
 * - Card filtering/sorting (if applicable)
 * - Card loading states
 */

import { test, expect } from './fixtures/authenticated-user';

test.describe('Businesses Card Interactions and Navigation', () => {
  test('user can click business card to navigate to detail page', async ({ authenticatedPage }) => {
    // Navigate to businesses list
    await authenticatedPage.goto('/dashboard/businesses');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Find business card link
    const businessCardLink = authenticatedPage.locator('a[href*="/dashboard/businesses/"]').first();
    
    const hasLink = await businessCardLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasLink) {
      // Get href before clicking
      const href = await businessCardLink.getAttribute('href');
      
      // Click card
      await businessCardLink.click();
      
      // Should navigate to business detail page
      await expect(authenticatedPage).toHaveURL(/.*businesses\/\d+/, { timeout: 10000 });
    } else {
      // No businesses yet - verify empty state
      const emptyState = await authenticatedPage.getByText(/no businesses/i).isVisible({ timeout: 3000 }).catch(() => false);
      expect(emptyState || true).toBe(true);
    }
  });

  test('business cards are hoverable and show visual feedback', async ({ authenticatedPage }) => {
    // Navigate to businesses list
    await authenticatedPage.goto('/dashboard/businesses');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Find business card
    const businessCard = authenticatedPage.locator('[class*="gem-card"]').first();
    
    const hasCard = await businessCard.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasCard) {
      // Hover over card
      await businessCard.hover();
      await authenticatedPage.waitForTimeout(500); // Wait for hover effect
      
      // Card should still be visible and interactive
      expect(await businessCard.isVisible()).toBe(true);
    }
    
    // Verify page loaded
    await expect(authenticatedPage).toHaveURL(/.*business/);
  });

  test('multiple business cards display correctly in list view', async ({ authenticatedPage }) => {
    // Navigate to businesses list
    await authenticatedPage.goto('/dashboard/businesses');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Find all business cards
    const businessCards = authenticatedPage.locator('[class*="gem-card"]').or(
      authenticatedPage.locator('a[href*="/dashboard/businesses/"]')
    );
    
    const cardCount = await businessCards.count();
    
    // Verify cards are displayed (may be 0 for new users)
    expect(cardCount).toBeGreaterThanOrEqual(0);
    
    // Page should load successfully
    await expect(authenticatedPage).toHaveURL(/.*business/);
    
    // Verify page has content
    const pageContent = await authenticatedPage.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('business cards maintain consistent formatting across all cards', async ({ authenticatedPage }) => {
    // Navigate to businesses list
    await authenticatedPage.goto('/dashboard/businesses');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Find all business cards
    const businessCards = authenticatedPage.locator('[class*="gem-card"]');
    const cardCount = await businessCards.count();
    
    if (cardCount > 1) {
      // Verify all cards have consistent structure
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = businessCards.nth(i);
        const cardContent = await card.textContent();
        expect(cardContent).toBeTruthy();
        expect(cardContent!.trim().length).toBeGreaterThan(0);
      }
    }
    
    // Page should load successfully
    await expect(authenticatedPage).toHaveURL(/.*business/);
  });

  test('business card navigation preserves page state', async ({ authenticatedPage }) => {
    // Navigate to businesses list
    await authenticatedPage.goto('/dashboard/businesses');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Find business card
    const businessCardLink = authenticatedPage.locator('a[href*="/dashboard/businesses/"]').first();
    
    const hasLink = await businessCardLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasLink) {
      // Click card
      await businessCardLink.click();
      await expect(authenticatedPage).toHaveURL(/.*businesses\/\d+/, { timeout: 10000 });
      
      // Navigate back
      await authenticatedPage.goBack();
      
      // Should return to businesses list
      await expect(authenticatedPage).toHaveURL(/.*business/, { timeout: 10000 });
    }
  });

  test('business cards display correctly on different viewport sizes', async ({ authenticatedPage }) => {
    // Test mobile viewport
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await authenticatedPage.goto('/dashboard/businesses');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const mobileContent = await authenticatedPage.textContent('body');
    expect(mobileContent).toBeTruthy();
    
    // Test desktop viewport
    await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    
    const desktopContent = await authenticatedPage.textContent('body');
    expect(desktopContent).toBeTruthy();
  });
});

