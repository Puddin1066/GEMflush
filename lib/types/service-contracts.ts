// Service Contracts - Optional explicit interfaces for services
// Your services already work with existing types, but this provides extra clarity

import {
  CrawlResult,
  CrawledData,
  FingerprintAnalysis,
  WikidataEntityData,
  WikidataPublishResult,
} from './gemflush';
import { 
  WikidataEntityDataContract,
  WikidataClaim as WikidataClaimStrict
} from './wikidata-contract';
import { Business } from '@/lib/db/schema';

/**
 * Web Crawler Service Contract
 * Implementation: lib/crawler/index.ts
 */
export interface IWebCrawler {
  crawl(url: string): Promise<CrawlResult>;
}

/**
 * LLM Fingerprinter Service Contract
 * Implementation: lib/llm/fingerprinter.ts
 */
export interface ILLMFingerprinter {
  fingerprint(business: Business): Promise<FingerprintAnalysis>;
}

/**
 * OpenRouter LLM Client Contract
 * Implementation: lib/llm/openrouter.ts
 */
export interface IOpenRouterClient {
  query(
    model: string,
    prompt: string
  ): Promise<{
    content: string;
    tokensUsed: number;
    model: string;
  }>;
}

/**
 * Wikidata Entity Builder Contract
 * Implementation: lib/wikidata/entity-builder.ts
 */
export interface IWikidataEntityBuilder {
  // Use strict contract type for better type safety
  buildEntity(business: Business | any): WikidataEntityDataContract;
  validateEntity(entity: WikidataEntityDataContract): boolean;
}

/**
 * Wikidata Publisher Contract
 * Implementation: lib/wikidata/publisher.ts
 */
export interface IWikidataPublisher {
  // Use strict contract type for better type safety
  publish(
    entity: WikidataEntityDataContract,
    target: 'test' | 'production'
  ): Promise<WikidataPublishResult>;
}

/**
 * API Response Types
 * Used by API routes in app/api/
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface JobResponse {
  jobId: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface BusinessCreateResponse {
  id: number;
  name: string;
  status: string;
}

/**
 * Service Error Types
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class CrawlerError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'CRAWLER_ERROR', 500, details);
    this.name = 'CrawlerError';
  }
}

export class LLMError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'LLM_ERROR', 500, details);
    this.name = 'LLMError';
  }
}

export class WikidataError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'WIKIDATA_ERROR', 500, details);
    this.name = 'WikidataError';
  }
}

