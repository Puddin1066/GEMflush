/**
 * Test Authentication with Correct Format from Wikidata Message
 * 
 * Based on the Wikidata bot password creation message:
 * "The new password to log in with Puddin1066@Puddin1066@kgaasbot is 0g435bt282nfk3fhq7rql3qvt0astl3h"
 * 
 * Format: lgname = username@username@botname
 */

import 'dotenv/config';

const TEST_WIKIDATA_API = 'https://test.wikidata.org/w/api.php';

async function testCorrectFormat() {
  console.log('🔐 Testing Authentication with Correct Format\n');
  console.log('Based on Wikidata message:');
  console.log('  "The new password to log in with Puddin1066@Puddin1066@kgaasbot is ..."\n');

  const botUsername = process.env.WIKIDATA_BOT_USERNAME || '';
  const botPassword = process.env.WIKIDATA_BOT_PASSWORD || '';

  if (!botUsername || !botPassword) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
  }

  const username = botUsername.includes('@') ? botUsername.split('@')[0] : botUsername;
  const botName = botUsername.includes('@') ? botUsername.split('@')[1] : botUsername;

  console.log('📋 Current .env:');
  console.log(`   WIKIDATA_BOT_USERNAME: ${botUsername}`);
  console.log(`   WIKIDATA_BOT_PASSWORD: ${botPassword.substring(0, 10)}... (length: ${botPassword.length})\n`);

  // Get login token
  console.log('Step 1: Getting login token...');
  const loginTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
  const loginTokenResponse = await fetch(loginTokenUrl);
  const loginTokenData = await loginTokenResponse.json();
  const loginToken = loginTokenData.query?.tokens?.logintoken;

  if (!loginToken) {
    console.error('❌ Failed to get login token');
    process.exit(1);
  }
  console.log('   ✅ Login token obtained\n');

  // Try NEW FORMAT: username@username@botname
  console.log('Step 2: Trying NEW FORMAT (username@username@botname)...');
  const newFormatUsername = `${username}@${username}@${botName}`;
  console.log(`   lgname: "${newFormatUsername}"`);
  console.log(`   lgpassword: "${botPassword.substring(0, 15)}..."`);

  let loginResponse = await fetch(TEST_WIKIDATA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GEMflush/1.0 (correct format test)',
    },
    body: new URLSearchParams({
      action: 'login',
      lgname: newFormatUsername,
      lgpassword: botPassword,
      lgtoken: loginToken,
      format: 'json',
    }),
  });

  let loginData = await loginResponse.json();
  console.log(`   Response:`, JSON.stringify(loginData, null, 2));

  if (loginData.login?.result === 'Success') {
    console.log('\n✅ AUTHENTICATION SUCCESSFUL with NEW FORMAT!');
    console.log(`\n💡 Your .env should be:`);
    console.log(`   WIKIDATA_BOT_USERNAME=${username}@${botName}`);
    console.log(`   WIKIDATA_BOT_PASSWORD=${botPassword}`);
    console.log(`\n   The code will automatically use: ${newFormatUsername} for lgname`);
    return;
  }

  // Try OLD FORMAT
  console.log('\nStep 3: Trying OLD FORMAT (legacy)...');
  const oldFormatUsername = username;
  const oldFormatPassword = `${username}@${botName}@${botPassword}`;
  console.log(`   lgname: "${oldFormatUsername}"`);
  console.log(`   lgpassword: "${oldFormatPassword.substring(0, 30)}..."`);

  loginResponse = await fetch(TEST_WIKIDATA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GEMflush/1.0 (correct format test)',
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
  console.log(`   Response:`, JSON.stringify(loginData, null, 2));

  if (loginData.login?.result === 'Success') {
    console.log('\n✅ AUTHENTICATION SUCCESSFUL with OLD FORMAT!');
  } else {
    console.log('\n❌ Both formats failed');
    console.log(`   Result: ${loginData.login?.result}`);
    console.log(`   Reason: ${loginData.login?.reason}`);
  }
}

testCorrectFormat();

