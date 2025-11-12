import { describe, it, expect } from 'vitest';
import {
  ServiceError,
  CrawlerError,
  LLMError,
  WikidataError,
  ApiResponse,
  JobResponse,
  BusinessCreateResponse,
} from '../service-contracts';

describe('Service Contracts - Error Classes', () => {
  describe('ServiceError', () => {
    it('should create error with message and code', () => {
      const error = new ServiceError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ServiceError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow custom status code', () => {
      const error = new ServiceError('Not found', 'NOT_FOUND', 404);

      expect(error.statusCode).toBe(404);
    });

    it('should allow optional details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new ServiceError('Validation failed', 'VALIDATION_ERROR', 400, details);

      expect(error.details).toEqual(details);
    });
  });

  describe('CrawlerError', () => {
    it('should create crawler-specific error', () => {
      const error = new CrawlerError('Failed to crawl URL');

      expect(error.message).toBe('Failed to crawl URL');
      expect(error.code).toBe('CRAWLER_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('CrawlerError');
      expect(error).toBeInstanceOf(ServiceError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow optional details', () => {
      const details = { url: 'https://example.com', statusCode: 404 };
      const error = new CrawlerError('Page not found', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('LLMError', () => {
    it('should create LLM-specific error', () => {
      const error = new LLMError('LLM query failed');

      expect(error.message).toBe('LLM query failed');
      expect(error.code).toBe('LLM_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('LLMError');
      expect(error).toBeInstanceOf(ServiceError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow optional details', () => {
      const details = { model: 'gpt-4', tokensUsed: 1000 };
      const error = new LLMError('Rate limit exceeded', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('WikidataError', () => {
    it('should create Wikidata-specific error', () => {
      const error = new WikidataError('Publish failed');

      expect(error.message).toBe('Publish failed');
      expect(error.code).toBe('WIKIDATA_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('WikidataError');
      expect(error).toBeInstanceOf(ServiceError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow optional details', () => {
      const details = { qid: 'Q123', reason: 'Not notable' };
      const error = new WikidataError('Entity not notable', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('Error Stack Traces', () => {
    it('should preserve stack trace', () => {
      const error = new ServiceError('Test', 'TEST');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ServiceError');
    });
  });
});

describe('Service Contracts - API Response Types', () => {
  describe('ApiResponse', () => {
    it('should match successful response structure', () => {
      const response: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1 });
      expect(response.error).toBeUndefined();
    });

    it('should match error response structure', () => {
      const response: ApiResponse = {
        success: false,
        error: 'Something went wrong',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
      expect(response.data).toBeUndefined();
    });

    it('should support optional message', () => {
      const response: ApiResponse = {
        success: true,
        message: 'Operation completed',
      };

      expect(response.message).toBe('Operation completed');
    });
  });

  describe('JobResponse', () => {
    it('should match job response structure', () => {
      const response: JobResponse = {
        jobId: 123,
        status: 'queued',
      };

      expect(response.jobId).toBe(123);
      expect(response.status).toBe('queued');
    });

    it('should support all status values', () => {
      const statuses: JobResponse['status'][] = ['queued', 'processing', 'completed', 'failed'];
      
      statuses.forEach(status => {
        const response: JobResponse = {
          jobId: 1,
          status,
        };
        expect(response.status).toBe(status);
      });
    });

    it('should support optional message', () => {
      const response: JobResponse = {
        jobId: 1,
        status: 'processing',
        message: 'Crawling website...',
      };

      expect(response.message).toBe('Crawling website...');
    });
  });

  describe('BusinessCreateResponse', () => {
    it('should match business creation response structure', () => {
      const response: BusinessCreateResponse = {
        id: 1,
        name: 'Test Business',
        status: 'pending',
      };

      expect(response.id).toBe(1);
      expect(response.name).toBe('Test Business');
      expect(response.status).toBe('pending');
    });
  });
});

