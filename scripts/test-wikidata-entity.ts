#!/usr/bin/env tsx
// Test script to generate and display Wikidata entity JSON

import { entityBuilder } from '../lib/wikidata/entity-builder';
import { Business } from '../lib/db/schema';
import { CrawledData } from '../lib/types/gemflush';

// Mock business data
const mockBusiness: Business = {
  id: 1,
  teamId: 1,
  name: 'Acme Coffee Roasters',
  url: 'https://acmecoffee.com',
  category: 'restaurant',
  location: {
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    lat: 37.7749,
    lng: -122.4194,
  },
  wikidataQID: null,
  wikidataPublishedAt: null,
  lastCrawledAt: null,
  crawlData: null,
  status: 'crawled',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock crawled data
const mockCrawledData: CrawledData = {
  name: 'Acme Coffee Roasters Inc.',
  description: 'Premium artisanal coffee roaster and cafe serving San Francisco since 2015. Specializing in single-origin beans and handcrafted espresso beverages.',
  phone: '+1-415-555-0123',
  email: 'info@acmecoffee.com',
  socialLinks: {
    facebook: 'https://facebook.com/acmecoffee',
    instagram: 'https://instagram.com/acmecoffee',
    linkedin: 'https://linkedin.com/company/acmecoffee',
  },
  founded: '2015',
  categories: ['restaurant', 'cafe', 'coffee roaster'],
  services: [
    'Espresso drinks',
    'Pour-over coffee',
    'Coffee bean sales',
    'Catering services',
  ],
  imageUrl: 'https://acmecoffee.com/images/storefront.jpg',
  metaTags: {
    'og:title': 'Acme Coffee Roasters - Artisan Coffee in SF',
    'description': 'Premium coffee experience in San Francisco',
  },
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Acme Coffee Roasters',
    telephone: '+1-415-555-0123',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Main Street',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      postalCode: '94102',
      addressCountry: 'US',
    },
  },
};

console.log('🔧 GEMFlush - Wikidata Entity Generator Test\n');
console.log('=' .repeat(80));
console.log('\n📋 Business Information:');
console.log('  Name:', mockBusiness.name);
console.log('  URL:', mockBusiness.url);
console.log('  Category:', mockBusiness.category);
console.log('  Location:', `${mockBusiness.location?.city}, ${mockBusiness.location?.state}`);
console.log('  Coordinates:', `${mockBusiness.location?.lat}, ${mockBusiness.location?.lng}`);
console.log('\n📊 Crawled Data:');
console.log('  Description:', mockCrawledData.description?.substring(0, 80) + '...');
console.log('  Phone:', mockCrawledData.phone);
console.log('  Email:', mockCrawledData.email);
console.log('  Founded:', mockCrawledData.founded);
console.log('  Social Links:', Object.keys(mockCrawledData.socialLinks || {}).length, 'platforms');

console.log('\n' + '='.repeat(80));
console.log('🏗️  Building Wikidata Entity...\n');

// Build the entity
const wikidataEntity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

console.log('📦 Generated Wikidata Entity JSON:');
console.log('=' .repeat(80));
console.log(JSON.stringify(wikidataEntity, null, 2));

console.log('\n' + '='.repeat(80));
console.log('✅ Validating Notability Standards...\n');

// Validate notability
const notabilityCheck = entityBuilder.validateNotability(wikidataEntity);

if (notabilityCheck.isNotable) {
  console.log('✅ Entity meets Wikidata notability standards!');
} else {
  console.log('❌ Entity does NOT meet notability standards:');
  notabilityCheck.reasons.forEach(reason => {
    console.log('   -', reason);
  });
}

console.log('\n' + '='.repeat(80));
console.log('📊 Entity Statistics:\n');

const claimCount = Object.keys(wikidataEntity.claims).length;
const referenceCount = Object.values(wikidataEntity.claims)
  .flat()
  .filter(claim => claim.references && claim.references.length > 0).length;

console.log('  Total Properties (PIDs):', claimCount);
console.log('  Properties with References:', referenceCount);
console.log('  Labels:', Object.keys(wikidataEntity.labels).join(', '));
console.log('  Descriptions:', Object.keys(wikidataEntity.descriptions).join(', '));

console.log('\n📝 Property Breakdown:');
Object.entries(wikidataEntity.claims).forEach(([pid, claims]) => {
  const propertyNames: Record<string, string> = {
    P31: 'instance of',
    P856: 'official website',
    P625: 'coordinate location',
    P1448: 'official name',
    P1329: 'phone number',
    P969: 'street address',
  };
  
  const name = propertyNames[pid] || 'unknown property';
  console.log(`  ${pid} (${name}):`, claims.length, 'claim(s)');
});

console.log('\n' + '='.repeat(80));
console.log('🚀 This JSON would be sent to Wikidata Action API:');
console.log('   Endpoint: https://test.wikidata.org/w/api.php');
console.log('   Action: wbeditentity');
console.log('   Method: POST');
console.log('   Parameters:');
console.log('     - action: wbeditentity');
console.log('     - new: item');
console.log('     - data: [JSON above]');
console.log('     - token: [CSRF token]');
console.log('     - format: json');
console.log('\n' + '='.repeat(80));

console.log('\n✨ Test completed successfully!\n');

