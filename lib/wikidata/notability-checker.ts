import { google } from 'googleapis';
import { openRouterClient } from '@/lib/llm/openrouter';

/**
 * Reference found by Google Search
 */
export interface Reference {
  url: string;
  title: string;
  snippet: string;
  source: string;
}

/**
 * LLM assessment of reference quality
 */
export interface ReferenceAssessment {
  index: number;
  isSerious: boolean;
  isPubliclyAvailable: boolean;
  isIndependent: boolean;
  sourceType: 'news' | 'government' | 'academic' | 'database' | 'company' | 'other';
  trustScore: number;
  reasoning: string;
}

/**
 * Complete notability assessment
 */
export interface NotabilityAssessment {
  meetsNotability: boolean;
  confidence: number;
  seriousReferenceCount: number;
  publiclyAvailableCount: number;
  independentCount: number;
  summary: string;
  references: ReferenceAssessment[];
  recommendations?: string[];
}

/**
 * Notability result for a business
 */
export interface NotabilityResult {
  isNotable: boolean;
  confidence: number;
  reasons: string[];
  references: Reference[];
  seriousReferenceCount: number;
  assessment?: NotabilityAssessment;
}

/**
 * Wikidata Notability Checker
 * Implements Single Responsibility Principle: Only handles notability checking
 * 
 * Per: https://www.wikidata.org/wiki/Wikidata:Notability
 * Entities must have "serious and publicly available references"
 */
export class NotabilityChecker {
  private customSearch = google.customsearch('v1');
  private dailyQueries = 0;
  private readonly DAILY_LIMIT = 100; // Free tier limit
  
  /**
   * Check if business meets Wikidata notability standards
   * 
   * @param businessName - Name of the business
   * @param location - Location for search context
   * @returns Notability assessment with references
   */
  async checkNotability(
    businessName: string,
    location?: { city: string; state: string; country?: string }
  ): Promise<NotabilityResult> {
    // Check rate limit
    if (this.dailyQueries >= this.DAILY_LIMIT) {
      console.warn('⚠️  Daily Google Search API limit reached');
      return this.createRateLimitedResult();
    }
    
    // Step 1: Find references
    console.log(`🔍 Searching for references: "${businessName}"`);
    const references = await this.findReferences(businessName, location);
    
    if (references.length === 0) {
      console.log(`❌ No references found for: ${businessName}`);
      return this.createNoReferencesResult();
    }
    
    console.log(`📚 Found ${references.length} potential references`);
    
    // Step 2: Assess quality with LLM
    console.log(`🤖 Assessing reference quality with LLM...`);
    const assessment = await this.assessReferenceQuality(references, businessName);
    
    const result: NotabilityResult = {
      isNotable: assessment.meetsNotability,
      confidence: assessment.confidence,
      reasons: assessment.meetsNotability ? [] : [assessment.summary],
      references: references,
      seriousReferenceCount: assessment.seriousReferenceCount,
      assessment: assessment,
    };
    
    console.log(
      assessment.meetsNotability 
        ? `✅ Notable (${assessment.seriousReferenceCount} serious references)`
        : `❌ Not notable: ${assessment.summary}`
    );
    
    return result;
  }
  
  /**
   * Find references using Google Custom Search API
   * Follows Interface Segregation Principle: Focused on search only
   */
  private async findReferences(
    name: string,
    location?: { city: string; state: string; country?: string }
  ): Promise<Reference[]> {
    try {
      // Build search query
      const query = location 
        ? `"${name}" ${location.city} ${location.state}`
        : `"${name}"`;
      
      // Validate API credentials
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      if (!apiKey || !engineId) {
        console.error('❌ Missing Google Search API credentials');
        return [];
      }
      
      // Call Google Custom Search API
      const response = await this.customSearch.cse.list({
        auth: apiKey,
        cx: engineId,
        q: query,
        num: 10, // Top 10 results
      });
      
      this.dailyQueries++;
      
      const references: Reference[] = [];
      
      for (const item of response.data.items || []) {
        if (item.link && item.title && item.snippet) {
          references.push({
            url: item.link,
            title: item.title,
            snippet: item.snippet,
            source: this.extractDomain(item.link),
          });
        }
      }
      
      return references;
    } catch (error) {
      console.error('Google Search API error:', error);
      return [];
    }
  }
  
