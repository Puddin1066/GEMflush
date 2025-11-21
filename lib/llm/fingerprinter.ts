// LLM Fingerprinting service - tests business visibility across multiple LLMs

import { Business } from '@/lib/db/schema';
import { FingerprintAnalysis, LLMResult, CrawledData } from '@/lib/types/gemflush';
import { ILLMFingerprinter } from '@/lib/types/service-contracts';
import { openRouterClient } from './openrouter';
import { loggers } from '@/lib/utils/logger';

const log = loggers.fingerprint;

export class LLMFingerprinter implements ILLMFingerprinter {
  // Models confirmed to work with OpenRouter API
  // Note: Model availability depends on your OpenRouter API tier
  // Limited to 3 models (one per provider) to control costs while maintaining diversity
  private models = [
    // OpenAI - ChatGPT
    'openai/gpt-4-turbo',
    // Anthropic - Claude
    'anthropic/claude-3-opus',
    // Google - Gemini
    'google/gemini-pro',
  ];
  
  /**
   * Run full fingerprint analysis for a business
   * 
   * @param business - Business to fingerprint
   * @param options - Execution options
   *   - parallel: Run all queries in parallel (default: true, ~3-5s)
   *   - batchSize: Number of concurrent requests (default: 15, no batching)
   *   - sequential: Run queries one-by-one (legacy mode, ~45-60s)
   */
  async fingerprint(
    business: Business, 
    options: { parallel?: boolean; batchSize?: number } = {}
  ): Promise<FingerprintAnalysis> {
    const { parallel = true, batchSize = 15 } = options;
    const startTime = Date.now();
    const operationId = log.start('Fingerprint Analysis', {
      businessId: business.id,
      businessName: business.name,
      url: business.url,
    });
    
    // REQUIREMENT: crawlData is required for effective fingerprinting
    // Since input is only a URL, we need crawled data to provide context to LLMs
    if (!business.crawlData) {
      const error = new Error(
        'Crawl data is required for fingerprinting. Please complete crawl first.'
      );
      log.error('Fingerprint attempted without crawlData', error, {
        businessId: business.id,
        businessName: business.name,
        url: business.url,
      });
      throw error;
    }
    
    // Validate crawlData structure
    if (typeof business.crawlData !== 'object') {
      const error = new Error(
        'Invalid crawlData format. Expected object, got: ' + typeof business.crawlData
      );
      log.error('Invalid crawlData format', error, {
        businessId: business.id,
        crawlDataType: typeof business.crawlData,
      });
      throw error;
    }
    
    // Generate prompts (now guaranteed to have crawlData)
    const prompts = await this.generatePrompts(business);
    
    // Log generated prompts for debugging
    Object.entries(prompts).forEach(([type, prompt]) => {
      log.debug(`Generated ${type} prompt`, {
        businessId: business.id,
        promptType: type,
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...',
      });
    });
    
    // Build all query tasks
    const queryTasks = this.models.flatMap(model =>
      Object.entries(prompts).map(([promptType, prompt]) => ({
        model,
        promptType,
        prompt,
      }))
    );
    
    log.info(`Executing ${queryTasks.length} queries`, {
      businessId: business.id,
      models: this.models.length,
      promptTypes: Object.keys(prompts).length,
      mode: parallel ? 'parallel' : 'sequential',
      batchSize,
    });
    
    let llmResults: LLMResult[];
    
    if (parallel) {
      // Parallel execution with optional batching
      llmResults = await this.executeParallel(queryTasks, business.name, batchSize);
    } else {
      // Sequential execution (legacy mode)
      llmResults = await this.executeSequential(queryTasks, business.name);
    }
    
    // Log results summary
    const mentionedCount = llmResults.filter(r => r.mentioned).length;
    const errorCount = llmResults.filter(r => r.rawResponse?.startsWith('Error:')).length;
    log.info('Query execution completed', {
      businessId: business.id,
      totalQueries: llmResults.length,
      mentioned: mentionedCount,
      notMentioned: llmResults.length - mentionedCount,
      errors: errorCount,
      mentionRate: `${Math.round((mentionedCount / llmResults.length) * 100)}%`,
    });
    
    // Calculate overall metrics
    const analysis = this.calculateMetrics(llmResults, business);
    
    const totalDuration = Date.now() - startTime;
    log.performance('Fingerprint Analysis', totalDuration, {
      businessId: business.id,
      visibilityScore: analysis.visibilityScore,
      mentionRate: analysis.mentionRate,
      sentimentScore: analysis.sentimentScore,
      hasCompetitiveData: !!analysis.competitiveLeaderboard,
    });
    
    log.complete(operationId, 'Fingerprint Analysis', {
      businessId: business.id,
      visibilityScore: analysis.visibilityScore,
      mentionRate: analysis.mentionRate,
      resultsCount: llmResults.length,
    });
    
    return analysis;
  }
  
