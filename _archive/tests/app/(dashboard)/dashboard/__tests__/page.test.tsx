/**
 * Dashboard Page Tests
 * Tests key UX improvements: value-first messaging, LLM connection, stats cards
 * Note: Server component testing is limited - these tests verify key text content
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as queries from '@/lib/db/queries';
import * as dashboardDTO from '@/lib/data/dashboard-dto';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
}));

// Mock dashboard DTO
vi.mock('@/lib/data/dashboard-dto', () => ({
  getDashboardDTO: vi.fn(),
}));

describe('Dashboard Page - UX Improvements', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockTeam = {
    id: 'team-1',
    planName: 'pro',
    subscriptionStatus: 'active',
  };

  const mockDashboardData = {
    totalBusinesses: 2,
    wikidataEntities: 1,
    avgVisibilityScore: 75,
    businesses: [
      {
        id: 1,
        name: 'Test Business 1',
        location: 'San Francisco, CA',
        visibilityScore: 80,
        trend: 'up',
        trendValue: 10,
        lastFingerprint: '2 days ago',
        wikidataQid: 'Q12345',
      },
      {
        id: 2,
        name: 'Test Business 2',
        location: 'New York, NY',
        visibilityScore: 70,
        trend: 'down',
        trendValue: 5,
        lastFingerprint: '5 days ago',
        wikidataQid: null,
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(queries.getUser).mockResolvedValue(mockUser as any);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam as any);
    vi.mocked(dashboardDTO.getDashboardDTO).mockResolvedValue(mockDashboardData as any);
  });

  it('should have correct hero messaging in component structure', async () => {
    // Verify the component file contains the new messaging
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app/(dashboard)/dashboard/page.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toContain('Get Found by AI. Not Just Google.');
    expect(content).toContain('When customers ask ChatGPT, Claude, or Perplexity');
  });

  it('should have "Visible in LLMs" stat card text', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app/(dashboard)/dashboard/page.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toContain('Visible in LLMs');
    expect(content).toContain('Published to Wikidata • Discoverable by AI');
  });

  it('should have value explanation banner', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app/(dashboard)/dashboard/page.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toContain('How Wikidata Publishing Makes You Visible to AI');
    expect(content).toContain('This is the only automated service that does this');
  });

  it('should have LLM visibility badges in business cards', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app/(dashboard)/dashboard/page.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toContain('In LLMs');
    expect(content).toContain('Not in LLMs yet');
    expect(content).toContain('Discoverable by AI');
  });
});

