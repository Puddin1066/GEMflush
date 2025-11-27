#!/usr/bin/env tsx
/**
 * Demo: New Streamlined Wikidata Module
 * 
 * Demonstrates the new efficient wikidata entity creation system
 * Uses only the new streamlined components (no legacy dependencies)
 */

import { WikidataService, EntityTemplate, CrawlDataProcessor, PropertyManager, ReferenceFinder } from '@/lib/wikidata';
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
  console.log('🚀 New Streamlined Wikidata Module Demo');
  console.log('=========================================\n');

  try {
    // Step 1: Process crawl data
    console.log('📊 Step 1: Processing Crawl Data');
    console.log('----------------------------------');
    
    const crawlDataInput = CrawlDataProcessor.processCrawlData(mockBusiness, mockCrawledData);
    const enhancedData = CrawlDataProcessor.enhanceCrawlData(crawlDataInput);
    const metrics = CrawlDataProcessor.extractMetrics(enhancedData);
    
    console.log(`   Processed business: ${enhancedData.name}`);
    console.log(`   Location: ${enhancedData.location?.city}, ${enhancedData.location?.state}`);
    console.log(`   Industry: ${enhancedData.business?.industry}`);
    console.log(`   Data completeness: ${(metrics.completeness * 100).toFixed(1)}%`);
    console.log(`   Data quality: ${(metrics.quality * 100).toFixed(1)}%`);
    console.log(`   Available properties: ${metrics.propertyCount}`);

    // Step 2: Property selection
    console.log('\n🎯 Step 2: Property Selection');
    console.log('------------------------------');
    
    const selection = await PropertyManager.selectProperties(enhancedData, {
      maxPIDs: 10,
      maxQIDs: 10,
      qualityThreshold: 0.7
    });
    
    console.log(`   Selected PIDs: ${selection.selectedPIDs.length}/10`);
    console.log(`   Selected QIDs: ${selection.selectedQIDs.length}/10`);
    console.log(`   Quality score: ${selection.qualityScore.toFixed(2)}`);
    console.log(`   Properties: ${selection.selectedPIDs.join(', ')}`);

    // Step 3: Notability reference finding
    console.log('\n🔍 Step 3: Notability Reference Finding');
    console.log('---------------------------------------');
    
    const referenceResult = await ReferenceFinder.findNotabilityReferences(enhancedData, {
      maxReferences: 5,
      requireSerious: true,
      minConfidence: 0.7
    });
    
    console.log(`   Notable: ${referenceResult.isNotable ? '✅ Yes' : '❌ No'}`);
    console.log(`   Confidence: ${(referenceResult.confidence * 100).toFixed(1)}%`);
    console.log(`   References found: ${referenceResult.references.length}`);
    console.log(`   Serious references: ${referenceResult.seriousReferenceCount}`);
    console.log(`   Summary: ${referenceResult.summary}`);
    
    if (referenceResult.references.length > 0) {
      console.log('\n   📚 Top references:');
      referenceResult.references.slice(0, 3).forEach((ref, idx) => {
        console.log(`     ${idx + 1}. ${ref.title}`);
        console.log(`        ${ref.url}`);
        console.log(`        Trust: ${ref.trustScore}, Serious: ${ref.isSerious ? '✅' : '❌'}`);
      });
    }

    // Step 4: Entity template generation with notability references
    console.log('\n🏗️  Step 4: Entity Template Generation');
    console.log('--------------------------------------');
    
    const entity = await EntityTemplate.generateEntity(enhancedData, {
      maxProperties: 10,
      includeReferences: true,
      qualityThreshold: 0.7,
      findNotabilityReferences: true,
      maxNotabilityReferences: 5
    });
    
    console.log(`   Entity label: ${entity.labels.en?.value}`);
    console.log(`   Entity description: ${entity.descriptions.en?.value}`);
    console.log(`   Claims generated: ${Object.keys(entity.claims).length}`);
    
    // Count references (including notability references)
    const referenceCount = Object.values(entity.claims)
      .flat()
      .reduce((count, claim) => count + (claim.references?.length || 0), 0);
    console.log(`   Total references: ${referenceCount}`);
    
    // Count notability references
    const notabilityRefCount = Object.values(entity.claims)
      .flat()
      .reduce((count, claim) => {
        if (!claim.references) return count;
        return count + claim.references.filter(ref => 
          ref.snaks['P1476'] // Has title (indicates notability reference)
        ).length;
      }, 0);
    console.log(`   Notability references: ${notabilityRefCount}`);

    // Step 5: Service integration
    console.log('\n🔧 Step 5: Service Integration');
    console.log('-------------------------------');
    
    const service = new WikidataService({
      maxProperties: 10,
      enableCaching: true,
      validateEntities: true
    });
    
    const stats = service.getServiceStats();
    console.log(`   Service version: ${stats.version}`);
    console.log(`   Max properties: ${stats.maxProperties}`);
    console.log(`   Max QIDs: ${stats.maxQIDs}`);
    console.log(`   Features: ${stats.features.length} available`);

    // Step 6: Preview entity
    console.log('\n👁️  Step 6: Entity Preview');
    console.log('-------------------------');
    
    const preview = await service.previewEntity(mockBusiness, mockCrawledData, {
      maxProperties: 10,
      maxQIDs: 10
    });
    
    console.log(`   Preview validation: ${preview.validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Entity completeness: ${(preview.metrics.completeness * 100).toFixed(1)}%`);
    console.log(`   Entity quality: ${(preview.metrics.quality * 100).toFixed(1)}%`);
    console.log(`   Entity richness: ${(preview.metrics.richness * 100).toFixed(1)}%`);

    // Step 7: Dry run publication
    console.log('\n🧪 Step 7: Dry Run Publication');
    console.log('--------------------------------');
    
    const result = await service.createAndPublishEntity(
      mockBusiness,
      mockCrawledData,
      {
        target: 'test',
        dryRun: true,
        maxProperties: 10,
        includeReferences: true
      }
    );
    
    console.log(`   Publication success: ${result.result.success ? '✅' : '❌'}`);
    console.log(`   Mock QID: ${result.result.qid}`);
    console.log(`   Properties published: ${result.result.propertiesPublished}`);
    console.log(`   References published: ${result.result.referencesPublished}`);
    console.log(`   Processing time: ${result.metrics.processingTime}ms`);
    console.log(`   Data quality: ${(result.metrics.dataQuality * 100).toFixed(1)}%`);

    console.log('\n✨ Demo completed successfully!');
    console.log('\n💡 Key Benefits of New Streamlined Module:');
    console.log('   ✅ Single service interface for all operations');
    console.log('   ✅ Intelligent property selection (up to 10 PIDs, 10 QIDs)');
    console.log('   ✅ Dynamic JSON templates for rich entities');
    console.log('   ✅ Automatic notability reference finding');
    console.log('   ✅ Multiple reference types (source + notability)');
    console.log('   ✅ Comprehensive quality metrics and validation');
    console.log('   ✅ Built-in mock mode for safe testing');
    console.log('   ✅ Efficient crawl data integration');
    console.log('   ✅ Type-safe TypeScript implementation');
    console.log('   ✅ No legacy dependencies');

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
