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
}

// Wikidata types
export interface WikidataEntityData {
  labels: Record<string, { language: string; value: string }>;
  descriptions: Record<string, { language: string; value: string }>;
  claims: Record<string, WikidataClaim[]>;
}

export interface WikidataClaim {
  mainsnak: {
    snaktype: string;
    property: string;
    datavalue: {
      value: unknown;
      type: string;
    };
  };
  type: string;
  rank?: string;
  references?: WikidataReference[];
}

export interface WikidataReference {
  snaks: Record<string, unknown[]>;
}

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
  visibilityScore: number;
  mentionRate: number;
  sentimentScore: number;
  accuracyScore: number;
  avgRankPosition: number | null;
  llmResults: LLMResult[];
  competitiveBenchmark?: CompetitiveBenchmark;
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

