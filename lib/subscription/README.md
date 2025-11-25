# Subscription Module (`lib/subscription/`)

**Purpose**: Subscription tier management and upgrade configuration  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `subscription/` module provides subscription tier management, upgrade configurations, and feature gating based on subscription plans. It centralizes upgrade messaging and feature definitions for consistent UI/UX across the platform.

### Architecture Principles

1. **Centralized Configuration**: Single source of truth for upgrade messaging
2. **Type Safety**: Full TypeScript coverage
3. **Feature Gating**: Clear feature availability per tier
4. **DRY**: Reusable upgrade configurations
5. **SOLID**: Single responsibility per component

---

## 🏗️ Module Structure

```
lib/subscription/
├── upgrade-config.ts     # Upgrade feature configurations
└── __tests__/           # TDD test specifications
```

---

## 🔑 Core Components

### 1. Upgrade Configuration (`upgrade-config.ts`)

**Purpose**: Centralized upgrade messaging and feature definitions

**Key Types:**

```typescript
export type UpgradeFeature = 
  | 'wikidata' 
  | 'businesses' 
  | 'api' 
  | 'enrichment' 
  | 'history';

export interface FeatureConfig {
  title: string;
  description: string;
  benefits: string[];
  icon: LucideIcon | React.ComponentType;
  targetPlan: 'pro' | 'agency';
  price: number;
  ctaText: string;
}
```

**Usage:**

```typescript
import { UPGRADE_CONFIGS } from '@/lib/subscription/upgrade-config';

// Get upgrade config for a feature
const wikidataConfig = UPGRADE_CONFIGS.wikidata;

// Display upgrade UI
function UpgradePrompt({ feature }: { feature: UpgradeFeature }) {
  const config = UPGRADE_CONFIGS[feature];
  
  return (
    <div>
      <h2>{config.title}</h2>
      <p>{config.description}</p>
      <ul>
        {config.benefits.map(benefit => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>
      <button>{config.ctaText}</button>
    </div>
  );
}
```

---

## 📋 Available Features

### 1. Wikidata Publishing

**Feature**: `wikidata`

**Config:**
- **Title**: "Unlock Wikidata Publishing"
- **Description**: "Publish your business to Wikidata and improve your AI visibility"
- **Target Plan**: Pro ($49/month)
- **Benefits**:
  - Get recommended by AI systems
  - Improve visibility by 2-4x
  - Control your business information
  - Track visibility improvements

---

### 2. Multiple Businesses

**Feature**: `businesses`

**Config:**
- **Title**: "Add More Businesses"
- **Description**: "Upgrade to manage multiple businesses"
- **Target Plan**: Pro (5 businesses) or Agency (25 businesses)
- **Benefits**:
  - Manage up to 5/25 businesses
  - Compare performance across clients
  - Unified dashboard

---

### 3. API Access

**Feature**: `api`

**Config:**
- **Title**: "API Access"
- **Description**: "Access your data programmatically"
- **Target Plan**: Agency
- **Benefits**:
  - RESTful API access
  - Webhook support
  - Rate limits

---

### 4. Data Enrichment

**Feature**: `enrichment`

**Config:**
- **Title**: "Enhanced Data Enrichment"
- **Description**: "Get richer business data"
- **Target Plan**: Pro
- **Benefits**:
  - Enhanced data extraction
  - More comprehensive analysis
  - Better insights

---

### 5. History & Analytics

**Feature**: `history`

**Config:**
- **Title**: "Historical Data & Analytics"
- **Description**: "Track performance over time"
- **Target Plan**: Pro
- **Benefits**:
  - Historical visibility trends
  - Performance analytics
  - Comparative analysis

---

## 🔄 Integration with Other Modules

### Automation Service

Subscription tiers determine automation features:

