#!/usr/bin/env tsx
/**
 * Simple Real Crawl Test - No LLM, just basic web scraping
 * Tests the crawler's ability to extract basic business data from real websites
 */

import { webCrawler } from '../lib/crawler';

const testUrl = process.argv[2] || 'https://www.anthropic.com';

console.log('🌐 Testing REAL Web Crawling (Basic Extraction Only)');
console.log('='.repeat(70));
console.log(`🎯 Target: ${testUrl}\n`);

async function test() {
  const startTime = Date.now();
  console.log('⏳ Crawling website...');
  
  const result = await webCrawler.crawl(testUrl);
  const duration = Date.now() - startTime;
  
  if (!result.success) {
    console.log(`\n❌ Crawl failed: ${result.error}`);
    process.exit(1);
  }
  
  console.log(`✅ Crawl completed in ${duration}ms\n`);
  console.log('═'.repeat(70));
  console.log('\n📊 EXTRACTED DATA:\n');
  
  // Basic Info
  console.log('📝 Basic Information:');
  console.log(`  Name: ${result.data?.name || 'N/A'}`);
  console.log(`  Description: ${result.data?.description?.substring(0, 120) || 'N/A'}...`);
  console.log(`  Phone: ${result.data?.phone || 'N/A'}`);
  console.log(`  Email: ${result.data?.email || 'N/A'}`);
  
  // Categories
  if (result.data?.categories && result.data.categories.length > 0) {
    console.log(`\n📂 Categories:`);
    result.data.categories.forEach(cat => console.log(`    - ${cat}`));
  }
  
  // Services
  if (result.data?.services && result.data.services.length > 0) {
    console.log(`\n🛠️  Services:`);
    result.data.services.slice(0, 5).forEach(service => console.log(`    - ${service}`));
    if (result.data.services.length > 5) {
      console.log(`    ... and ${result.data.services.length - 5} more`);
    }
  }
  
  // Social Links
  if (result.data?.socialLinks) {
    const links = result.data.socialLinks;
    const count = Object.keys(links).length;
    if (count > 0) {
      console.log(`\n🔗 Social Media (${count} platforms):`);
      if (links.facebook) console.log(`    Facebook: ${links.facebook}`);
      if (links.twitter) console.log(`    Twitter: ${links.twitter}`);
      if (links.linkedin) console.log(`    LinkedIn: ${links.linkedin}`);
      if (links.instagram) console.log(`    Instagram: ${links.instagram}`);
    }
  }
  
  // Structured Data
  if (result.data?.structuredData) {
    console.log(`\n📦 Structured Data (schema.org):`);
    const data = result.data.structuredData as any;
    if (data['@type']) console.log(`    Type: ${data['@type']}`);
    if (data.name) console.log(`    Name: ${data.name}`);
    if (data.telephone) console.log(`    Phone: ${data.telephone}`);
    if (data.address) {
      const addr = data.address;
      if (addr.streetAddress) console.log(`    Address: ${addr.streetAddress}`);
      if (addr.addressLocality) console.log(`    City: ${addr.addressLocality}`);
    }
  }
  
  // Meta Tags
  if (result.data?.metaTags) {
    console.log(`\n🏷️  Meta Tags:`);
    const tags = result.data.metaTags;
    if (tags['og:title']) console.log(`    OG Title: ${tags['og:title']}`);
    if (tags['description']) console.log(`    Description: ${tags['description']}`);
    if (tags['og:image']) console.log(`    OG Image: ${tags['og:image']}`);
  }
  
  // LLM Enhanced (if available)
  if (result.data?.businessDetails) {
    console.log(`\n🤖 LLM-Enhanced Data:`);
    const details = result.data.businessDetails;
    const fields = Object.keys(details).length;
    console.log(`    Total fields extracted: ${fields}`);
    if (details.industry) console.log(`    Industry: ${details.industry}`);
    if (details.founded) console.log(`    Founded: ${details.founded}`);
    if (details.employeeCount) console.log(`    Employees: ${details.employeeCount}`);
    if (details.ceo) console.log(`    CEO: ${details.ceo}`);
    if (details.products && details.products.length > 0) {
      console.log(`    Products: ${details.products.slice(0, 3).join(', ')}`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n✨ Test completed! This data can be used to build Wikidata entities.\n');
}

test().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});

