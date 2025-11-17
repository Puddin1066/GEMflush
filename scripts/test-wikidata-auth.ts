/**
 * Test Wikidata Authentication
 * 
 * This script tests if authentication to test.wikidata.org is working.
 * It checks:
 * 1. Can we get a login token?
 * 2. Can we authenticate with bot credentials?
 * 3. Can we get a CSRF token (requires authentication)?
 */

import 'dotenv/config';

const TEST_WIKIDATA_API = 'https://test.wikidata.org/w/api.php';

async function testAuthentication() {
  console.log('🔐 Testing Wikidata Authentication...\n');

  const botUsername = process.env.WIKIDATA_BOT_USERNAME;
  const botPassword = process.env.WIKIDATA_BOT_PASSWORD;

  if (!botUsername || !botPassword) {
    console.error('❌ Missing credentials');
    console.error('   Set WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD in .env');
    process.exit(1);
  }

  console.log(`📋 Credentials configured:`);
  console.log(`   Username: ${botUsername}`);
  console.log(`   Password: ${botPassword.substring(0, 10)}... (length: ${botPassword.length})\n`);

  try {
    // Step 1: Get login token
    console.log('Step 1: Getting login token...');
    const loginTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
    const loginTokenResponse = await fetch(loginTokenUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'GEMflush/1.0 (auth test)' },
    });

    if (!loginTokenResponse.ok) {
      console.error(`❌ Failed to fetch login token: ${loginTokenResponse.status} ${loginTokenResponse.statusText}`);
      process.exit(1);
    }

    const loginTokenData = await loginTokenResponse.json();
    
    if (loginTokenData.error) {
      console.error(`❌ API error: ${loginTokenData.error.code} - ${loginTokenData.error.info}`);
      process.exit(1);
    }

    const loginToken = loginTokenData.query?.tokens?.logintoken;
    if (!loginToken) {
      console.error('❌ Login token not found in response');
      console.error('   Response:', JSON.stringify(loginTokenData, null, 2));
      process.exit(1);
    }

    console.log('   ✅ Login token obtained\n');

    // Step 2: Try authentication with CORRECT FORMAT (username@botname)
    console.log('Step 2: Attempting authentication...');
    console.log(`   Format: CORRECT (username@botname)`);
    console.log(`   lgname: "${botUsername}"`);
    console.log(`   lgpassword: "${botPassword.substring(0, 10)}..." (length: ${botPassword.length})`);

    const loginResponse = await fetch(TEST_WIKIDATA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GEMflush/1.0 (auth test)',
      },
      body: new URLSearchParams({
        action: 'login',
        lgname: botUsername,
        lgpassword: botPassword,
        lgtoken: loginToken,
        format: 'json',
      }),
    });

    const loginData = await loginResponse.json();
    console.log(`   Response:`, JSON.stringify(loginData, null, 2));

    if (loginData.error) {
      console.error(`\n❌ Authentication failed with API error:`);
      console.error(`   Code: ${loginData.error.code}`);
      console.error(`   Info: ${loginData.error.info}`);
      process.exit(1);
    }

    if (loginData.login?.result === 'Success') {
      console.log('\n✅ Authentication SUCCESSFUL!');
      
      // Step 3: Try to get CSRF token (requires authentication)
      console.log('\nStep 3: Testing authenticated request (CSRF token)...');
      
      const cookiesHeader = loginResponse.headers.get('set-cookie');
      if (!cookiesHeader) {
        console.warn('   ⚠️  No cookies received from login');
      } else {
        const cookies = cookiesHeader
          .split(',')
          .map(cookie => cookie.split(';')[0].trim())
          .join('; ');
        console.log(`   Cookies: ${cookies.substring(0, 50)}...`);

        const csrfTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=csrf&format=json`;
        const csrfResponse = await fetch(csrfTokenUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'GEMflush/1.0 (auth test)',
            'Cookie': cookies,
          },
        });

        if (!csrfResponse.ok) {
          console.error(`   ❌ Failed to get CSRF token: ${csrfResponse.status} ${csrfResponse.statusText}`);
          process.exit(1);
        }

        const csrfData = await csrfResponse.json();
        
        if (csrfData.error) {
          console.error(`   ❌ API error: ${csrfData.error.code} - ${csrfData.error.info}`);
          process.exit(1);
        }

        const csrfToken = csrfData.query?.tokens?.csrftoken;
        if (csrfToken) {
          console.log(`   ✅ CSRF token obtained: ${csrfToken.substring(0, 20)}...`);
          console.log('\n✅ FULL AUTHENTICATION SUCCESSFUL!');
          console.log('   You can now publish to test.wikidata.org');
        } else {
          console.error('   ❌ CSRF token not found in response');
          process.exit(1);
        }
      }
    } else {
      const result = loginData.login?.result || 'Unknown';
      const reason = loginData.login?.reason || 'No reason provided';
      
      console.error(`\n❌ Authentication FAILED`);
      console.error(`   Result: ${result}`);
      console.error(`   Reason: ${reason}`);
      
      if (result === 'Failed' && reason.includes('session')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Verify bot name matches exactly (case-sensitive)');
        console.error('   2. Check password is correct (no extra spaces)');
        console.error('   3. Verify bot password exists at: https://test.wikidata.org/wiki/Special:BotPasswords');
        console.error('   4. Try creating a new bot password');
        console.error('   5. Wait a few minutes if rate limited');
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

testAuthentication();

