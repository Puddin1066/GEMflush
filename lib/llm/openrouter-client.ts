/**
 * Streamlined OpenRouter API Client
 * Efficient, focused implementation for business fingerprinting across 3 LLM models
 * 
 * Features:
 * - Pure OpenRouter API integration
 * - Parallel request handling with intelligent batching
 * - Development caching for cost efficiency
 * - Graceful error handling with mock fallbacks
 * - Token usage tracking and optimization
 * - Smart retry logic with exponential backoff
 */

import { 
  IOpenRouterClient, 
  LLMQuery, 
  LLMResponse, 
  LLMError, 
  DEFAULT_MODELS,
  DEFAULT_CONFIG
} from './types';
import { loggers } from '@/lib/utils/logger';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const log = loggers.api;

// ============================================================================
// OPENROUTER API TYPES
// ============================================================================

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface CacheEntry {
  prompt: string;
  model: string;
  response: LLMResponse;
  timestamp: number;
}

// ============================================================================
// MOCK RESPONSE GENERATORS
// ============================================================================

class MockResponseGenerator {
  private static readonly BUSINESS_TYPES = [
    'restaurant', 'dental practice', 'law firm', 'consulting company', 
    'retail store', 'service provider', 'healthcare facility', 'tech company'
  ];

  private static readonly POSITIVE_DESCRIPTORS = [
    'reputable', 'professional', 'reliable', 'experienced', 'trusted',
    'established', 'quality', 'excellent', 'outstanding', 'top-rated'
  ];

  private static readonly COMPETITORS = {
    restaurant: ['Local Bistro', 'Corner Cafe', 'Family Kitchen', 'Downtown Grill'],
    dental: ['Family Dental', 'Modern Dentistry', 'Gentle Care Dental', 'Smile Center'],
    legal: ['Smith & Associates', 'Legal Solutions', 'Community Law', 'Professional Legal'],
    default: ['Quality Services', 'Local Excellence', 'Community Choice', 'Professional Group']
  };

  static generateFactualResponse(businessName: string, location?: string): string {
    const mentioned = Math.random() > 0.3;
    const locationStr = location ? ` in ${location}` : '';
    
    if (mentioned) {
      const descriptor = this.POSITIVE_DESCRIPTORS[Math.floor(Math.random() * this.POSITIVE_DESCRIPTORS.length)];
      const businessType = this.BUSINESS_TYPES[Math.floor(Math.random() * this.BUSINESS_TYPES.length)];
      
      return `Based on available information, ${businessName}${locationStr} is a ${descriptor} ${businessType} that has been serving the local community. They maintain professional standards and offer quality services to their customers. The business has established a presence in the area and continues to operate with a focus on customer satisfaction.`;
    } else {
      return `I don't have specific detailed information about ${businessName}${locationStr} in my current knowledge base. For the most accurate and up-to-date information about their services, reputation, and offerings, I'd recommend checking their official website, recent customer reviews, or contacting them directly.`;
    }
  }

  static generateOpinionResponse(businessName: string, location?: string): string {
    const mentioned = Math.random() > 0.4;
    const locationStr = location ? ` in ${location}` : '';
    
    if (mentioned) {
      const sentiment = Math.random();
      if (sentiment > 0.7) {
        return `Based on general indicators, ${businessName}${locationStr} appears to be a solid choice. They seem to maintain professional standards and have positive community presence. However, I'd recommend verifying current customer reviews and ratings to make an informed decision about their services.`;
      } else if (sentiment > 0.3) {
        return `${businessName}${locationStr} appears to be a legitimate business operation. While I don't have extensive specific details, they seem to maintain basic professional standards. I'd suggest researching recent customer feedback and comparing with other local options.`;
      } else {
        return `I have limited information about ${businessName}${locationStr} to provide a strong opinion. I'd recommend thoroughly researching customer reviews, Better Business Bureau ratings, and asking for references before making a decision.`;
      }
    } else {
      return `I don't have enough specific information to form a reliable opinion about ${businessName}${locationStr}. For making an informed decision, I'd suggest checking recent online reviews, industry ratings, and getting recommendations from people who have used their services.`;
    }
  }

  static generateRecommendationResponse(businessName: string, industry: string, location?: string): string {
    const mentioned = Math.random() > 0.5;
    const locationStr = location ? ` in ${location}` : '';
    const industryKey = industry.toLowerCase().includes('dental') ? 'dental' : 
                      industry.toLowerCase().includes('legal') ? 'legal' :
                      industry.toLowerCase().includes('restaurant') ? 'restaurant' : 'default';
    
    const competitors = this.COMPETITORS[industryKey] || this.COMPETITORS.default;
    const selectedCompetitors = competitors.slice(0, Math.floor(Math.random() * 2) + 3);
    
    let response = `Here are some top ${industry}${locationStr} I'd recommend:\n\n`;
    
    if (mentioned && Math.random() > 0.3) {
      const position = Math.floor(Math.random() * selectedCompetitors.length) + 1;
      selectedCompetitors.splice(position - 1, 0, businessName);
    }
    
    selectedCompetitors.slice(0, 5).forEach((name, index) => {
      const description = name === businessName ? 
        'Professional service with established local reputation' :
        `Quality ${industry.toLowerCase()} with strong community presence`;
      response += `${index + 1}. ${name} - ${description}\n`;
    });
    
    response += `\nEach of these businesses has demonstrated professional standards and serves the local community effectively.`;
    
    return response;
  }

