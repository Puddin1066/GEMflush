/**
 * Mock Response Generator
 * DRY: Extracted from openrouter-client.ts for reusability
 */

export class MockResponseGenerator {
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


