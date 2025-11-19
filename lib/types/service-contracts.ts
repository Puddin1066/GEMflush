// Service Contracts - Optional explicit interfaces for services
// Your services already work with existing types, but this provides extra clarity

import {
  CrawlResult,
  CrawledData,
  FingerprintAnalysis,
  WikidataPublishResult,
} from './gemflush';
import { 
  WikidataEntityDataContract,
  WikidataClaim as WikidataClaimStrict,
  StoredEntityMetadata,
  NotabilityAssessment
} from './wikidata-contract';
import { Business } from '@/lib/db/schema';
import type {
  StripePriceDTO,
  StripeProductDTO,
  CreateCheckoutSessionInput,
  UpdateTeamSubscriptionInput,
} from '@/lib/payments/types';
import Stripe from 'stripe';

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
  buildEntity(business: Business | any): Promise<WikidataEntityDataContract> | WikidataEntityDataContract;
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
 * Manual Publish Storage Service Contract
 * Implementation: lib/wikidata/manual-publish-storage.ts
 */
export interface IManualPublishStorage {
  /**
   * Store entity JSON for manual publication
   * @param businessId - Business ID
   * @param businessName - Business name
   * @param entity - Assembled entity JSON
   * @param canPublish - Whether entity meets publication criteria
   * @param notability - Optional notability assessment
   */
  storeEntityForManualPublish(
    businessId: number,
    businessName: string,
    entity: WikidataEntityDataContract,
    canPublish: boolean,
    notability?: NotabilityAssessment
  ): Promise<void>;

  /**
   * List all stored entities
   * @returns Array of stored entity metadata
   */
  listStoredEntities(): Promise<StoredEntityMetadata[]>;

  /**
   * Load stored entity JSON
   * @param metadata - Entity metadata
   * @returns Entity JSON
   */
  loadStoredEntity(metadata: StoredEntityMetadata): Promise<WikidataEntityDataContract>;

  /**
   * Delete stored entity files
   * @param metadata - Entity metadata
   */
  deleteStoredEntity(metadata: StoredEntityMetadata): Promise<void>;
}

/**
 * Payment Service Contract
 * Implementation: lib/payments/stripe.ts
 */
export interface IPaymentService {
  /**
   * Create a Stripe checkout session
   * @param input - Checkout session input parameters
   * @throws Redirects to Stripe checkout or sign-up page
   */
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<void>;

  /**
   * Create a Stripe customer portal session
   * @param team - Team with Stripe customer ID
   * @returns Portal session with URL
   */
  createCustomerPortalSession(team: { stripeCustomerId: string | null; stripeProductId: string | null }): Promise<{ url: string }>;

  /**
   * Handle subscription change from Stripe webhook
   * @param subscription - Stripe subscription object
   */
  handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void>;

  /**
   * Get all active Stripe prices
   * @returns Array of Stripe price DTOs
   */
  getStripePrices(): Promise<StripePriceDTO[]>;

  /**
   * Get all active Stripe products
   * @returns Array of Stripe product DTOs
   */
  getStripeProducts(): Promise<StripeProductDTO[]>;
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

export class PaymentError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', 500, details);
    this.name = 'PaymentError';
  }
}