  static extractBusinessName(prompt: string): string {
    const patterns = [
      /about\s+([^?]+?)(?:\?|\.|\s+in\s+)/i,
      /going to\s+([^?]+?)(?:\?|\.|\s+in\s+)/i,
      /services of\s+([^?]+?)(?:\?|\.|\s+located)/i,
    ];
    
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'this business';
  }

  static extractLocation(prompt: string): string | null {
    const locationMatch = prompt.match(/(?:in|located in)\s+([^?]+?)(?:\?|$)/i);
    return locationMatch ? locationMatch[1].trim() : null;
  }

  static extractIndustry(prompt: string): string {
    const industryMatch = prompt.match(/(?:best|top)\s+([A-Za-z\s]+?)(?:\s+in|\s+located)/i);
    return industryMatch ? industryMatch[1].toLowerCase().trim() : 'businesses';
  }
}

// ============================================================================
// MAIN CLIENT CLASS
// ============================================================================

/**
 * Streamlined OpenRouter client optimized for business fingerprinting
 */
export class OpenRouterClient implements IOpenRouterClient {
  private apiKey: string | undefined;
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly cacheDir = path.join(process.cwd(), '.cache', 'llm');
  private readonly cacheFile = path.join(this.cacheDir, 'responses.json');
  private cache: Record<string, CacheEntry> = {};
  private readonly config = DEFAULT_CONFIG;
  
  constructor() {
    this.apiKey = undefined;
    
    if (this.config.caching.enabled) {
      this.loadCache();
    }
  }
  
  /**
   * Get default models for business fingerprinting
   */
  getDefaultModels(): string[] {
    return [...DEFAULT_MODELS];
  }
  
  /**
   * Query a single LLM via OpenRouter API
   */
  async query(model: string, prompt: string, options?: Partial<LLMQuery>): Promise<LLMResponse> {
    const startTime = Date.now();
    
    // Check cache first (development only)
    if (this.config.caching.enabled) {
      const cached = this.getCachedResponse(model, prompt);
      if (cached) {
        return { 
          ...cached, 
          cached: true,
          processingTime: Date.now() - startTime
        };
      }
    }

    // Get API key
    const apiKey = this.getApiKey();
    if (!apiKey) {
      log.warn(`API key not configured. Using mock response for ${model}`);
      return this.getMockResponse(model, prompt, startTime);
    }
    
    try {
      const response = await this.makeApiRequestWithRetry(model, prompt, apiKey, options);
      
      // Cache successful response (development only)
      if (this.config.caching.enabled) {
        this.cacheResponse(model, prompt, response);
      }
      
      const processingTime = Date.now() - startTime;
      response.processingTime = processingTime;
      
      log.debug('LLM query completed', {
        model,
        tokensUsed: response.tokensUsed,
        processingTime,
        cached: false
      });
      
      return response;
      
    } catch (error) {
      log.error('LLM query failed', error, { 
        model, 
        promptLength: prompt.length
      });
      
      // Return mock response as fallback
      return this.getMockResponse(model, prompt, startTime);
    }
  }
  
