import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WikidataPublisher } from '../publisher';
import { WikidataEntityData } from '@/lib/types/gemflush';

// Mock fetch globally
global.fetch = vi.fn();

describe('WikidataPublisher', () => {
  let publisher: WikidataPublisher;
  const originalEnv = process.env;

  const mockEntity: WikidataEntityData = {
    labels: {
      en: {
        language: 'en',
        value: 'Test Business',
      },
    },
    descriptions: {
      en: {
        language: 'en',
        value: 'A test business',
      },
    },
    claims: {
      P31: [
        {
          mainsnak: {
            property: 'P31',
            snaktype: 'value',
            datavalue: {
              value: {
                'entity-type': 'item',
                id: 'Q4830453',
              },
              type: 'wikibase-entityid',
            },
          },
          type: 'statement',
          rank: 'normal',
        },
      ],
    },
  };

  beforeEach(() => {
    publisher = new WikidataPublisher();
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    // Default to mock mode for most tests
    process.env.WIKIDATA_PUBLISH_MODE = 'mock';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('publishEntity - Mock Mode', () => {
    it('should publish entity to test Wikidata in mock mode', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'mock';
      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(true);
      expect(result.qid).toMatch(/^Q999\d+$/); // Mock QIDs start with Q999
      expect(result.error).toBeUndefined();
    });

    it('should publish entity to production Wikidata in mock mode', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'mock';
      const result = await publisher.publishEntity(mockEntity, true);

      expect(result.success).toBe(true);
      expect(result.qid).toMatch(/^Q999\d+$/);
    });

    it('should generate unique QIDs', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'mock';
      const result1 = await publisher.publishEntity(mockEntity, false);
      const result2 = await publisher.publishEntity(mockEntity, false);

      expect(result1.qid).not.toBe(result2.qid);
    });

    it('should handle errors gracefully', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'mock';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a publisher that will throw an error
      const publisherWithError = new WikidataPublisher();
      vi.spyOn(publisherWithError as any, 'generateMockQID').mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await publisherWithError.publishEntity(mockEntity, false);

      expect(result.success).toBe(false);
      expect(result.qid).toBe('');
      expect(result.error).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('publishEntity - Real API Mode', () => {
    beforeEach(() => {
      process.env.WIKIDATA_PUBLISH_MODE = 'real';
      process.env.WIKIDATA_BOT_USERNAME = 'TestUser@TestBot';
      process.env.WIKIDATA_BOT_PASSWORD = 'validpassword123';
    });

    it('should fall back to mock mode when credentials are placeholders', async () => {
      process.env.WIKIDATA_BOT_USERNAME = 'YourBot@Example';
      process.env.WIKIDATA_BOT_PASSWORD = 'the_full_bot_password';

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(true);
      expect(result.qid).toMatch(/^Q999\d+$/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fall back to mock mode when password is too short', async () => {
      process.env.WIKIDATA_BOT_PASSWORD = '1234'; // Too short

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(true);
      expect(result.qid).toMatch(/^Q999\d+$/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should successfully publish with valid credentials', async () => {
      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request (correct format)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session; userid=123; username=TestUser',
        },
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-456',
            },
          },
        }),
      });

      // Mock entity creation request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: {
            id: 'Q123456',
          },
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(true);
      expect(result.qid).toBe('Q123456');
      expect(global.fetch).toHaveBeenCalledTimes(4); // login token + login + csrf + publish
    });

    it('should try old format if correct format fails', async () => {
      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request (correct format fails)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Failed',
            reason: 'Wrong password',
          },
        }),
      });

      // Mock login request (old format succeeds)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session; userid=123; username=TestUser',
        },
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-456',
            },
          },
        }),
      });

      // Mock entity creation request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: {
            id: 'Q789012',
          },
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(true);
      expect(result.qid).toBe('Q789012');
      // Should have tried both login formats
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should handle API errors gracefully', async () => {
      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session',
        },
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-456',
            },
          },
        }),
      });

      // Mock entity creation request with error
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          error: {
            code: 'invalid-entity',
            info: 'Entity data is invalid',
          },
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(false);
      expect(result.qid).toBe('');
      expect(result.error).toContain('invalid-entity');
    });

    it('should handle missing entity ID in response', async () => {
      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session',
        },
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-456',
            },
          },
        }),
      });

      // Mock entity creation request without entity ID
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          // Missing entity.id
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no entity ID returned');
    });

    it('should handle login token fetch errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          error: {
            code: 'api-error',
            info: 'API unavailable',
          },
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get login token');
    });

    it('should handle missing login token in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {},
          },
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Login token not found');
    });

    it('should handle login failures with helpful error messages', async () => {
      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request (both formats fail)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Failed',
            reason: 'Unable to continue login. Your session most likely timed out.',
          },
        }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Failed',
            reason: 'Unable to continue login. Your session most likely timed out.',
          },
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Login failed');
      expect(result.error).toContain('session');
    });
  });

  describe('updateEntity', () => {
    it('should update entity successfully in mock mode', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'mock';
      const updates: Partial<WikidataEntityData> = {
        labels: {
          en: {
            language: 'en',
            value: 'Updated Business Name',
          },
        },
      };

      const result = await publisher.updateEntity('Q123456', updates, false);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should update entity in production (mocked)', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'mock';
      const updates: Partial<WikidataEntityData> = {
        descriptions: {
          en: {
            language: 'en',
            value: 'Updated description',
          },
        },
      };

      const result = await publisher.updateEntity('Q123456', updates, true);

      expect(result.success).toBe(true);
    });

    it('should update entity with real API', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'real';
      process.env.WIKIDATA_BOT_USERNAME = 'TestUser@TestBot';
      process.env.WIKIDATA_BOT_PASSWORD = 'validpassword123';

      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session',
        },
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-456',
            },
          },
        }),
      });

      // Mock update request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
        }),
      });

      const updates: Partial<WikidataEntityData> = {
        labels: {
          en: {
            language: 'en',
            value: 'Updated Business Name',
          },
        },
      };

      const result = await publisher.updateEntity('Q123456', updates, false);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle update API errors', async () => {
      process.env.WIKIDATA_PUBLISH_MODE = 'real';
      process.env.WIKIDATA_BOT_USERNAME = 'TestUser@TestBot';
      process.env.WIKIDATA_BOT_PASSWORD = 'validpassword123';

      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session',
        },
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-456',
            },
          },
        }),
      });

      // Mock update request with error
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          error: {
            code: 'invalid-entity',
            info: 'Entity not found',
          },
        }),
      });

      const updates: Partial<WikidataEntityData> = {
        labels: {
          en: {
            language: 'en',
            value: 'Updated Business Name',
          },
        },
      };

      const result = await publisher.updateEntity('Q123456', updates, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid-entity');
    });
  });

  describe('CSRF Token and Session Management', () => {
    beforeEach(() => {
      process.env.WIKIDATA_PUBLISH_MODE = 'real';
      process.env.WIKIDATA_BOT_USERNAME = 'TestUser@TestBot';
      process.env.WIKIDATA_BOT_PASSWORD = 'validpassword123';
    });

    it('should reuse session cookies for multiple operations', async () => {
      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-123',
            },
          },
        }),
      });

      // Mock login request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session; userid=123',
        },
      });

      // Mock CSRF token request (first time)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-1',
            },
          },
        }),
      });

      // Mock first publish
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: { id: 'Q111' },
        }),
      });

      // Mock CSRF token request (second time - should reuse cookies)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-2',
            },
          },
        }),
      });

      // Mock second publish
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: { id: 'Q222' },
        }),
      });

      const result1 = await publisher.publishEntity(mockEntity, false);
      const result2 = await publisher.publishEntity(mockEntity, false);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Should only login once (session reused)
      // Check for login calls by examining the request body
      const loginCalls = (global.fetch as any).mock.calls.filter((call: any[]) => {
        if (call[1]?.body) {
          const body = call[1].body.toString();
          return body.includes('action=login');
        }
        return false;
      });
      expect(loginCalls.length).toBe(1);
    });

    it('should re-authenticate if CSRF token fetch fails with 401', async () => {
      // Mock login token request (first attempt)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-1',
            },
          },
        }),
      });

      // Mock login request (first attempt)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session-1',
        },
      });

      // Mock CSRF token request fails with 401
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Mock login token request (re-auth)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token-2',
            },
          },
        }),
      });

      // Mock login request (re-auth)
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          login: {
            result: 'Success',
          },
        }),
        headers: {
          get: () => 'sessionid=mock-session-2',
        },
      });

      // Mock CSRF token request (retry after re-auth)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token-retry',
            },
          },
        }),
      });

      // Mock publish
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: { id: 'Q333' },
        }),
      });

      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(true);
      // Should have logged in twice (initial + re-auth)
      // Check for login calls by examining the request body
      const loginCalls = (global.fetch as any).mock.calls.filter((call: any[]) => {
        if (call[1]?.body) {
          const body = call[1].body.toString();
          return body.includes('action=login');
        }
        return false;
      });
      expect(loginCalls.length).toBe(2);
    });
  });

  describe('Bot Password Format Handling', () => {
    beforeEach(() => {
      process.env.WIKIDATA_PUBLISH_MODE = 'real';
    });

    it('should use correct format (username@username@botname) for lgname', async () => {
      process.env.WIKIDATA_BOT_USERNAME = 'TestUser@TestBot';
      process.env.WIKIDATA_BOT_PASSWORD = 'password123';

      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token',
            },
          },
        }),
      });

      // Mock login request
      let loginCall: any;
      (global.fetch as any).mockImplementationOnce(async (url: string, options?: any) => {
        loginCall = options;
        return {
          json: async () => ({
            login: {
              result: 'Success',
            },
          }),
          headers: {
            get: () => 'sessionid=mock-session',
          },
        };
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token',
            },
          },
        }),
      });

      // Mock publish
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: { id: 'Q444' },
        }),
      });

      await publisher.publishEntity(mockEntity, false);

      // Verify correct format was used (NEW FORMAT: username@username@botname per Wikidata message)
      const body = loginCall?.body as URLSearchParams;
      const lgname = body?.get('lgname');
      expect(lgname).toBe('TestUser@TestUser@TestBot'); // NEW format: username@username@botname
    });

    it('should preserve exact case of bot name', async () => {
      process.env.WIKIDATA_BOT_USERNAME = 'TestUser@KGaaS_Bot';
      process.env.WIKIDATA_BOT_PASSWORD = 'password123';

      // Mock login token request
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          query: {
            tokens: {
              logintoken: 'mock-login-token',
            },
          },
        }),
      });

      // Mock login request
      let loginCall: any;
      (global.fetch as any).mockImplementationOnce(async (url: string, options?: any) => {
        loginCall = options;
        return {
          json: async () => ({
            login: {
              result: 'Success',
            },
          }),
          headers: {
            get: () => 'sessionid=mock-session',
          },
        };
      });

      // Mock CSRF token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            tokens: {
              csrftoken: 'mock-csrf-token',
            },
          },
        }),
      });

      // Mock publish
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: { id: 'Q555' },
        }),
      });

      await publisher.publishEntity(mockEntity, false);

      // Verify exact case is preserved (NEW FORMAT: username@username@botname)
      const body = loginCall?.body as URLSearchParams;
      const lgname = body?.get('lgname');
      expect(lgname).toBe('TestUser@TestUser@KGaaS_Bot'); // NEW format with exact case preserved
    });
  });
});

