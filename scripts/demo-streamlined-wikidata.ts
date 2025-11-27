#!/usr/bin/env tsx
/**
 * Demo: Streamlined Wikidata Module
 * 
 * Demonstrates the new efficient wikidata entity creation system
 */

import { WikidataService } from '@/lib/wikidata';
import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/domain/gemflush';

// Enable mock mode for safe demonstration
process.env.WIKIDATA_PUBLISH_MODE = 'mock';

// Mock business data
const mockBusiness: Business = {
  id: 'demo-business-1',
  name: 'Demo Tech Solutions',
  url: 'https://demotechsolutions.com',
  location: {
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    coordinates: {
      lat: 37.7749,
      lng: -122.4194
    }
  },
  status: 'active',
  tier: 'pro',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock crawled data (rich dataset)
const mockCrawledData: CrawledData = {
  name: 'Demo Tech Solutions Inc.',
  description: 'Leading provider of innovative technology solutions for modern businesses',
  phone: '+1-415-555-0123',
  email: 'contact@demotechsolutions.com',
  address: '123 Innovation Drive, San Francisco, CA 94105',
  location: {
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    lat: 37.7749,
    lng: -122.4194,
    address: '123 Innovation Drive, San Francisco, CA 94105'
  },
  businessDetails: {
    industry: 'Software Development',
    sector: 'Technology',
    legalForm: 'Corporation',
    founded: '2018',
    employeeCount: 150,
    revenue: '$10M-50M'
  },
  socialLinks: {
    facebook: 'https://facebook.com/demotechsolutions',
    twitter: 'https://twitter.com/demotechsol',
    instagram: 'https://instagram.com/demotechsolutions',
    linkedin: 'https://linkedin.com/company/demo-tech-solutions'
  },
  content: 'We specialize in cloud computing, AI solutions, and digital transformation services.',
  images: ['https://demotechsolutions.com/logo.png']
};

async function demonstrateStreamlinedWikidata() {
  console.log('🚀 Streamlined Wikidata Module Demo');
  console.log('=====================================\n');

  // Initialize service
  const service = new WikidataService({
    maxProperties: 10,
    enableCaching: true,
    validateEntities: true
  });

  // Display service info
  const stats = service.getServiceStats();
  console.log('📊 Service Statistics:');
  console.log(`   Version: ${stats.version}`);
  console.log(`   Max Properties: ${stats.maxProperties}`);
  console.log(`   Max QIDs: ${stats.maxQIDs}`);
  console.log(`   Features: ${stats.features.length} available\n`);

  // Validate configuration
  const configValidation = service.validateConfiguration();
  console.log('⚙️  Configuration Validation:');
  console.log(`   Valid: ${configValidation.isValid}`);
  if (configValidation.warnings.length > 0) {
    console.log(`   Warnings: ${configValidation.warnings.length}`);
    configValidation.warnings.forEach(warning => console.log(`     - ${warning}`));
  }
  console.log();

  try {
    // Step 1: Preview entity (no publishing)
    console.log('🔍 Step 1: Previewing Entity');
    console.log('----------------------------');
    
    const preview = await service.previewEntity(mockBusiness, mockCrawledData, {
      maxProperties: 10,
      maxQIDs: 10
    });

    console.log(`   Entity Label: ${preview.entity.labels.en?.value}`);
    console.log(`   Entity Description: ${preview.entity.descriptions.en?.value}`);
    console.log(`   Properties: ${Object.keys(preview.entity.claims).length}`);
    console.log(`   Selected QIDs: ${preview.selection.selectedQIDs.length}`);
    console.log(`   Quality Score: ${preview.selection.qualityScore.toFixed(2)}`);
    console.log(`   Validation: ${preview.validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (preview.validation.warnings.length > 0) {
      console.log(`   Warnings: ${preview.validation.warnings.length}`);
    }

    console.log('\n   📋 Properties included:');
    Object.keys(preview.entity.claims).forEach(pid => {
      console.log(`     - ${pid}`);
    });

    console.log('\n   📈 Data Metrics:');
    console.log(`     - Completeness: ${(preview.metrics.completeness * 100).toFixed(1)}%`);
    console.log(`     - Quality: ${(preview.metrics.quality * 100).toFixed(1)}%`);
    console.log(`     - Richness: ${(preview.metrics.richness * 100).toFixed(1)}%`);
    console.log(`     - Property Count: ${preview.metrics.propertyCount}`);

    // Step 2: Create and publish entity (mock mode)
    console.log('\n🚀 Step 2: Creating and Publishing Entity');
    console.log('------------------------------------------');
    
    const result = await service.createAndPublishEntity(
      mockBusiness,
      mockCrawledData,
      {
        target: 'test',
        maxProperties: 10,
        maxQIDs: 10,
        includeReferences: true
      }
    );

    console.log(`   Success: ${result.result.success ? '✅' : '❌'}`);
    if (result.result.success) {
      console.log(`   QID: ${result.result.qid}`);
      console.log(`   Published to: ${result.result.publishedTo}`);
      console.log(`   Properties Published: ${result.result.propertiesPublished}`);
      console.log(`   References Published: ${result.result.referencesPublished}`);
    } else {
      console.log(`   Error: ${result.result.error}`);
    }

    console.log('\n   ⏱️  Performance Metrics:');
    console.log(`     - Processing Time: ${result.metrics.processingTime}ms`);
    console.log(`     - Data Quality: ${(result.metrics.dataQuality * 100).toFixed(1)}%`);
    console.log(`     - Properties: ${result.metrics.propertyCount}`);
    console.log(`     - QIDs: ${result.metrics.qidCount}`);

    // Step 3: Demonstrate dry run
    console.log('\n🧪 Step 3: Dry Run Mode');
    console.log('------------------------');
    
    const dryRunResult = await service.createAndPublishEntity(
      mockBusiness,
      mockCrawledData,
      {
        target: 'production',
        dryRun: true,
        maxProperties: 8
      }
    );

    console.log(`   Dry Run Success: ${dryRunResult.result.success ? '✅' : '❌'}`);
    console.log(`   Would publish to: ${dryRunResult.result.publishedTo}`);
    console.log(`   Would include ${dryRunResult.result.propertiesPublished} properties`);

    // Step 4: Demonstrate minimal data handling
    console.log('\n📦 Step 4: Minimal Data Handling');
    console.log('---------------------------------');
    
    const minimalBusiness: Business = {
      ...mockBusiness,
      name: 'Minimal Business',
      url: 'https://minimal.com',
      location: undefined
    };

    const minimalResult = await service.createAndPublishEntity(
      minimalBusiness,
      undefined, // No crawl data
      { target: 'test', dryRun: true }
    );

    console.log(`   Minimal Success: ${minimalResult.result.success ? '✅' : '❌'}`);
    console.log(`   Properties with minimal data: ${minimalResult.result.propertiesPublished}`);
    console.log(`   Quality score: ${(minimalResult.metrics.dataQuality * 100).toFixed(1)}%`);

    console.log('\n✨ Demo completed successfully!');
    console.log('\n💡 Key Benefits of Streamlined Module:');
    console.log('   - Single service interface for all operations');
    console.log('   - Intelligent property selection (up to 10 PIDs, 10 QIDs)');
    console.log('   - Dynamic JSON templates for rich entities');
    console.log('   - Comprehensive quality metrics and validation');
    console.log('   - Built-in mock mode for safe testing');
    console.log('   - Efficient crawl data integration');
    console.log('   - Type-safe TypeScript implementation');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  demonstrateStreamlinedWikidata()
    .then(() => {
      console.log('\n🎉 Demo completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo error:', error);
      process.exit(1);
    });
}

