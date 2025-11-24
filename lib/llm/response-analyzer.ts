/**
 * Sophisticated Response Analysis Engine
 * Analyzes LLM responses for business mentions, sentiment, and competitive positioning
 * 
 * Features:
 * - Advanced mention detection with fuzzy matching
 * - Multi-dimensional sentiment analysis
 * - Competitive ranking extraction
 * - Confidence scoring for all analyses
 * - Context-aware business name matching
 * - Robust error handling and fallbacks
 */

import { 
  IResponseAnalyzer, 
  LLMResponse, 
  LLMResult,
  MentionAnalysis, 
  SentimentAnalysis, 
  CompetitorAnalysis 
} from './types';
import { loggers } from '@/lib/utils/logger';

const log = loggers.fingerprint;

// ============================================================================
// ANALYSIS PATTERNS AND CONSTANTS
// ============================================================================

const POSITIVE_INDICATORS = [
  'excellent', 'outstanding', 'great', 'amazing', 'fantastic', 'wonderful',
  'professional', 'reliable', 'trustworthy', 'reputable', 'quality',
  'highly recommended', 'top-rated', 'best', 'leading', 'premier',
  'experienced', 'skilled', 'expert', 'knowledgeable', 'competent',
  'friendly', 'helpful', 'responsive', 'efficient', 'thorough',
  'satisfied', 'pleased', 'happy', 'impressed', 'delighted'
];

const NEGATIVE_INDICATORS = [
  'terrible', 'awful', 'horrible', 'disappointing', 'poor', 'bad',
  'unprofessional', 'unreliable', 'untrustworthy', 'questionable',
  'avoid', 'warning', 'complaint', 'problem', 'issue', 'concern',
  'rude', 'unhelpful', 'slow', 'inefficient', 'careless',
  'overpriced', 'expensive', 'cheap', 'low-quality', 'subpar',
  'dissatisfied', 'unhappy', 'frustrated', 'disappointed', 'regret'
];

const NEUTRAL_INDICATORS = [
  'okay', 'average', 'decent', 'standard', 'typical', 'normal',
  'adequate', 'acceptable', 'reasonable', 'fair', 'moderate',
  'mixed', 'varies', 'depends', 'sometimes', 'generally'
];

