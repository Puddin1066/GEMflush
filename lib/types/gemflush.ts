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
  // Rich business details
  businessDetails?: {
    industry?: string;
    sector?: string;
    businessType?: string;
    legalForm?: string;
    founded?: string;
    dissolved?: string;
    employeeCount?: number | string;
    revenue?: string;
    locations?: number;
    products?: string[];
    services?: string[];
    brands?: string[];
    parentCompany?: string;
    subsidiaries?: string[];
    partnerships?: string[];
    awards?: string[];
    certifications?: string[];
    targetMarket?: string;
    headquarters?: string;
    ceo?: string;
    stockSymbol?: string;
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
    processedAt: Date;
  };
}

// Wikidata types
export interface WikidataEntityData {
  labels: Record<string, { language: string; value: string }>;
  descriptions: Record<string, { language: string; value: string }>;
  claims: Record<string, WikidataClaim[]>;
  // LLM-generated suggestions
  llmSuggestions?: {
    suggestedProperties: Array<{
      property: string;
      propertyLabel: string;
      suggestedValue: string;
      confidence: number;
      reasoning: string;
    }>;
    suggestedReferences: Array<{
      url: string;
      title: string;
      relevance: number;
    }>;
    qualityScore: number;
    completeness: number;
    model: string;
    generatedAt: Date;
  };
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
  visibilityScore: number;
  mentionRate: number;
  sentimentScore: number;
  accuracyScore: number;
  avgRankPosition: number | null;
  llmResults: LLMResult[];
  competitiveBenchmark?: CompetitiveBenchmark;
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