  /**
   * Execute queries in parallel with optional batching
   */
  private async executeParallel(
    tasks: Array<{ model: string; promptType: string; prompt: string }>,
    businessName: string,
    batchSize: number
  ): Promise<LLMResult[]> {
    const startTime = Date.now();
    
    if (batchSize >= tasks.length) {
      // No batching - all at once
      log.info(`Executing all ${tasks.length} queries in parallel`);
      const results = await Promise.allSettled(
        tasks.map(task => this.executeQuery(task, businessName))
      );
      
      const duration = Date.now() - startTime;
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      log.performance('Parallel query execution', duration, {
        total: tasks.length,
        successful,
        failed,
      });
      
      return results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<LLMResult>).value);
    } else {
      // Batched execution
      log.info(`Executing ${tasks.length} queries in batches of ${batchSize}`);
      const results: LLMResult[] = [];
      const totalBatches = Math.ceil(tasks.length / batchSize);
      
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        log.debug(`Processing batch ${batchNum}/${totalBatches}`, {
          batchSize: batch.length,
          batchNum,
          totalBatches,
        });
        
        const batchResults = await Promise.allSettled(
          batch.map(task => this.executeQuery(task, businessName))
        );
        
        const batchSuccessful = batchResults.filter(r => r.status === 'fulfilled').length;
        const batchFailed = batchResults.filter(r => r.status === 'rejected').length;
        
        log.debug(`Batch ${batchNum} completed`, {
          successful: batchSuccessful,
          failed: batchFailed,
        });
        
        results.push(
          ...batchResults
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<LLMResult>).value)
        );
      }
      
      const duration = Date.now() - startTime;
      log.performance('Batched query execution', duration, {
        total: tasks.length,
        successful: results.length,
        batches: totalBatches,
      });
      
      return results;
    }
  }
  
  /**
   * Execute queries sequentially (legacy mode)
   */
  private async executeSequential(
    tasks: Array<{ model: string; promptType: string; prompt: string }>,
    businessName: string
  ): Promise<LLMResult[]> {
    const startTime = Date.now();
    log.info(`Executing ${tasks.length} queries sequentially`);
    
    const results: LLMResult[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      log.debug(`Query ${i + 1}/${tasks.length}: ${task.model} (${task.promptType})`);
      const result = await this.executeQuery(task, businessName);
      results.push(result);
    }
    
    const duration = Date.now() - startTime;
    log.performance('Sequential query execution', duration, {
      total: tasks.length,
      successful: results.length,
    });
    
    return results;
  }
  
  /**
   * Execute a single query with error handling
   */
  private async executeQuery(
    task: { model: string; promptType: string; prompt: string },
    businessName: string
  ): Promise<LLMResult> {
    const queryStartTime = Date.now();
    
    try {
      log.debug(`Querying ${task.model} (${task.promptType})`, {
        model: task.model,
        promptType: task.promptType,
        promptLength: task.prompt.length,
      });
      
      const response = await openRouterClient.query(task.model, task.prompt);
      
      const queryDuration = Date.now() - queryStartTime;
      
      // Check if response looks like a mock (common mock patterns)
      const isMockResponse = response.content.includes('Based on available information') &&
        response.content.includes('reputable local establishment') &&
        !response.content.toLowerCase().includes(businessName.toLowerCase().split(' ')[0]);
      
      if (isMockResponse) {
        log.warn('Response appears to be mock data', {
          model: task.model,
          promptType: task.promptType,
          responsePreview: response.content.substring(0, 150),
        });
      }
      
      const analysis = await this.analyzeResponse(
        response.content,
        businessName,
        task.promptType
      );
      
      log.debug(`Query completed: ${task.model} (${task.promptType})`, {
        model: task.model,
        promptType: task.promptType,
        mentioned: analysis.mentioned,
        sentiment: analysis.sentiment,
        rankPosition: analysis.rankPosition,
        duration: queryDuration,
        tokensUsed: response.tokensUsed,
        responseLength: response.content.length,
        isMock: isMockResponse,
      });
      
      return {
        model: task.model,
        promptType: task.promptType,
        mentioned: analysis.mentioned,
        sentiment: analysis.sentiment,
        accuracy: analysis.accuracy,
        rankPosition: analysis.rankPosition,
        competitorMentions: analysis.competitorMentions,
        rawResponse: response.content,
        tokensUsed: response.tokensUsed,
        prompt: task.prompt, // Store the actual generated prompt
      };
    } catch (error) {
      const queryDuration = Date.now() - queryStartTime;
      log.error(`Error querying ${task.model} (${task.promptType})`, error, {
        model: task.model,
        promptType: task.promptType,
        duration: queryDuration,
      });
      
      return {
        model: task.model,
        promptType: task.promptType,
        mentioned: false,
        sentiment: 'neutral',
        accuracy: 0,
        rankPosition: null,
        rawResponse: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokensUsed: 0,
        prompt: task.prompt, // Store the actual generated prompt even for errors
      };
    }
  }
  
  /**
   * Get industry-specific plural term for recommendations using LLM-assisted logic
   * Replaces hard-coded mappings with intelligent classification
   * DRY: Centralized industry term mapping with LLM fallback
   * SOLID: Enhanced with LLM reasoning for edge cases and new industries
   */
  private async getIndustryPlural(industry?: string | null, category?: string | null, businessCategory?: string | null, services?: string[]): Promise<string> {
    // Try fast hard-coded mappings first (performance optimization)
    const quickResult = this.getQuickIndustryMapping(industry, category, businessCategory, services);
    if (quickResult !== 'unknown') {
      return quickResult;
    }
    
    // Fall back to LLM-assisted classification for edge cases and new industries
    return await this.getLLMIndustryClassification(industry, category, businessCategory, services);
  }
  
  /**
   * Fast hard-coded mappings for common industries (performance optimization)
   * Returns 'unknown' if no quick match found, triggering LLM classification
   */
  private getQuickIndustryMapping(industry?: string | null, category?: string | null, businessCategory?: string | null, services?: string[]): string {
    // Priority: services (for specificity) > industry > businessCategory > category
    let term = (industry || businessCategory || category || '').toLowerCase().trim();
    
    // Enhanced: Check services for more specific subcategories (e.g., pizza places vs restaurants)
    if (services && services.length > 0) {
      const serviceText = services.join(' ').toLowerCase();
      
      // Pizza-specific detection
      if (serviceText.includes('pizza')) {
        term = 'pizza';
      }
      // Coffee-specific detection
      else if (serviceText.includes('coffee') || serviceText.includes('espresso') || serviceText.includes('latte')) {
        term = 'coffee';
      }
      // Dental-specific detection
      else if (serviceText.includes('dental') || serviceText.includes('dentist') || serviceText.includes('teeth')) {
        term = 'dental';
      }
    }
    
    if (!term) return 'unknown';
    
    // Common industry mappings (keep most frequent ones for speed)
    const quickMap: Record<string, string> = {
      // Food & Hospitality (most common)
      'restaurant': 'restaurants',
      'pizza': 'pizza places',
      'coffee': 'coffee shops',
      'bar': 'bars',
      
      // Healthcare (common)
      'dental': 'dental practices',
      'medical': 'medical practices',
      'healthcare': 'healthcare providers',
      
      // Professional Services (common)
      'legal': 'law firms',
      'real estate': 'real estate agencies',
      
      // Retail (common)
      'retail': 'retail stores',
    };
    
    return quickMap[term] || 'unknown';
  }
  
  /**
   * LLM-assisted industry classification for edge cases and new industries
   * Provides intelligent reasoning when hard-coded mappings fail
   */
  private async getLLMIndustryClassification(industry?: string | null, category?: string | null, businessCategory?: string | null, services?: string[]): Promise<string> {
    const context = {
      industry: industry || 'unknown',
      category: category || 'unknown', 
      businessCategory: businessCategory || 'unknown',
      services: services || []
    };
    
    const prompt = `Classify this business into the most specific industry plural term for local search.

Business Context:
- Industry: ${context.industry}
- Category: ${context.category}
- Business Category: ${context.businessCategory}
- Services: ${context.services.join(', ') || 'none listed'}

Return ONLY the most specific plural term that customers would use to search locally.
Examples: "pizza places", "dental practices", "auto repair shops", "yoga studios"

If unclear, default to "businesses".

Classification:`;

    try {
      const response = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      const classification = response.content.trim().toLowerCase();
      
      // Validate response (must be reasonable plural term)
      if (classification.length > 3 && classification.length < 50 && !classification.includes('\n')) {
        log.debug('LLM industry classification', {
          input: context,
          classification,
          confidence: 'high'
        });
        return classification;
      }
    } catch (error) {
      log.warn('LLM industry classification failed', { error: error instanceof Error ? error.message : 'Unknown error', context });
    }
    
    // Fallback to generic term
    return 'businesses';
  }
  
  /**
   * Generate prompts that emulate customer query syntax
   * Designed to produce measurable responses about local business visibility
   * 
   * Customer queries are natural, location-focused, and search-oriented.
   * Responses enable objective measurement of visibility metrics:
   * - Mention detection (yes/no)
   * - Ranking position (1-5)
   * - Sentiment (positive/neutral/negative)
   * - Competitive context (who else is mentioned)
   * 
   * REQUIRES crawlData: Since input is only a URL, we need crawled data
   * to provide business context (industry, services, description) to LLMs.
   */
  private async generatePrompts(business: Business): Promise<{ factual: string; opinion: string; recommendation: string }> {
    // REQUIREMENT: crawlData must exist (validated in fingerprint() method)
    if (!business.crawlData || typeof business.crawlData !== 'object') {
      throw new Error('crawlData is required for prompt generation');
    }
    
    const crawlData = business.crawlData as CrawledData;
    
    // Extract rich context from crawlData (REQUIRED for effective prompts)
    // Since input is only a URL, we need all context from crawlData
    const industry = crawlData.businessDetails?.industry || crawlData.businessDetails?.sector || null;
    const businessCategory = crawlData.llmEnhanced?.businessCategory || null;
    const services = crawlData.services || crawlData.businessDetails?.services || [];
    const description = crawlData.description || null; // Description is on crawlData directly
    const founded = crawlData.founded || crawlData.businessDetails?.founded || null;
    const awards = crawlData.businessDetails?.awards || [];
    const certifications = crawlData.businessDetails?.certifications || [];
    
    // Get industry-specific plural term (enhanced with services for specificity)
    const industryPlural = await this.getIndustryPlural(industry, business.category, businessCategory, services);
    
    // Build service context from crawled data (more specific than category)
    const serviceContext = services.length > 0 
      ? services[0].toLowerCase()
      : business.category?.toLowerCase() || industryPlural;
    
    // Handle location - critical for local business visibility
    let location: string;
    let locationQuery: string;
    if (business.location && business.location.city && business.location.state) {
      const city = business.location.city !== 'Unknown' ? business.location.city : '';
      const state = business.location.state !== 'Unknown' ? business.location.state : '';
      if (city && state) {
        location = `${city}, ${state}`;
        locationQuery = `in ${city}, ${state}`;
      } else if (city) {
        location = city;
        locationQuery = `in ${city}`;
      } else if (state) {
        location = state;
        locationQuery = `in ${state}`;
      } else {
        location = '';
        locationQuery = '';
      }
    } else {
      location = '';
      locationQuery = '';
    }
    
    // Build rich context from crawled data for more effective prompts
    // Since input is only a URL, we need to provide all context from crawlData
    const contextParts: string[] = [];
    
    // Business description (primary context - helps LLM recognize the business)
    if (description) {
      // Use first 100 chars of description to provide context without overwhelming
      const descPreview = description.length > 100 
        ? description.substring(0, 100) + '...'
        : description;
      contextParts.push(descPreview);
    }
    
    // Services offered (helps LLM understand what they do)
    if (services.length > 0) {
      const servicesList = services.slice(0, 3).join(', ');
      contextParts.push(`They offer ${servicesList}`);
    }
    
    // Credibility signals (founded date, certifications, awards)
    const credibilityParts: string[] = [];
    if (founded) {
      const year = parseInt(founded);
      if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
        credibilityParts.push(`operating since ${founded}`);
      }
    }
    if (certifications.length > 0) {
      credibilityParts.push(`certified ${certifications.slice(0, 2).join(' and ')}`);
    }
    if (awards.length > 0) {
      credibilityParts.push(`awarded ${awards[0]}`);
    }
    if (credibilityParts.length > 0) {
      contextParts.push(`(${credibilityParts.join(', ')})`);
    }
    
    // Build context string (combine all parts)
    const businessContext = contextParts.length > 0 
      ? ` ${contextParts.join('. ')}.`
      : '';
    
    // TEMPLATE-BASED PROMPTS: Hard-coded structure with dynamic data insertion
    // Benefits: Consistent format, better LLM responses, easier parsing, clear instructions
    
    // PROMPT 1: Factual Knowledge Query
    // Template ensures consistent structure and comprehensive context
    const factual = this.buildFactualPrompt({
      businessName: business.name,
      serviceContext,
      location,
      businessContext,
      industry: industryPlural
    });
    
    // PROMPT 2: Opinion/Reputation Query  
    // Template ensures consistent sentiment analysis opportunities
    const opinion = this.buildOpinionPrompt({
      businessName: business.name,
      serviceContext,
      location,
      businessContext,
      industry: industryPlural
    });
    
    // PROMPT 3: Competitive Recommendation Query
    // Template ensures consistent ranking format and local focus
    const recommendation = this.buildRecommendationPrompt({
      businessName: business.name,
      industryPlural,
      location,
      industry: industry || businessCategory || business.category
    });
    
    return {
      factual,
      opinion,
      recommendation,
    };
  }
  
  /**
   * Build objective factual prompt that emulates natural customer queries
   * Avoids leading language while maintaining structure for parsing
   */
  private buildFactualPrompt(params: {
    businessName: string;
    serviceContext: string;
    location: string;
    businessContext: string;
    industry: string;
  }): string {
    const { businessName, serviceContext, location, businessContext } = params;
    
    // Natural customer query: "What do you know about [business]?"
    if (location) {
      return `What do you know about ${businessName}? I'm looking for information about this ${serviceContext} in ${location}.${businessContext}`;
    } else {
      return `What do you know about ${businessName}? I'm looking for information about this ${serviceContext}.${businessContext}`;
    }
  }
  
  /**
   * Build objective opinion prompt that emulates natural customer queries
   * Avoids leading language while allowing natural sentiment expression
   */
  private buildOpinionPrompt(params: {
    businessName: string;
    serviceContext: string;
    location: string;
    businessContext: string;
    industry: string;
  }): string {
    const { businessName, serviceContext, location, businessContext } = params;
    
    // Natural customer query: "Is [business] any good?" or "Should I go to [business]?"
    if (location) {
      return `I'm thinking about going to ${businessName} in ${location}. Is this ${serviceContext} any good?${businessContext} What's your take on them?`;
    } else {
      return `I'm thinking about going to ${businessName}. Is this ${serviceContext} any good?${businessContext} What's your take on them?`;
    }
  }
  
  /**
   * Build objective recommendation prompt that emulates natural customer queries
   * Maintains local focus without leading the LLM toward specific answers
   */
  private buildRecommendationPrompt(params: {
    businessName: string;
    industryPlural: string;
    location: string;
    industry?: string | null;
  }): string {
    const { businessName, industryPlural, location } = params;
    
    // Natural customer query: "What are the best [businesses] in [location]?"
    if (location) {
      const locationEmphasis = location.includes(',') 
        ? `in ${location}` 
        : `in the ${location} area`;
      
      // Use uppercase for industry emphasis (proven effective from LBDD testing)
      const industryEmphasis = industryPlural.toUpperCase();
      
      return `What are the best ${industryEmphasis} ${locationEmphasis}? I'm looking for the top 5 and would like to know why each one is good.`;
    } else {
      // Without location: Focus on businesses similar to the target
      const industryEmphasis = industryPlural.toUpperCase();
      
      return `What are the best ${industryEmphasis} similar to ${businessName}? I'm looking for the top 5 and would like to know why each one is good.`;
    }
  }
  
  /**
   * Analyze LLM response for mention, sentiment, and accuracy using hybrid AI approach
   */
  private async analyzeResponse(
    response: string,
    businessName: string,
    promptType: string
  ): Promise<{
    mentioned: boolean;
    sentiment: 'positive' | 'neutral' | 'negative';
    accuracy: number;
    rankPosition: number | null;
    competitorMentions?: string[];
  }> {
    // Check if business is mentioned
    const mentioned = await this.detectMention(response, businessName);
    
    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(response, businessName);
    
    // Extract ranking position (for recommendation prompts)
    const rankPosition = promptType === 'recommendation'
      ? await this.extractRankPosition(response, businessName)
      : null;
    
    // Extract competitor mentions (for recommendation prompts)
    const competitorMentions = promptType === 'recommendation'
      ? await this.extractCompetitorMentions(response, businessName)
      : undefined;
    
    // Calculate accuracy (simplified for now)
    const accuracy = mentioned ? 0.7 : 0;
    
    return {
      mentioned,
      sentiment,
      accuracy,
      rankPosition,
      competitorMentions,
    };
  }
  
  /**
   * Detect if business name is mentioned using hybrid approach
   * Fast pattern matching + LLM reasoning for complex cases
   */
  private async detectMention(response: string, businessName: string): Promise<boolean> {
    const normalized = response.toLowerCase();
    
    // Generate multiple name variants for better matching
    const nameVariants: string[] = [];
    
    // 1. Full name (exact)
    nameVariants.push(businessName.toLowerCase());
    
    // 2. Full name without punctuation
    nameVariants.push(businessName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()|]/g, '').toLowerCase());
    
    // 3. Full name without common suffixes
    nameVariants.push(
      businessName.replace(/\s+(LLC|Inc|Corp|Ltd|Co|Limited|Company)\.?$/i, '').toLowerCase()
    );
    
    // 4. First word (for businesses like "Joe's Café" -> "joe")
    const firstWord = businessName.split(/\s+/)[0].toLowerCase();
    if (firstWord.length > 2) {
      nameVariants.push(firstWord);
    }
    
    // 5. Words without common prefixes (The, A, An)
    const withoutPrefix = businessName.replace(/^(The|A|An)\s+/i, '').toLowerCase();
    if (withoutPrefix !== businessName.toLowerCase()) {
      nameVariants.push(withoutPrefix);
    }
    
    // 6. Extract key words (remove common words like "Dental", "Care", "Services")
    const keyWords = businessName
      .split(/\s+/)
      .filter(word => {
        const lower = word.toLowerCase();
        return !['dental', 'care', 'services', 'group', 'associates', 'clinic', 'center'].includes(lower);
      })
      .map(w => w.toLowerCase());
    
    if (keyWords.length > 0 && keyWords.length < businessName.split(/\s+/).length) {
      nameVariants.push(keyWords.join(' '));
    }
    
    // Fast pattern matching first
    const quickMatch = nameVariants.some(variant => {
      if (variant.length < 3) return false;
      return normalized.includes(variant);
    });
    
    if (quickMatch) {
      return true;
    }
    
    // Use LLM for complex cases (similar names, abbreviations, etc.)
    return await this.getLLMBusinessMentionDetection(response, businessName, nameVariants);
  }
  
  /**
   * LLM-assisted business mention detection for complex cases
   * Handles similar business names, abbreviations, and contextual references
   */
  private async getLLMBusinessMentionDetection(response: string, businessName: string, variants: string[]): Promise<boolean> {
    // Only use LLM if response is reasonably short and might contain the business
    if (response.length > 2000 || !response.toLowerCase().includes(businessName.split(' ')[0].toLowerCase())) {
      return false;
    }
    
    const prompt = `Is "${businessName}" mentioned in this text?

Text: "${response}"

Consider:
- Exact name matches
- Abbreviations or shortened versions
- Similar business names (but be precise - "Joe's Pizza" ≠ "Tony's Pizza")
- Contextual references to the specific business

Respond with ONLY: yes or no`;

    try {
      const llmResponse = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      const answer = llmResponse.content.trim().toLowerCase();
      
      const mentioned = answer === 'yes';
      
      log.debug('LLM business mention detection', {
        businessName,
        responsePreview: response.substring(0, 100),
        variants: variants.slice(0, 3),
        mentioned,
        confidence: 'high'
      });
      
      return mentioned;
    } catch (error) {
      log.warn('LLM mention detection failed', { error: error instanceof Error ? error.message : 'Unknown error', businessName });
      return false;
    }
  }
  
  /**
   * Analyze sentiment using hybrid approach: fast keyword detection + LLM reasoning
   * Provides more accurate sentiment analysis than keyword-only approach
   */
  private async analyzeSentiment(text: string, businessName: string): Promise<'positive' | 'neutral' | 'negative'> {
    // Fast keyword-based detection for obvious cases (performance optimization)
    const quickSentiment = this.getQuickSentiment(text);
    if (quickSentiment.confidence > 0.8) {
      return quickSentiment.sentiment;
    }
    
    // Use LLM for nuanced sentiment analysis when keywords are ambiguous
    return await this.getLLMSentimentAnalysis(text, businessName);
  }
  
  /**
   * Fast keyword-based sentiment detection for obvious cases
   */
  private getQuickSentiment(text: string): { sentiment: 'positive' | 'neutral' | 'negative', confidence: number } {
    const lowerText = text.toLowerCase();
    
    const strongPositive = ['excellent', 'outstanding', 'amazing', 'fantastic', 'highly recommend'];
    const strongNegative = ['terrible', 'awful', 'horrible', 'avoid at all costs', 'worst'];
    
    const positiveKeywords = [
      'excellent', 'great', 'best', 'recommend', 'trusted',
      'reliable', 'professional', 'quality', 'reputable',
      'outstanding', 'top', 'highly rated', 'popular',
    ];
    
    const negativeKeywords = [
      'poor', 'bad', 'worst', 'avoid', 'unreliable',
      'unprofessional', 'complaint', 'issue', 'problem',
      'disappointed', 'negative', 'warning',
    ];
    
    // Check for strong indicators first
    const hasStrongPositive = strongPositive.some(word => lowerText.includes(word));
    const hasStrongNegative = strongNegative.some(word => lowerText.includes(word));
    
    if (hasStrongPositive && !hasStrongNegative) {
      return { sentiment: 'positive', confidence: 0.9 };
    }
    if (hasStrongNegative && !hasStrongPositive) {
      return { sentiment: 'negative', confidence: 0.9 };
    }
    
    // Count regular keywords
    const positiveCount = positiveKeywords.filter(keyword => lowerText.includes(keyword)).length;
    const negativeCount = negativeKeywords.filter(keyword => lowerText.includes(keyword)).length;
    
    if (positiveCount > negativeCount + 2) {
      return { sentiment: 'positive', confidence: 0.7 };
    }
    if (negativeCount > positiveCount + 2) {
      return { sentiment: 'negative', confidence: 0.7 };
    }
    
    // Ambiguous case - needs LLM analysis
    return { sentiment: 'neutral', confidence: 0.3 };
  }
  
  /**
   * LLM-assisted sentiment analysis for nuanced cases
   * Handles context, sarcasm, and complex sentiment expressions
   */
  private async getLLMSentimentAnalysis(text: string, businessName: string): Promise<'positive' | 'neutral' | 'negative'> {
    const prompt = `Analyze the sentiment toward "${businessName}" in this text:

"${text}"

Consider:
- Overall tone and context
- Specific mentions of the business
- Implied recommendations or warnings
- Sarcasm or nuanced language

Respond with ONLY one word: positive, negative, or neutral`;

    try {
      const response = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      const sentiment = response.content.trim().toLowerCase() as 'positive' | 'neutral' | 'negative';
      
      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        log.debug('LLM sentiment analysis', {
          businessName,
          textPreview: text.substring(0, 100),
          sentiment,
          confidence: 'high'
        });
        return sentiment;
      }
    } catch (error) {
      log.warn('LLM sentiment analysis failed', { error: error instanceof Error ? error.message : 'Unknown error', businessName });
    }
    
    // Fallback to neutral
    return 'neutral';
  }
  
  /**
   * Extract ranking position from recommendation response
   */
  private async extractRankPosition(response: string, businessName: string): Promise<number | null> {
    const lines = response.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (await this.detectMention(line, businessName)) {
        // Match patterns like "1. Business Name" or "Top 1: Business Name"
        const rankMatch = line.match(/^(\d+)[.)]/);
        if (rankMatch) {
          return parseInt(rankMatch[1]);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract competitor business names from recommendation response
   * Returns list of competitors mentioned alongside the target business
   * IMPROVED: Better extraction, filters out generic/placeholder names and action phrases
   */
  private async extractCompetitorMentions(response: string, businessName: string): Promise<string[]> {
    const competitors: string[] = [];
    const lines = response.split('\n');
    
    // Action phrases that indicate non-business names (e.g., "Checking recent online reviews")
    const actionPhrases = [
      'checking',
      'asking for',
      'verifying',
      'comparing',
      'looking for',
      'searching for',
      'reviewing',
      'considering',
      'evaluating',
      'researching',
      'consulting',
      'contacting',
      'visiting',
      'reading',
      'browsing',
    ];
    
    // Common placeholder/generic names to filter out
    const placeholderNames = [
      'local business example',
      'sample business',
      'example business',
      'quality services',
      'premier services',
      'top choice',
      'recommended business',
      'local establishment',
      'area business',
      'nearby business',
    ];
    
    // Business name indicators (must contain at least one)
    const businessIndicators = [
      /\b(inc|llc|corp|ltd|co|company|corporation|limited|group|associates|partners|services|medical|health|clinic|hospital|center|centre)\b/i,
      /\b(physicians|doctors|lawyers|attorneys|dentists|veterinarians|accountants|consultants)\b/i,
      /\b(university|college|school|academy|institute)\b/i,
    ];
    
    const isPlaceholder = (name: string): boolean => {
      const lower = name.toLowerCase();
      return placeholderNames.some(placeholder => lower.includes(placeholder));
    };
    
    const isActionPhrase = (name: string): boolean => {
      const lower = name.toLowerCase();
      return actionPhrases.some(phrase => lower.startsWith(phrase) || lower.includes(` ${phrase} `));
    };
    
    const looksLikeBusinessName = (name: string): boolean => {
      // Must be at least 3 characters
      if (name.length < 3) return false;
      
      // Must not be just numbers
      if (/^\d+$/.test(name)) return false;
      
      // Must not start with action phrase
      if (isActionPhrase(name)) return false;
      
      // Must contain business indicators OR be a proper noun (starts with capital)
      const hasBusinessIndicator = businessIndicators.some(pattern => pattern.test(name));
      const isProperNoun = /^[A-Z]/.test(name.trim());
      
      // If it's very short (3-5 chars), must be a proper noun
      if (name.length <= 5 && !isProperNoun) return false;
      
      // Must be either a proper noun or have business indicators
      return hasBusinessIndicator || isProperNoun;
    };
    
    for (const line of lines) {
      // Match numbered list items: "1. Business Name" or "1) Business Name" or "Top 1: Business Name"
      const listMatch = line.match(/^\s*(?:top\s+)?(\d+)[.)\s:]\s*(.+?)(?:\s*-|\s*:|$)/i);
      if (listMatch) {
        let competitor = listMatch[2].trim();
        
        // Remove markdown formatting (**bold**, *italic*)
        competitor = competitor.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        
        // Skip if it's the target business
        if (await this.detectMention(competitor, businessName)) {
          continue;
        }
        
        // Skip if it's a placeholder/generic name
        if (isPlaceholder(competitor)) {
          log.debug('Filtered out placeholder competitor name', {
            competitor,
            line: line.substring(0, 100),
          });
          continue;
        }
        
        // Skip if it's an action phrase (not a business name)
        if (isActionPhrase(competitor)) {
          log.debug('Filtered out action phrase (not a business name)', {
            competitor,
            line: line.substring(0, 100),
          });
          continue;
        }
        
        // Validate it looks like a business name
        if (!looksLikeBusinessName(competitor)) {
          log.debug('Filtered out invalid competitor name (does not look like business)', {
            competitor,
            line: line.substring(0, 100),
          });
          continue;
        }
        
        // Clean up common prefixes/suffixes but keep the cleaned version
        const cleaned = competitor
          .replace(/^(The|A|An)\s+/i, '')
          .replace(/\s+(LLC|Inc|Corp|Ltd|Co|Limited|Company)\.?$/i, '')
          .trim();
        
        // Final validation on cleaned name
        if (cleaned.length >= 3 && !/^\d+$/.test(cleaned) && looksLikeBusinessName(cleaned)) {
          competitors.push(cleaned);
        }
      }
    }
    
    if (competitors.length > 0) {
      log.debug('Extracted competitors from recommendation response', {
        count: competitors.length,
        competitors: competitors.slice(0, 5), // Log first 5
      });
    } else {
      log.debug('No competitors extracted from recommendation response', {
        responsePreview: response.substring(0, 300),
      });
    }
    
    return competitors;
  }
  
  /**
   * Calculate overall metrics from LLM results
   */
  private calculateMetrics(
    llmResults: LLMResult[],
    business: Business
  ): FingerprintAnalysis {
    const totalResults = llmResults.length;
    
    // Mention rate
    const mentionCount = llmResults.filter(r => r.mentioned).length;
    const mentionRate = (mentionCount / totalResults) * 100; // Percentage
    
    // Sentiment score
    const sentimentScores = {
      positive: 1,
      neutral: 0.5,
      negative: 0,
    };
    
    const avgSentiment = llmResults
      .filter(r => r.mentioned)
      .reduce((sum, r) => sum + sentimentScores[r.sentiment], 0) / Math.max(mentionCount, 1);
    
    // Accuracy score
    const avgAccuracy = llmResults
      .filter(r => r.mentioned)
      .reduce((sum, r) => sum + r.accuracy, 0) / Math.max(mentionCount, 1);
    
    // Average rank position
    const rankedResults = llmResults.filter(r => r.rankPosition !== null);
    const avgRankPosition = rankedResults.length > 0
      ? rankedResults.reduce((sum, r) => sum + (r.rankPosition || 0), 0) / rankedResults.length
      : null;
    
    // Calculate visibility score (0-100)
    const visibilityScore = Math.round(
      (mentionRate * 0.4) +           // 40% weight on mention rate
      (avgSentiment * 30) +           // 30% weight on sentiment
      (avgAccuracy * 20) +            // 20% weight on accuracy
      (avgRankPosition ? Math.max(0, (6 - avgRankPosition) / 5 * 10) : 5) // 10% on ranking
    );
    
    // Build competitive leaderboard from competitor mentions
    const competitiveLeaderboard = this.buildCompetitiveLeaderboard(
      llmResults,
      business,
      avgRankPosition
    );
    
    return {
      businessId: business.id,
      businessName: business.name,
      visibilityScore,
      mentionRate,
      sentimentScore: avgSentiment,
      accuracyScore: avgAccuracy,
      avgRankPosition,
      llmResults,
      competitiveLeaderboard,
      generatedAt: new Date(),
    };
  }
  
  /**
   * Build competitive leaderboard from competitor mentions
   * Shows which competitors are mentioned most often alongside the target business
   * IMPROVED: Better validation, logging, and handling of empty data
   */
  private buildCompetitiveLeaderboard(
    llmResults: LLMResult[],
    business: Business,
    targetBusinessRank: number | null
  ): {
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
      appearsWithTarget: number; // How many times mentioned alongside target
    }>;
    totalRecommendationQueries: number;
  } {
    const recommendationResults = llmResults.filter(r => r.promptType === 'recommendation');
    
    log.debug('Building competitive leaderboard', {
      businessId: business.id,
      recommendationQueries: recommendationResults.length,
      targetBusinessRank,
    });
    
    // Count competitor mentions
    const competitorCounts = new Map<string, { count: number; positions: number[] }>();
    
    recommendationResults.forEach((result) => {
      if (result.competitorMentions && result.competitorMentions.length > 0) {
        result.competitorMentions.forEach((competitor, idx) => {
          if (!competitorCounts.has(competitor)) {
            competitorCounts.set(competitor, { count: 0, positions: [] });
          }
          const stats = competitorCounts.get(competitor)!;
          stats.count++;
          // Estimate position based on order in list (1-based)
          stats.positions.push(idx + 1);
        });
      }
    });
    
    // Build sorted leaderboard
    const competitors = Array.from(competitorCounts.entries())
      .map(([name, stats]) => ({
        name,
        mentionCount: stats.count,
        avgPosition: stats.positions.reduce((sum, p) => sum + p, 0) / stats.positions.length,
        appearsWithTarget: stats.count, // All mentions are alongside target
      }))
      .sort((a, b) => {
        // Sort by mention count (descending), then by avg position (ascending)
        if (b.mentionCount !== a.mentionCount) {
          return b.mentionCount - a.mentionCount;
        }
        return a.avgPosition - b.avgPosition;
      });
    
    const targetMentionCount = recommendationResults.filter(r => r.mentioned).length;
    
    // Log leaderboard summary
    log.info('Competitive leaderboard built', {
      businessId: business.id,
      targetMentions: targetMentionCount,
      totalRecommendationQueries: recommendationResults.length,
      competitorsFound: competitors.length,
      topCompetitors: competitors.slice(0, 3).map(c => c.name),
    });
    
    // Warn if no meaningful data
    if (competitors.length === 0 && recommendationResults.length > 0) {
      log.warn('No competitors extracted from recommendation responses', {
        businessId: business.id,
        recommendationQueries: recommendationResults.length,
        responsesWithCompetitors: recommendationResults.filter(r => r.competitorMentions && r.competitorMentions.length > 0).length,
      });
    }
    
    if (targetMentionCount === 0 && recommendationResults.length > 0) {
      log.warn('Target business not mentioned in any recommendation responses', {
        businessId: business.id,
        businessName: business.name,
        recommendationQueries: recommendationResults.length,
      });
    }
    
    return {
      targetBusiness: {
        name: business.name,
        rank: targetBusinessRank,
        mentionCount: targetMentionCount,
        avgPosition: targetBusinessRank,
      },
      competitors,
      totalRecommendationQueries: recommendationResults.length,
    };
  }
}

export const llmFingerprinter = new LLMFingerprinter();

