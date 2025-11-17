/**
 * Simple Authentication Test
 * 
 * Tests if we're using the bot password correctly.
 * Bot passwords are SEPARATE from your account login password.
 * 
 * When you create a bot password at Special:BotPasswords, you get:
 * - Bot name (e.g., "kgaas_bot")
 * - Generated random password (this is what you use, NOT your account password)
 * 
 * Format:
 * - lgname: "username@botname"
 * - lgpassword: "the_generated_bot_password" (just the random part, NOT your account password)
 */

import 'dotenv/config';

const TEST_WIKIDATA_API = 'https://test.wikidata.org/w/api.php';

async function testSimpleAuth() {
  console.log('🔐 Simple Authentication Test\n');
  console.log('IMPORTANT: Bot passwords are SEPARATE from your account password!\n');
  console.log('When you create a bot password at Special:BotPasswords:');
  console.log('  1. You choose a bot name (e.g., "kgaas_bot")');
  console.log('  2. MediaWiki generates a random password');
  console.log('  3. You use THAT random password, NOT your account password\n');

  const botUsername = process.env.WIKIDATA_BOT_USERNAME;
  const botPassword = process.env.WIKIDATA_BOT_PASSWORD;

  if (!botUsername || !botPassword) {
    console.error('❌ Missing credentials in .env');
    console.error('   Set WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD');
    process.exit(1);
  }

  console.log('📋 Current .env configuration:');
  console.log(`   WIKIDATA_BOT_USERNAME: ${botUsername}`);
  console.log(`   WIKIDATA_BOT_PASSWORD: ${botPassword.substring(0, 10)}... (length: ${botPassword.length})`);
  console.log(`\n   This should be:`);
  console.log(`   - Username: Your account username + @ + bot name`);
  console.log(`   - Password: The GENERATED bot password (random string), NOT your account password\n`);

  // Get login token
  console.log('Step 1: Getting login token...');
  const loginTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
  const loginTokenResponse = await fetch(loginTokenUrl, {
    headers: { 'User-Agent': 'GEMflush/1.0 (simple auth test)' },
  });
  const loginTokenData = await loginTokenResponse.json();
  const loginToken = loginTokenData.query?.tokens?.logintoken;

  if (!loginToken) {
    console.error('❌ Failed to get login token');
    process.exit(1);
  }
  console.log('   ✅ Login token obtained\n');

  // Try authentication
  console.log('Step 2: Attempting authentication...');
  console.log(`   lgname: "${botUsername}"`);
  console.log(`   lgpassword: "${botPassword.substring(0, 15)}..." (using bot password, NOT account password)`);

  const loginResponse = await fetch(TEST_WIKIDATA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GEMflush/1.0 (simple auth test)',
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
  
  console.log(`\n   Response:`, JSON.stringify(loginData, null, 2));

  if (loginData.login?.result === 'Success') {
    console.log('\n✅ AUTHENTICATION SUCCESSFUL!');
    console.log('   You are using the correct bot password format.');
    return;
  }

  const result = loginData.login?.result || 'Unknown';
  const reason = loginData.login?.reason || 'No reason';

  console.log(`\n❌ Authentication failed: ${result}`);
  console.log(`   Reason: ${reason}\n`);

  console.log('💡 Troubleshooting:');
  console.log('   1. Verify you are using the GENERATED bot password (random string)');
  console.log('      NOT your account login password');
  console.log('   2. Check Special:BotPasswords page:');
  console.log('      https://test.wikidata.org/wiki/Special:BotPasswords');
  console.log('   3. The bot password should be a long random string (usually 20-40 chars)');
  console.log('   4. Copy it EXACTLY - no extra spaces or characters');
  console.log('   5. Verify the bot name matches exactly (case-sensitive)');
  console.log('   6. If the bot password was revoked, create a new one');
  console.log('\n   Example of what you should see on Special:BotPasswords:');
  console.log('   Bot name: kgaas_bot');
  console.log('   Password: 0g435bt282nfk3fhq7rql3qvt0astl3h  <-- Use THIS, not your account password');
}

testSimpleAuth();

