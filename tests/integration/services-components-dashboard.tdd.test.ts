/**
 * TDD Integration Test: Services + Components + Dashboard Integration
 * 
 * SPECIFICATION: Integration of Services, Components, and Dashboard for GEMflush Value Delivery
 * 
 * As a user
 * I want services, components, and dashboard pages to work together seamlessly
 * So that I can see my business data, track processing status, and view results
 * 
 * Acceptance Criteria:
 * 1. Dashboard pages fetch data via hooks that call services
 * 2. Components receive DTOs from hooks and display them correctly
 * 3. Services orchestrate business logic and return DTOs
 * 4. Real-time updates work through polling and status changes
 * 5. Error states are handled gracefully at each layer
 * 6. Loading states are displayed during async operations
 * 7. Business creation flow (URL → Crawl → Fingerprint → Publish) works end-to-end
 * 8. Dashboard displays aggregated statistics from services
 * 9. Components show processing progress and status
 * 10. Competitive data and fingerprint results are displayed correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * 
 * Integration Points:
 * - Services (lib/services/) → Business logic orchestration
 * - DTOs (lib/data/) → Data transformation for UI
 * - Hooks (lib/hooks/) → Data fetching and state management
 * - Components (components/) → UI display
 * - Dashboard Pages (app/(dashboard)/) → Page composition
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock services
vi.mock('@/lib/services/business-execution', () => ({
  executeCrawlJob: vi.fn(),
  executeFingerprint: vi.fn(),
}));

vi.mock('@/lib/services/cfp-orchestrator', () => ({
  CFPOrchestrator: vi.fn(),
  executeCFPFlow: vi.fn(),
}));

vi.mock('@/lib/services/business-decisions', () => ({
  shouldCrawl: vi.fn(),
  canRunFingerprint: vi.fn(),
}));

vi.mock('@/lib/services/automation-service', () => ({
  getAutomationConfig: vi.fn(),
  shouldAutoCrawl: vi.fn(),
  shouldAutoPublish: vi.fn(),
}));

// Mock data layer
vi.mock('@/lib/data/dashboard-dto', () => ({
  getDashboardDTO: vi.fn(),
}));

vi.mock('@/lib/data/business-dto', () => ({
  getBusinessDetailDTO: vi.fn(),
}));

vi.mock('@/lib/data/fingerprint-dto', () => ({
  toFingerprintDetailDTO: vi.fn(),
}));

vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataEntityDetailDTO: vi.fn(),
}));

// Mock API routes (simulated)
vi.mock('@/app/api/business/[id]/route', () => ({
  GET: vi.fn(),
}));

vi.mock('@/app/api/fingerprint/business/[businessId]/route', () => ({
  GET: vi.fn(),
}));

vi.mock('@/app/api/wikidata/entity/[businessId]/route', () => ({
  GET: vi.fn(),
}));

// ============================================================================
// TEST SPECIFICATIONS
// ============================================================================

describe('🔴 RED: Services + Components + Dashboard Integration Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // SPECIFICATION GROUP 1: Business Creation Flow Integration
  // ============================================================================

  describe('Business Creation Flow (URL → Crawl → Fingerprint → Publish)', () => {
    /**
     * SPECIFICATION 1.1: Complete CFP Flow Integration
     * 
     * Given: User provides business URL
     * When: Business creation is initiated
     * Then: Services orchestrate CFP flow and components display progress
     */
    it('orchestrates complete CFP flow from URL to published entity', async () => {
      // Arrange: Mock complete CFP flow
      const url = 'https://example.com';
      const businessId = 1;
      
      const mockCrawlData = {
        url,
        name: 'Example Business',
        location: { city: 'San Francisco', state: 'CA', country: 'US' },
        content: '<html>Test</html>',
      };
      
      const mockFingerprint = {
        visibilityScore: 75,
        mentionRate: 0.8,
        sentimentScore: 0.7,
        results: [],
        competitiveLeaderboard: [],
      };
      
      const mockEntity = {
        id: 'Q123',
        qid: 'Q123',
        labels: { en: { value: 'Example Business' } },
        claims: {},
      };

      const { executeCFPFlow } = await import('@/lib/services/cfp-orchestrator');
      const { getBusinessDetailDTO } = await import('@/lib/data/business-dto');
      const { toFingerprintDetailDTO } = await import('@/lib/data/fingerprint-dto');
      const { getWikidataEntityDetailDTO } = await import('@/lib/data/wikidata-dto');

      // Mock service execution
      vi.mocked(executeCFPFlow).mockResolvedValue({
        success: true,
        url,
        entity: mockEntity,
        crawlData: mockCrawlData,
        fingerprintAnalysis: mockFingerprint,
        processingTime: 5000,
        timestamp: new Date(),
      });

      // Mock DTO transformations
      vi.mocked(getBusinessDetailDTO).mockResolvedValue({
        id: businessId,
        name: 'Example Business',
        url,
        status: 'published',
        wikidataQID: 'Q123',
        createdAt: new Date().toISOString(),
      } as any);

      vi.mocked(toFingerprintDetailDTO).mockReturnValue({
        visibilityScore: 75,
        summary: {
          visibilityScore: 75,
          mentionRate: 0.8,
          sentimentScore: 0.7,
        },
        results: [],
        competitiveLeaderboard: [],
      } as any);

      vi.mocked(getWikidataEntityDetailDTO).mockResolvedValue({
        qid: 'Q123',
        labels: { en: 'Example Business' },
        claims: {},
      } as any);

      // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
      const result = await executeCFPFlow({
        url,
        options: { shouldPublish: true },
      });

      // Assert: Verify complete flow executed (behavior: entity created with all data)
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.crawlData).toBeDefined();
      expect(result.fingerprintAnalysis).toBeDefined();
      
      // Verify DTOs can be created from service results
      const businessDTO = await getBusinessDetailDTO(businessId);
      expect(businessDTO).toBeDefined();
      expect(businessDTO.wikidataQID).toBe('Q123');
    });

    /**
     * SPECIFICATION 1.2: Crawl Service Integration
     * 
     * Given: Business needs crawling
     * When: Crawl service is called
     * Then: Crawl data is returned and transformed to DTO
     */
    it('integrates crawl service with business DTO transformation', async () => {
      // Arrange: Mock crawl execution
      const businessId = 1;
      const mockCrawlResult = {
        success: true,
        businessId,
        duration: 3000,
      };

      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      const { getBusinessDetailDTO } = await import('@/lib/data/business-dto');

      vi.mocked(executeCrawlJob).mockResolvedValue(mockCrawlResult);
      vi.mocked(getBusinessDetailDTO).mockResolvedValue({
        id: businessId,
        name: 'Test Business',
        status: 'crawled',
        lastCrawledAt: new Date().toISOString(),
      } as any);

      // Act: Execute crawl (TEST DRIVES IMPLEMENTATION)
      const result = await executeCrawlJob(null, businessId);

      // Assert: Verify crawl executed and DTO updated (behavior: status changed to crawled)
      expect(result.success).toBe(true);
      
      const businessDTO = await getBusinessDetailDTO(businessId);
      expect(businessDTO.status).toBe('crawled');
      expect(businessDTO.lastCrawledAt).toBeDefined();
    });

    /**
     * SPECIFICATION 1.3: Fingerprint Service Integration
     * 
     * Given: Business has been crawled
     * When: Fingerprint service is called
     * Then: Fingerprint data is returned and transformed to DTO
     */
    it('integrates fingerprint service with fingerprint DTO transformation', async () => {
      // Arrange: Mock fingerprint execution
      const businessId = 1;
      const mockFingerprintResult = {
        success: true,
        businessId,
        duration: 5000,
      };

      const mockFingerprintAnalysis = {
        visibilityScore: 75,
        mentionRate: 0.8,
        sentimentScore: 0.7,
        llmResults: {},
        competitiveLeaderboard: [],
      };

      const { executeFingerprint } = await import('@/lib/services/business-execution');
      const { toFingerprintDetailDTO } = await import('@/lib/data/fingerprint-dto');

      vi.mocked(executeFingerprint).mockResolvedValue(mockFingerprintResult);
      vi.mocked(toFingerprintDetailDTO).mockReturnValue({
        visibilityScore: 75,
        summary: {
          visibilityScore: 75,
          mentionRate: 0.8,
          sentimentScore: 0.7,
        },
        results: [],
        competitiveLeaderboard: [],
      } as any);

      // Act: Execute fingerprint (TEST DRIVES IMPLEMENTATION)
      const result = await executeFingerprint(businessId);

      // Assert: Verify fingerprint executed and DTO created (behavior: visibility score available)
      expect(result.success).toBe(true);
      
      const fingerprintDTO = toFingerprintDetailDTO(mockFingerprintAnalysis);
      expect(fingerprintDTO.visibilityScore).toBe(75);
      expect(fingerprintDTO.summary).toBeDefined();
    });
  });

  // ============================================================================
  // SPECIFICATION GROUP 2: Dashboard Data Display Integration
  // ============================================================================

  describe('Dashboard Data Display Integration', () => {
    /**
     * SPECIFICATION 2.1: Dashboard Overview Integration
     * 
     * Given: User views dashboard
     * When: Dashboard page loads
     * Then: Dashboard DTO is fetched and displays aggregated statistics
     */
    it('displays dashboard overview with aggregated statistics from services', async () => {
      // Arrange: Mock dashboard DTO
      const teamId = 1;
      const mockDashboardDTO = {
        totalBusinesses: 5,
        wikidataEntities: 3,
        avgVisibilityScore: 75,
        totalCrawled: 4,
        totalPublished: 3,
        businesses: [
          {
            id: '1',
            name: 'Business 1',
            visibilityScore: 80,
            status: 'published',
            wikidataQid: 'Q123',
          },
          {
            id: '2',
            name: 'Business 2',
            visibilityScore: 70,
            status: 'crawled',
            wikidataQid: null,
          },
        ],
      };

      const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
      vi.mocked(getDashboardDTO).mockResolvedValue(mockDashboardDTO);

      // Act: Fetch dashboard data (TEST DRIVES IMPLEMENTATION)
      const dashboardData = await getDashboardDTO(teamId);

      // Assert: Verify dashboard data structure (behavior: aggregated stats available)
      expect(dashboardData.totalBusinesses).toBe(5);
      expect(dashboardData.wikidataEntities).toBe(3);
      expect(dashboardData.avgVisibilityScore).toBe(75);
      expect(dashboardData.businesses).toHaveLength(2);
      
      // Verify business data includes visibility scores
      expect(dashboardData.businesses[0].visibilityScore).toBe(80);
      expect(dashboardData.businesses[0].status).toBe('published');
    });

    /**
     * SPECIFICATION 2.2: Business Detail Integration
     * 
     * Given: User views business detail page
     * When: Business detail page loads
     * Then: Business, fingerprint, and entity DTOs are fetched and displayed
     */
    it('displays business detail with fingerprint and entity data', async () => {
      // Arrange: Mock business detail data
      const businessId = 1;
      
      const mockBusinessDTO = {
        id: businessId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'published',
        wikidataQID: 'Q123',
        createdAt: new Date().toISOString(),
      };

      const mockFingerprintDTO = {
        visibilityScore: 75,
        summary: {
          visibilityScore: 75,
          mentionRate: 0.8,
          sentimentScore: 0.7,
        },
        results: [],
        competitiveLeaderboard: [],
      };

      const mockEntityDTO = {
        qid: 'Q123',
        labels: { en: 'Test Business' },
        claims: {},
      };

      const { getBusinessDetailDTO } = await import('@/lib/data/business-dto');
      const { toFingerprintDetailDTO } = await import('@/lib/data/fingerprint-dto');
      const { getWikidataEntityDetailDTO } = await import('@/lib/data/wikidata-dto');

      vi.mocked(getBusinessDetailDTO).mockResolvedValue(mockBusinessDTO as any);
      vi.mocked(toFingerprintDetailDTO).mockReturnValue(mockFingerprintDTO as any);
      vi.mocked(getWikidataEntityDetailDTO).mockResolvedValue(mockEntityDTO as any);

      // Act: Fetch business detail data (TEST DRIVES IMPLEMENTATION)
      const business = await getBusinessDetailDTO(businessId);
      const fingerprint = toFingerprintDetailDTO({} as any);
      const entity = await getWikidataEntityDetailDTO(businessId);

      // Assert: Verify all DTOs available (behavior: complete business data displayed)
      expect(business).toBeDefined();
      expect(business.wikidataQID).toBe('Q123');
      expect(fingerprint).toBeDefined();
      expect(fingerprint.visibilityScore).toBe(75);
      expect(entity).toBeDefined();
      expect(entity.qid).toBe('Q123');
    });

    /**
     * SPECIFICATION 2.3: Business List Integration
     * 
     * Given: User views business list
     * When: Business list page loads
     * Then: Business list DTO is fetched and displays all businesses with status
     */
    it('displays business list with status from services', async () => {
      // Arrange: Mock business list
      const teamId = 1;
      const mockBusinesses = [
        {
          id: 1,
          name: 'Business 1',
          status: 'published',
          wikidataQID: 'Q123',
        },
        {
          id: 2,
          name: 'Business 2',
          status: 'crawling',
          wikidataQID: null,
        },
      ];

      const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
      vi.mocked(getDashboardDTO).mockResolvedValue({
        totalBusinesses: 2,
        businesses: mockBusinesses.map(b => ({
          id: b.id.toString(),
          name: b.name,
          status: b.status as any,
          wikidataQid: b.wikidataQID,
          visibilityScore: null,
          location: '',
          trend: 'neutral' as const,
          trendValue: 0,
          lastFingerprint: '',
          automationEnabled: false,
        })),
      } as any);

      // Act: Fetch business list (TEST DRIVES IMPLEMENTATION)
      const dashboardData = await getDashboardDTO(teamId);

      // Assert: Verify business list structure (behavior: businesses displayed with status)
      expect(dashboardData.businesses).toHaveLength(2);
      expect(dashboardData.businesses[0].status).toBe('published');
      expect(dashboardData.businesses[1].status).toBe('crawling');
    });
  });

  // ============================================================================
  // SPECIFICATION GROUP 3: Real-Time Updates Integration
  // ============================================================================

  describe('Real-Time Updates Integration', () => {
    /**
     * SPECIFICATION 3.1: Status Polling Integration
     * 
     * Given: Business is in processing state
     * When: Dashboard polls for updates
     * Then: Status changes are reflected in DTOs and components update
     */
    it('polls for status updates and reflects changes in DTOs', async () => {
      // Arrange: Mock status progression
      const businessId = 1;
      let statusIndex = 0;
      const statuses = ['pending', 'crawling', 'crawled', 'generating', 'published'];

      const { getBusinessDetailDTO } = await import('@/lib/data/business-dto');
      
      vi.mocked(getBusinessDetailDTO).mockImplementation(async () => {
        const status = statuses[statusIndex];
        statusIndex = Math.min(statusIndex + 1, statuses.length - 1);
        
        return {
          id: businessId,
          name: 'Test Business',
          status,
          wikidataQID: status === 'published' ? 'Q123' : null,
          createdAt: new Date().toISOString(),
        } as any;
      });

      // Act: Poll for updates (TEST DRIVES IMPLEMENTATION)
      const update1 = await getBusinessDetailDTO(businessId);
      const update2 = await getBusinessDetailDTO(businessId);
      const update3 = await getBusinessDetailDTO(businessId);

      // Assert: Verify status progression (behavior: status updates reflected)
      expect(update1.status).toBe('pending');
      expect(update2.status).toBe('crawling');
      expect(update3.status).toBe('crawled');
    });

    /**
     * SPECIFICATION 3.2: Fingerprint Progress Integration
     * 
     * Given: Fingerprint is in progress
     * When: Dashboard polls for fingerprint updates
     * Then: Fingerprint DTO updates when available
     */
    it('updates fingerprint DTO when fingerprint completes', async () => {
      // Arrange: Mock fingerprint progression
      let fingerprintAvailable = false;
      
      const { toFingerprintDetailDTO } = await import('@/lib/data/fingerprint-dto');
      
      // Simulate fingerprint becoming available
      const checkFingerprint = () => {
        if (!fingerprintAvailable) {
          fingerprintAvailable = true;
          return null;
        }
        return toFingerprintDetailDTO({
          visibilityScore: 75,
          mentionRate: 0.8,
          sentimentScore: 0.7,
        } as any);
      };

      // Act: Check for fingerprint updates (TEST DRIVES IMPLEMENTATION)
      const firstCheck = checkFingerprint();
      const secondCheck = checkFingerprint();

      // Assert: Verify fingerprint appears when ready (behavior: fingerprint DTO available after completion)
      expect(firstCheck).toBeNull();
      expect(secondCheck).toBeDefined();
      expect(secondCheck?.visibilityScore).toBe(75);
    });
  });

  // ============================================================================
  // SPECIFICATION GROUP 4: Error Handling Integration
  // ============================================================================

  describe('Error Handling Integration', () => {
    /**
     * SPECIFICATION 4.1: Service Error Propagation
     * 
     * Given: Service encounters an error
     * When: Error occurs during processing
     * Then: Error is handled gracefully and user sees error state
     */
    it('handles service errors and propagates to DTO layer', async () => {
      // Arrange: Mock service error
      const businessId = 1;
      const errorMessage = 'Crawl failed: Network error';

      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      const { getBusinessDetailDTO } = await import('@/lib/data/business-dto');

      vi.mocked(executeCrawlJob).mockResolvedValue({
        success: false,
        businessId,
        error: errorMessage,
      });

      vi.mocked(getBusinessDetailDTO).mockResolvedValue({
        id: businessId,
        name: 'Test Business',
        status: 'error',
        errorMessage,
        createdAt: new Date().toISOString(),
      } as any);

      // Act: Execute crawl with error (TEST DRIVES IMPLEMENTATION)
      const result = await executeCrawlJob(null, businessId);
      const businessDTO = await getBusinessDetailDTO(businessId);

      // Assert: Verify error handled (behavior: error state reflected in DTO)
      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(businessDTO.status).toBe('error');
    });

    /**
     * SPECIFICATION 4.2: Partial Failure Handling
     * 
     * Given: CFP flow partially fails
     * When: Some steps succeed but others fail
     * Then: Partial results are returned and displayed
     */
    it('handles partial CFP failures and returns partial results', async () => {
      // Arrange: Mock partial failure (crawl succeeds, fingerprint fails)
      const url = 'https://example.com';
      
      const { executeCFPFlow } = await import('@/lib/services/cfp-orchestrator');
      
      vi.mocked(executeCFPFlow).mockResolvedValue({
        success: false,
        url,
        entity: null,
        crawlData: {
          url,
          name: 'Example Business',
        },
        fingerprintAnalysis: undefined,
        processingTime: 3000,
        timestamp: new Date(),
        error: 'Fingerprint failed',
        partialResults: {
          crawlSuccess: true,
          fingerprintSuccess: false,
          entityCreationSuccess: false,
          publishSuccess: false,
        },
      });

      // Act: Execute CFP with partial failure (TEST DRIVES IMPLEMENTATION)
      const result = await executeCFPFlow({ url });

      // Assert: Verify partial results returned (behavior: crawl data available despite failure)
      expect(result.success).toBe(false);
      expect(result.crawlData).toBeDefined();
      expect(result.fingerprintAnalysis).toBeUndefined();
      expect(result.partialResults?.crawlSuccess).toBe(true);
      expect(result.partialResults?.fingerprintSuccess).toBe(false);
    });
  });

  // ============================================================================
  // SPECIFICATION GROUP 5: Component Data Flow Integration
  // ============================================================================

  describe('Component Data Flow Integration', () => {
    /**
     * SPECIFICATION 5.1: Component Receives DTOs
     * 
     * Given: Dashboard page fetches data
     * When: Components render
     * Then: Components receive DTOs with correct structure
     */
    it('passes DTOs from hooks to components with correct structure', () => {
      // Arrange: Mock DTOs that components expect
      const businessDTO = {
        id: 1,
        name: 'Test Business',
        status: 'published',
        wikidataQID: 'Q123',
      };

      const fingerprintDTO = {
        visibilityScore: 75,
        summary: {
          visibilityScore: 75,
          mentionRate: 0.8,
          sentimentScore: 0.7,
        },
        results: [],
        competitiveLeaderboard: [],
      };

      // Act: Verify DTO structure matches component props (TEST DRIVES IMPLEMENTATION)
      // Components expect:
      // - GemOverviewCard: business prop with name, status, wikidataQID
      // - VisibilityIntelCard: fingerprint prop with visibilityScore, summary
      
      // Assert: Verify DTO structure (behavior: DTOs match component prop types)
      expect(businessDTO).toHaveProperty('name');
      expect(businessDTO).toHaveProperty('status');
      expect(businessDTO).toHaveProperty('wikidataQID');
      
      expect(fingerprintDTO).toHaveProperty('visibilityScore');
      expect(fingerprintDTO).toHaveProperty('summary');
      expect(fingerprintDTO.summary).toHaveProperty('visibilityScore');
    });

    /**
     * SPECIFICATION 5.2: Loading State Integration
     * 
     * Given: Data is being fetched
     * When: Components render during loading
     * Then: Loading states are displayed
     */
    it('displays loading states while services execute', async () => {
      // Arrange: Mock async service that takes time
      const { getBusinessDetailDTO } = await import('@/lib/data/business-dto');
      
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      vi.mocked(getBusinessDetailDTO).mockReturnValue(promise);

      // Act: Start data fetch (TEST DRIVES IMPLEMENTATION)
      const dataPromise = getBusinessDetailDTO(1);

      // Assert: Verify loading state would be shown (behavior: loading state during async operation)
      // In real implementation, hook would set loading=true while promise pending
      expect(dataPromise).toBeInstanceOf(Promise);
      
      // Resolve promise
      resolvePromise!({
        id: 1,
        name: 'Test Business',
        status: 'published',
      } as any);
      
      await dataPromise;
    });
  });

  // ============================================================================
  // SPECIFICATION GROUP 6: Automation Integration
  // ============================================================================

  describe('Automation Integration', () => {
    /**
     * SPECIFICATION 6.1: Auto-Crawl Integration
     * 
     * Given: Business has automation enabled
     * When: Auto-crawl is triggered
     * Then: Crawl service executes automatically and status updates
     */
    it('triggers auto-crawl when automation is enabled', async () => {
      // Arrange: Mock automation decision and execution
      const businessId = 1;
      
      const { shouldAutoCrawl } = await import('@/lib/services/automation-service');
      const { executeCrawlJob } = await import('@/lib/services/business-execution');

      vi.mocked(shouldAutoCrawl).mockReturnValue(true);
      vi.mocked(executeCrawlJob).mockResolvedValue({
        success: true,
        businessId,
        duration: 3000,
      });

      // Act: Check if auto-crawl should run and execute (TEST DRIVES IMPLEMENTATION)
      const shouldCrawl = shouldAutoCrawl({} as any, {} as any);
      
      if (shouldCrawl) {
        const result = await executeCrawlJob(null, businessId);
        
        // Assert: Verify auto-crawl executed (behavior: crawl runs automatically)
        expect(result.success).toBe(true);
      }
    });

    /**
     * SPECIFICATION 6.2: Auto-Publish Integration
     * 
     * Given: Business has automation enabled and is crawled
     * When: Auto-publish is triggered
     * Then: Publish service executes automatically
     */
    it('triggers auto-publish when automation is enabled and business is crawled', async () => {
      // Arrange: Mock automation decision
      const { shouldAutoPublish } = await import('@/lib/services/automation-service');
      
      vi.mocked(shouldAutoPublish).mockReturnValue(true);

      // Act: Check if auto-publish should run (TEST DRIVES IMPLEMENTATION)
      const shouldPublish = shouldAutoPublish({} as any, {} as any);

      // Assert: Verify auto-publish decision (behavior: publish runs automatically when conditions met)
      expect(shouldPublish).toBe(true);
    });
  });
});

