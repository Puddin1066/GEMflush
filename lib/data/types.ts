/**
 * Data Transfer Object (DTO) Types
 * These define stable interfaces for UI consumption
 * Following Next.js Data Access Layer pattern
 * 
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer
 */

// ============================================================================
// Dashboard DTOs
// ============================================================================

/**
 * Dashboard overview data
 * Used by: app/(dashboard)/dashboard/page.tsx
 */
export interface DashboardDTO {
  totalBusinesses: number;
  wikidataEntities: number;
  avgVisibilityScore: number;
  businesses: DashboardBusinessDTO[];
}

/**
 * Business data for dashboard display
 * Simplified from full Business domain type
 */
export interface DashboardBusinessDTO {
  id: string;                        // Converted from number
  name: string;
  location: string;                  // Simplified: "San Francisco, CA"
  visibilityScore: number | null;    // From fingerprints table
  trend: 'up' | 'down' | 'neutral';  // Computed field
  trendValue: number;                // Future: actual trend calculation
  wikidataQid: string | null;
  lastFingerprint: string;           // Formatted: "2 days ago"
  status: 'published' | 'pending' | 'crawled';
}

// ============================================================================
// Business Detail DTOs (Future)
// ============================================================================

/**
 * Full business details for detail page
 * Used by: app/(dashboard)/dashboard/businesses/[id]/page.tsx (future)
 */
export interface BusinessDetailDTO {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  location: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  } | null;
  crawlInfo: {
    lastCrawled: string | null;     // Formatted date
    phone: string | null;
    email: string | null;
    socialLinks: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
    };
  } | null;
  visibilityInfo: {
    score: number | null;
    trend: 'up' | 'down' | 'neutral';
    lastChecked: string | null;
    summary: string;                 // e.g., "Mentioned in 3/5 models"
  } | null;
  wikidataInfo: {
    qid: string;
    url: string;
    status: 'published' | 'pending';
  } | null;
  status: 'published' | 'pending' | 'crawled';
  createdAt: string;                 // Formatted date
}

// ============================================================================
// Activity Feed DTOs (Future)
// ============================================================================

/**
 * Activity feed item
 * Used by: app/(dashboard)/dashboard/activity/page.tsx (future)
 */
export interface ActivityDTO {
  id: string;
  type: 'crawl' | 'fingerprint' | 'publish';
  businessId: string;
  businessName: string;
  status: 'completed' | 'failed' | 'processing' | 'queued';
  message: string;                   // Human-readable message
  timestamp: string;                 // Formatted: "2 hours ago"
  details?: {
    progress?: number;
    error?: string;
    result?: string;
  };
}

// ============================================================================
// Fingerprint DTOs (Future)
// ============================================================================

/**
 * Detailed fingerprint analysis
 * Used by: app/(dashboard)/dashboard/businesses/[id]/fingerprint/page.tsx (future)
 */
export interface FingerprintDetailDTO {
  visibilityScore: number;
  trend: 'up' | 'down' | 'neutral';
  summary: {
    mentionRate: number;             // Percentage (0-100)
    sentiment: 'positive' | 'neutral' | 'negative';
    topModels: string[];             // Top 3 performing models
    averageRank: number | null;
  };
  results: FingerprintResultDTO[];
  createdAt: string;
}

/**
 * Individual LLM result (filtered for UI)
 */
export interface FingerprintResultDTO {
  model: string;                     // Display name (not full ID)
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;                // 0-100
  rankPosition: number | null;
  // ❌ NO rawResponse (too technical for UI)
}

// ============================================================================
// Wikidata DTOs
// ============================================================================

/**
 * Wikidata publish DTO
 * Used by: app/api/wikidata/publish/route.ts, business detail page
 */
export interface WikidataPublishDTO {
  businessId: number;
  businessName: string;
  entity: {
    label: string;
    description: string;
    claimCount: number;              // Simplified: just count, not full claims
  };
  notability: {
    isNotable: boolean;
    confidence: number;              // 0-1
    reasons: string[];
    seriousReferenceCount: number;
    topReferences: Array<{
      title: string;
      url: string;
      source: string;
      trustScore: number;            // 0-100
    }>;
  };
  canPublish: boolean;               // Computed: meets all requirements?
  recommendation: string;            // Human-readable recommendation
}

/**
 * Wikidata entity status for display
 * Used by: Business detail page, dashboard cards
 */
export interface WikidataStatusDTO {
  qid: string | null;
  status: 'published' | 'pending' | 'not-started';
  url: string | null;                // Link to Wikidata page
  lastChecked: string | null;        // Formatted timestamp
  claimCount: number;                // Number of claims/properties
  notabilityScore: number | null;    // 0-100
}

/**
 * Wikidata entity detail DTO (rich view)
 * Used by: Business detail page - entity details section
 * 
 * Provides full entity information with PIDs, QIDs, and statements
 * for users who want to see/edit the complete Wikidata structure
 */
export interface WikidataEntityDetailDTO {
  qid: string | null;
  label: string;
  description: string;
  wikidataUrl: string | null;        // Direct link to Wikidata page
  lastUpdated: string | null;        // Formatted timestamp
  
  // Rich claim data
  claims: WikidataClaimDTO[];
  
  // Summary stats
  stats: {
    totalClaims: number;
    claimsWithReferences: number;
    referenceQuality: 'high' | 'medium' | 'low';
  };
  
  // Edit capabilities
  canEdit: boolean;
  editUrl: string | null;            // Link to Wikidata edit page
}

/**
 * Individual Wikidata claim (property-value pair)
 * Simplified from complex Wikidata claim structure
 */
export interface WikidataClaimDTO {
  pid: string;                       // Property ID (e.g., "P31")
  propertyLabel: string;             // Human-readable (e.g., "instance of")
  propertyDescription?: string;      // Help text for users
  
  // Value (different types)
  value: string | number | {
    qid: string;                     // For entity values (e.g., Q4830453)
    label: string;                   // Human-readable (e.g., "business")
  };
  valueType: 'item' | 'string' | 'time' | 'quantity' | 'coordinate' | 'url';
  
  // References (simplified)
  references: Array<{
    url: string;
    title: string;
    retrieved?: string;              // When was this reference checked?
  }>;
  
  // Metadata
  rank: 'preferred' | 'normal' | 'deprecated';
  hasQualifiers: boolean;            // Does this claim have qualifiers?
}

/**
 * Wikidata property suggestion (for entity enhancement)
 * Used by: Business detail page - suggested properties section
 */
export interface WikidataPropertySuggestionDTO {
  pid: string;
  propertyLabel: string;
  description: string;
  suggestedValue: string;
  confidence: number;                // 0-100
  reasoning: string;                 // Why add this property?
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Crawler DTOs
// ============================================================================

/**
 * Crawl result for display
 * Used by: Business detail page, crawl status
 */
export interface CrawlResultDTO {
  success: boolean;
  status: 'completed' | 'failed' | 'processing';
  lastCrawled: string | null;       // Formatted timestamp
  data: {
    phone: string | null;
    email: string | null;
    socialLinks: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
    };
    description: string | null;
    founded: string | null;
    categories: string[];            // Business categories found
  } | null;
  errorMessage: string | null;
}

