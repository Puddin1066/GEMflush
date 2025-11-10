import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardDTO } from '../dashboard-dto';
import * as queries from '@/lib/db/queries';

// Mock the database queries module
vi.mock('@/lib/db/queries', () => ({
  getBusinessesByTeam: vi.fn(),
  getLatestFingerprint: vi.fn(),
}));

describe('getDashboardDTO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return dashboard data with correct structure', async () => {
    // Arrange - Mock database responses
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      {
        id: 1,
        name: 'Test Business',
        url: 'https://test.com',
        description: 'Test Description',
        location: {
          city: 'Oakland',
          state: 'CA',
          country: 'USA',
          coordinates: { lat: 37.8, lng: -122.2 },
        },
        wikidataQID: 'Q123',
        status: 'published',
        crawlData: null,
        teamId: 1,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue({
      id: 1,
      businessId: 1,
      visibilityScore: 85,
      llmResults: [],
      competitiveBenchmark: null,
      createdAt: new Date('2025-11-09'),
    } as any);

    // Act
    const result = await getDashboardDTO(1);

    // Assert - Verify DTO structure
    expect(result).toMatchObject({
      totalBusinesses: 1,
      wikidataEntities: 1,
      avgVisibilityScore: 85,
      businesses: expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          name: 'Test Business',
          location: 'Oakland, CA',
          visibilityScore: 85,
          trend: expect.stringMatching(/up|down|neutral/),
          wikidataQid: 'Q123',
          status: 'published',
        }),
      ]),
    });

    // Verify trend calculation
    expect(result.businesses[0].trend).toBe('up');
  });

  it('should handle businesses without fingerprints', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      {
        id: 2,
        name: 'New Business',
        location: null,
        wikidataQID: null,
        status: 'pending',
      } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue(null);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.businesses[0]).toMatchObject({
      id: '2',
      name: 'New Business',
      location: 'Location not set',
      visibilityScore: null,
      trend: 'neutral',
      lastFingerprint: 'Never',
      wikidataQid: null,
      status: 'pending',
    });
  });

  it('should handle empty business list', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([]);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.totalBusinesses).toBe(0);
    expect(result.wikidataEntities).toBe(0);
    expect(result.avgVisibilityScore).toBe(0);
    expect(result.businesses).toHaveLength(0);
  });

  it('should calculate average visibility score correctly', async () => {
    // Arrange - Multiple businesses with different scores
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      { id: 1, name: 'Business 1', wikidataQID: null } as any,
      { id: 2, name: 'Business 2', wikidataQID: null } as any,
      { id: 3, name: 'Business 3', wikidataQID: null } as any,
    ]);

    // Mock different scores for each business
    vi.mocked(queries.getLatestFingerprint)
      .mockResolvedValueOnce({ visibilityScore: 80, createdAt: new Date() } as any)
      .mockResolvedValueOnce({ visibilityScore: 90, createdAt: new Date() } as any)
      .mockResolvedValueOnce({ visibilityScore: 70, createdAt: new Date() } as any);

    // Act
    const result = await getDashboardDTO(1);

    // Assert - Average should be (80 + 90 + 70) / 3 = 80
    expect(result.avgVisibilityScore).toBe(80);
  });

  it('should exclude null scores from average calculation', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      { id: 1, name: 'Business 1' } as any,
      { id: 2, name: 'Business 2' } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint)
      .mockResolvedValueOnce({ visibilityScore: 100, createdAt: new Date() } as any)
      .mockResolvedValueOnce(null); // No fingerprint

    // Act
    const result = await getDashboardDTO(1);

    // Assert - Average should be 100 (only counting first business)
    expect(result.avgVisibilityScore).toBe(100);
  });

  it('should count Wikidata entities correctly', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      { id: 1, name: 'Published 1', wikidataQID: 'Q123' } as any,
      { id: 2, name: 'Published 2', wikidataQID: 'Q456' } as any,
      { id: 3, name: 'Not Published', wikidataQID: null } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue(null);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.totalBusinesses).toBe(3);
    expect(result.wikidataEntities).toBe(2);
  });

  it('should format timestamps correctly', async () => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      { id: 1, name: 'Test' } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue({
      visibilityScore: 80,
      createdAt: yesterday,
    } as any);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.businesses[0].lastFingerprint).toBe('Yesterday');
  });

  it('should format location correctly', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      {
        id: 1,
        name: 'Test',
        location: {
          city: 'San Francisco',
          state: 'California',
          country: 'USA',
          coordinates: { lat: 37.7, lng: -122.4 },
        },
      } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue(null);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.businesses[0].location).toBe('San Francisco, California');
  });

  it('should convert business ID to string', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      { id: 999, name: 'Test' } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue(null);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.businesses[0].id).toBe('999');
    expect(typeof result.businesses[0].id).toBe('string');
  });

  it('should set trend to "up" when fingerprint exists', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      { id: 1, name: 'Test' } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue({
      visibilityScore: 75,
      createdAt: new Date(),
    } as any);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.businesses[0].trend).toBe('up');
  });

  it('should set trend to "neutral" when no fingerprint exists', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockResolvedValue([
      { id: 1, name: 'Test' } as any,
    ]);

    vi.mocked(queries.getLatestFingerprint).mockResolvedValue(null);

    // Act
    const result = await getDashboardDTO(1);

    // Assert
    expect(result.businesses[0].trend).toBe('neutral');
  });

  it('should handle database query errors gracefully', async () => {
    // Arrange
    vi.mocked(queries.getBusinessesByTeam).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Act & Assert
    await expect(getDashboardDTO(1)).rejects.toThrow('Database connection failed');
  });
});

