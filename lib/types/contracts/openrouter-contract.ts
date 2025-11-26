/**
 * OpenRouter API Contract
 * Type definitions for OpenRouter API requests and responses
 * 
 * Reference: https://openrouter.ai/docs/api-reference
 * 
 * DRY: Centralized contract definitions
 * SOLID: Single Responsibility - contract definitions only
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * OpenRouter message structure
 * Used in chat completion requests
 */
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenRouter API request structure
 * Used for chat completion API calls
 */
export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * OpenRouter API response structure
 * Response from chat completion endpoint
 */
export interface OpenRouterResponse {
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

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * OpenRouter API error structure
 * Error response from OpenRouter API
 */
export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