  /**
   * Assess reference quality using LLM
   * Follows Dependency Inversion Principle: Depends on LLM abstraction
   */
  private async assessReferenceQuality(
    references: Reference[],
    businessName: string
  ): Promise<NotabilityAssessment> {
    const prompt = this.buildAssessmentPrompt(references, businessName);
    let rawResponse = '';
    
    try {
      const response = await openRouterClient.query(
        'openai/gpt-4-turbo',
        prompt
      );
      
      rawResponse = response.content;
      
      // Clean up markdown code blocks if present
      let content = response.content.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const assessment = JSON.parse(content) as NotabilityAssessment;
      return assessment;
    } catch (error) {
      console.error('LLM assessment error:', error);
      if (rawResponse) {
        console.error('Raw LLM response (first 500 chars):', rawResponse.substring(0, 500));
      }
      return this.createFallbackAssessment(references);
    }
  }
  
  /**
   * Build assessment prompt
   * Follows DRY principle: Centralized prompt building
   */
  private buildAssessmentPrompt(references: Reference[], businessName: string): string {
    return `
Assess if these references meet Wikidata's "serious and publicly available" standard:

Business: ${businessName}

References:
${references.map((r, i) => `
${i + 1}. ${r.title}
   URL: ${r.url}
   Source: ${r.source}
   Snippet: ${r.snippet}
`).join('\n')}

Wikidata requires references to be:
1. From reputable sources (news, government, academic, official databases)
2. Publicly available (not paywalled, not private documents)
3. Independent (not just company's own website/marketing)

For each reference, assess:
- isSerious: Is this from a reputable source? (true/false)
- isPubliclyAvailable: Can anyone access this? (true/false)
- isIndependent: Is this from a third-party? (true/false)
- sourceType: "news" | "government" | "academic" | "database" | "company" | "other"
- trustScore: 0-100 (how trustworthy is this source?)
- reasoning: Why is this assessment given?

Overall:
- meetsNotability: Does the business have at least 2 serious references?
- confidence: 0-1 (how confident in this assessment?)
- seriousReferenceCount: How many serious references?
- publiclyAvailableCount: How many publicly available?
- independentCount: How many independent sources?
- summary: Brief explanation of decision
- recommendations: What to do with this entity? (if not notable, suggest improvements)

Return ONLY valid JSON with this exact structure:
{
  "meetsNotability": boolean,
  "confidence": number,
  "seriousReferenceCount": number,
  "publiclyAvailableCount": number,
  "independentCount": number,
  "summary": string,
  "references": [
    {
      "index": number,
      "isSerious": boolean,
      "isPubliclyAvailable": boolean,
      "isIndependent": boolean,
      "sourceType": string,
      "trustScore": number,
      "reasoning": string
    }
  ],
  "recommendations": string[]
}
    `.trim();
  }
  
  /**
   * Extract domain from URL
   * Utility function following Single Responsibility
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  }
  
  /**
   * Create result for rate limit exceeded
   * Follows Open/Closed Principle: Extension point for error handling
   */
  private createRateLimitedResult(): NotabilityResult {
    return {
      isNotable: false,
      confidence: 0.5,
      reasons: ['Daily API rate limit exceeded - manual review required'],
      references: [],
      seriousReferenceCount: 0,
    };
  }
  
  /**
   * Create result when no references found
   */
  private createNoReferencesResult(): NotabilityResult {
    return {
      isNotable: false,
      confidence: 0.9,
      reasons: [
        'No publicly available references found',
        'Cannot verify notability without sources'
      ],
      references: [],
      seriousReferenceCount: 0,
    };
  }
  
  /**
   * Create fallback assessment when LLM fails
   * Graceful degradation following Error Handling best practices
   */
  private createFallbackAssessment(references: Reference[]): NotabilityAssessment {
    return {
      meetsNotability: false,
      confidence: 0.5,
      seriousReferenceCount: 0,
      publiclyAvailableCount: references.length,
      independentCount: 0,
      summary: 'Unable to assess reference quality - manual review required',
      references: references.map((r, i) => ({
        index: i,
        isSerious: false,
        isPubliclyAvailable: true,
        isIndependent: false,
        sourceType: 'other' as const,
        trustScore: 50,
        reasoning: 'Assessment failed - requires manual review',
      })),
      recommendations: ['Manual review required', 'Verify references independently'],
    };
  }
}

// Export singleton (follows Singleton pattern)
export const notabilityChecker = new NotabilityChecker();