const RANKING_PATTERNS = [
  /(?:number\s+|#)(\d+)/i,
  /(\d+)(?:st|nd|rd|th)\s+(?:place|choice|option)/i,
  /top\s+(\d+)/i,
  /ranked\s+(\d+)/i,
  /position\s+(\d+)/i
];

const BUSINESS_NAME_VARIATIONS = {
  // Common business suffixes that might be omitted or added
  suffixes: ['inc', 'llc', 'corp', 'company', 'co', 'ltd', 'group', 'services', 'solutions'],
  // Common prefixes
  prefixes: ['the', 'a', 'an'],
  // Words that might be replaced
  replacements: {
    '&': 'and',
    'and': '&',
    'centre': 'center',
    'center': 'centre'
  }
};

// ============================================================================
// MAIN ANALYZER CLASS
// ============================================================================

export class ResponseAnalyzer implements IResponseAnalyzer {
  
  /**
   * Analyze a complete LLM response for all dimensions
   */
  analyzeResponse(response: LLMResponse, businessName: string, promptType: string): LLMResult {
    const startTime = Date.now();
    
    try {
      const mentionAnalysis = this.analyzeMention(response.content, businessName);
      const sentimentAnalysis = this.analyzeSentiment(response.content, businessName);
      const competitorAnalysis = this.analyzeCompetitors(response.content, businessName);
      
      const result: LLMResult = {
        model: response.model,
        promptType: promptType as 'factual' | 'opinion' | 'recommendation',
        mentioned: mentionAnalysis.mentioned,
        sentiment: sentimentAnalysis.sentiment,
        confidence: this.calculateOverallConfidence(mentionAnalysis, sentimentAnalysis, competitorAnalysis),
        rankPosition: competitorAnalysis.targetRank,
        competitorMentions: competitorAnalysis.competitors,
        rawResponse: response.content,
        tokensUsed: response.tokensUsed,
        prompt: '', // Will be filled by caller
        processingTime: Date.now() - startTime,
      };
      
      log.debug('Response analysis completed', {
        model: response.model,
        promptType,
        mentioned: result.mentioned,
        sentiment: result.sentiment,
        confidence: result.confidence,
        competitors: result.competitorMentions.length,
        processingTime: result.processingTime
      });
      
      return result;
      
    } catch (error) {
      log.error('Response analysis failed', error, { 
        model: response.model, 
        promptType,
        businessName 
      });
      
      // Return fallback result
      return {
        model: response.model,
        promptType: promptType as 'factual' | 'opinion' | 'recommendation',
        mentioned: false,
        sentiment: 'neutral',
        confidence: 0,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: response.content,
        tokensUsed: response.tokensUsed,
        prompt: '',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }
  
  /**
   * Analyze if and how the business is mentioned in the response
   */
  analyzeMention(response: string, businessName: string): MentionAnalysis {
    const normalizedResponse = response.toLowerCase();
    const normalizedBusinessName = businessName.toLowerCase();
    
    // Direct exact match
    if (normalizedResponse.includes(normalizedBusinessName)) {
      return {
        mentioned: true,
        confidence: 0.95,
        matchType: 'exact',
        variants: [businessName],
        reasoning: `Exact match found for "${businessName}"`
      };
    }
    
    // Generate business name variations
    const variations = this.generateBusinessNameVariations(businessName);
    
    // Check variations
    for (const variation of variations) {
      const normalizedVariation = variation.toLowerCase();
      if (normalizedResponse.includes(normalizedVariation)) {
        return {
          mentioned: true,
          confidence: 0.85,
          matchType: 'partial',
          variants: [variation],
          reasoning: `Partial match found for variation "${variation}"`
        };
      }
    }
    
    // Contextual analysis - look for business-related context
    const contextualMatch = this.analyzeContextualMention(response, businessName);
    if (contextualMatch.mentioned) {
      return contextualMatch;
    }
    
    // No mention found
    return {
      mentioned: false,
      confidence: 0.9,
      matchType: 'none',
      variants: [],
      reasoning: 'No mention of business name or variations found'
    };
  }
  
  /**
   * Analyze sentiment of the response toward the business
   */
  analyzeSentiment(response: string, businessName: string): SentimentAnalysis {
    const normalizedResponse = response.toLowerCase();
    
    // First check if business is mentioned - sentiment only matters if mentioned
    const mentionAnalysis = this.analyzeMention(response, businessName);
    if (!mentionAnalysis.mentioned) {
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        score: 0,
        keywords: [],
        reasoning: 'Business not mentioned, neutral sentiment assigned'
      };
    }
    
    // Count positive and negative indicators
    const positiveMatches = POSITIVE_INDICATORS.filter(indicator => 
      normalizedResponse.includes(indicator)
    );
    
    const negativeMatches = NEGATIVE_INDICATORS.filter(indicator => 
      normalizedResponse.includes(indicator)
    );
    
    const neutralMatches = NEUTRAL_INDICATORS.filter(indicator => 
      normalizedResponse.includes(indicator)
    );
    
    // Calculate sentiment score (-1 to 1)
    const positiveScore = positiveMatches.length;
    const negativeScore = negativeMatches.length;
    const neutralScore = neutralMatches.length;
    
    const totalScore = positiveScore + negativeScore + neutralScore;
    
    if (totalScore === 0) {
      // No sentiment indicators found - analyze context
      return this.analyzeContextualSentiment(response, businessName);
    }
    
    const sentimentScore = (positiveScore - negativeScore) / Math.max(totalScore, 1);
    
    // Determine sentiment category
    let sentiment: 'positive' | 'neutral' | 'negative';
    let confidence: number;
    
    if (sentimentScore > 0.3) {
      sentiment = 'positive';
      confidence = Math.min(0.95, 0.6 + (sentimentScore * 0.35));
    } else if (sentimentScore < -0.3) {
      sentiment = 'negative';
      confidence = Math.min(0.95, 0.6 + (Math.abs(sentimentScore) * 0.35));
    } else {
      sentiment = 'neutral';
      confidence = 0.7;
    }
    
    return {
      sentiment,
      confidence,
      score: sentimentScore,
      keywords: [...positiveMatches, ...negativeMatches, ...neutralMatches],
      reasoning: `Found ${positiveScore} positive, ${negativeScore} negative, ${neutralScore} neutral indicators`
    };
  }
  
  /**
   * Analyze competitors mentioned in the response
   * 
   * SOLID: Single Responsibility - extracts and validates competitor names
   * DRY: Reusable validation logic for business name extraction
   */
  analyzeCompetitors(response: string, businessName: string): CompetitorAnalysis {
    const competitors: string[] = [];
    let targetRank: number | null = null;
    
    // Extract potential business names from numbered lists (most reliable)
    // Pattern: "1. Business Name" or "1) Business Name"
    // Stop at common delimiters: dash, colon, or newline (to avoid matching descriptions)
    // Exclude dash from main match to stop at "Business Name - Description"
    const numberedListPattern = /^\s*\d+[\.\)]\s+([A-Z][a-zA-Z\s&']+(?:Inc|LLC|Corp|Company|Co|Ltd|Group|Services|Solutions)?)(?=\s*[-:]|\s*$|\n)/gm;
    const numberedMatches = Array.from(response.matchAll(numberedListPattern));
    // Clean up extracted names - remove any trailing dashes or descriptions that might have been captured
    const numberedBusinesses = numberedMatches.map(match => {
      let name = match[1].trim();
      // Remove anything after a dash or colon if it was accidentally captured
      name = name.split(/\s*[-:]\s*/)[0].trim();
      return name;
    });
    
    // Also extract from bullet lists
    const bulletListPattern = /^[\-\*•]\s+([A-Z][a-zA-Z\s&'-]+(?:Inc|LLC|Corp|Company|Co|Ltd|Group|Services|Solutions)?)/gm;
    const bulletMatches = Array.from(response.matchAll(bulletListPattern));
    const bulletBusinesses = bulletMatches.map(match => match[1].trim());
    
    // Combine and deduplicate
    const allPotentialBusinesses = [...new Set([...numberedBusinesses, ...bulletBusinesses])];
    
    // Filter out invalid business names (LLM response text, not actual business names)
    const filteredBusinesses = allPotentialBusinesses
      .filter(name => this.isValidBusinessName(name)) // NEW: Validate it's actually a business name
      .filter(name => !this.isSameBusinessName(name, businessName))
      .filter(name => !this.isCommonFalsePositive(name))
      .filter(name => !this.isLLMResponseText(name)) // NEW: Filter out LLM response text
      .filter((name, index, array) => array.indexOf(name) === index); // Remove duplicates
    
    competitors.push(...filteredBusinesses);
    
    // Look for ranking information
    targetRank = this.extractRanking(response, businessName);
    
    // Calculate confidence based on context
    const confidence = this.calculateCompetitorConfidence(response, competitors, businessName);
    
    return {
      competitors,
      targetRank,
      confidence,
      reasoning: `Found ${competitors.length} potential competitors${targetRank ? `, target ranked at position ${targetRank}` : ''}`
    };
  }
  
  /**
   * Validate that a name is actually a business name (not LLM response text)
   * 
   * DRY: Reusable validation logic
   */
  private isValidBusinessName(name: string): boolean {
    const trimmed = name.trim();
    
    // Too short or too long
    if (trimmed.length < 2 || trimmed.length > 80) {
      return false;
    }
    
    // Must start with capital letter
    if (!/^[A-Z]/.test(trimmed)) {
      return false;
    }
    
    // Check for invalid patterns (LLM response text indicators)
    const invalidPatterns = [
      /^(here are|i'd recommend|i recommend|to give you|that's a|i need|quality recommendations)/i,
      /^(each of these|these businesses|professional standards|local community)/i,
      /^(demonstrated|serves the|effectively|strong community presence)/i,
      /^(with strong|community presence|demonstrated professional)/i,
      /^(quality recommendations for)/i,
      /^(some top|top recommendations|recommendations for)/i,
      /^(a great|great question|little more|more information)/i,
      /^(what you're|you're looking|looking for)/i,
      /^(and|or|but|if|when|where|why|how)\s+/i, // Starts with conjunction
      /^(is|are|was|were|be|been|being)\s+/i, // Starts with verb
      /^(can|could|should|would|will|may|might)\s+/i, // Starts with modal
      /^(this|that|these|those)\s+/i, // Starts with demonstrative
      /^(it|they|we|you|he|she)\s+/i, // Starts with pronoun
    ];
    
    if (invalidPatterns.some(pattern => pattern.test(trimmed))) {
      return false;
    }
    
    // Check for common phrases that indicate it's not a business name
    const commonPhrases = [
      'quality professional services',
      'professional services providers',
      'strong community presence',
      'demonstrated professional standards',
      'serves the local community',
      'professional service with',
      'established local reputation',
    ];
    
    if (commonPhrases.some(phrase => trimmed.toLowerCase().includes(phrase))) {
      return false;
    }
    
    // Check for generic words that aren't business names
    const genericWords = ['quality', 'professional', 'local', 'community', 'excellence', 'choice', 'group', 'services', 'solutions'];
    if (genericWords.includes(trimmed.toLowerCase())) {
      return false;
    }
    
    // Must contain at least one letter (not just numbers/symbols)
    if (!/[a-zA-Z]/.test(trimmed)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if text is LLM response text (not a business name)
   * 
   * DRY: Reusable validation logic
   */
  private isLLMResponseText(text: string): boolean {
    const trimmed = text.trim();
    
    // Very long text is likely a sentence fragment
    if (trimmed.length > 100) {
      return true;
    }
    
    // Contains newlines (likely multi-line response text)
    if (trimmed.includes('\n')) {
      return true;
    }
    
    // Contains multiple sentences (indicated by periods in middle)
    const sentenceCount = (trimmed.match(/\.\s+[A-Z]/g) || []).length;
    if (sentenceCount > 0) {
      return true;
    }
    
    // Contains common LLM response patterns
    const llmPatterns = [
      /quality recommendations for/i,
      /with strong community presence/i,
      /demonstrated professional standards/i,
      /serves the local community/i,
      /each of these businesses/i,
    ];
    
    if (llmPatterns.some(pattern => pattern.test(trimmed))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate variations of business name for matching
   */
  private generateBusinessNameVariations(businessName: string): string[] {
    const variations = new Set<string>();
    const name = businessName.trim();
    
    // Add original name
    variations.add(name);
    
    // Remove common suffixes
    for (const suffix of BUSINESS_NAME_VARIATIONS.suffixes) {
      const pattern = new RegExp(`\\s+${suffix}$`, 'i');
      if (pattern.test(name)) {
        variations.add(name.replace(pattern, '').trim());
      }
    }
    
    // Remove common prefixes
    for (const prefix of BUSINESS_NAME_VARIATIONS.prefixes) {
      const pattern = new RegExp(`^${prefix}\\s+`, 'i');
      if (pattern.test(name)) {
        variations.add(name.replace(pattern, '').trim());
      }
    }
    
    // Apply common replacements
    for (const [from, to] of Object.entries(BUSINESS_NAME_VARIATIONS.replacements)) {
      if (name.includes(from)) {
        variations.add(name.replace(new RegExp(from, 'gi'), to));
      }
    }
    
    // Add abbreviated versions (first letters of words)
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const abbreviation = words.map(word => word.charAt(0).toUpperCase()).join('');
      if (abbreviation.length >= 2) {
        variations.add(abbreviation);
      }
    }
    
    return Array.from(variations).filter(v => v.length > 0);
  }
  
  /**
   * Analyze contextual mentions (indirect references)
   */
  private analyzeContextualMention(response: string, businessName: string): MentionAnalysis {
    const normalizedResponse = response.toLowerCase();
    
    // Look for contextual clues that might indicate the business
    const contextualPatterns = [
      /this\s+(?:business|company|establishment|place|location)/i,
      /they\s+(?:are|offer|provide|specialize)/i,
      /their\s+(?:services|reputation|quality|experience)/i,
      /it\s+(?:is|appears|seems|looks)/i
    ];
    
    const hasContextualClues = contextualPatterns.some(pattern => pattern.test(response));
    
    if (hasContextualClues) {
      // Check if response seems to be specifically about a business
      const businessContextWords = [
        'services', 'reputation', 'quality', 'professional', 'experience',
        'customers', 'clients', 'staff', 'team', 'location', 'business'
      ];
      
      const contextWordCount = businessContextWords.filter(word => 
        normalizedResponse.includes(word)
      ).length;
      
      if (contextWordCount >= 2) {
        return {
          mentioned: true,
          confidence: 0.6,
          matchType: 'contextual',
          variants: [],
          reasoning: `Contextual business reference detected with ${contextWordCount} business-related terms`
        };
      }
    }
    
    return {
      mentioned: false,
      confidence: 0.8,
      matchType: 'none',
      variants: [],
      reasoning: 'No contextual business reference found'
    };
  }
  
  /**
   * Analyze sentiment when no explicit indicators are found
   */
  private analyzeContextualSentiment(response: string, businessName: string): SentimentAnalysis {
    const normalizedResponse = response.toLowerCase();
    
    // Look for implicit positive patterns
    const implicitPositive = [
      /would\s+recommend/i,
      /good\s+choice/i,
      /solid\s+option/i,
      /worth\s+considering/i,
      /established\s+presence/i,
      /professional\s+standards/i
    ];
    
    // Look for implicit negative patterns
    const implicitNegative = [
      /would\s+not\s+recommend/i,
      /avoid/i,
      /be\s+careful/i,
      /limited\s+information/i,
      /don't\s+have\s+enough/i,
      /insufficient\s+data/i
    ];
    
    const positiveCount = implicitPositive.filter(pattern => pattern.test(response)).length;
    const negativeCount = implicitNegative.filter(pattern => pattern.test(response)).length;
    
    if (positiveCount > negativeCount) {
      return {
        sentiment: 'positive',
        confidence: 0.6,
        score: 0.5,
        keywords: [],
        reasoning: 'Implicit positive sentiment detected from context'
      };
    } else if (negativeCount > positiveCount) {
      return {
        sentiment: 'negative',
        confidence: 0.6,
        score: -0.5,
        keywords: [],
        reasoning: 'Implicit negative sentiment detected from context'
      };
    }
    
    return {
      sentiment: 'neutral',
      confidence: 0.8,
      score: 0,
      keywords: [],
      reasoning: 'No clear sentiment indicators found, defaulting to neutral'
    };
  }
  
  /**
   * Extract ranking position from response
   */
  private extractRanking(response: string, businessName: string): number | null {
    // Only look for rankings if the business is mentioned
    const mentionAnalysis = this.analyzeMention(response, businessName);
    if (!mentionAnalysis.mentioned) {
      return null;
    }
    
    for (const pattern of RANKING_PATTERNS) {
      const match = response.match(pattern);
      if (match) {
        const rank = parseInt(match[1], 10);
        if (rank >= 1 && rank <= 10) { // Reasonable ranking range
          return rank;
        }
      }
    }
    
    // Look for ordinal positions in lists
    const lines = response.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.isSameBusinessName(line, businessName)) {
        // Check if this line starts with a number
        const numberMatch = line.match(/^\s*(\d+)[\.\)]/);
        if (numberMatch) {
          const rank = parseInt(numberMatch[1], 10);
          if (rank >= 1 && rank <= 10) {
            return rank;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if two business names refer to the same business
   */
  private isSameBusinessName(name1: string, name2: string): boolean {
    const normalized1 = name1.toLowerCase().trim();
    const normalized2 = name2.toLowerCase().trim();
    
    if (normalized1 === normalized2) return true;
    
    // Check if one is a substring of the other (accounting for suffixes)
    const variations1 = this.generateBusinessNameVariations(name1);
    const variations2 = this.generateBusinessNameVariations(name2);
    
    for (const var1 of variations1) {
      for (const var2 of variations2) {
        if (var1.toLowerCase() === var2.toLowerCase()) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Filter out common false positives for business names
   */
  private isCommonFalsePositive(name: string): boolean {
    const falsePositives = [
      'Google', 'Facebook', 'Twitter', 'LinkedIn', 'Instagram',
      'Better Business Bureau', 'BBB', 'Yelp', 'TripAdvisor',
      'United States', 'New York', 'California', 'Texas',
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return falsePositives.some(fp => 
      name.toLowerCase().includes(fp.toLowerCase())
    );
  }
  
  /**
   * Calculate confidence for competitor analysis
   */
  private calculateCompetitorConfidence(response: string, competitors: string[], businessName: string): number {
    // Base confidence on context and structure
    let confidence = 0.5;
    
    // Higher confidence if response looks like a recommendation list
    if (response.includes('recommend') || response.includes('top') || response.includes('best')) {
      confidence += 0.2;
    }
    
    // Higher confidence if competitors are in a structured list
    const hasNumberedList = /^\s*\d+[\.\)]/m.test(response);
    if (hasNumberedList) {
      confidence += 0.2;
    }
    
    // Lower confidence if too many or too few competitors
    if (competitors.length > 10) {
      confidence -= 0.2;
    } else if (competitors.length === 0) {
      confidence -= 0.3;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }
  
  /**
   * Calculate overall confidence score combining all analyses
   */
  private calculateOverallConfidence(
    mention: MentionAnalysis, 
    sentiment: SentimentAnalysis, 
    competitor: CompetitorAnalysis
  ): number {
    // Weighted average of individual confidences
    const mentionWeight = 0.5;
    const sentimentWeight = 0.3;
    const competitorWeight = 0.2;
    
    return (
      mention.confidence * mentionWeight +
      sentiment.confidence * sentimentWeight +
      competitor.confidence * competitorWeight
    );
  }
}

// Export singleton instance
export const responseAnalyzer = new ResponseAnalyzer();