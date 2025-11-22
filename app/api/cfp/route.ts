/**
 * CFP Orchestrator API Endpoint
 * 
 * Provides HTTP access to the automated CFP (Crawl, Fingerprint, Publish) flow.
 * Takes a single URL and produces a complete JSON entity.
 * 
 * POST /api/cfp
 * {
 *   "url": "https://example.com",
 *   "options": {
 *     "publishTarget": "test",
 *     "includeFingerprint": true,
 *     "shouldPublish": false,
 *     "timeout": 60000
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeCFPFlow } from '@/lib/services/cfp-orchestrator';
import type { CFPInput } from '@/lib/services/cfp-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CFPInput;
    
    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Set reasonable defaults and limits for API usage
    const options = {
      publishTarget: body.options?.publishTarget || 'test',
      includeFingerprint: body.options?.includeFingerprint !== false,
      shouldPublish: body.options?.shouldPublish || false,
      timeout: Math.min(body.options?.timeout || 60000, 120000), // Max 2 minutes
      allowMockData: body.options?.allowMockData !== false,
    };
    
    console.log('[CFP API] Starting CFP flow', {
      url: body.url,
      options,
      timestamp: new Date().toISOString()
    });
    
    // Execute CFP flow
    const result = await executeCFPFlow(body.url, options);
    
    console.log('[CFP API] CFP flow completed', {
      url: body.url,
      success: result.success,
      processingTime: result.processingTime,
      hasEntity: !!result.entity,
      hasPublishResult: !!result.publishResult
    });
    
    // Return result
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[CFP API] CFP flow failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

// GET endpoint for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'CFP Orchestrator API',
    description: 'Automated Crawl, Fingerprint, Publish flow from URL to JSON entity',
    version: '1.0.0',
    endpoints: {
      'POST /api/cfp': {
        description: 'Execute CFP flow for a given URL',
        parameters: {
          url: {
            type: 'string',
            required: true,
            description: 'Business website URL to process'
          },
          options: {
            type: 'object',
            required: false,
            properties: {
              publishTarget: {
                type: 'string',
                enum: ['test', 'production'],
                default: 'test',
                description: 'Wikidata publishing target'
              },
              includeFingerprint: {
                type: 'boolean',
                default: true,
                description: 'Whether to include LLM fingerprint analysis'
              },
              shouldPublish: {
                type: 'boolean',
                default: false,
                description: 'Whether to actually publish to Wikidata'
              },
              timeout: {
                type: 'number',
                default: 60000,
                maximum: 120000,
                description: 'Maximum processing time in milliseconds'
              },
              allowMockData: {
                type: 'boolean',
                default: true,
                description: 'Whether to use mock data for testing'
              }
            }
          }
        },
        response: {
          success: 'boolean',
          url: 'string',
          entity: 'WikidataEntity | null',
          publishResult: 'PublishResult | undefined',
          crawlData: 'CrawledData | undefined',
          fingerprintAnalysis: 'FingerprintAnalysis | undefined',
          processingTime: 'number',
          timestamp: 'Date',
          error: 'string | undefined',
          partialResults: {
            crawlSuccess: 'boolean',
            fingerprintSuccess: 'boolean',
            entityCreationSuccess: 'boolean',
            publishSuccess: 'boolean'
          }
        }
      }
    },
    examples: {
      'Basic entity creation': {
        url: 'https://brownphysicians.org',
        options: {
          shouldPublish: false,
          includeFingerprint: true
        }
      },
      'Full CFP with publishing': {
        url: 'https://brownphysicians.org',
        options: {
          shouldPublish: true,
          publishTarget: 'test',
          includeFingerprint: true,
          timeout: 90000
        }
      },
      'Quick crawl only': {
        url: 'https://stripe.com',
        options: {
          shouldPublish: false,
          includeFingerprint: false,
          timeout: 30000
        }
      },
      'Healthcare practice': {
        url: 'https://brownphysicians.org',
        options: {
          shouldPublish: false,
          includeFingerprint: true,
          timeout: 60000
        }
      },
      'Technology company': {
        url: 'https://openai.com',
        options: {
          shouldPublish: false,
          includeFingerprint: true,
          timeout: 60000
        }
      }
    }
  });
}
