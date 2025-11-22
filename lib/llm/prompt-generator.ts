/**
 * Context-Aware Prompt Generation System
 * Generates sophisticated, customer-query-style prompts for business fingerprinting
 * 
 * Features:
 * - Rich context integration (business data + crawl data)
 * - Natural, customer-like query patterns
 * - Location-aware prompt generation
 * - Industry-specific prompt customization
 * - Template-based system with variable substitution
 */

import { 
  IPromptGenerator, 
  BusinessContext, 
  GeneratedPrompts, 
  PromptTemplate 
} from './types';
import { Business } from '@/lib/db/schema';
import { CrawledData } from '@/lib/types/gemflush';

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const FACTUAL_TEMPLATES: PromptTemplate[] = [
  {
    type: 'factual',
    template: 'What information do you have about {businessName}{locationContext}? Please provide factual details about their services, reputation, contact information, and any notable characteristics.',
    variables: ['businessName', 'locationContext']
  },
  {
    type: 'factual',
    template: 'Can you tell me about {businessName}{locationContext}? I\'m looking for factual information about what they do, their background, and their reputation in the community.',
    variables: ['businessName', 'locationContext']
  },
  {
      type: 'factual',
    template: 'I need information about {businessName}{locationContext}. What can you tell me about their services, experience, and standing in the {industry} industry?',
    variables: ['businessName', 'locationContext', 'industry']
  }
];

const OPINION_TEMPLATES: PromptTemplate[] = [
  {
    type: 'opinion',
    template: 'I\'m considering using the services of {businessName}{locationContext}. Based on what you know, would you say they are a reputable and reliable {businessType}? What\'s your assessment of their quality and trustworthiness?',
    variables: ['businessName', 'locationContext', 'businessType']
  },
  {
    type: 'opinion',
    template: 'I\'m thinking about going to {businessName}{locationContext} for {serviceContext}. Do you think they\'re a good choice? What\'s your opinion on their reputation and service quality?',
    variables: ['businessName', 'locationContext', 'serviceContext']
  },
  {
      type: 'opinion', 
    template: 'A friend recommended {businessName}{locationContext} to me. What\'s your take on them? Are they known for being professional and delivering good results in the {industry} space?',
    variables: ['businessName', 'locationContext', 'industry']
  }
];

const RECOMMENDATION_TEMPLATES: PromptTemplate[] = [
  {
    type: 'recommendation',
    template: 'What are the best {industryPlural}{locationContext}? I\'m looking for top recommendations for quality {serviceType} providers in the area.',
    variables: ['industryPlural', 'locationContext', 'serviceType']
  },
  {
    type: 'recommendation',
    template: 'Can you recommend the top 5 {industryPlural}{locationContext}? I need reliable options for {serviceContext} and want to know who the leading providers are.',
    variables: ['industryPlural', 'locationContext', 'serviceContext']
  },
  {
      type: 'recommendation',
    template: 'I\'m looking for the most reputable {industryPlural}{locationContext}. Who would you recommend for someone seeking high-quality {serviceType} services?',
    variables: ['industryPlural', 'locationContext', 'serviceType']
  }
];

// ============================================================================
// INDUSTRY MAPPINGS
// ============================================================================

const INDUSTRY_MAPPINGS = {
  // Healthcare & Medical
  'healthcare': { plural: 'healthcare providers', service: 'medical care', type: 'healthcare provider' },
  'dental': { plural: 'dental practices', service: 'dental care', type: 'dental practice' },
  'medical': { plural: 'medical practices', service: 'medical services', type: 'medical provider' },
  'veterinary': { plural: 'veterinary clinics', service: 'pet care', type: 'veterinary clinic' },
  
  // Professional Services
  'legal': { plural: 'law firms', service: 'legal services', type: 'law firm' },
  'accounting': { plural: 'accounting firms', service: 'financial services', type: 'accounting firm' },
  'consulting': { plural: 'consulting firms', service: 'business consulting', type: 'consulting company' },
  'real estate': { plural: 'real estate agencies', service: 'property services', type: 'real estate agency' },
  
  // Food & Hospitality
  'restaurant': { plural: 'restaurants', service: 'dining', type: 'restaurant' },
  'cafe': { plural: 'cafes', service: 'coffee and food', type: 'cafe' },
  'catering': { plural: 'catering companies', service: 'event catering', type: 'catering service' },
  'hotel': { plural: 'hotels', service: 'accommodation', type: 'hotel' },
  
  // Retail & Commerce
  'retail': { plural: 'retail stores', service: 'shopping', type: 'retail business' },
  'automotive': { plural: 'auto services', service: 'vehicle maintenance', type: 'automotive service' },
  'beauty': { plural: 'beauty salons', service: 'beauty services', type: 'beauty salon' },
  'fitness': { plural: 'fitness centers', service: 'fitness training', type: 'fitness facility' },
  
  // Technology & Services
  'technology': { plural: 'tech companies', service: 'technology solutions', type: 'technology company' },
  'marketing': { plural: 'marketing agencies', service: 'marketing services', type: 'marketing agency' },
  'construction': { plural: 'construction companies', service: 'construction services', type: 'construction company' },
  'cleaning': { plural: 'cleaning services', service: 'cleaning', type: 'cleaning service' },
  
  // Default fallback
  'default': { plural: 'businesses', service: 'professional services', type: 'business' }
};

// ============================================================================
// MAIN GENERATOR CLASS
// ============================================================================

export class PromptGenerator implements IPromptGenerator {
  
