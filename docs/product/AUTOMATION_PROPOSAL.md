# Automated Crawl & Publication System Proposal

## 🎯 Objective

Automate crawl and publication workflows based on subscription tier to:
1. Remove user responsibility for manual actions
2. Control Wikidata JSON structure and richness by tier
3. Control publication schedule by tier
4. Ensure consistent, high-quality entity publication

## 📊 Current State

### Manual Actions (To Be Removed)
- ✅ Manual "Crawl Website" button
- ✅ Manual "Publish to Wikidata" button
- ✅ Manual "Run Fingerprint" button (keep for free tier)

### Current Automation
- ✅ Auto-start crawl/fingerprint for new businesses (`autoStartProcessing`)
- ✅ Crawl caching (24-hour TTL)
- ✅ Fingerprint frequency enforcement (monthly/weekly)

### Current Entity Richness
- Basic entities: 3-5 properties (P31, P856, P1448, P625, P1329)
- Enhanced entities: 11+ properties (with social links, email, etc.)
- Complete entities: 15-20+ properties (with industry, location QIDs, etc.)

## 🚀 Proposed Automation System

### Tier-Based Automation Rules

#### Free Tier
- **Crawl**: Manual only (no automation)
- **Fingerprint**: Manual only (monthly limit enforced)
- **Publication**: Not available
- **Entity Richness**: N/A

#### Pro Tier
- **Crawl**: Automated weekly (or on-demand if URL changes)
- **Fingerprint**: Automated weekly (aligned with crawl schedule)
- **Publication**: Automated after successful crawl (if notability passes)
- **Entity Richness**: Enhanced (11+ properties)
  - Core: P31, P856, P1448
  - Location: P625, P6375
  - Contact: P1329, P968
  - Social: P2002, P2013, P2003, P4264
  - Temporal: P571 (if available)
  - Business: P1128 (if available)

#### Agency Tier
- **Crawl**: Automated weekly (or on-demand if URL changes)
- **Fingerprint**: Automated weekly (aligned with crawl schedule)
- **Publication**: Automated after successful crawl (if notability passes)
- **Progressive Enrichment**: Enabled (entities improve over time)
- **Entity Richness**: Complete (15-20+ properties)
  - All Pro properties +
  - Geographic: P131 (located in), P159 (headquarters), P17 (country)
  - Industry: P452 (industry), P1128 (products)
  - Additional: P18/P4896 (logo/image), P2035 (LinkedIn)

### Publication Schedule

#### Initial Publication
- **Trigger**: After first successful crawl
- **Timing**: Immediate (within 5 minutes of crawl completion)
- **Condition**: Notability check must pass
- **Fallback**: If notability fails, schedule retry after next crawl

#### Re-publication (Progressive Enrichment)
- **Pro Tier**: Re-publish when entity richness increases (new properties added)
- **Agency Tier**: 
  - Weekly re-publication if entity has new data
  - Automatic enrichment after 2nd, 3rd, 4th crawl cycles
  - Enrichment levels: 1 → 2 → 3 → 4

#### Update Schedule
- **Crawl Frequency**: Weekly (Pro/Agency)
- **Publication Frequency**: 
  - Pro: After each crawl if entity changed
  - Agency: After each crawl if entity changed + progressive enrichment

## 🏗️ Architecture

### 1. Automation Service

```typescript
// lib/services/automation-service.ts

interface AutomationConfig {
  crawlFrequency: 'manual' | 'weekly' | 'daily';
  fingerprintFrequency: 'manual' | 'monthly' | 'weekly';
  autoPublish: boolean;
  entityRichness: 'basic' | 'enhanced' | 'complete';
  progressiveEnrichment: boolean;
}

class AutomationService {
  // Get automation config for team
  getConfig(team: Team): AutomationConfig;
  
  // Schedule crawl for business
  scheduleCrawl(businessId: number, team: Team): Promise<void>;
  
  // Schedule publication after crawl
  schedulePublication(businessId: number, team: Team): Promise<void>;
  
  // Check if automation should run
  shouldAutoCrawl(business: Business, team: Team): boolean;
  shouldAutoPublish(business: Business, team: Team): boolean;
}
```

