// OpenRouter API client for LLM queries

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

export class OpenRouterClient {
  private apiKey: string | undefined;
  private endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  
  constructor() {
    // Lazy load API key to ensure env vars are loaded first
    this.apiKey = undefined;
  }
  
  private getApiKey(): string {
    if (this.apiKey === undefined) {
      this.apiKey = process.env.OPENROUTER_API_KEY || '';
      if (!this.apiKey) {
        console.warn('[OpenRouter] API key not configured. Using mock responses.');
      }
    }
    return this.apiKey;
  }
  
  /**
   * Query an LLM via OpenRouter
   */
  async query(model: string, prompt: string): Promise<{
    content: string;
    tokensUsed: number;
    model: string;
  }> {
    // Check if API key is configured
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.log('[OpenRouter] API key not configured. Using mock responses.');
      return this.getMockResponse(model, prompt);
    }
    
    try {
      console.log(`[OpenRouter] Querying ${model}...`);
      
      // PRODUCTION CODE:
      
      const request: OpenRouterRequest = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.BASE_URL || 'https://gemflush.com',
          'X-Title': 'GEMflush',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }
      
      const data: OpenRouterResponse = await response.json();
      
      return {
        content: data.choices[0].message.content,
        tokensUsed: data.usage?.total_tokens || 0,
        model: data.model,
      };
      
    } catch (error) {
      console.error('OpenRouter query error:', error);
      // Return mock response on error
      return this.getMockResponse(model, prompt);
    }
  }
  
  /**
   * Generate mock response for development
   * Simulates realistic LLM responses for testing
   */
  private getMockResponse(model: string, prompt: string): {
    content: string;
    tokensUsed: number;
    model: string;
  } {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect prompt type and business name
    let content = '';
    
    if (lowerPrompt.includes('what do you know about') || lowerPrompt.includes('what information')) {
      // Factual prompt
      if (Math.random() > 0.3) {
        content = `Based on available information, this business is a reputable local establishment known for providing quality services. They have been serving the community and maintain a professional reputation. They offer various services and products to their customers and have positive feedback from clients.`;
      } else {
        content = `I don't have specific information about this particular business in my training data. I would recommend checking their website or recent customer reviews for the most accurate and up-to-date information about their services and reputation.`;
      }
    } else if (lowerPrompt.includes('reputable') || lowerPrompt.includes('reliable')) {
      // Opinion prompt
      if (Math.random() > 0.4) {
        content = `Based on general information, this business appears to be a legitimate operation. However, I'd recommend researching current customer reviews and ratings to make an informed decision. Look for consistent positive feedback and professional service indicators.`;
      } else {
        content = `I don't have enough specific information to assess the reputation of this particular business. I'd suggest checking recent online reviews, Better Business Bureau ratings, and asking for references.`;
      }
    } else if (lowerPrompt.includes('recommend') || lowerPrompt.includes('best') || lowerPrompt.includes('top')) {
      // Recommendation prompt
      const shouldMention = Math.random() > 0.5;
      
      if (shouldMention) {
        content = `Here are some recommended businesses in this category:\n\n1. Local Business Example A - Known for excellent customer service\n2. Sample Business Inc - Professional and reliable service provider\n3. Quality Services Co - Long-standing reputation in the community\n4. Professional Solutions LLC - Innovative approach and competitive pricing\n5. Trusted Provider Group - Highly rated by customers\n\nI recommend researching recent reviews for each option to find the best fit for your needs.`;
      } else {
        content = `When looking for businesses in this category, I recommend:\n\n1. Checking recent online reviews on Google, Yelp, and industry-specific platforms\n2. Asking for recommendations from local community groups\n3. Verifying licenses and certifications\n4. Comparing quotes from multiple providers\n5. Looking for businesses with established track records\n\nWould you like more specific guidance on what to look for?`;
      }
    } else {
      content = `I can help you find information about local businesses. Could you please provide more specific details about what you're looking for?`;
    }
    
    return {
      content,
      tokensUsed: Math.floor(Math.random() * 200) + 100,
      model,
    };
  }
}

export const openRouterClient = new OpenRouterClient();

