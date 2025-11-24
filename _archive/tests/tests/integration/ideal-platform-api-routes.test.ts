/**
 * IDEAL PLATFORM OPERATION - API Routes TDD Specifications
 * 
 * This test suite defines the IDEAL API route behavior as executable specifications.
 * Tests are written FIRST to define API contracts, then routes satisfy them.
 * 
 * Based on: app/api/README.md
 * 
 * Principles:
 * - SOLID: Single responsibility per test, dependency injection
 * - DRY: Reusable test helpers and factories
 * - TDD: Tests ARE specifications written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  BusinessTestFactory,
  TeamTestFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies at module level (SOLID: Dependency Inversion)
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  createBusiness: vi.fn(),
  updateBusiness: vi.fn(),
  getBusinessesByTeamId: vi.fn(),
  getBusinessesByTeam: vi.fn(),
  getTeamForBusiness: vi.fn(),
  getBusinessCountByTeam: vi.fn(),
}));

vi.mock('@/lib/services/business-execution', () => ({
  autoStartProcessing: vi.fn(),
  executeCrawlJob: vi.fn(),
  executeFingerprint: vi.fn(),
}));

vi.mock('@/lib/gemflush/permissions', () => ({
  canPublishToWikidata: vi.fn(),
  canAddBusiness: vi.fn(),
  getMaxBusinesses: vi.fn(),
}));

vi.mock('@/lib/wikidata/service', () => ({
  wikidataService: {
    createAndPublishEntity: vi.fn(),
  },
}));

vi.mock('@/lib/data/dashboard-dto', () => ({
  getDashboardDTO: vi.fn(),
}));

describe('🎯 IDEAL PLATFORM OPERATION - API Routes', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockCreateBusiness: any;
  let mockGetBusinessesByTeamId: any;
  let mockGetBusinessesByTeam: any;
  let mockGetBusinessCountByTeam: any;
  let mockAutoStartProcessing: any;
  let mockCanPublishToWikidata: any;
  let mockCanAddBusiness: any;
  let mockGetMaxBusinesses: any;
  let mockWikidataService: any;
  let mockGetDashboardDTO: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked modules (SOLID: Dependency Inversion)
    const dbQueries = await import('@/lib/db/queries');
    const businessExecution = await import('@/lib/services/business-execution');
    const permissions = await import('@/lib/gemflush/permissions');
    const wikidata = await import('@/lib/wikidata/service');
    const dashboardDTO = await import('@/lib/data/dashboard-dto');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockCreateBusiness = dbQueries.createBusiness;
    mockGetBusinessesByTeamId = dbQueries.getBusinessesByTeamId;
    mockGetBusinessesByTeam = dbQueries.getBusinessesByTeam || vi.fn();
    mockGetBusinessCountByTeam = dbQueries.getBusinessCountByTeam;
    mockAutoStartProcessing = businessExecution.autoStartProcessing;
    mockCanPublishToWikidata = permissions.canPublishToWikidata;
    mockCanAddBusiness = permissions.canAddBusiness;
    mockGetMaxBusinesses = permissions.getMaxBusinesses;
    mockWikidataService = wikidata.wikidataService;
    mockGetDashboardDTO = dashboardDTO.getDashboardDTO;
  });

  /**
   * SPECIFICATION: Business Creation API
   * 
   * As a user
   * I want to create a business via API
   * So that I can start the CFP workflow
   * 
   * Acceptance Criteria:
   * - POST /api/business creates business
   * - Returns 201 with business data on success
   * - Returns 401 if not authenticated
   * - Returns 400 if validation fails
   * - Automatically starts CFP processing
   */
  describe('POST /api/business - Business Creation', () => {
    it('creates business and returns 201 with business data', async () => {
      // Arrange: Set up authenticated user and valid data
      const user = {
        id: 1,
        email: 'test@example.com',
        teamId: 1,
      };
      const team = TeamTestFactory.createPro();
      const businessData = {
        name: 'New Business',
        url: 'https://newbusiness.com',
        category: 'restaurant', // Lowercase enum value
        location: {
          city: 'Seattle',
          state: 'WA',
          country: 'US',
        },
      };
      const createdBusiness = BusinessTestFactory.create({
        ...businessData,
        id: 123,
        teamId: team.id,
      });

      mockGetUser.mockResolvedValue(user);
      mockGetTeamForUser.mockResolvedValue(team);
      mockGetBusinessCountByTeam.mockResolvedValue(0); // No existing businesses
      mockCanAddBusiness.mockReturnValue(true); // Can add business
      mockGetMaxBusinesses.mockReturnValue(5); // Pro tier limit
      mockCreateBusiness.mockResolvedValue(createdBusiness);
      mockAutoStartProcessing.mockResolvedValue(undefined);

      // Act: Import and call POST handler
      const { POST } = await import('@/app/api/business/route');
      const request = new NextRequest('http://localhost/api/business', {
        method: 'POST',
        body: JSON.stringify(businessData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      // Assert: Verify API contract
      expect(response.status).toBe(201);
      const data = await response.json();
      // Route returns { business: {...}, message: '...' } format
      expect(data.business).toBeDefined();
      expect(data.business.id).toBe(123);
      expect(data.business.name).toBe('New Business');
      expect(data.business.status).toBe('pending');
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange: No authenticated user
      mockGetUser.mockResolvedValue(null);

      // Act
      const { POST } = await import('@/app/api/business/route');
      const request = new NextRequest('http://localhost/api/business', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', url: 'https://example.com' }),
      });

      const response = await POST(request);

      // Assert: Verify 401 response
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  /**
   * SPECIFICATION: Business Processing API
   * 
   * As a user
   * I want to trigger CFP processing for my business
   * So that it gets crawled, fingerprinted, and published
   * 
   * Acceptance Criteria:
   * - POST /api/business/[id]/process triggers CFP workflow
   * - Returns 202 with job status
   * - Returns 401 if not authenticated
   * - Returns 403 if user doesn't own business
   * - Returns 400 if business not found
   */
  describe('POST /api/business/[id]/process - CFP Processing', () => {
    it('triggers CFP processing and returns 202', async () => {
      // Arrange
      const user = { id: 1, teamId: 1 };
      const business = BusinessTestFactory.create({
        id: 123,
        teamId: 1,
        status: 'pending',
      });

      mockGetUser.mockResolvedValue(user);
      mockGetBusinessById.mockResolvedValue(business);
      mockGetTeamForBusiness.mockResolvedValue(team);
      mockAutoStartProcessing.mockResolvedValue({
        success: true,
        businessId: business.id,
      });

      // Act
      const { POST } = await import('@/app/api/business/[id]/process/route');
      const request = new NextRequest('http://localhost/api/business/123/process', {
        method: 'POST',
      });

      const response = await POST(request, { params: { id: '123' } });

      // Assert: Verify API contract
      expect(response.status).toBe(202);
      expect(mockAutoStartProcessing).toHaveBeenCalledWith(business.id);
    });

    it('returns 403 when user does not own business', async () => {
      // Arrange
      const user = { id: 1, teamId: 1 };
      const business = BusinessTestFactory.create({
        id: 123,
        teamId: 999, // Different team
      });

      mockGetUser.mockResolvedValue(user);
      mockGetBusinessById.mockResolvedValue(business);

      // Act
      const { POST } = await import('@/app/api/business/[id]/process/route');
      const request = new NextRequest('http://localhost/api/business/123/process', {
        method: 'POST',
      });

      const response = await POST(request, { params: { id: '123' } });

      // Assert: Verify 403 response
      expect(response.status).toBe(403);
    });
  });

  /**
   * SPECIFICATION: Wikidata Publishing API
   * 
   * As a Pro tier user
   * I want to publish my business to Wikidata
   * So that it appears in the knowledge graph
   * 
   * Acceptance Criteria:
   * - POST /api/wikidata/publish publishes entity
   * - Returns 201 with QID on success
   * - Returns 401 if not authenticated
   * - Returns 403 if free tier user
   * - Returns 400 if business not crawled
   * - Returns 400 if business not notable
   */
  describe('POST /api/wikidata/publish - Wikidata Publishing', () => {
    it('publishes entity and returns 201 with QID', async () => {
      // Arrange
      const user = { id: 1, teamId: 1 };
      const team = TeamTestFactory.createPro();
      const business = BusinessTestFactory.createCrawled({
        id: 123,
        teamId: 1,
      });

      mockGetUser.mockResolvedValue(user);
      mockGetBusinessById.mockResolvedValue(business);
      mockGetTeamForBusiness.mockResolvedValue(team);
      mockCanPublishToWikidata.mockReturnValue(true);
      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        success: true,
        qid: 'Q123456',
      });

      // Act
      const { POST } = await import('@/app/api/wikidata/publish/route');
      const request = new NextRequest('http://localhost/api/wikidata/publish', {
        method: 'POST',
        body: JSON.stringify({ businessId: 123 }),
      });

      const response = await POST(request);

      // Assert: Verify API contract
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.qid).toBe('Q123456');
      expect(data.success).toBe(true);
    });

    it('returns 403 when free tier user tries to publish', async () => {
      // Arrange
      const user = { id: 1, teamId: 1 };
      const freeTeam = TeamTestFactory.createFree();
      const business = BusinessTestFactory.createCrawled({
        id: 123,
        teamId: 1,
      });

      mockGetUser.mockResolvedValue(user);
      mockGetBusinessById.mockResolvedValue(business);
      mockGetTeamForBusiness.mockResolvedValue(freeTeam);
      mockCanPublishToWikidata.mockReturnValue(false);

      // Act
      const { POST } = await import('@/app/api/wikidata/publish/route');
      const request = new NextRequest('http://localhost/api/wikidata/publish', {
        method: 'POST',
        body: JSON.stringify({ businessId: 123 }),
      });

      const response = await POST(request);

      // Assert: Verify 403 response
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('returns 400 when business not crawled', async () => {
      // Arrange
      const user = { id: 1, teamId: 1 };
      const team = TeamTestFactory.createPro();
      const business = BusinessTestFactory.create({
        id: 123,
        teamId: 1,
        status: 'pending', // Not crawled
      });

      mockGetUser.mockResolvedValue(user);
      mockGetBusinessById.mockResolvedValue(business);
      mockGetTeamForBusiness.mockResolvedValue(team);
      mockCanPublishToWikidata.mockReturnValue(true);

      // Act
      const { POST } = await import('@/app/api/wikidata/publish/route');
      const request = new NextRequest('http://localhost/api/wikidata/publish', {
        method: 'POST',
        body: JSON.stringify({ businessId: 123 }),
      });

      const response = await POST(request);

      // Assert: Verify 400 response
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  /**
   * SPECIFICATION: Business List API
   * 
   * As a user
   * I want to list my businesses
   * So that I can see all businesses in my account
   * 
   * Acceptance Criteria:
   * - GET /api/business returns list of businesses
   * - Returns 200 with business array
   * - Returns 401 if not authenticated
   * - Only returns businesses for user's team
   */
  describe('GET /api/business - Business List', () => {
    it('returns list of businesses for user team', async () => {
      // Arrange
      const user = { id: 1, teamId: 1 };
      const team = TeamTestFactory.createPro();
      const businesses = [
        BusinessTestFactory.create({ id: 1, teamId: 1 }),
        BusinessTestFactory.create({ id: 2, teamId: 1 }),
      ];

      mockGetUser.mockResolvedValue(user);
      mockGetTeamForUser.mockResolvedValue(team);
      mockGetDashboardDTO.mockResolvedValue({
        businesses: businesses.map(b => ({
          id: b.id,
          name: b.name,
          url: b.url,
          status: b.status,
        })),
      });

      // Act
      const { GET } = await import('@/app/api/business/route');
      const request = new NextRequest('http://localhost/api/business');

      const response = await GET(request);

      // Assert: Verify API contract
      expect(response.status).toBe(200);
      const data = await response.json();
      // Route returns { businesses: [...], maxBusinesses: ... }
      expect(data.businesses).toBeDefined();
      expect(Array.isArray(data.businesses)).toBe(true);
      expect(data.businesses.length).toBe(2);
      expect(data.businesses[0].id).toBe(1);
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      mockGetUser.mockResolvedValue(null);

      // Act
      const { GET } = await import('@/app/api/business/route');
      const request = new NextRequest('http://localhost/api/business');

      const response = await GET(request);

      // Assert: Verify 401 response
      expect(response.status).toBe(401);
    });
  });
});

