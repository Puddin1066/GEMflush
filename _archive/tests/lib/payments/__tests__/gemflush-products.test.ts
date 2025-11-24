import { describe, it, expect } from 'vitest';
import { getGemflushProduct, GEMFLUSH_STRIPE_CONFIG } from '../gemflush-products';

describe('GEMflush Products', () => {
  describe('GEMFLUSH_STRIPE_CONFIG', () => {
    it('should have Pro and Agency products', () => {
      expect(GEMFLUSH_STRIPE_CONFIG.products).toHaveLength(2);
      expect(GEMFLUSH_STRIPE_CONFIG.products[0].name).toBe('Pro');
      expect(GEMFLUSH_STRIPE_CONFIG.products[1].name).toBe('Agency');
    });

    it('should have correct Pro product configuration', () => {
      const proProduct = GEMFLUSH_STRIPE_CONFIG.products[0];
      expect(proProduct.name).toBe('Pro');
      expect(proProduct.price).toBe(4900);
      expect(proProduct.interval).toBe('month');
      expect(proProduct.features).toContain('Up to 5 businesses');
      expect(proProduct.features).toContain('Wikidata publishing');
    });

    it('should have correct Agency product configuration', () => {
      const agencyProduct = GEMFLUSH_STRIPE_CONFIG.products[1];
      expect(agencyProduct.name).toBe('Agency');
      expect(agencyProduct.price).toBe(14900);
      expect(agencyProduct.interval).toBe('month');
      expect(agencyProduct.features).toContain('Up to 25 businesses');
      expect(agencyProduct.features).toContain('API access');
    });
  });

  describe('getGemflushProduct', () => {
    it('should find Pro product by name', () => {
      const product = getGemflushProduct('Pro');
      expect(product).toBeDefined();
      expect(product?.name).toBe('Pro');
    });

    it('should find Agency product by name', () => {
      const product = getGemflushProduct('Agency');
      expect(product).toBeDefined();
      expect(product?.name).toBe('Agency');
    });

    it('should be case-insensitive', () => {
      const product1 = getGemflushProduct('pro');
      const product2 = getGemflushProduct('PRO');
      const product3 = getGemflushProduct('Pro');

      expect(product1?.name).toBe('Pro');
      expect(product2?.name).toBe('Pro');
      expect(product3?.name).toBe('Pro');
    });

    it('should return undefined for unknown product', () => {
      const product = getGemflushProduct('Unknown');
      expect(product).toBeUndefined();
    });
  });
});

