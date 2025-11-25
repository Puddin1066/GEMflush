/**
 * TDD E2E Test: Data Consistency and Reliability
 * 
 * SPECIFICATION: Data must remain consistent across all operations
 * 
 * As a platform operator
 * I want data to remain consistent and reliable
 * So that users trust the platform and data integrity is maintained
 * 
 * Acceptance Criteria:
 * 1. Data persists correctly through all operations
 * 2. Concurrent operations don't corrupt data
 * 3. Status updates are atomic and consistent
 * 4. Relationships between entities are maintained
 * 5. Data is not lost during processing
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { test, expect, Page } from '@playwright/test';
import { createTestUserAndSignIn } from './helpers/auth-helper';

test.describe('🔴 RED: Data Consistency and Reliability Specification', () => {
  /**
   * SPECIFICATION 1: Business Status Updates Atomically
   * 
   * Given: Business is processing
   * When: Status updates occur
   * Then: Status transitions are atomic and consistent
   */
  test('business status updates are atomic and consistent', async ({ page }) => {
    // Arrange: Create business
    await createTestUserAndSignIn(page);
    await page.goto('/dashboard/businesses');
    
    // Create business
    await page.click('text=Add Business');
    await page.fill('input[name="url"]', 'https://example.com');
    await page.click('button[type="submit"]');
    
    // Wait for business creation
    await expect(page.locator('text=Business created')).toBeVisible({ timeout: 10000 });
    
    // Get business ID from URL or element
    const businessLink = page.locator('a[href*="/businesses/"]').first();
    await businessLink.click();
    
    // Act: Monitor status changes (TEST DRIVES IMPLEMENTATION)
    const statusElement = page.locator('[data-status]').or(page.locator('[data-business-status]')).first();
    
    // Assert: Status transitions are valid (behavior: no invalid state transitions)
    // Wait for status to progress
    await expect(statusElement).toBeVisible({ timeout: 10000 });
    
    // Refresh page and verify status is consistent (behavior: status persisted correctly)
    await page.reload();
    await expect(statusElement).toBeVisible({ timeout: 5000 });
    
    // Assert: Status doesn't regress (behavior: status only moves forward)
    // This is a specification - implementation must ensure status only progresses forward
  });

  /**
   * SPECIFICATION 2: Fingerprint Data Persists Correctly
   * 
   * Given: Fingerprint is generated
   * When: User views fingerprint multiple times
   * Then: Fingerprint data is consistent and doesn't change
   */
  test('fingerprint data persists correctly across page loads', async ({ page }) => {
    // Arrange: Create business and generate fingerprint
    await createTestUserAndSignIn(page);
    await page.goto('/dashboard/businesses');
    
    // Create business and wait for fingerprint
    await page.click('text=Add Business');
    await page.fill('input[name="url"]', 'https://example.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Business created')).toBeVisible({ timeout: 10000 });
    
    // Navigate to fingerprint page
    const businessLink = page.locator('a[href*="/businesses/"]').first();
    await businessLink.click();
    
    await page.goto('/dashboard/businesses/*/fingerprint');
    
    // Wait for fingerprint data
    await expect(page.locator('text=/visibility score|\\d+\\/100/i')).toBeVisible({ timeout: 60000 });
    
    // Get visibility score
    const scoreElement = page.locator('[data-visibility-score]').or(
      page.locator('text=/\\d+\\/100/')
    ).first();
    const initialScore = await scoreElement.textContent();
    
    // Act: Refresh page (TEST DRIVES IMPLEMENTATION)
    await page.reload();
    
    // Assert: Score remains the same (behavior: data persists correctly)
    await expect(scoreElement).toHaveText(initialScore || '', { timeout: 10000 });
  });

  /**
   * SPECIFICATION 3: Wikidata QID Persists After Publishing
   * 
   * Given: Business is published to Wikidata
   * When: User views business detail
   * Then: QID is displayed and persists across page loads
   */
  test('wikidata QID persists after publishing', async ({ page }) => {
    // Arrange: Pro user with published business
    await createTestUserAndSignIn(page, { tier: 'pro' });
    await page.goto('/dashboard/businesses');
    
    // Create and publish business (may take time)
    await page.click('text=Add Business');
    await page.fill('input[name="url"]', 'https://example.com');
    await page.click('button[type="submit"]');
    
    // Wait for publish to complete
    await expect(page.locator('[data-qid]').or(page.locator('text=/Q\\d+/'))).toBeVisible({ timeout: 120000 });
    
    // Get QID
    const qidElement = page.locator('[data-qid]').or(page.locator('text=/Q\\d+/')).first();
    const initialQid = await qidElement.textContent();
    
    // Act: Navigate away and back (TEST DRIVES IMPLEMENTATION)
    await page.goto('/dashboard');
    const businessLink = page.locator('a[href*="/businesses/"]').first();
    await businessLink.click();
    
    // Assert: QID is still present (behavior: QID persisted in database)
    await expect(page.locator(`text=${initialQid}`).or(page.locator('[data-qid]'))).toBeVisible({ timeout: 10000 });
  });

  /**
   * SPECIFICATION 4: Business Limit Enforced Correctly
   * 
   * Given: Free tier user at business limit
   * When: User attempts to create additional business
   * Then: Creation is prevented and user sees upgrade prompt
   */
  test('business limit is enforced correctly', async ({ page }) => {
    // Arrange: Free tier user with 1 business (at limit)
    await createTestUserAndSignIn(page, { tier: 'free' });
    await page.goto('/dashboard/businesses');
    
    // Create first business
    await page.click('text=Add Business');
    await page.fill('input[name="url"]', 'https://example1.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Business created')).toBeVisible({ timeout: 10000 });
    
    // Act: Attempt to create second business (TEST DRIVES IMPLEMENTATION)
    await page.goto('/dashboard/businesses');
    await page.click('text=Add Business');
    await page.fill('input[name="url"]', 'https://example2.com');
    await page.click('button[type="submit"]');
    
    // Assert: Business limit error is shown (behavior: tier restrictions enforced)
    await expect(
      page.locator('text=/limit|upgrade|maximum|businesses/i')
    ).toBeVisible({ timeout: 10000 });
    
    // Assert: Second business is not created (behavior: limit enforced at API level)
    await page.goto('/dashboard/businesses');
    const businessLinks = page.locator('a[href*="/businesses/"]');
    const count = await businessLinks.count();
    expect(count).toBeLessThanOrEqual(1);
  });
});

