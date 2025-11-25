# Gemflush Module (`lib/gemflush/`)

**Purpose**: Platform-specific configuration (permissions, plans, platform types)  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `gemflush/` module provides platform-specific configuration for the Gemflush SaaS platform. It includes subscription plan definitions, permission management, and platform-specific types and constants.

### Architecture Principles

1. **Platform-Specific**: Configuration for Gemflush platform
2. **Centralized**: Single source of truth for plans and permissions
3. **Type Safety**: Full TypeScript coverage
4. **DRY**: Reusable configuration
5. **SOLID**: Single responsibility per component

---

## 🏗️ Module Structure

```
lib/gemflush/
├── plans.ts            # Subscription plan definitions
├── permissions.ts       # Permission management
└── __tests__/         # TDD test specifications
```

---

## 🔑 Core Components

### 1. Subscription Plans (`plans.ts`)

**Purpose**: Define subscription tiers and features

**Key Types:**

```typescript
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  stripePriceId?: string;
  features: {
    wikidataPublishing: boolean;
    fingerprintFrequency: 'monthly' | 'weekly';
    maxBusinesses: number;
    historicalData: boolean;
    competitiveBenchmark: boolean;
    progressiveEnrichment?: boolean;
    apiAccess?: boolean;
  };
}

export const GEMFLUSH_PLANS: Record<string, SubscriptionPlan> = {
  free: { /* ... */ },
  pro: { /* ... */ },
  agency: { /* ... */ },
};
```

**Usage:**

```typescript
import { GEMFLUSH_PLANS, getPlanById } from '@/lib/gemflush/plans';

// Get plan by ID
const proPlan = getPlanById('pro');

// Check features
if (proPlan?.features.wikidataPublishing) {
  // Enable Wikidata publishing
}

// Get all plans
const allPlans = Object.values(GEMFLUSH_PLANS);
```

---

### 2. Permissions (`permissions.ts`)

**Purpose**: Manage feature permissions based on subscription tier

**Key Functions:**

```typescript
// Check if user can perform action
export function canPerformAction(
  user: User,
  action: string
): boolean

// Get user permissions
export function getUserPermissions(
  user: User
): PermissionSet

// Check feature access
export function hasFeatureAccess(
  team: Team,
  feature: string
): boolean
```

**Usage:**

```typescript
import { hasFeatureAccess } from '@/lib/gemflush/permissions';

// Check if team can publish to Wikidata
if (hasFeatureAccess(team, 'wikidataPublishing')) {
  await publishToWikidata(business);
} else {
  // Show upgrade prompt
  return <UpgradePrompt feature="wikidata" />;
}
```

---

## 📋 Subscription Plans

### Free Tier

**ID**: `free`  
**Price**: $0/month  
**Features**:
- ✅ Competitive benchmark
- ❌ Wikidata publishing
- ❌ Historical data
- ❌ API access
- **Max Businesses**: 1
- **Fingerprint Frequency**: Monthly

---

### Pro Tier

**ID**: `pro`  
**Price**: $49/month  
**Features**:
- ✅ Wikidata publishing
- ✅ Historical data
- ✅ Progressive enrichment
- ✅ Competitive benchmark
- ❌ API access
- **Max Businesses**: 5
- **Fingerprint Frequency**: Weekly

---

### Agency Tier

**ID**: `agency`  
**Price**: $149/month  
**Features**:
- ✅ All Pro features
- ✅ API access
- ✅ Webhook support
- ✅ Priority support
- **Max Businesses**: 25
- **Fingerprint Frequency**: Weekly

---

## 🔄 Integration with Other Modules

### Automation Service

Plans determine automation features:

```typescript
// lib/services/automation-service.ts
import { GEMFLUSH_PLANS } from '@/lib/gemflush/plans';

export function getAutomationConfig(team: Team) {
  const plan = GEMFLUSH_PLANS[team.planName];
  
  return {
    autoCrawl: plan.features.fingerprintFrequency === 'weekly',
    autoPublish: plan.features.wikidataPublishing,
    maxBusinesses: plan.features.maxBusinesses,
  };
}
```

### Payments Module

Plans link to Stripe prices:

```typescript
// lib/payments/stripe.ts
import { GEMFLUSH_PLANS } from '@/lib/gemflush/plans';

export async function createCheckoutSession(team: Team, planId: string) {
  const plan = GEMFLUSH_PLANS[planId];
  const priceId = plan.stripePriceId;
  
  // Create Stripe checkout session
}
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Subscription Plans
 * 
 * As a system
 * I want subscription plans to be well-defined
 * So that features are correctly gated
 * 
 * Acceptance Criteria:
 * - All plans have required fields
 * - Plans define feature access
 * - getPlanById returns correct plan
 */
describe('Subscription Plans - Specification', () => {
  it('defines all required plan fields', () => {
    // SPECIFICATION: Given all plans
    Object.values(GEMFLUSH_PLANS).forEach(plan => {
      // SPECIFICATION: Then should have required fields
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.price).toBeGreaterThanOrEqual(0);
      expect(plan.features).toBeDefined();
      expect(plan.features.maxBusinesses).toBeGreaterThan(0);
    });
  });
  
  it('returns plan by ID', () => {
    // SPECIFICATION: Given a plan ID
    const plan = getPlanById('pro');
    
    // SPECIFICATION: Then should return correct plan
    expect(plan).toBeDefined();
    expect(plan?.id).toBe('pro');
    expect(plan?.price).toBe(49);
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/gemflush/__tests__/plans.test.ts

# With coverage
pnpm test:coverage lib/gemflush/
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Payments Module**: `lib/payments/`
- **Subscription Module**: `lib/subscription/`
- **Automation Service**: `lib/services/automation-service.ts`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Platform-Specific**: Configuration for Gemflush platform
2. **Centralized**: Single source of truth for plans and permissions
3. **Type Safety**: Full TypeScript coverage
4. **DRY**: Reusable configuration
5. **SOLID**: Single responsibility per component
6. **TDD Development**: Write tests first as specifications

---

## ⚠️ Important Notes

### Plan Changes

- Plan changes affect all users
- Test plan changes thoroughly
- Update documentation when plans change

### Feature Gating

- Always check permissions before enabling features
- Use `hasFeatureAccess` for feature checks
- Show upgrade prompts when features are unavailable

### Stripe Integration

- Keep `stripePriceId` in sync with Stripe
- Use environment variables for price IDs
- Test checkout flows with all plans

---

**Remember**: Platform configuration is critical for monetization. Keep plans well-defined, permissions clear, and always test feature gating.


