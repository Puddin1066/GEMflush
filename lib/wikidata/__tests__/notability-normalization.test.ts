import { describe, it, expect } from 'vitest';
import { NotabilityChecker } from '../notability-checker';

describe('NotabilityChecker - Name Normalization', () => {
  const checker = new NotabilityChecker();

  it('should normalize business names by removing timestamps', async () => {
    const businessName = 'RIDA Free Dental Care 1763324513662';
    const location = { city: 'Providence', state: 'RI', country: 'US' };

    // Mock the findReferences to avoid actual API calls
    const originalFindReferences = (checker as any).findReferences.bind(checker);
    (checker as any).findReferences = async (name: string) => {
      console.log(`[TEST] findReferences called with name: "${name}"`);
      // Verify the name is normalized (no timestamp)
      expect(name).toBe('RIDA Free Dental Care');
      expect(name).not.toContain('1763324513662');
      // Return empty to trigger the no references path
      return [];
    };

    const result = await checker.checkNotability(businessName, location);

    // Restore original method
    (checker as any).findReferences = originalFindReferences;

    // Verify result
    expect(result.isNotable).toBe(false);
    expect(result.seriousReferenceCount).toBe(0);
  });

  it('should normalize business names with shorter trailing numbers', async () => {
    const businessName = 'Test Business 123456';
    const location = { city: 'Test', state: 'TS', country: 'US' };

    const originalFindReferences = (checker as any).findReferences.bind(checker);
    (checker as any).findReferences = async (name: string) => {
      console.log(`[TEST] findReferences called with name: "${name}"`);
      expect(name).toBe('Test Business');
      expect(name).not.toContain('123456');
      return [];
    };

    await checker.checkNotability(businessName, location);

    (checker as any).findReferences = originalFindReferences;
  });

  it('should not modify names without trailing numbers', async () => {
    const businessName = 'RIDA Free Dental Care';
    const location = { city: 'Providence', state: 'RI', country: 'US' };

    const originalFindReferences = (checker as any).findReferences.bind(checker);
    (checker as any).findReferences = async (name: string) => {
      console.log(`[TEST] findReferences called with name: "${name}"`);
      expect(name).toBe('RIDA Free Dental Care');
      return [];
    };

    await checker.checkNotability(businessName, location);

    (checker as any).findReferences = originalFindReferences;
  });
});