### 2. Tier-Based Entity Builder

```typescript
// lib/wikidata/tiered-entity-builder.ts

class TieredEntityBuilder {
  // Build entity based on tier
  buildEntity(
    business: Business,
    crawledData: CrawlData,
    tier: 'free' | 'pro' | 'agency',
    enrichmentLevel?: number
  ): WikidataEntity;
  
  // Get properties for tier
  getPropertiesForTier(tier: string, enrichmentLevel?: number): string[];
}
```

### 3. Scheduled Job System

```typescript
// lib/services/scheduler.ts

class SchedulerService {
  // Schedule weekly crawl for Pro/Agency businesses
  scheduleWeeklyCrawls(): Promise<void>;
  
  // Process crawl completion (trigger publication if needed)
  onCrawlComplete(businessId: number): Promise<void>;
  
  // Process publication completion (trigger enrichment if needed)
  onPublicationComplete(businessId: number): Promise<void>;
}
```

## 📝 Implementation Plan

### Phase 1: Core Automation Infrastructure

1. **Create Automation Service**
   - `lib/services/automation-service.ts`
   - Tier-based config logic
   - Should auto-crawl/publish checks

2. **Update Entity Builder for Tiers**
   - `lib/wikidata/tiered-entity-builder.ts`
   - Property selection based on tier
   - Enrichment level support

3. **Update Business Processing**
   - Integrate automation service
   - Auto-trigger publication after crawl
   - Remove manual triggers

### Phase 2: Scheduled Jobs

4. **Create Scheduler Service**
   - `lib/services/scheduler.ts`
   - Weekly crawl scheduling
   - Event handlers (crawl → publish → enrich)

5. **API Endpoint for Scheduled Jobs**
   - `app/api/cron/weekly-crawls/route.ts`
   - `app/api/cron/process-queue/route.ts`
   - Protected with API key or Vercel Cron

6. **Database Schema Updates**
   - Add `automationEnabled` to businesses
   - Add `nextCrawlAt` timestamp
   - Add `lastAutoPublishedAt` timestamp

### Phase 3: UI Updates

7. **Remove Manual Actions**
   - Remove "Crawl" button from business detail page
   - Remove "Publish" button (replace with status)
   - Update business cards to show automation status

8. **Add Automation Status Display**
   - Show "Automated" badge for Pro/Agency
   - Show next scheduled crawl time
   - Show last publication time
   - Show enrichment level (Agency)

9. **Update Publishing Onboarding**
   - Remove manual steps
   - Show automated journey
   - Explain tier-based automation

### Phase 4: Progressive Enrichment (Agency)

10. **Enrichment Logic**
    - Track enrichment level (1-4)
    - Schedule enrichment after N crawls
    - Add properties incrementally

11. **Enrichment UI**
    - Show enrichment progress
    - Show next enrichment milestone
    - Display enrichment level badge

## 🔧 Technical Details

### Entity Richness by Tier

#### Pro Tier (Enhanced - 11+ properties)
```typescript
const proProperties = [
  'P31',   // instance of
  'P856',  // official website
  'P1448', // official name
  'P625',  // coordinate location
  'P6375', // street address
  'P1329', // phone number
  'P968',  // email address
  'P2002', // Twitter
  'P2013', // Facebook
  'P2003', // Instagram
  'P4264', // LinkedIn
  'P571',  // inception (if available)
  'P1128', // employees (if available)
];
```

#### Agency Tier (Complete - 15-20+ properties)
```typescript
const agencyProperties = [
  ...proProperties,
  'P131',  // located in (city QID)
  'P159',  // headquarters (city QID)
  'P17',   // country (QID)
  'P452',  // industry (QID)
  'P18',   // image (or P4896 logo)
  'P1128', // products/services
  // Additional properties from LLM suggestions
];
```

### Publication Flow

```
Business Created
    ↓
Auto-Crawl (if Pro/Agency)
    ↓
Crawl Complete
    ↓
Check Notability
    ↓
Build Entity (tier-based richness)
    ↓
Auto-Publish (if notability passes)
    ↓
Publication Complete
    ↓
Schedule Next Crawl (weekly)
    ↓
[Progressive Enrichment] (Agency only)
```

