/**
 * Test Triple Format (username@username@botname)
 * 
 * According to the Wikidata message, the format might be:
 * "The new password to log in with Puddin1066@Puddin1066@kgaasbot is ..."
 * 
 * This suggests: lgname = username@username@botname
 */

import 'dotenv/config';

const TEST_WIKIDATA_API = 'https://test.wikidata.org/w/api.php';

async function testTripleFormat() {
  console.log('🔐 Testing Triple Format (username@username@botname)\n');

  const botUsername = process.env.WIKIDATA_BOT_USERNAME || '';
  const botPassword = process.env.WIKIDATA_BOT_PASSWORD || '';

  if (!botUsername || !botPassword) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const username = botUsername.includes('@') ? botUsername.split('@')[0] : botUsername;
  const botName = botUsername.includes('@') ? botUsername.split('@')[1] : '';

  console.log(`Username: ${username}`);
  console.log(`Bot name from .env: ${botName}`);
  console.log(`Password: ${botPassword.substring(0, 10)}... (length: ${botPassword.length})\n`);

  // Get login token
  const loginTokenUrl = `${TEST_WIKIDATA_API}?action=query&meta=tokens&type=login&format=json`;
  const loginTokenResponse = await fetch(loginTokenUrl);
  const loginTokenData = await loginTokenResponse.json();
  const loginToken = loginTokenData.query?.tokens?.logintoken;

  // Try different variations
  const formats = [
    {
      name: 'Triple format (username@username@botname)',
      lgname: `${username}@${username}@${botName}`,
      lgpassword: botPassword,
    },
    {
      name: 'Triple format (lowercase bot)',
      lgname: `${username}@${username}@${botName.toLowerCase()}`,
      lgpassword: botPassword,
    },
    {
      name: 'Triple format (no underscore)',
      lgname: `${username}@${username}@${botName.replace('_', '')}`,
      lgpassword: botPassword,
    },
    {
      name: 'Double format (username@botname) - current',
      lgname: `${username}@${botName}`,
      lgpassword: botPassword,
    },
  ];

  for (const format of formats) {
    console.log(`Testing: ${format.name}`);
    console.log(`   lgname: "${format.lgname}"`);
    console.log(`   lgpassword: "${format.lgpassword.substring(0, 15)}..."`);

    const loginResponse = await fetch(TEST_WIKIDATA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GEMflush/1.0 (triple format test)',
      },
      body: new URLSearchParams({
        action: 'login',
        lgname: format.lgname,
        lgpassword: format.lgpassword,
        lgtoken: loginToken,
        format: 'json',
      }),
    });

    const loginData = await loginResponse.json();
    const result = loginData.login?.result;
    const reason = loginData.login?.reason;

    if (result === 'Success') {
      console.log(`   ✅ SUCCESS! This format works!`);
      console.log(`\n💡 Update your .env:`);
      console.log(`   WIKIDATA_BOT_USERNAME=${format.lgname}`);
      console.log(`   WIKIDATA_BOT_PASSWORD=${botPassword}`);
      return;
    } else {
      console.log(`   ❌ Failed: ${result} - ${reason}`);
    }
    console.log('');

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('❌ None of the formats worked.');
  console.log('\n💡 Important:');
  console.log('   - Bot passwords are SEPARATE from your account password');
  console.log('   - Use the GENERATED bot password (random string)');
  console.log('   - NOT your account login password');
  console.log('   - Check Special:BotPasswords to verify the bot name and password');
}

testTripleFormat();

