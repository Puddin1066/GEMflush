/**
 * Test script to verify test.wikidata.org Action API connectivity
 * Tests both read (no auth) and write (requires auth) operations
 * 
 * Usage:
 *   pnpm tsx scripts/test-wikidata-action-api.ts
 */

// Load environment variables from .env file
import 'dotenv/config';

const TEST_WIKIDATA_API = 'https://test.wikidata.org/w/api.php';

async function testReadOperation() {
  console.log('\n📖 Testing READ operation (no auth required)...');
  
  try {
    // Test querying an existing item (Q1 is "universe")
    const response = await fetch(
      `${TEST_WIKIDATA_API}?action=wbgetentities&ids=Q1&format=json`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API Error: ${data.error.info || 'Unknown error'}`);
    }
    
    const entity = data.entities?.Q1;
    if (entity) {
      console.log('✅ READ operation successful');
      console.log(`   Found entity: ${entity.labels?.en?.value || 'Unnamed'}`);
      console.log(`   Type: ${entity.type || 'unknown'}`);
      return true;
    } else {
      console.log('❌ READ operation failed: No entity found');
      return false;
    }
  } catch (error) {
    console.error('❌ READ operation failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function testWriteOperationCapability() {
  console.log('\n✍️  Testing WRITE operation capability (auth required)...');
  console.log(`   Using test.wikidata.org endpoint: ${TEST_WIKIDATA_API}`);
  
  const botUsername = process.env.WIKIDATA_BOT_USERNAME;
  const botPassword = process.env.WIKIDATA_BOT_PASSWORD;
  
  // Check for placeholder credentials
  // Note: Bot passwords can be various lengths, so we only check for obvious placeholders
  const isPlaceholder = 
    !botUsername || 
    !botPassword ||
    botUsername.includes('YourBot') ||
    botUsername.includes('example') ||
    botUsername.includes('placeholder') ||
    botPassword.includes('the_full_bot_password') ||
    botPassword.includes('example') ||
    botPassword.includes('placeholder') ||
    botPassword.length < 5; // Minimum reasonable length
  
  if (isPlaceholder) {
    console.log('⚠️  WRITE operation skipped: Credentials not configured (placeholder detected)');
    console.log('   To enable write operations:');
    console.log('   1. Create bot account at https://test.wikidata.org');
    console.log('   2. Create bot password at https://test.wikidata.org/wiki/Special:BotPasswords');
    console.log('   3. Update .env with:');
    console.log('      WIKIDATA_BOT_USERNAME=YourBot@BotName');
    console.log('      WIKIDATA_BOT_PASSWORD=actual_password_here');
    return false;
  }
  
  try {
    // Step 1: Get login token
    console.log('   Step 1: Getting login token...');
    const loginTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
    const loginTokenResponse = await fetch(loginTokenUrl);
    
    if (!loginTokenResponse.ok) {
      throw new Error(`HTTP ${loginTokenResponse.status}: ${loginTokenResponse.statusText}`);
    }
    
    const loginTokenData = await loginTokenResponse.json();
    
    if (loginTokenData.error) {
      throw new Error(`API Error: ${loginTokenData.error.info || 'Unknown error'}`);
    }
    
    const loginToken = loginTokenData.query?.tokens?.logintoken;
    if (!loginToken) {
      throw new Error('Login token not found in API response');
    }
    
    console.log('   ✅ Login token obtained');
    
    // Step 2: Login
    // Per MediaWiki API:Login specification, bot passwords use:
    // CORRECT FORMAT: lgname="username@botname" (from WIKIDATA_BOT_USERNAME), lgpassword="randompassword"
    // OLD FORMAT (legacy): lgname="username", lgpassword="username@botname@randompassword"
    console.log('   Step 2: Attempting login...');
    // IMPORTANT: Bot names are case-sensitive - preserve exact case from .env
    const username = botUsername.includes('@') ? botUsername.split('@')[0] : botUsername;
    const botName = botUsername.includes('@') ? botUsername.split('@')[1] : botUsername; // Preserve exact case
    
    // CORRECT FORMAT: Use username@botname directly (per MediaWiki API:Login spec)
    const correctFormatUsername = botUsername; // Use the full username@botname from .env
    const correctFormatPassword = botPassword; // Just the random password
    
    // OLD FORMAT as fallback (legacy compatibility)
    const oldFormatUsername = username;
    const oldFormatPassword = `${username}@${botName}@${botPassword}`; // Preserve exact case
    
    console.log(`   Trying CORRECT FORMAT (username@botname):`);
    console.log(`     lgname: "${correctFormatUsername}"`);
    console.log(`     lgpassword: "${correctFormatPassword.substring(0, 10)}..." (length: ${correctFormatPassword.length})`);
    
    let loginResponse = await fetch(TEST_WIKIDATA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GEMflush/1.0 (test script)',
      },
      body: new URLSearchParams({
        action: 'login',
        lgname: correctFormatUsername,
        lgpassword: correctFormatPassword,
        lgtoken: loginToken,
        format: 'json',
      }),
    });
    
    let loginData = await loginResponse.json();
    console.log(`   CORRECT FORMAT full response:`, JSON.stringify(loginData, null, 2));
    
    // If CORRECT FORMAT fails, try OLD FORMAT (legacy)
    if (loginData.login?.result !== 'Success' && loginData.login?.result !== 'NeedToken') {
      console.log(`   CORRECT FORMAT failed (${loginData.login?.result}), trying OLD FORMAT...`);
      console.log(`   Trying OLD FORMAT (legacy):`);
      console.log(`     lgname: "${oldFormatUsername}"`);
      console.log(`     lgpassword: "${oldFormatPassword.substring(0, 30)}..." (length: ${oldFormatPassword.length})`);
      
      loginResponse = await fetch(TEST_WIKIDATA_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GEMflush/1.0 (test script)',
        },
        body: new URLSearchParams({
          action: 'login',
          lgname: oldFormatUsername,
          lgpassword: oldFormatPassword,
          lgtoken: loginToken,
          format: 'json',
        }),
      });
      
      loginData = await loginResponse.json();
      console.log(`   OLD FORMAT full response:`, JSON.stringify(loginData, null, 2));
    }
    
    if (loginData.error) {
      console.error('   ❌ Login API error:', loginData.error);
      throw new Error(`Login error: ${loginData.error.code || 'unknown'} - ${loginData.error.info || 'Unknown error'}`);
    }
    
    if (loginData.login?.result !== 'Success') {
      console.error('   ❌ Login failed. Response:', JSON.stringify(loginData.login, null, 2));
      console.error('   Check:');
      console.error('   - Bot name should be lowercase (e.g., "kgaasbot" not "KGaaS_Bot")');
      console.error('   - Password should be just the random part (e.g., "0g435bt282nfk3fhq7rql3qvt0astl3h")');
      console.error('   - Update .env: WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot');
      throw new Error(`Login failed: ${loginData.login?.result || 'Unknown'} - ${loginData.login?.reason || 'Unknown reason'}`);
    }
    
    console.log('   ✅ Login successful');
    
    // Step 3: Get CSRF token (for write operations)
    console.log('   Step 3: Getting CSRF token for write operations...');
    const cookies = loginResponse.headers.get('set-cookie');
    
    if (!cookies) {
      throw new Error('No session cookies received from login');
    }
    
    const csrfTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=csrf&format=json`;
    const csrfResponse = await fetch(csrfTokenUrl, {
      headers: {
        'Cookie': cookies.split(',').map(c => c.split(';')[0].trim()).join('; '),
        'User-Agent': 'GEMflush/1.0 (test script)',
      },
    });
    
    const csrfData = await csrfResponse.json();
    
    if (csrfData.error) {
      throw new Error(`CSRF token error: ${csrfData.error.info || 'Unknown error'}`);
    }
    
    const csrfToken = csrfData.query?.tokens?.csrftoken;
    if (!csrfToken) {
      throw new Error('CSRF token not found in API response');
    }
    
    console.log('   ✅ CSRF token obtained');
    console.log('\n✅ WRITE operation capability verified');
    console.log('   Action API is ready for publishing entities');
    return true;
    
  } catch (error) {
    console.error('❌ WRITE operation capability test failed:', error instanceof Error ? error.message : error);
    console.log('\n   Troubleshooting:');
    console.log('   - Verify WIKIDATA_BOT_USERNAME format: username@botname');
    console.log('   - Verify WIKIDATA_BOT_PASSWORD matches exactly what was generated');
    console.log('   - Check bot account exists at https://test.wikidata.org');
    console.log('   - Create new bot password at https://test.wikidata.org/wiki/Special:BotPasswords');
    return false;
  }
}

async function main() {
  console.log('🔍 Testing test.wikidata.org Action API connectivity...\n');
  console.log(`API Endpoint: ${TEST_WIKIDATA_API}`);
  
  const readSuccess = await testReadOperation();
  const writeSuccess = await testWriteOperationCapability();
  
  console.log('\n📊 Test Summary:');
  console.log(`   READ operations: ${readSuccess ? '✅ Available' : '❌ Failed'}`);
  console.log(`   WRITE operations: ${writeSuccess ? '✅ Ready' : '⚠️  Requires credentials'}`);
  
  if (readSuccess && writeSuccess) {
    console.log('\n🎉 All tests passed! Action API is ready for use.');
    process.exit(0);
  } else if (readSuccess) {
    console.log('\n✅ Read operations work. Write operations require valid credentials.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check network connectivity and API endpoint.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

