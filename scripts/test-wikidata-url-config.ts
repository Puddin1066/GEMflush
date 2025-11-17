/**
 * Test Wikidata URL Configuration
 * 
 * Verifies that the Wikidata API URLs are properly configured.
 */

import 'dotenv/config';

console.log('🔍 Checking Wikidata API URL Configuration...\n');

const testUrl = process.env.WIKIDATA_TEST_API_URL || 'https://test.wikidata.org/w/api.php';
const prodUrl = process.env.WIKIDATA_PROD_API_URL || 'https://www.wikidata.org/w/api.php';

console.log('📋 Current Configuration:');
console.log(`   WIKIDATA_TEST_API_URL: ${process.env.WIKIDATA_TEST_API_URL || '(not set, using default)'}`);
console.log(`   → Test URL: ${testUrl}`);
console.log(`   WIKIDATA_PROD_API_URL: ${process.env.WIKIDATA_PROD_API_URL || '(not set, using default)'}`);
console.log(`   → Prod URL: ${prodUrl}\n`);

// Test if URLs are accessible
async function testUrlAccess(url: string, name: string) {
  try {
    const response = await fetch(`${url}?action=query&meta=siteinfo&format=json`, {
      method: 'GET',
      headers: { 'User-Agent': 'GEMflush/1.0 (URL test)' },
    });
    
    if (response.ok) {
      const data = await response.json();
      const siteName = data.query?.general?.sitename || 'Unknown';
      console.log(`✅ ${name}: ${url}`);
      console.log(`   Site: ${siteName}`);
      return true;
    } else {
      console.log(`❌ ${name}: ${url}`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${url}`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function runTests() {
  console.log('Testing URLs...\n');
  const testOk = await testUrlAccess(testUrl, 'Test Environment');
  console.log('');
  const prodOk = await testUrlAccess(prodUrl, 'Production Environment');
  
  console.log('\n📝 To configure custom URLs, add to .env:');
  console.log('   WIKIDATA_TEST_API_URL=https://test.wikidata.org/w/api.php');
  console.log('   WIKIDATA_PROD_API_URL=https://www.wikidata.org/w/api.php');

  if (!testOk || !prodOk) {
    console.log('\n⚠️  Some URLs are not accessible. Check your configuration.');
    process.exit(1);
  } else {
    console.log('\n✅ All URLs are accessible!');
  }
}

runTests();
