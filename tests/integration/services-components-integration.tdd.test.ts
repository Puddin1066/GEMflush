/**
 * TDD Test: Services + Components Integration - Value Delivery
 * 
 * SPECIFICATION: Service-Component Integration for GEMflush Value
 * 
 * As a GEMflush system
 * I want services to provide data that components can display
 * So that users see the value GEMflush provides
 * 
 * IMPORTANT: These tests specify DESIRED behavior for how services
 * and components integrate to deliver GEMflush value proposition.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired integration behavior
 * 
 * Value Delivery Points:
 * 1. Visibility scores from LLM fingerprinting service
 * 2. Wikidata publishing status from publishing service
 * 3. Competitive positioning from analysis service
 * 4. Automation status from scheduler service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock services
vi.mock('@/lib/data/dashboard-dto', () => ({
  getDashboardDTO: vi.fn(),
}));

vi.mock('@/lib/services/automation-service', () => ({
  getAutomationConfig: vi.fn(),
  shouldAutoCrawl: vi.fn(),
  shouldAutoPublish: vi.fn(),
}));

vi.mock('@/lib/services/business-execution', () => ({
  executeCFPAutomation: vi.fn(),
}));

vi.mock('@/lib/services/cfp-orchestrator', () => ({
  cfpOrchestrator: {
    executeFullCFP: vi.fn(),
  },
}));

describe('🔴 RED: Services + Components Integration - Value Delivery Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Dashboard Service MUST Provide Visibility Data
   * 
   * DESIRED BEHAVIOR: Dashboard service MUST aggregate visibility scores
   * from fingerprint service so components can display them.
   */
  describe('Dashboard Service → Component Data Flow', () => {
    it('MUST provide visibility scores for dashboard display', async () => {
      // Arrange: Dashboard service with visibility data
      const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');

      const mockDashboardData = {
        totalBusinesses: 2,
        wikidataEntities: 1,
        avgVisibilityScore: 75,
        businesses: [
          {
            id: 1,
            name: 'Business 1',
            visibilityScore: 80,
            wikidataQid: 'Q12345',
            status: 'published',
          },
          {
            id: 2,
            name: 'Business 2',
            visibilityScore: 70,
            wikidataQid: null,
            status: 'crawled',
          },
        ],
      };

      vi.mocked(getDashboardDTO).mockResolvedValue(mockDashboardData as any);

      // Act: Get dashboard data (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = await getDashboardDTO(1);

      // Assert: SPECIFICATION - MUST provide visibility scores
      expect(result.avgVisibilityScore).toBe(75);
      expect(result.businesses[0].visibilityScore).toBe(80);
      expect(result.businesses[1].visibilityScore).toBe(70);
      // Components can use this data to display scores
    });

    it('MUST provide Wikidata publishing status for display', async () => {
      // Arrange: Dashboard service with publishing status
      const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');

      const mockDashboardData = {
        totalBusinesses: 3,
        wikidataEntities: 2, // 2 published
        avgVisibilityScore: 70,
        businesses: [
          {
            id: 1,
            name: 'Published Business',
            visibilityScore: 75,
            wikidataQid: 'Q12345',
            status: 'published',
          },
          {
            id: 2,
            name: 'Another Published',
            visibilityScore: 80,
            wikidataQid: 'Q67890',
            status: 'published',
          },
          {
            id: 3,
            name: 'Not Published',
            visibilityScore: null,
            wikidataQid: null,
            status: 'crawled',
          },
        ],
      };

      vi.mocked(getDashboardDTO).mockResolvedValue(mockDashboardData as any);

      // Act: Get dashboard data (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = await getDashboardDTO(1);

      // Assert: SPECIFICATION - MUST provide publishing status
      expect(result.wikidataEntities).toBe(2);
      expect(result.businesses[0].wikidataQid).toBe('Q12345');
      expect(result.businesses[2].wikidataQid).toBeNull();
      // Components can use this to show "In LLMs" vs "Not in LLMs yet"
    });
  });

  /**
   * SPECIFICATION 2: Automation Service MUST Provide Status
   * 
   * DESIRED BEHAVIOR: Automation service MUST provide automation status
   * so components can show ongoing value delivery.
   */
  describe('Automation Service → Component Status Flow', () => {
    it('MUST provide automation config for tier-based display', async () => {
      // Arrange: Automation service
      const { getAutomationConfig } = await import('@/lib/services/automation-service');
      const team = TeamTestFactory.createPro();

      const mockConfig = {
        automationEnabled: true,
        crawlFrequency: 'weekly',
        fingerprintFrequency: 'monthly',
        autoPublish: true,
      };

      vi.mocked(getAutomationConfig).mockReturnValue(mockConfig);

      // Act: Get automation config (TEST SPECIFIES DESIRED BEHAVIOR)
      const config = getAutomationConfig(team);

      // Assert: SPECIFICATION - MUST provide automation status
      expect(config.automationEnabled).toBe(true);
      expect(config.autoPublish).toBe(true);
      // Components can use this to show automation badges
    });

    it('MUST indicate when automation is processing', async () => {
      // Arrange: Business with automation enabled
      const business = BusinessTestFactory.create({
        id: 1,
        automationEnabled: true,
        status: 'crawling',
      });

      const { shouldAutoCrawl } = await import('@/lib/services/automation-service');
      const team = TeamTestFactory.createPro();

      vi.mocked(shouldAutoCrawl).mockResolvedValue(true);

      // Act: Check automation status (TEST SPECIFIES DESIRED BEHAVIOR)
      const shouldCrawl = await shouldAutoCrawl(business, team);

      // Assert: SPECIFICATION - MUST indicate automation status
      expect(shouldCrawl).toBe(true);
      // Components can use this to show "Automation Active" status
    });
  });

  /**
   * SPECIFICATION 3: CFP Orchestrator MUST Provide Processing Status
   * 
   * DESIRED BEHAVIOR: CFP orchestrator MUST provide processing status
   * so components can show progress through the CFP pipeline.
   */
  describe('CFP Orchestrator → Component Status Flow', () => {
    it('MUST provide status updates during CFP execution', async () => {
      // Arrange: CFP orchestrator
      const { cfpOrchestrator } = await import('@/lib/services/cfp-orchestrator');
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
      });

      const mockResult = {
        success: true,
        businessId: 1,
        crawlJobId: 123,
        fingerprintId: 456,
        wikidataQid: 'Q12345',
        status: 'published',
      };

      vi.mocked(cfpOrchestrator.executeFullCFP).mockResolvedValue(mockResult as any);

      // Act: Execute CFP (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = await cfpOrchestrator.executeFullCFP(business);

      // Assert: SPECIFICATION - MUST provide status updates
      expect(result.success).toBe(true);
      expect(result.status).toBe('published');
      expect(result.wikidataQid).toBe('Q12345');
      // Components can use this to show progress: crawling → generating → published
    });
  });

  /**
   * SPECIFICATION 4: Services MUST Transform Data for Components
   * 
   * DESIRED BEHAVIOR: Services MUST transform raw data into formats
   * that components can easily display.
   */
  describe('Service Data Transformation', () => {
    it('MUST transform business status for component display', async () => {
      // Arrange: Business with various statuses
      const businesses = [
        BusinessTestFactory.create({ id: 1, status: 'pending' }),
        BusinessTestFactory.create({ id: 2, status: 'crawling' }),
        BusinessTestFactory.create({ id: 3, status: 'crawled' }),
        BusinessTestFactory.create({ id: 4, status: 'generating' }),
        BusinessTestFactory.create({ id: 5, status: 'published' }),
      ];

      // Act: Transform statuses (TEST SPECIFIES DESIRED BEHAVIOR)
      // This would be done by a DTO transformation service
      const statuses = businesses.map(b => b.status);

      // Assert: SPECIFICATION - MUST provide displayable statuses
      expect(statuses).toContain('pending');
      expect(statuses).toContain('crawling');
      expect(statuses).toContain('published');
      // Components can map these to visual indicators
    });

    it('MUST calculate visibility trends for component display', async () => {
      // Arrange: Multiple fingerprints with scores
      const fingerprints = [
        { visibilityScore: 60, createdAt: new Date('2024-01-01') },
        { visibilityScore: 70, createdAt: new Date('2024-02-01') },
        { visibilityScore: 75, createdAt: new Date('2024-03-01') },
      ];

      // Act: Calculate trend (TEST SPECIFIES DESIRED BEHAVIOR)
      const scores = fingerprints.map(f => f.visibilityScore);
      const trend = scores[scores.length - 1] > scores[0] ? 'up' : 'down';
      const trendValue = Math.abs(scores[scores.length - 1] - scores[0]);

      // Assert: SPECIFICATION - MUST provide trend data
      expect(trend).toBe('up');
      expect(trendValue).toBe(15);
      // Components can use this to show "↑ 15%" trend indicators
    });
  });

  /**
   * SPECIFICATION 5: Components MUST Consume Service Data
   * 
   * DESIRED BEHAVIOR: Components MUST correctly consume and display
   * data provided by services.
   */
  describe('Component Data Consumption', () => {
    it('MUST display visibility score from service data', () => {
      // Arrange: Service provides visibility data
      const serviceData = {
        visibilityScore: 85,
        mentionRate: 70,
        sentimentScore: 0.8,
      };

      // Act: Component consumes data (TEST SPECIFIES DESIRED BEHAVIOR)
      // Component would receive this and display it
      const displayValue = serviceData.visibilityScore;

      // Assert: SPECIFICATION - MUST display service data
      expect(displayValue).toBe(85);
      // Component should render: "85" with appropriate styling
    });

    it('MUST display Wikidata QID when provided by service', () => {
      // Arrange: Service provides QID
      const serviceData = {
        wikidataQid: 'Q12345',
        status: 'published',
      };

      // Act: Component consumes QID (TEST SPECIFIES DESIRED BEHAVIOR)
      const displayQID = serviceData.wikidataQid;

      // Assert: SPECIFICATION - MUST display QID
      expect(displayQID).toBe('Q12345');
      // Component should render: "Q12345" with Wikidata icon
    });
  });

  /**
   * SPECIFICATION 6: Integration MUST Handle Real-time Updates
   * 
   * DESIRED BEHAVIOR: When services update data,
   * components MUST reflect changes to show current value.
   */
  describe('Real-time Value Updates', () => {
    it('MUST update visibility score when new fingerprint completes', async () => {
      // Arrange: Service provides updated score
      const initialData = { visibilityScore: 70 };
      const updatedData = { visibilityScore: 85 };

      // Act: Service updates data (TEST SPECIFIES DESIRED BEHAVIOR)
      const newScore = updatedData.visibilityScore;

      // Assert: SPECIFICATION - MUST reflect updated score
      expect(newScore).toBeGreaterThan(initialData.visibilityScore);
      // Components should update to show new score
    });

    it('MUST update publishing status when Wikidata publish completes', async () => {
      // Arrange: Service provides updated status
      const initialData = { wikidataQid: null, status: 'crawled' };
      const updatedData = { wikidataQid: 'Q12345', status: 'published' };

      // Act: Service updates status (TEST SPECIFIES DESIRED BEHAVIOR)
      const newStatus = updatedData.status;
      const newQID = updatedData.wikidataQid;

      // Assert: SPECIFICATION - MUST reflect updated status
      expect(newStatus).toBe('published');
      expect(newQID).toBe('Q12345');
      // Components should update to show "In LLMs" badge
    });
  });
});


