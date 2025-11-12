import { describe, it, expect } from 'vitest';
import { BUSINESS_PROPERTY_MAP, type PropertyMapping } from '../property-mapping';

describe('Property Mapping', () => {
  describe('BUSINESS_PROPERTY_MAP', () => {
    it('should contain required core properties', () => {
      expect(BUSINESS_PROPERTY_MAP['P31']).toBeDefined();
      expect(BUSINESS_PROPERTY_MAP['P856']).toBeDefined();
      expect(BUSINESS_PROPERTY_MAP['P1448']).toBeDefined();
    });

    it('should mark core properties as required', () => {
      expect(BUSINESS_PROPERTY_MAP['P31'].required).toBe(true);
      expect(BUSINESS_PROPERTY_MAP['P856'].required).toBe(true);
      expect(BUSINESS_PROPERTY_MAP['P1448'].required).toBe(true);
    });

    it('should have correct data types', () => {
      expect(BUSINESS_PROPERTY_MAP['P31'].dataType).toBe('item');
      expect(BUSINESS_PROPERTY_MAP['P856'].dataType).toBe('url');
      expect(BUSINESS_PROPERTY_MAP['P1448'].dataType).toBe('string');
    });

    it('should validate URL format for P856', () => {
      const validator = BUSINESS_PROPERTY_MAP['P856'].validator;
      expect(validator).toBeDefined();
      
      if (validator) {
        expect(validator('https://example.com')).toBe(true);
        expect(validator('http://example.com')).toBe(true);
        expect(validator('invalid-url')).toBe(false);
        expect(validator('not-a-url')).toBe(false);
      }
    });

    it('should have descriptive labels and descriptions', () => {
      Object.values(BUSINESS_PROPERTY_MAP).forEach((mapping: PropertyMapping) => {
        expect(mapping.label).toBeDefined();
        expect(mapping.label.length).toBeGreaterThan(0);
        expect(mapping.description).toBeDefined();
        expect(mapping.description.length).toBeGreaterThan(0);
      });
    });

    it('should have valid PIDs', () => {
      Object.keys(BUSINESS_PROPERTY_MAP).forEach(pid => {
        expect(pid).toMatch(/^P\d+$/);
      });
    });
  });

  describe('Property Mapping Structure', () => {
    it('should have consistent structure across all properties', () => {
      Object.values(BUSINESS_PROPERTY_MAP).forEach((mapping: PropertyMapping) => {
        expect(mapping).toHaveProperty('pid');
        expect(mapping).toHaveProperty('label');
        expect(mapping).toHaveProperty('description');
        expect(mapping).toHaveProperty('dataType');
        expect(mapping).toHaveProperty('required');
      });
    });

    it('should have valid data types', () => {
      const validDataTypes = ['item', 'string', 'time', 'quantity', 'url', 'coordinate'];
      
      Object.values(BUSINESS_PROPERTY_MAP).forEach((mapping: PropertyMapping) => {
        expect(validDataTypes).toContain(mapping.dataType);
      });
    });
  });
});