```typescript
// lib/services/automation-service.ts
import { getTeamForUser } from '@/lib/db/queries';

export async function getAutomationConfig(teamId: number) {
  const team = await getTeamForUser(teamId);
  
  // Feature gating based on subscription tier
  if (team.planName === 'free') {
    return { autoCrawl: false, autoPublish: false };
  }
  
  if (team.planName === 'pro') {
    return { autoCrawl: true, autoPublish: true };
  }
  
  // ... agency tier
}
```

### Payments Module

Upgrade configurations link to payment flows:

```typescript
// app/(dashboard)/upgrade/page.tsx
import { UPGRADE_CONFIGS } from '@/lib/subscription/upgrade-config';
import { createCheckoutSession } from '@/lib/payments/stripe';

async function handleUpgrade(feature: UpgradeFeature) {
  const config = UPGRADE_CONFIGS[feature];
  const priceId = getPriceIdForPlan(config.targetPlan);
  
  const { url } = await createCheckoutSession({
    team: currentTeam,
    priceId,
  });
  
  redirect(url);
}
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Upgrade Configuration
 * 
 * As a developer
 * I want upgrade configurations to be centralized
 * So that upgrade messaging is consistent
 * 
 * Acceptance Criteria:
 * - All features have upgrade configs
 * - Configs include title, description, benefits
 * - Configs specify target plan and price
 */
describe('Upgrade Configuration - Specification', () => {
  it('provides config for all upgrade features', () => {
    // SPECIFICATION: Given upgrade features
    const features: UpgradeFeature[] = [
      'wikidata',
      'businesses',
      'api',
      'enrichment',
      'history',
    ];
    
    // SPECIFICATION: When accessing configs
    features.forEach(feature => {
      const config = UPGRADE_CONFIGS[feature];
      
      // SPECIFICATION: Then config should have required fields
      expect(config).toBeDefined();
      expect(config.title).toBeDefined();
      expect(config.description).toBeDefined();
      expect(config.benefits).toBeInstanceOf(Array);
      expect(config.targetPlan).toBeOneOf(['pro', 'agency']);
      expect(config.price).toBeGreaterThan(0);
    });
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/subscription/__tests__/upgrade-config.test.ts

# With coverage
pnpm test:coverage lib/subscription/
```

---

## 📋 Subscription Tiers

### Free Tier

**Features:**
- 1 business
- Basic crawling
- Basic fingerprinting
- No Wikidata publishing
- No API access

**Limitations:**
- No automation
- No historical data
- Limited features

---

### Pro Tier ($49/month)

**Features:**
- Up to 5 businesses
- Automated crawling
- Automated fingerprinting
- Wikidata publishing
- Historical data & analytics
- Enhanced data enrichment

**Benefits:**
- Full CFP workflow automation
- Visibility tracking
- Performance analytics

---

### Agency Tier ($199/month)

**Features:**
- Up to 25 businesses
- All Pro features
- API access
- Webhook support
- Priority support
- Custom integrations

**Benefits:**
- Multi-client management
- Programmatic access
- Enterprise features

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Payments Module**: `lib/payments/`
- **Automation Service**: `lib/services/automation-service.ts`
- **Gemflush Plans**: `lib/gemflush/plans.ts`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Centralized Configuration**: Single source of truth for upgrade messaging
2. **Type Safety**: Full TypeScript coverage
3. **Feature Gating**: Clear feature availability per tier
4. **DRY**: Reusable upgrade configurations
5. **SOLID**: Single responsibility per component
6. **TDD Development**: Write tests first as specifications

---

## ⚠️ Important Notes

### Feature Gating

Always check subscription tier before enabling features:

```typescript
const team = await getTeamForUser(userId);
if (team.planName === 'free') {
  // Show upgrade prompt
  return <UpgradePrompt feature="wikidata" />;
}
```

### Upgrade Flow

1. User clicks upgrade button
2. Show upgrade configuration
3. Create checkout session
4. Redirect to Stripe
5. Handle webhook
6. Update team subscription

---

**Remember**: Subscription management is critical for monetization. Keep configurations centralized, well-tested, and consistent across the platform.


