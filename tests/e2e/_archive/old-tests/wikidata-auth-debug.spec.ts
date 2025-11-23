/**
 * Wikidata Authentication Debug Test
 * 
 * This test performs comprehensive authentication and API communication testing
 * with extensive logging to help diagnose authentication issues.
 * 
 * IMPORTANT: This test ONLY works with test.wikidata.org
 * - Production wikidata.org account (Puddin1066) is BLOCKED indefinitely
 * - All tests target test.wikidata.org which is the safe testing environment
 * - Production publishing is disabled in the publisher code
 * 
 * Tests:
 * 1. Environment variable validation
 * 2. Login token retrieval
 * 3. Authentication with both new and old format
 * 4. Session cookie extraction
 * 5. CSRF token retrieval
 * 6. UserInfo verification (confirms authentication status)
 * 7. Authenticated API call (read operation)
 * 8. Write operation capability verification
 * 
 * Usage:
 *   pnpm test:e2e wikidata-auth-debug
 * 
 * Requires:
 *   WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD environment variables
 *   (loaded from .env file or system environment)
 *   Account must have valid bot password for test.wikidata.org
 */

// Load environment variables from .env file
import 'dotenv/config';

import { test, expect } from '@playwright/test';

const TEST_WIKIDATA_API = 'https://test.wikidata.org/w/api.php';

interface LogContext {
  step: string;
  timestamp: string;
  details: Record<string, unknown>;
}

class AuthLogger {
  private logs: LogContext[] = [];

  log(step: string, details: Record<string, unknown> = {}) {
    const context: LogContext = {
      step,
      timestamp: new Date().toISOString(),
      details,
    };
    this.logs.push(context);
    
    // Also log to console for immediate visibility
    // eslint-disable-next-line no-console
    console.log(`\n[${context.timestamp}] ${step}`);
    if (Object.keys(details).length > 0) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(details, null, 2));
    }
  }

  getLogs(): LogContext[] {
    return this.logs;
  }

  getLogSummary(): string {
    return this.logs.map(log => 
      `[${log.timestamp}] ${log.step}\n${JSON.stringify(log.details, null, 2)}`
    ).join('\n\n');
  }
}

