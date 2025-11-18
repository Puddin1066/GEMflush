// GEMflush TypeScript interfaces and types

export interface BusinessLocation {
  address?: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface CrawledData {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  structuredData?: Record<string, unknown>;
  metaTags?: Record<string, string>;
  founded?: string;
  categories?: string[];
  services?: string[];
  imageUrl?: string;
  // Rich business details
  // Note: Fields can be null (LLM returns null for missing data)
  businessDetails?: {
    industry?: string | null;
    sector?: string | null;
    businessType?: string | null;
    legalForm?: string | null;
    founded?: string | null;
    dissolved?: string | null;
    employeeCount?: number | string | null;
    revenue?: string | null;
    locations?: number | null;
    products?: string[] | null;
    services?: string[] | null;
    brands?: string[] | null;
    parentCompany?: string | null;
    subsidiaries?: string[] | null;
    partnerships?: string[] | null;
    awards?: string[] | null;
    certifications?: string[] | null;
    targetMarket?: string | null;
    headquarters?: string | null;
    ceo?: string | null;
    stockSymbol?: string | null;
  };
  // LLM-enhanced extraction
  llmEnhanced?: {
    extractedEntities: string[];
    businessCategory: string;
    serviceOfferings: string[];
    targetAudience: string;
    keyDifferentiators: string[];
    confidence: number;
    model: string;
    processedAt: Date | string; // Can be Date or ISO string
  };
}

// Wikidata types have been migrated to lib/types/wikidata-contract.ts
// Use WikidataEntityDataContract, WikidataClaim, and WikidataReference from './wikidata-contract' for strict typing

// LLM Fingerprinting types
export interface LLMResult {
  model: string;
  promptType: string;
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  accuracy: number;
  rankPosition: number | null;
  rawResponse: string;
  tokensUsed: number;
  // LLM reasoning and context
  reasoning?: string;
  confidence?: number;
  contextualRelevance?: number;
  competitorMentions?: string[];
  keyPhrases?: string[];
}

export interface CompetitiveBenchmark {
  rank: number;
  totalCompetitors: number;
  competitorScores: Array<{
    businessId: number;
    businessName: string;
    score: number;
  }>;
}

export interface FingerprintAnalysis {
  businessId: number;
  businessName: string;
  visibilityScore: number;
  mentionRate: number;
  sentimentScore: number;
  accuracyScore: number;
  avgRankPosition: number | null;
  llmResults: LLMResult[];
  generatedAt: Date;
  competitiveBenchmark?: CompetitiveBenchmark;
  competitiveLeaderboard?: {
    targetBusiness: {
      name: string;
      rank: number | null;
      mentionCount: number;
      avgPosition: number | null;
    };
    competitors: Array<{
      name: string;
      mentionCount: number;
      avgPosition: number;
      appearsWithTarget: number;
    }>;
    totalRecommendationQueries: number;
  };
  // LLM-generated insights
  insights?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    summary: string;
    confidenceLevel: 'high' | 'medium' | 'low';
    generatedBy: string;
  };
}

// Crawler types
export interface CrawlResult {
  success: boolean;
  data?: CrawledData;
  error?: string;
  url: string;
  crawledAt: Date;
}

// Plan configuration
export interface PlanFeatures {
  wikidataPublishing: boolean;
  fingerprintFrequency: 'monthly' | 'weekly' | 'daily';
  maxBusinesses: number;
  historicalData: boolean;
  competitiveBenchmark: boolean;
  progressiveEnrichment?: boolean;
  apiAccess?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  stripePriceId?: string;
  features: PlanFeatures;
}

// Job types
export interface CrawlJobResult {
  crawledData?: CrawledData;
  error?: string;
}

export interface FingerprintJobResult {
  fingerprintId: number;
  visibilityScore: number;
}

export interface WikidataPublishResult {
  qid: string;
  entityId: number;
  publishedTo: string;
}

