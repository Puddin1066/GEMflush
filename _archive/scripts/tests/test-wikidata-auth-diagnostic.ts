/**
 * Diagnostic Test for Wikidata Authentication
 * 
 * Tries multiple bot name format variations to identify the correct format.
 */

import 'dotenv/config';

const TEST_WIKIDATA_API = 'https://test.wikidata.org/w/api.php';

async function testAuthFormat(username: string, botName: string, password: string, formatName: string) {
  const loginTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
  const loginTokenResponse = await fetch(loginTokenUrl);
  const loginTokenData = await loginTokenResponse.json();
  const loginToken = loginTokenData.query?.tokens?.logintoken;

  const loginResponse = await fetch(TEST_WIKIDATA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GEMflush/1.0 (diagnostic)',
    },
    body: new URLSearchParams({
      action: 'login',
      lgname: username,
      lgpassword: password,
      lgtoken: loginToken,
      format: 'json',
    }),
  });

  const loginData = await loginResponse.json();
  return {
    formatName,
    username,
    password: password.substring(0, 10) + '...',
    result: loginData.login?.result,
    reason: loginData.login?.reason,
    success: loginData.login?.result === 'Success',
  };
}

async function runDiagnostic() {
  console.log('🔍 Diagnostic Test: Trying Multiple Bot Name Formats\n');

  const botUsername = process.env.WIKIDATA_BOT_USERNAME || '';
  const botPassword = process.env.WIKIDATA_BOT_PASSWORD || '';

  if (!botUsername || !botPassword) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
  }

  const username = botUsername.includes('@') ? botUsername.split('@')[0] : botUsername;
  const currentBotName = botUsername.includes('@') ? botUsername.split('@')[1] : '';

  console.log(`Base username: ${username}`);
  console.log(`Current bot name from .env: ${currentBotName}`);
  console.log(`Password length: ${botPassword.length}\n`);

  // Try different variations
  const formats = [
    // Current format
    { name: 'Current (.env format)', lgname: botUsername, lgpassword: botPassword },
    
    // Variations of bot name
    { name: 'Lowercase bot name', lgname: `${username}@${currentBotName.toLowerCase()}`, lgpassword: botPassword },
    { name: 'Uppercase bot name', lgname: `${username}@${currentBotName.toUpperCase()}`, lgpassword: botPassword },
    { name: 'No underscore', lgname: `${username}@${currentBotName.replace('_', '')}`, lgpassword: botPassword },
    { name: 'Hyphen instead of underscore', lgname: `${username}@${currentBotName.replace('_', '-')}`, lgpassword: botPassword },
    
    // Old format variations
    { name: 'Old format (username only)', lgname: username, lgpassword: `${username}@${currentBotName}@${botPassword}` },
    { name: 'Old format (lowercase bot)', lgname: username, lgpassword: `${username}@${currentBotName.toLowerCase()}@${botPassword}` },
    { name: 'Old format (no underscore)', lgname: username, lgpassword: `${username}@${currentBotName.replace('_', '')}@${botPassword}` },
  ];

  console.log('Testing formats...\n');

  const results = [];
  for (const format of formats) {
    try {
      const result = await testAuthFormat(format.lgname, '', format.lgpassword, format.name);
      results.push(result);
      
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${format.name}`);
      console.log(`   lgname: "${format.lgname}"`);
      console.log(`   lgpassword: "${format.lgpassword.substring(0, 20)}..."`);
      console.log(`   Result: ${result.result} - ${result.reason || 'N/A'}\n`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error testing ${format.name}:`, error);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  const successful = results.find(r => r.success);
  if (successful) {
    console.log(`\n✅ WORKING FORMAT FOUND:`);
    console.log(`   Format: ${successful.formatName}`);
    console.log(`   lgname: "${successful.username}"`);
    console.log(`   lgpassword: "${successful.password}"`);
    console.log(`\n💡 Update your .env:`);
    console.log(`   WIKIDATA_BOT_USERNAME=${successful.username}`);
    console.log(`   WIKIDATA_BOT_PASSWORD=<full password>`);
  } else {
    console.log('\n❌ No working format found. Possible issues:');
    console.log('   1. Bot password may have been revoked');
    console.log('   2. Bot name may be completely different');
    console.log('   3. Password may be incorrect');
    console.log('   4. Rate limiting (wait a few minutes)');
    console.log('\n💡 Next steps:');
    console.log('   1. Check Special:BotPasswords page');
    console.log('   2. Verify the exact bot name shown');
    console.log('   3. Create a new bot password if needed');
  }
}

runDiagnostic();