  /**
   * Generate all three prompt types for a business context
   */
  generatePrompts(context: BusinessContext): GeneratedPrompts {
    return {
      factual: this.generateFactualPrompt(context),
      opinion: this.generateOpinionPrompt(context),
      recommendation: this.generateRecommendationPrompt(context)
    };
  }

  /**
   * Generate factual information prompt
   */
  generateFactualPrompt(context: BusinessContext): string {
    const template = this.selectTemplate(FACTUAL_TEMPLATES);
    const variables = this.buildVariables(context);
    return this.substituteVariables(template.template, variables);
  }
  
  /**
   * Generate opinion/assessment prompt
   */
  generateOpinionPrompt(context: BusinessContext): string {
    const template = this.selectTemplate(OPINION_TEMPLATES);
    const variables = this.buildVariables(context);
    return this.substituteVariables(template.template, variables);
  }
  
  /**
   * Generate recommendation/competitive prompt
   */
  generateRecommendationPrompt(context: BusinessContext): string {
    const template = this.selectTemplate(RECOMMENDATION_TEMPLATES);
    const variables = this.buildVariables(context);
    return this.substituteVariables(template.template, variables);
  }
  
  /**
   * Create prompts from Business entity (convenience method)
   */
  generatePromptsFromBusiness(business: Business): GeneratedPrompts {
    const context = this.businessToContext(business);
    return this.generatePrompts(context);
  }
  
  /**
   * Convert Business entity to BusinessContext
   */
  private businessToContext(business: Business): BusinessContext {
    return {
      name: business.name,
      url: business.url,
      category: business.category || undefined,
      location: business.location ? {
        city: business.location.city,
        state: business.location.state,
        country: business.location.country
      } : undefined,
      crawlData: business.crawlData || undefined
    };
  }
  
  /**
   * Select a random template from the array
   */
  private selectTemplate(templates: PromptTemplate[]): PromptTemplate {
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }
  
  /**
   * Build variable substitution map from business context
   */
  private buildVariables(context: BusinessContext): Record<string, string> {
    const industry = this.extractIndustry(context);
    const industryMapping = INDUSTRY_MAPPINGS[industry as keyof typeof INDUSTRY_MAPPINGS] || INDUSTRY_MAPPINGS.default;
    
    return {
      businessName: context.name,
      locationContext: this.buildLocationContext(context.location),
      industry: industry,
      industryPlural: industryMapping.plural,
      businessType: industryMapping.type,
      serviceType: industryMapping.service,
      serviceContext: this.buildServiceContext(context, industryMapping.service)
    };
  }
  
  /**
   * Build location context string
   */
  private buildLocationContext(location?: BusinessContext['location']): string {
    if (!location) return '';
    
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    
    if (parts.length === 0) return '';
    
    return ` in ${parts.join(', ')}`;
  }
  
  /**
   * Build service context from crawl data or category
   */
  private buildServiceContext(context: BusinessContext, defaultService: string): string {
    // Try to extract specific services from crawl data
    if (context.crawlData?.services && context.crawlData.services.length > 0) {
      const primaryService = context.crawlData.services[0];
      return primaryService.toLowerCase();
    }
    
    // Try to extract from business description
    if (context.crawlData?.description) {
      const description = context.crawlData.description.toLowerCase();
      
      // Look for service keywords
      const serviceKeywords = [
        'consulting', 'design', 'development', 'marketing', 'sales',
        'repair', 'maintenance', 'installation', 'training', 'support',
        'care', 'treatment', 'therapy', 'advice', 'planning'
      ];
      
      for (const keyword of serviceKeywords) {
        if (description.includes(keyword)) {
          return keyword;
        }
      }
    }
    
    return defaultService;
  }
  
  /**
   * Extract industry from context
   */
  private extractIndustry(context: BusinessContext): string {
    // First try category
    if (context.category) {
      const category = context.category.toLowerCase();
      
      // Direct matches
      for (const industry of Object.keys(INDUSTRY_MAPPINGS)) {
        if (category.includes(industry)) {
          return industry;
        }
      }
      
      // Fuzzy matches
      if (category.includes('food') || category.includes('dining')) return 'restaurant';
      if (category.includes('health') || category.includes('medical')) return 'healthcare';
      if (category.includes('law') || category.includes('attorney')) return 'legal';
      if (category.includes('tech') || category.includes('software')) return 'technology';
      if (category.includes('shop') || category.includes('store')) return 'retail';
    }
    
    // Try to extract from crawl data
    if (context.crawlData) {
      const text = [
        context.crawlData.description,
        context.crawlData.businessDetails?.industry,
        context.crawlData.businessDetails?.sector,
        ...(context.crawlData.services || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      for (const industry of Object.keys(INDUSTRY_MAPPINGS)) {
        if (text.includes(industry)) {
          return industry;
        }
      }
      
      // Additional fuzzy matching on crawl data
      if (text.includes('doctor') || text.includes('clinic')) return 'healthcare';
      if (text.includes('lawyer') || text.includes('attorney')) return 'legal';
      if (text.includes('restaurant') || text.includes('food')) return 'restaurant';
      if (text.includes('software') || text.includes('app')) return 'technology';
    }
    
    // Try to extract from URL
    if (context.url) {
      const url = context.url.toLowerCase();
      for (const industry of Object.keys(INDUSTRY_MAPPINGS)) {
        if (url.includes(industry)) {
          return industry;
        }
      }
    }
    
    return 'default';
  }
  
  /**
   * Substitute variables in template string
   */
  private substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }
}

// Export singleton instance
export const promptGenerator = new PromptGenerator();