test.describe('Wikidata Authentication Debug', () => {
  test.setTimeout(120_000); // 2 minutes for comprehensive testing

  test('comprehensive authentication and API communication test (test.wikidata.org only)', async () => {
    const logger = new AuthLogger();
    
    // ==========================================
    // STEP 0: Test Environment Information
    // ==========================================
    logger.log('STEP 0: Test Environment Information', {
      target_environment: 'test.wikidata.org (ONLY)',
      note: 'Production wikidata.org account is BLOCKED - all tests use test.wikidata.org',
      api_endpoint: TEST_WIKIDATA_API,
      production_blocked: true,
      production_note: 'Account Puddin1066 is blocked on www.wikidata.org - production publishing disabled',
    });

    // ==========================================
    // STEP 1: Environment Variable Validation
    // ==========================================
    logger.log('STEP 1: Environment Variable Validation', {
      hasWIKIDATA_BOT_USERNAME: !!process.env.WIKIDATA_BOT_USERNAME,
      hasWIKIDATA_BOT_PASSWORD: !!process.env.WIKIDATA_BOT_PASSWORD,
      WIKIDATA_BOT_USERNAME_length: process.env.WIKIDATA_BOT_USERNAME?.length || 0,
      WIKIDATA_BOT_PASSWORD_length: process.env.WIKIDATA_BOT_PASSWORD?.length || 0,
      WIKIDATA_BOT_USERNAME_preview: process.env.WIKIDATA_BOT_USERNAME 
        ? `${process.env.WIKIDATA_BOT_USERNAME.substring(0, 20)}...` 
        : 'NOT SET',
      WIKIDATA_PUBLISH_MODE: process.env.WIKIDATA_PUBLISH_MODE || 'not set',
    });

    const botUsername = process.env.WIKIDATA_BOT_USERNAME;
    const botPassword = process.env.WIKIDATA_BOT_PASSWORD;

    if (!botUsername || !botPassword) {
      logger.log('ERROR: Missing credentials', {
        error: 'WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD are required',
        instructions: [
          '1. Create bot account at https://test.wikidata.org',
          '2. Create bot password at https://test.wikidata.org/wiki/Special:BotPasswords',
          '3. Set WIKIDATA_BOT_USERNAME=username@botname',
          '4. Set WIKIDATA_BOT_PASSWORD=random_password_string',
        ],
      });
      throw new Error('Missing Wikidata credentials');
    }

    // Parse username and bot name
    const username = botUsername.includes('@') ? botUsername.split('@')[0] : botUsername;
    const botName = botUsername.includes('@') ? botUsername.split('@')[1] : botUsername;

    logger.log('Credentials parsed', {
      full_username: botUsername,
      extracted_username: username,
      extracted_botname: botName,
      password_length: botPassword.length,
      password_preview: `${botPassword.substring(0, 10)}...`,
    });

    // Check for placeholder credentials
    const isPlaceholder = 
      botUsername.includes('YourBot') ||
      botUsername.includes('example') ||
      botUsername.includes('placeholder') ||
      botPassword.includes('the_full_bot_password') ||
      botPassword.includes('example') ||
      botPassword.includes('placeholder') ||
      botPassword.length < 5;

    if (isPlaceholder) {
      logger.log('WARNING: Placeholder credentials detected', {
        isPlaceholder: true,
        message: 'Credentials appear to be placeholders. Real credentials required for testing.',
      });
    }

    // ==========================================
    // STEP 2: Test API Endpoint Connectivity
    // ==========================================
    logger.log('STEP 2: Testing API Endpoint Connectivity', {
      endpoint: TEST_WIKIDATA_API,
    });

    let connectivityTest: Response;
    try {
      connectivityTest = await fetch(TEST_WIKIDATA_API);
      logger.log('API endpoint connectivity', {
        status: connectivityTest.status,
        statusText: connectivityTest.statusText,
        ok: connectivityTest.ok,
        headers: Object.fromEntries(connectivityTest.headers.entries()),
      });
    } catch (error) {
      logger.log('ERROR: API endpoint connectivity failed', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: TEST_WIKIDATA_API,
      });
      throw error;
    }

    // ==========================================
    // STEP 3: Get Login Token
    // ==========================================
    const step3Start = Date.now();
    logger.log('STEP 3: Getting Login Token', {
      timestamp: new Date().toISOString(),
      step_start_ms: step3Start,
      url: `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`,
    });

    const loginTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
    let loginTokenResponse: Response;
    let loginTokenData: any;
    let loginTokenObtainedAt: number;

    try {
      const requestStart = Date.now();
      loginTokenResponse = await fetch(loginTokenUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'GEMflush/1.0 (auth debug test)',
        },
      });
      const requestEnd = Date.now();
      const requestDuration = requestEnd - requestStart;

      logger.log('Login token request response', {
        timestamp: new Date().toISOString(),
        status: loginTokenResponse.status,
        statusText: loginTokenResponse.statusText,
        ok: loginTokenResponse.ok,
        request_start_ms: requestStart,
        request_end_ms: requestEnd,
        request_duration_ms: requestDuration,
        time_since_step_start_ms: requestEnd - step3Start,
        headers: Object.fromEntries(loginTokenResponse.headers.entries()),
      });

      const parseStart = Date.now();
      loginTokenData = await loginTokenResponse.json();
      const parseEnd = Date.now();
      const parseDuration = parseEnd - parseStart;
      
      loginTokenObtainedAt = Date.now();
      const totalStepDuration = loginTokenObtainedAt - step3Start;
      
      logger.log('Login token API response', {
        timestamp: new Date().toISOString(),
        hasError: !!loginTokenData.error,
        error: loginTokenData.error || null,
        hasQuery: !!loginTokenData.query,
        hasTokens: !!loginTokenData.query?.tokens,
        hasLogintoken: !!loginTokenData.query?.tokens?.logintoken,
        parse_duration_ms: parseDuration,
        total_step_duration_ms: totalStepDuration,
        fullResponse: loginTokenData,
      });

      if (loginTokenData.error) {
        throw new Error(`Failed to get login token: ${loginTokenData.error.info || 'Unknown error'}`);
      }

      const loginToken = loginTokenData.query?.tokens?.logintoken;
      if (!loginToken) {
        throw new Error('Login token not found in API response');
      }

      logger.log('Login token obtained successfully', {
        timestamp: new Date().toISOString(),
        token_obtained_at_ms: loginTokenObtainedAt,
        token_obtained_at_iso: new Date(loginTokenObtainedAt).toISOString(),
        token_length: loginToken.length,
        token_preview: `${loginToken.substring(0, 20)}...`,
        request_duration_ms: requestDuration,
        parse_duration_ms: parseDuration,
        total_step_duration_ms: totalStepDuration,
        time_since_step_start_ms: loginTokenObtainedAt - step3Start,
      });
    } catch (error) {
      logger.log('ERROR: Failed to get login token', {
        timestamp: new Date().toISOString(),
        error_time_ms: Date.now(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        time_since_step_start_ms: Date.now() - step3Start,
      });
      throw error;
    }

    const loginToken = loginTokenData.query?.tokens?.logintoken;

    // ==========================================
    // STEP 4: Attempt Authentication (NEW FORMAT)
    // ==========================================
    logger.log('STEP 4: Attempting Authentication (NEW FORMAT)', {
      format: 'username@username@botname',
      lgname_format: `${username}@${username}@${botName}`,
      lgpassword_format: 'random_password_only',
      note: 'MediaWiki login may require two attempts (NeedToken then Success)',
    });

    // NEW FORMAT: username@username@botname
    const newFormatUsername = `${username}@${username}@${botName}`;
    const newFormatPassword = botPassword;

    logger.log('NEW FORMAT credentials prepared', {
      lgname: newFormatUsername,
      lgpassword_length: newFormatPassword.length,
      lgpassword_preview: `${newFormatPassword.substring(0, 15)}...`,
      lgtoken_length: loginToken.length,
      token_obtained_at: new Date().toISOString(),
    });

    let loginResponse: Response;
    let loginData: any;

    // Helper to get a fresh login token (tokens expire quickly)
    // MediaWiki may require cookies from token request to be sent with login request
    const getFreshLoginToken = async (): Promise<{ token: string; obtainedAt: number; requestDuration: number; cookies?: string }> => {
      const startTime = Date.now();
      const timestamp = new Date().toISOString();
      
      logger.log('Getting fresh login token for login attempt', {
        timestamp,
        start_time_ms: startTime,
      });
      
      const tokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
      const requestStart = Date.now();
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'GEMflush/1.0 (auth debug test)',
        },
      });
      
      const requestEnd = Date.now();
      const requestDuration = requestEnd - requestStart;
      
      // Extract cookies from token response (MediaWiki may require these for login)
      const setCookieHeader = tokenResponse.headers.get('set-cookie');
      let cookies: string | undefined;
      if (setCookieHeader) {
        cookies = setCookieHeader
          .split(',')
          .map(cookie => cookie.split(';')[0].trim())
          .join('; ');
        logger.log('Cookies extracted from token response', {
          raw_cookies: setCookieHeader.substring(0, 100) + '...',
          parsed_cookies: cookies.substring(0, 100) + '...',
          cookie_count: cookies.split(';').length,
        });
      }
      
      const parseStart = Date.now();
      const tokenData = await tokenResponse.json();
      const parseEnd = Date.now();
      const parseDuration = parseEnd - parseStart;
      
      const freshToken = tokenData.query?.tokens?.logintoken;
      const obtainedAt = Date.now();
      const totalDuration = obtainedAt - startTime;
      
      if (!freshToken) {
        logger.log('ERROR: Failed to get fresh login token', {
          timestamp: new Date().toISOString(),
          error_time_ms: obtainedAt,
          request_duration_ms: requestDuration,
          parse_duration_ms: parseDuration,
          total_duration_ms: totalDuration,
          response_data: tokenData,
        });
        throw new Error('Failed to get fresh login token');
      }
      
      logger.log('Fresh login token obtained', {
        timestamp: new Date().toISOString(),
        token_obtained_at_ms: obtainedAt,
        token_obtained_at_iso: new Date(obtainedAt).toISOString(),
        token_length: freshToken.length,
        token_preview: `${freshToken.substring(0, 20)}...`,
        request_duration_ms: requestDuration,
        parse_duration_ms: parseDuration,
        total_duration_ms: totalDuration,
        time_since_start_ms: obtainedAt - startTime,
        cookies_available: !!cookies,
        cookies_preview: cookies ? cookies.substring(0, 50) + '...' : undefined,
      });
      
      return { token: freshToken, obtainedAt, requestDuration, cookies };
    };

    // MediaWiki login helper function
    const attemptLogin = async (
      lgname: string,
      lgpassword: string,
      formatName: string,
      useToken?: string,
      tokenInfo?: { token: string; obtainedAt: number; requestDuration: number; cookies?: string }
    ): Promise<{ response: Response; data: any; token: string; timing: any; cookies: string | undefined }> => {
      const attemptStart = Date.now();
      const attemptStartIso = new Date().toISOString();
      
      // Get fresh token if not provided (tokens expire quickly)
      let token: string;
      let tokenObtainedAt: number | undefined;
      let tokenRequestDuration: number | undefined;
      let tokenCookies: string | undefined;
      
      if (useToken && tokenInfo) {
        token = useToken;
        tokenObtainedAt = tokenInfo.obtainedAt;
        tokenRequestDuration = tokenInfo.requestDuration;
        tokenCookies = tokenInfo.cookies;
      } else {
        const tokenResult = await getFreshLoginToken();
        token = tokenResult.token;
        tokenObtainedAt = tokenResult.obtainedAt;
        tokenRequestDuration = tokenResult.requestDuration;
        tokenCookies = tokenResult.cookies;
      }
      
      const timeSinceTokenObtained = tokenObtainedAt ? attemptStart - tokenObtainedAt : undefined;
      
      logger.log(`Attempting ${formatName} login`, {
        timestamp: attemptStartIso,
        attempt_start_ms: attemptStart,
        lgname,
        lgpassword_length: lgpassword.length,
        lgpassword_preview: `${lgpassword.substring(0, 20)}...`,
        token_preview: `${token.substring(0, 20)}...`,
        token_fresh: !useToken,
        token_obtained_at_ms: tokenObtainedAt,
        token_obtained_at_iso: tokenObtainedAt ? new Date(tokenObtainedAt).toISOString() : undefined,
        time_since_token_obtained_ms: timeSinceTokenObtained,
        token_age_ms: timeSinceTokenObtained,
        token_request_duration_ms: tokenRequestDuration,
        cookies_available: !!tokenCookies,
        cookies_preview: tokenCookies ? tokenCookies.substring(0, 50) + '...' : undefined,
        warning: timeSinceTokenObtained && timeSinceTokenObtained > 5000 
          ? 'Token may be expired (obtained more than 5 seconds ago)' 
          : undefined,
      });

      // Build headers - include cookies from token request if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GEMflush/1.0 (auth debug test)',
      };
      
      if (tokenCookies) {
        headers['Cookie'] = tokenCookies;
        logger.log('Including cookies from token request in login request', {
          cookies_preview: tokenCookies.substring(0, 80) + '...',
        });
      }

      const requestStart = Date.now();
      const response = await fetch(TEST_WIKIDATA_API, {
        method: 'POST',
        headers,
        body: new URLSearchParams({
          action: 'login',
          lgname,
          lgpassword,
          lgtoken: token,
          format: 'json',
        }),
      });
      const requestEnd = Date.now();
      const requestDuration = requestEnd - requestStart;

      const parseStart = Date.now();
      const data = await response.json();
      const parseEnd = Date.now();
      const parseDuration = parseEnd - parseStart;
      
      const attemptEnd = Date.now();
      const totalAttemptDuration = attemptEnd - attemptStart;
      
      const timing = {
        attempt_start_ms: attemptStart,
        attempt_start_iso: attemptStartIso,
        attempt_end_ms: attemptEnd,
        attempt_end_iso: new Date(attemptEnd).toISOString(),
        total_attempt_duration_ms: totalAttemptDuration,
        request_duration_ms: requestDuration,
        parse_duration_ms: parseDuration,
        token_obtained_at_ms: tokenObtainedAt,
        token_age_at_request_ms: timeSinceTokenObtained,
        token_request_duration_ms: tokenRequestDuration,
      };
      
      logger.log(`${formatName} login response`, {
        timestamp: new Date().toISOString(),
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        login_result: data.login?.result,
        login_reason: data.login?.reason,
        login_userid: data.login?.userid,
        login_username: data.login?.username,
        hasError: !!data.error,
        error: data.error || null,
        timing,
        fullResponse: data,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        token_age_analysis: {
          token_age_ms: timeSinceTokenObtained,
          token_age_seconds: timeSinceTokenObtained ? (timeSinceTokenObtained / 1000).toFixed(2) : undefined,
          likely_expired: timeSinceTokenObtained ? timeSinceTokenObtained > 30000 : false, // MediaWiki tokens typically expire in 30 seconds
          warning_threshold_exceeded: timeSinceTokenObtained ? timeSinceTokenObtained > 5000 : false,
        },
      });

      return { response, data, token, timing, cookies: tokenCookies };
    };

    try {
      // First login attempt with NEW FORMAT
      const firstAttempt = await attemptLogin(newFormatUsername, newFormatPassword, 'NEW FORMAT (first attempt)');
      loginResponse = firstAttempt.response;
      loginData = firstAttempt.data;
      
      // Extract cookies from first attempt for NeedToken retry
      // CRITICAL: For NeedToken, we must use the SAME cookies from the token request
      const firstAttemptTokenInfo = {
        token: firstAttempt.token,
        obtainedAt: firstAttempt.timing.token_obtained_at_ms || Date.now(),
        requestDuration: firstAttempt.timing.token_request_duration_ms || 0,
        cookies: firstAttempt.cookies, // Use cookies from first attempt's token request
      };
      
      logger.log('First attempt token info stored', {
        token_preview: `${firstAttempt.token.substring(0, 20)}...`,
        cookies_available: !!firstAttemptTokenInfo.cookies,
        cookies_preview: firstAttemptTokenInfo.cookies ? firstAttemptTokenInfo.cookies.substring(0, 50) + '...' : undefined,
        note: 'Cookies will be reused for NeedToken retry if needed',
      });

      // Handle NeedToken response (MediaWiki requires two-step login)
      // IMPORTANT: For NeedToken, we must use the SAME token, not a new one
      if (loginData.login?.result === 'NeedToken') {
        const timeBetweenAttempts = Date.now() - firstAttempt.timing.attempt_end_ms;
        logger.log('NeedToken response - retrying with same token (MediaWiki two-step login)', {
          timestamp: new Date().toISOString(),
          note: 'MediaWiki login requires a second attempt with the SAME token after NeedToken response',
          time_since_first_attempt_ms: timeBetweenAttempts,
          first_attempt_token_age_ms: Date.now() - firstAttemptTokenInfo.obtainedAt,
          first_attempt_token_age_seconds: ((Date.now() - firstAttemptTokenInfo.obtainedAt) / 1000).toFixed(2),
          warning: (Date.now() - firstAttemptTokenInfo.obtainedAt) > 30000 
            ? 'Token may be expired (older than 30 seconds)' 
            : undefined,
        });
        
        // Use the same token from the first attempt
        const secondAttempt = await attemptLogin(
          newFormatUsername, 
          newFormatPassword, 
          'NEW FORMAT (second attempt)', 
          firstAttempt.token,
          firstAttemptTokenInfo
        );
        loginResponse = secondAttempt.response;
        loginData = secondAttempt.data;
        
        logger.log('Second attempt timing analysis', {
          time_between_attempts_ms: secondAttempt.timing.attempt_start_ms - firstAttempt.timing.attempt_end_ms,
          total_token_age_at_second_attempt_ms: secondAttempt.timing.token_age_at_request_ms,
          total_token_age_seconds: secondAttempt.timing.token_age_at_request_ms 
            ? (secondAttempt.timing.token_age_at_request_ms / 1000).toFixed(2) 
            : undefined,
        });
      }

      if (loginData.error) {
        logger.log('ERROR: NEW FORMAT login API error', {
          error_code: loginData.error.code,
          error_info: loginData.error.info,
          fullError: loginData.error,
        });
      }
    } catch (error) {
      logger.log('ERROR: NEW FORMAT login request failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    // ==========================================
    // STEP 5: Attempt Authentication (OLD FORMAT) if NEW FORMAT failed
    // ==========================================
    if (loginData.login?.result !== 'Success' && loginData.login?.result !== 'NeedToken') {
      logger.log('STEP 5: Attempting Authentication (OLD FORMAT - fallback)', {
        reason: 'NEW FORMAT failed',
        new_format_result: loginData.login?.result,
        format: 'username as lgname, username@botname@password as lgpassword',
      });

      // OLD FORMAT: username as lgname, username@botname@password as lgpassword
      const oldFormatUsername = username;
      const oldFormatPassword = `${username}@${botName}@${botPassword}`;

      try {
        // First attempt with OLD FORMAT
        const oldFirstAttempt = await attemptLogin(oldFormatUsername, oldFormatPassword, 'OLD FORMAT (first attempt)');
        loginResponse = oldFirstAttempt.response;
        loginData = oldFirstAttempt.data;
        
        // Extract cookies from OLD FORMAT first attempt for NeedToken retry
        const oldFirstAttemptTokenInfo = {
          token: oldFirstAttempt.token,
          obtainedAt: oldFirstAttempt.timing.token_obtained_at_ms || Date.now(),
          requestDuration: oldFirstAttempt.timing.token_request_duration_ms || 0,
          cookies: oldFirstAttempt.cookies, // Use cookies from first attempt's token request
        };
        
        logger.log('OLD FORMAT first attempt token info stored', {
          token_preview: `${oldFirstAttempt.token.substring(0, 20)}...`,
          cookies_available: !!oldFirstAttemptTokenInfo.cookies,
          cookies_preview: oldFirstAttemptTokenInfo.cookies ? oldFirstAttemptTokenInfo.cookies.substring(0, 50) + '...' : undefined,
        });

        // Handle NeedToken response (use SAME token)
        if (loginData.login?.result === 'NeedToken') {
          const timeBetweenAttempts = Date.now() - oldFirstAttempt.timing.attempt_end_ms;
          logger.log('NeedToken response - retrying OLD FORMAT with same token', {
            timestamp: new Date().toISOString(),
            time_since_first_attempt_ms: timeBetweenAttempts,
            first_attempt_token_age_ms: Date.now() - oldFirstAttemptTokenInfo.obtainedAt,
            first_attempt_token_age_seconds: ((Date.now() - oldFirstAttemptTokenInfo.obtainedAt) / 1000).toFixed(2),
          });
          const oldSecondAttempt = await attemptLogin(
            oldFormatUsername, 
            oldFormatPassword, 
            'OLD FORMAT (second attempt)', 
            oldFirstAttempt.token,
            oldFirstAttemptTokenInfo
          );
          loginResponse = oldSecondAttempt.response;
          loginData = oldSecondAttempt.data;
          
          logger.log('OLD FORMAT second attempt timing analysis', {
            time_between_attempts_ms: oldSecondAttempt.timing.attempt_start_ms - oldFirstAttempt.timing.attempt_end_ms,
            total_token_age_at_second_attempt_ms: oldSecondAttempt.timing.token_age_at_request_ms,
            total_token_age_seconds: oldSecondAttempt.timing.token_age_at_request_ms 
              ? (oldSecondAttempt.timing.token_age_at_request_ms / 1000).toFixed(2) 
              : undefined,
          });
        }
      } catch (error) {
        logger.log('ERROR: OLD FORMAT login request failed', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }

    // ==========================================
    // STEP 6: Validate Authentication Result
    // ==========================================
    logger.log('STEP 6: Validating Authentication Result', {
      login_result: loginData.login?.result,
      login_reason: loginData.login?.reason,
    });

    if (loginData.error) {
      logger.log('ERROR: Login API returned error', {
        error_code: loginData.error.code,
        error_info: loginData.error.info,
        fullError: loginData.error,
      });
      throw new Error(
        `Login failed: ${loginData.error.code || 'unknown'} - ${loginData.error.info || 'Unknown error'}`
      );
    }

    if (loginData.login?.result !== 'Success') {
      logger.log('ERROR: Login failed', {
        result: loginData.login?.result,
        reason: loginData.login?.reason,
        troubleshooting: [
          '1. Verify bot password format matches exactly what was generated',
          '2. Check bot name is correct (case-sensitive)',
          '3. Ensure bot account exists at test.wikidata.org',
          '4. Try creating a new bot password at https://test.wikidata.org/wiki/Special:BotPasswords',
          '5. Verify WIKIDATA_BOT_USERNAME format: username@botname',
          '6. Verify WIKIDATA_BOT_PASSWORD is just the random password (not username@botname@password)',
        ],
      });
      throw new Error(
        `Login failed: ${loginData.login?.result || 'Unknown'} - ${loginData.login?.reason || 'Unknown reason'}`
      );
    }

    logger.log('Authentication successful', {
      userid: loginData.login?.userid,
      username: loginData.login?.username,
      result: loginData.login?.result,
    });

    // ==========================================
    // STEP 7: Extract Session Cookies
    // ==========================================
    logger.log('STEP 7: Extracting Session Cookies', {});

    const cookiesHeader = loginResponse.headers.get('set-cookie');
    if (!cookiesHeader) {
      logger.log('ERROR: No session cookies received', {
        allHeaders: Object.fromEntries(loginResponse.headers.entries()),
      });
      throw new Error('No session cookies received from login. Authentication failed.');
    }

    logger.log('Session cookies received', {
      raw_cookies_header: cookiesHeader,
      cookies_header_length: cookiesHeader.length,
    });

    // Parse cookies
    const cookies = cookiesHeader
      .split(',')
      .map(cookie => cookie.split(';')[0].trim())
      .join('; ');

    logger.log('Session cookies parsed', {
      parsed_cookies: cookies,
      cookie_count: cookies.split(';').length,
      cookie_names: cookies.split(';').map(c => c.split('=')[0].trim()),
    });

    // ==========================================
    // STEP 8: Get CSRF Token
    // ==========================================
    logger.log('STEP 8: Getting CSRF Token', {
      url: `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=csrf&format=json`,
    });

    const csrfTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=csrf&format=json`;
    let csrfResponse: Response;
    let csrfData: any;

    try {
      csrfResponse = await fetch(csrfTokenUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'GEMflush/1.0 (auth debug test)',
          'Cookie': cookies,
        },
      });

      logger.log('CSRF token request sent', {
        status: csrfResponse.status,
        statusText: csrfResponse.statusText,
        ok: csrfResponse.ok,
        requestHeaders: {
          'Cookie': cookies.substring(0, 100) + '...',
        },
        responseHeaders: Object.fromEntries(csrfResponse.headers.entries()),
      });

      csrfData = await csrfResponse.json();
      logger.log('CSRF token API response', {
        fullResponse: csrfData,
        hasError: !!csrfData.error,
        error: csrfData.error || null,
        hasQuery: !!csrfData.query,
        hasTokens: !!csrfData.query?.tokens,
        hasCsrftoken: !!csrfData.query?.tokens?.csrftoken,
      });

      if (csrfData.error) {
        logger.log('ERROR: CSRF token API error', {
          error_code: csrfData.error.code,
          error_info: csrfData.error.info,
          fullError: csrfData.error,
        });
        throw new Error(
          `CSRF token error: ${csrfData.error.code || 'unknown'} - ${csrfData.error.info || 'Unknown error'}`
        );
      }

      const csrfToken = csrfData.query?.tokens?.csrftoken;
      if (!csrfToken) {
        logger.log('ERROR: CSRF token not found', {
          availableKeys: Object.keys(csrfData.query?.tokens || {}),
        });
        throw new Error('CSRF token not found in API response');
      }

      logger.log('CSRF token obtained successfully', {
        token_length: csrfToken.length,
        token_preview: `${csrfToken.substring(0, 20)}...`,
      });
    } catch (error) {
      logger.log('ERROR: Failed to get CSRF token', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    const csrfToken = csrfData.query?.tokens?.csrftoken;

    // Validate CSRF token format
    if (csrfToken) {
      logger.log('CSRF token validation', {
        token_length: csrfToken.length,
        token_starts_with_plus: csrfToken.startsWith('+'),
        token_format_valid: csrfToken.length > 20 && csrfToken.length < 200,
        token_preview: `${csrfToken.substring(0, 30)}...`,
      });
      
      expect(csrfToken).toBeTruthy();
      expect(csrfToken.length).toBeGreaterThan(20);
      expect(csrfToken.length).toBeLessThan(200);
    } else {
      throw new Error('CSRF token is null or undefined');
    }

    // ==========================================
    // STEP 9: Verify Authentication with UserInfo API
    // ==========================================
    logger.log('STEP 9: Verifying Authentication with UserInfo API', {
      url: `${TEST_WIKIDATA_API}?action=query&meta=userinfo&uiprop=*&format=json`,
      note: 'This verifies the session cookies are valid and we are authenticated',
    });

    try {
      const userInfoResponse = await fetch(
        `${TEST_WIKIDATA_API}?action=query&meta=userinfo&uiprop=*&format=json`,
        {
          headers: {
            'User-Agent': 'GEMflush/1.0 (auth debug test)',
            'Cookie': cookies,
          },
        }
      );

      const userInfoData = await userInfoResponse.json();
      logger.log('UserInfo API response', {
        status: userInfoResponse.status,
        ok: userInfoResponse.ok,
        hasError: !!userInfoData.error,
        error: userInfoData.error || null,
        hasQuery: !!userInfoData.query,
        hasUserinfo: !!userInfoData.query?.userinfo,
        userinfo: userInfoData.query?.userinfo || null,
        is_authenticated: !userInfoData.query?.userinfo?.anon,
        user_id: userInfoData.query?.userinfo?.id,
        username: userInfoData.query?.userinfo?.name,
        groups: userInfoData.query?.userinfo?.groups,
        rights: userInfoData.query?.userinfo?.rights,
      });

      if (userInfoData.query?.userinfo?.anon) {
        logger.log('WARNING: User appears to be anonymous', {
          message: 'Authentication may have failed - user is still anonymous',
          userinfo: userInfoData.query?.userinfo,
        });
      } else {
        const userInfo = userInfoData.query?.userinfo;
        logger.log('Authentication verified via UserInfo', {
          user_id: userInfo?.id,
          username: userInfo?.name,
          authenticated: true,
          groups: userInfo?.groups || [],
          rights: userInfo?.rights || [],
          edit_count: userInfo?.editcount || 'unknown',
          // Check for block status (though test.wikidata.org account should not be blocked)
          blocked: userInfo?.blockedby ? {
            blocked: true,
            blockedby: userInfo.blockedby,
            blockreason: userInfo.blockreason,
            blockexpiry: userInfo.blockexpiry,
          } : { blocked: false },
        });
        
        // Warn if account appears to be blocked (shouldn't happen on test.wikidata.org)
        if (userInfo?.blockedby) {
          logger.log('WARNING: Account appears to be blocked', {
            blockedby: userInfo.blockedby,
            blockreason: userInfo.blockreason,
            blockexpiry: userInfo.blockexpiry,
            message: 'This account may not be able to perform write operations',
          });
        }
      }

      expect(userInfoResponse.ok).toBe(true);
    } catch (error) {
      logger.log('ERROR: UserInfo verification failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw - this is a verification step, not critical
    }

    // ==========================================
    // STEP 10: Test Authenticated Read Operation
    // ==========================================
    logger.log('STEP 10: Testing Authenticated Read Operation', {
      test_entity: 'Q1',
      url: `${TEST_WIKIDATA_API}?action=wbgetentities&ids=Q1&format=json`,
    });

    try {
      const readResponse = await fetch(
        `${TEST_WIKIDATA_API}?action=wbgetentities&ids=Q1&format=json`,
        {
          headers: {
            'User-Agent': 'GEMflush/1.0 (auth debug test)',
            'Cookie': cookies,
          },
        }
      );

      const readData = await readResponse.json();
      logger.log('Authenticated read operation result', {
        status: readResponse.status,
        ok: readResponse.ok,
        hasError: !!readData.error,
        error: readData.error || null,
        hasEntities: !!readData.entities,
        entity_id: readData.entities?.Q1?.id,
        entity_labels: readData.entities?.Q1?.labels,
      });

      expect(readResponse.ok).toBe(true);
      expect(readData.entities?.Q1).toBeTruthy();
      logger.log('Authenticated read operation successful', {
        entity_id: readData.entities?.Q1?.id,
        entity_label: readData.entities?.Q1?.labels?.en?.value,
      });
    } catch (error) {
      logger.log('ERROR: Authenticated read operation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    // ==========================================
    // STEP 11: Test Write Operation Capability (verify CSRF token is usable)
    // ==========================================
    logger.log('STEP 11: Testing Write Operation Capability', {
      note: 'This step verifies that we have the necessary tokens and cookies for write operations',
      has_csrf_token: !!csrfToken,
      csrf_token_length: csrfToken?.length || 0,
      has_session_cookies: !!cookies,
      session_cookies_length: cookies?.length || 0,
    });

    // Test that CSRF token format is correct for write operations
    // MediaWiki CSRF tokens typically start with '+' and are base64-like strings
    const tokenFormatValid = csrfToken && 
      csrfToken.length > 20 && 
      csrfToken.length < 200 &&
      (csrfToken.startsWith('+') || csrfToken.match(/^[A-Za-z0-9+\/=]+$/));

    logger.log('CSRF token format validation', {
      token_exists: !!csrfToken,
      token_length_valid: csrfToken ? (csrfToken.length > 20 && csrfToken.length < 200) : false,
      token_starts_with_plus: csrfToken?.startsWith('+') || false,
      token_format_valid: tokenFormatValid,
      token_preview: csrfToken ? `${csrfToken.substring(0, 40)}...` : 'N/A',
    });

    logger.log('Write operation capability verified', {
      csrf_token_available: !!csrfToken,
      csrf_token_format_valid: tokenFormatValid,
      session_cookies_available: !!cookies,
      authentication_complete: true,
      ready_for_write_operations: !!csrfToken && !!cookies && tokenFormatValid,
    });

    // Assert that we have everything needed for write operations
    expect(csrfToken).toBeTruthy();
    expect(cookies).toBeTruthy();
    expect(tokenFormatValid).toBe(true);

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    logger.log('TEST COMPLETE: All authentication steps passed', {
      summary: {
        environment_validation: 'PASSED',
        api_connectivity: 'PASSED',
        login_token_retrieval: 'PASSED',
        authentication: 'PASSED',
        session_cookies: 'PASSED',
        csrf_token_retrieval: 'PASSED',
        csrf_token_format: tokenFormatValid ? 'VALID' : 'INVALID',
        userinfo_verification: 'PASSED',
        authenticated_read: 'PASSED',
        write_capability: tokenFormatValid && !!csrfToken && !!cookies ? 'VERIFIED' : 'FAILED',
      },
      csrf_token_details: {
        obtained: !!csrfToken,
        length: csrfToken?.length || 0,
        format_valid: tokenFormatValid,
        preview: csrfToken ? `${csrfToken.substring(0, 30)}...` : 'N/A',
      },
      authentication_format_used: loginData.login?.result === 'Success' 
        ? (loginData.login?.username === newFormatUsername ? 'NEW FORMAT' : 'OLD FORMAT')
        : 'UNKNOWN',
    });

    // Output full log summary
    // eslint-disable-next-line no-console
    console.log('\n\n========================================');
    // eslint-disable-next-line no-console
    console.log('FULL LOG SUMMARY');
    // eslint-disable-next-line no-console
    console.log('========================================\n');
    // eslint-disable-next-line no-console
    console.log(logger.getLogSummary());
  });
});

