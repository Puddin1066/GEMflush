import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikidataSPARQLService } from '../sparql';

// Mock database
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => mockDbSelect(),
    insert: () => mockDbInsert(),
    update: () => mockDbUpdate(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  qidCache: {},
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  sql: vi.fn((str) => str),
}));

// Mock fetch for SPARQL queries
global.fetch = vi.fn();

describe('WikidataSPARQLService', () => {
  let service: WikidataSPARQLService;

  beforeEach(() => {
    service = new WikidataSPARQLService();
    vi.clearAllMocks();
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue({}),
      }),
    });
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    });
  });

  describe('findCityQID', () => {
    it('should return QID from memory cache (L1)', async () => {
      // Pre-populate memory cache
      (service as any).memoryCache.set('city:new york, ny', 'Q60');

      const result = await service.findCityQID('New York', 'NY');

      expect(result).toBe('Q60');
    });

    it('should return QID from database cache (L2)', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ qid: 'Q65' }]),
          }),
        }),
      });

      const result = await service.findCityQID('Los Angeles', 'CA');

      expect(result).toBe('Q65');
    });

    it('should return QID from local mapping (L3)', async () => {
      const result = await service.findCityQID('San Francisco', 'CA');

      expect(result).toBe('Q62');
    });

    it('should skip SPARQL when skipSparql is true', async () => {
      const result = await service.findCityQID('Unknown City', 'XX', 'Q30', true);

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should query SPARQL when not in cache and skipSparql is false', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: {
            bindings: [
              {
                city: { value: 'Q12345' },
              },
            ],
          },
        }),
      });

      const result = await service.findCityQID('Unknown City', 'XX', 'Q30', false);

      expect(global.fetch).toHaveBeenCalled();
      expect(result).toBe('Q12345');
    });
  });

  describe('findIndustryQID', () => {
    it('should return QID from memory cache', async () => {
      (service as any).memoryCache.set('industry:technology', 'Q11019');

      const result = await service.findIndustryQID('Technology');

      expect(result).toBe('Q11019');
    });

    it('should return QID from local mapping', async () => {
      const result = await service.findIndustryQID('restaurant');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should skip SPARQL when skipSparql is true', async () => {
      const result = await service.findIndustryQID('Unknown Industry', true);

      expect(result).toBeNull();
    });
  });

  describe('findLegalFormQID', () => {
    it('should return QID from memory cache', async () => {
      (service as any).memoryCache.set('legal_form:corporation', 'Q4830453');

      const result = await service.findLegalFormQID('Corporation');

      expect(result).toBe('Q4830453');
    });

    it('should return QID from local mapping', async () => {
      const result = await service.findLegalFormQID('LLC');

      expect(result).toBeDefined();
    });

    it('should return null for unknown legal form', async () => {
      const result = await service.findLegalFormQID('Unknown Form');

      expect(result).toBeNull();
    });
  });

  describe('validateQID', () => {
    it('should return true for valid QID', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          boolean: true,
        }),
      });

      const result = await service.validateQID('Q60');

      expect(result).toBe(true);
    });

    it('should return false for invalid QID', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          boolean: false,
        }),
      });

      const result = await service.validateQID('Q999999999');

      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

      const result = await service.validateQID('Q60');

      expect(result).toBe(false);
    });
  });
});

