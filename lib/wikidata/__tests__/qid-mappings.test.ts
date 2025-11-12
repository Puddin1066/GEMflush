import { describe, it, expect } from 'vitest';
import {
  US_CITY_QIDS,
  INDUSTRY_QIDS,
  LEGAL_FORM_QIDS,
  US_STATE_QIDS,
  COUNTRY_QIDS,
} from '../qid-mappings';

describe('QID Mappings', () => {
  describe('US_CITY_QIDS', () => {
    it('should contain major US cities', () => {
      expect(US_CITY_QIDS['new york, ny']).toBe('Q60');
      expect(US_CITY_QIDS['los angeles, ca']).toBe('Q65');
      expect(US_CITY_QIDS['chicago, il']).toBe('Q1297');
      expect(US_CITY_QIDS['san francisco, ca']).toBe('Q62');
    });

    it('should have QIDs in correct format', () => {
      Object.values(US_CITY_QIDS).forEach(qid => {
        expect(qid).toMatch(/^Q\d+$/);
      });
    });

    it('should have normalized keys (lowercase)', () => {
      Object.keys(US_CITY_QIDS).forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });
    });
  });

  describe('INDUSTRY_QIDS', () => {
    it('should contain common industries', () => {
      expect(INDUSTRY_QIDS['restaurant']).toBeDefined();
      expect(INDUSTRY_QIDS['technology']).toBeDefined();
      expect(INDUSTRY_QIDS['healthcare']).toBeDefined();
    });

    it('should have QIDs in correct format', () => {
      Object.values(INDUSTRY_QIDS).forEach(qid => {
        expect(qid).toMatch(/^Q\d+$/);
      });
    });
  });

  describe('LEGAL_FORM_QIDS', () => {
    it('should contain common legal forms', () => {
      expect(LEGAL_FORM_QIDS['llc']).toBeDefined();
      expect(LEGAL_FORM_QIDS['corporation']).toBeDefined();
      expect(LEGAL_FORM_QIDS['partnership']).toBeDefined();
    });

    it('should have QIDs in correct format', () => {
      Object.values(LEGAL_FORM_QIDS).forEach(qid => {
        expect(qid).toMatch(/^Q\d+$/);
      });
    });
  });

  describe('US_STATE_QIDS', () => {
    it('should contain all US states', () => {
      expect(US_STATE_QIDS['california']).toBe('Q99');
      expect(US_STATE_QIDS['new york']).toBe('Q1384');
      expect(US_STATE_QIDS['texas']).toBe('Q1439');
    });

    it('should have QIDs in correct format', () => {
      Object.values(US_STATE_QIDS).forEach(qid => {
        expect(qid).toMatch(/^Q\d+$/);
      });
    });
  });

  describe('COUNTRY_QIDS', () => {
    it('should contain major countries', () => {
      expect(COUNTRY_QIDS['united states']).toBe('Q30');
      expect(COUNTRY_QIDS['canada']).toBe('Q16');
      expect(COUNTRY_QIDS['united kingdom']).toBe('Q145');
    });

    it('should have QIDs in correct format', () => {
      Object.values(COUNTRY_QIDS).forEach(qid => {
        expect(qid).toMatch(/^Q\d+$/);
      });
    });
  });

  describe('Mapping Coverage', () => {
    it('should have reasonable coverage for common entities', () => {
      expect(Object.keys(US_CITY_QIDS).length).toBeGreaterThan(20);
      expect(Object.keys(INDUSTRY_QIDS).length).toBeGreaterThan(20);
      expect(Object.keys(LEGAL_FORM_QIDS).length).toBeGreaterThan(5);
      expect(Object.keys(US_STATE_QIDS).length).toBeGreaterThan(40);
      expect(Object.keys(COUNTRY_QIDS).length).toBeGreaterThan(40);
    });
  });
});