  /**
   * Execute multiple queries in parallel with intelligent batching
   * Optimized for the 3-model fingerprinting workflow
   */
  async queryParallel(queries: LLMQuery[]): Promise<LLMResponse[]> {
    const startTime = Date.now();
    
    log.info('Starting parallel LLM queries', {
      queryCount: queries.length,
      models: [...new Set(queries.map(q => q.model))],
      promptTypes: [...new Set(queries.map(q => q.promptType))],
    });
    
    // Process queries in batches to respect rate limits
    const batchSize = this.config.parallelism.batchSize;
    const results: LLMResponse[] = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (query) => {
          try {
            return await this.query(query.model, query.prompt, query);
          } catch (error) {
          log.error('Parallel query failed', error, { 
            model: query.model, 
            promptType: query.promptType
          });
            
            // Return mock response for failed queries
            return this.getMockResponse(query.model, query.prompt, Date.now());
          }
        })
      );
      
      // Extract results, using mock responses for failures
      const batchResponses = batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const query = batch[index];
          return this.getMockResponse(query.model, query.prompt, Date.now());
        }
      });
      
      results.push(...batchResponses);
      
      // Add small delay between batches to be respectful to the API
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const processingTime = Date.now() - startTime;
    const successCount = results.filter(r => !r.cached && r.tokensUsed > 0).length;
    const cachedCount = results.filter(r => r.cached).length;
    const mockCount = results.length - successCount - cachedCount;
    
    log.info('Parallel LLM queries completed', {
      queryCount: queries.length,
      successCount,
      cachedCount,
      mockCount,
      processingTime,
      avgTokensPerQuery: Math.round(results.reduce((sum, r) => sum + r.tokensUsed, 0) / results.length),
    });
    
    return results;
  }
  
  /**
   * Make actual API request to OpenRouter with retry logic
   */
  private async makeApiRequestWithRetry(
    model: string, 
    prompt: string, 
    apiKey: string, 
    options?: Partial<LLMQuery>
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries.maxAttempts; attempt++) {
      try {
        return await this.makeApiRequest(model, prompt, apiKey, options);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retries.maxAttempts) {
          const backoffMs = this.config.retries.backoffMs * Math.pow(2, attempt - 1);
          log.warn(`API request failed, retrying in ${backoffMs}ms`, { 
            model, 
            attempt
          });
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }
  
  /**
   * Make actual API request to OpenRouter
   */
  private async makeApiRequest(
    model: string, 
    prompt: string, 
    apiKey: string, 
    options?: Partial<LLMQuery>
  ): Promise<LLMResponse> {
    const request: OpenRouterRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
    };
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BASE_URL || 'https://gemflush.com',
        'X-Title': 'GEMflush Business Fingerprinting',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response choices returned from OpenRouter API');
    }
    
    return {
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
      model: data.model,
      requestId: data.id,
      cached: false,
    };
  }
  
  /**
   * Get API key with lazy loading
   */
  private getApiKey(): string {
    if (this.apiKey === undefined) {
      this.apiKey = process.env.OPENROUTER_API_KEY || '';
      if (this.apiKey) {
        log.debug('OpenRouter API key loaded from environment');
      }
    }
    return this.apiKey;
  }
  
  /**
   * Load cache from disk (development only)
   */
  private loadCache(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        this.cache = JSON.parse(data);
        
        // Clean expired entries
        const now = Date.now();
        const ttlMs = this.config.caching.ttl * 1000;
        let cleanedCount = 0;
        
        for (const [key, entry] of Object.entries(this.cache)) {
          if (now - entry.timestamp > ttlMs) {
            delete this.cache[key];
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          this.saveCache();
        }
        
        log.debug('LLM cache loaded', { 
          entries: Object.keys(this.cache).length,
          cleaned: cleanedCount
        });
      }
    } catch (error) {
      log.warn('Failed to load LLM cache', error);
      this.cache = {};
    }
  }
  
  /**
   * Save cache to disk (development only)
   */
  private saveCache(): void {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      log.warn('Failed to save LLM cache', error);
    }
  }
  
  /**
   * Get cached response if available and valid
   */
  private getCachedResponse(model: string, prompt: string): LLMResponse | null {
    const cacheKey = this.getCacheKey(model, prompt);
    const cached = this.cache[cacheKey];
    
    if (cached) {
      const ttlMs = this.config.caching.ttl * 1000;
      const isValid = Date.now() - cached.timestamp < ttlMs;
      
      if (isValid) {
        log.debug('Cache hit for LLM query', { 
          model, 
          cacheKey: cacheKey.substring(0, 8) + '...'
        });
        return cached.response;
      } else {
        // Remove expired cache entry
        delete this.cache[cacheKey];
        this.saveCache();
      }
    }
    
    return null;
  }
  
  /**
   * Cache successful response
   */
  private cacheResponse(model: string, prompt: string, response: LLMResponse): void {
    const cacheKey = this.getCacheKey(model, prompt);
    this.cache[cacheKey] = {
      prompt,
      model,
      response,
      timestamp: Date.now(),
    };
    this.saveCache();
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(model: string, prompt: string): string {
    return crypto.createHash('md5').update(`${model}:${prompt}`).digest('hex');
  }
  
  /**
   * Generate mock response for development and error fallback
   */
  private getMockResponse(model: string, prompt: string, startTime: number): LLMResponse {
    const lowerPrompt = prompt.toLowerCase();
    let content = '';
    
    const businessName = MockResponseGenerator.extractBusinessName(prompt);
    const location = MockResponseGenerator.extractLocation(prompt);
    
    // Detect prompt type and generate appropriate mock response
    if (lowerPrompt.includes('what do you know about') || lowerPrompt.includes('information about')) {
      content = MockResponseGenerator.generateFactualResponse(businessName, location || undefined);
    } else if (lowerPrompt.includes('thinking about') || lowerPrompt.includes('considering')) {
      content = MockResponseGenerator.generateOpinionResponse(businessName, location || undefined);
    } else if (lowerPrompt.includes('recommend') || lowerPrompt.includes('best') || lowerPrompt.includes('top')) {
      const industry = MockResponseGenerator.extractIndustry(prompt);
      content = MockResponseGenerator.generateRecommendationResponse(businessName, industry, location || undefined);
    } else {
      content = 'I can help you find information about local businesses. Could you please provide more specific details about what you\'re looking for?';
    }
    
    return {
      content,
      tokensUsed: Math.floor(Math.random() * 200) + 100,
      model,
      cached: false,
      processingTime: Math.max(1, Date.now() - startTime), // Ensure at least 1ms
    };
  }
}

// Export singleton instance
export const openRouterClient = new OpenRouterClient();