### Scheduling Logic

```typescript
// Weekly crawl schedule
const scheduleWeeklyCrawl = async (business: Business, team: Team) => {
  const config = automationService.getConfig(team);
  
  if (config.crawlFrequency === 'weekly') {
    const nextCrawl = new Date();
    nextCrawl.setDate(nextCrawl.getDate() + 7);
    
    await updateBusiness(business.id, {
      nextCrawlAt: nextCrawl,
    });
  }
};

// Auto-publish after crawl
const onCrawlComplete = async (businessId: number) => {
  const business = await getBusinessById(businessId);
  const team = await getTeamForBusiness(businessId);
  const config = automationService.getConfig(team);
  
  if (config.autoPublish && business.status === 'crawled') {
    // Check notability
    const canPublish = await checkNotability(business);
    
    if (canPublish) {
      // Build entity with tier-appropriate richness
      const entity = tieredEntityBuilder.buildEntity(
        business,
        business.crawlData,
        team.planName,
        business.enrichmentLevel
      );
      
      // Publish
      await publishEntity(businessId, entity);
    }
  }
};
```

## 🎨 UI Changes

### Business Detail Page

**Before:**
```tsx
<Button onClick={handleCrawl}>Crawl Website</Button>
<Button onClick={handlePublish}>Publish to Wikidata</Button>
```

**After:**
```tsx
{isProOrAgency ? (
  <div className="automation-status">
    <Badge variant="success">
      <Sparkles className="mr-1 h-3 w-3" />
      Automated
    </Badge>
    <p className="text-sm text-gray-600">
      Next crawl: {formatDate(business.nextCrawlAt)}
    </p>
    {business.wikidataQID && (
      <p className="text-sm text-gray-600">
        Last published: {formatDate(business.lastAutoPublishedAt)}
      </p>
    )}
  </div>
) : (
  <UpgradeCTA feature="wikidata" />
)}
```

### Business Card

**Add automation indicator:**
```tsx
{business.automationEnabled && (
  <Badge variant="outline" className="text-xs">
    <Sparkles className="mr-1 h-3 w-3" />
    Automated
  </Badge>
)}
```

## ✅ Success Criteria

1. **Pro/Agency users**: No manual crawl/publish actions needed
2. **Entity richness**: Pro gets 11+ properties, Agency gets 15-20+
3. **Publication schedule**: Automatic after crawl completion
4. **Progressive enrichment**: Agency entities improve over time
5. **UI clarity**: Users understand automation is happening
6. **Error handling**: Failed automations are logged and retried

## 🔒 Error Handling

### Crawl Failures
- Retry after 24 hours
- Notify user if 3 consecutive failures
- Fall back to manual option (emergency)

### Publication Failures
- Retry on next crawl cycle
- Log notability failures
- Allow manual override (admin only)

### Rate Limiting
- Respect Wikidata API rate limits
- Queue publications if needed
- Batch operations for Agency tier

## 📊 Monitoring

### Metrics to Track
- Automation success rate by tier
- Average time from crawl to publication
- Entity richness distribution
- Progressive enrichment progression
- User satisfaction (fewer support tickets)

### Logging
- All automation events logged
- Tier-based decisions logged
- Publication attempts logged
- Enrichment level changes logged

## 🚦 Rollout Plan

1. **Week 1**: Implement automation service + tiered entity builder
2. **Week 2**: Add scheduled jobs + API endpoints
3. **Week 3**: Update UI to remove manual actions
4. **Week 4**: Test with Pro users (beta)
5. **Week 5**: Roll out to all Pro/Agency users
6. **Week 6**: Implement progressive enrichment (Agency)

## 📚 Related Files

- `lib/services/business-processing.ts` - Current auto-processing
- `lib/wikidata/entity-builder.ts` - Current entity builder
- `lib/gemflush/plans.ts` - Tier definitions
- `app/api/crawl/route.ts` - Current crawl endpoint
- `app/api/wikidata/publish/route.ts` - Current publish endpoint

