/**
 * Payment Contract Tests
 * Tests the payment DTO type contracts to ensure they match expected structure
 * 
 * SOLID: Single Responsibility - tests payment type contracts only
 * DRY: Reusable test fixtures
 */

import { describe, it, expect } from 'vitest';
import type {
  StripePriceDTO,
  StripeProductDTO,
  GemflushProductConfig,
  GemflushStripeConfig,
  CreateCheckoutSessionInput,
  UpdateTeamSubscriptionInput,
  EnsureStripeProductsResult,
} from '../types';

describe('Payment Type Contracts', () => {
  // DRY: Reusable test fixtures
  const createStripePriceDTO = (): StripePriceDTO => ({
    id: 'price_test123',
    productId: 'prod_test123',
    unitAmount: 4900,
    currency: 'usd',
    interval: 'month',
    trialPeriodDays: 14,
  });

  const createStripeProductDTO = (): StripeProductDTO => ({
    id: 'prod_test123',
    name: 'Pro',
    description: 'Pro plan with premium features',
    defaultPriceId: 'price_test123',
  });

  const createGemflushProductConfig = (): GemflushProductConfig => ({
    name: 'Pro',
    description: 'Wikidata Publisher + Premium Features',
    priceId: 'price_pro_test',
    price: 4900,
    interval: 'month',
    features: ['Up to 5 businesses', 'Wikidata publishing'],
  });

  describe('StripePriceDTO Contract', () => {
    it('should match StripePriceDTO structure', () => {
      const dto: StripePriceDTO = createStripePriceDTO();

      expect(dto.id).toBe('price_test123');
      expect(typeof dto.id).toBe('string');
      expect(dto.productId).toBe('prod_test123');
      expect(typeof dto.productId).toBe('string');
      expect(dto.unitAmount).toBe(4900);
      expect(typeof dto.unitAmount).toBe('number');
      expect(dto.currency).toBe('usd');
      expect(dto.interval).toBe('month');
      expect(dto.trialPeriodDays).toBe(14);
    });

    it('should enforce required fields', () => {
      const dto: StripePriceDTO = {
        id: 'price_test',
        productId: 'prod_test',
        unitAmount: null,
        currency: 'usd',
        interval: null,
        trialPeriodDays: null,
      };

      expect(dto.id).toBeDefined();
      expect(dto.productId).toBeDefined();
      expect(dto.currency).toBeDefined();
      // Optional fields can be null
      expect(dto.unitAmount).toBeNull();
      expect(dto.interval).toBeNull();
      expect(dto.trialPeriodDays).toBeNull();
    });

    it('should enforce interval union type', () => {
      const validIntervals: StripePriceDTO['interval'][] = ['day', 'week', 'month', 'year', null];
      
      validIntervals.forEach((interval) => {
        const dto: StripePriceDTO = {
          ...createStripePriceDTO(),
          interval,
        };
        expect(dto.interval).toBe(interval);
      });
    });

    it('should handle null unitAmount', () => {
      const dto: StripePriceDTO = {
        ...createStripePriceDTO(),
        unitAmount: null,
      };
      expect(dto.unitAmount).toBeNull();
    });

    it('should handle all currency codes', () => {
      const currencies = ['usd', 'eur', 'gbp', 'cad'];
      currencies.forEach((currency) => {
        const dto: StripePriceDTO = {
          ...createStripePriceDTO(),
          currency,
        };
        expect(dto.currency).toBe(currency);
      });
    });
  });

  describe('StripeProductDTO Contract', () => {
    it('should match StripeProductDTO structure', () => {
      const dto: StripeProductDTO = createStripeProductDTO();

      expect(dto.id).toBe('prod_test123');
      expect(typeof dto.id).toBe('string');
      expect(dto.name).toBe('Pro');
      expect(typeof dto.name).toBe('string');
      expect(dto.description).toBe('Pro plan with premium features');
      expect(dto.defaultPriceId).toBe('price_test123');
    });

    it('should enforce required fields', () => {
      const dto: StripeProductDTO = {
        id: 'prod_test',
        name: 'Test Product',
        description: null,
        defaultPriceId: null,
      };

      expect(dto.id).toBeDefined();
      expect(dto.name).toBeDefined();
      // Optional fields can be null
      expect(dto.description).toBeNull();
      expect(dto.defaultPriceId).toBeNull();
    });

    it('should handle null description', () => {
      const dto: StripeProductDTO = {
        ...createStripeProductDTO(),
        description: null,
      };
      expect(dto.description).toBeNull();
    });

    it('should handle null defaultPriceId', () => {
      const dto: StripeProductDTO = {
        ...createStripeProductDTO(),
        defaultPriceId: null,
      };
      expect(dto.defaultPriceId).toBeNull();
    });
  });

  describe('GemflushProductConfig Contract', () => {
    it('should match GemflushProductConfig structure', () => {
      const config: GemflushProductConfig = createGemflushProductConfig();

      expect(config.name).toBe('Pro');
      expect(config.description).toBe('Wikidata Publisher + Premium Features');
      expect(config.priceId).toBe('price_pro_test');
      expect(config.price).toBe(4900);
      expect(config.interval).toBe('month');
      expect(Array.isArray(config.features)).toBe(true);
      expect(config.features.length).toBeGreaterThan(0);
    });

    it('should enforce name union type', () => {
      const validNames: GemflushProductConfig['name'][] = ['Pro', 'Agency'];
      
      validNames.forEach((name) => {
        const config: GemflushProductConfig = {
          ...createGemflushProductConfig(),
          name,
        };
        expect(config.name).toBe(name);
      });
    });

    it('should enforce interval union type', () => {
      const validIntervals: GemflushProductConfig['interval'][] = ['month', 'year'];
      
      validIntervals.forEach((interval) => {
        const config: GemflushProductConfig = {
          ...createGemflushProductConfig(),
          interval,
        };
        expect(config.interval).toBe(interval);
      });
    });

    it('should handle undefined priceId', () => {
      const config: GemflushProductConfig = {
        ...createGemflushProductConfig(),
        priceId: undefined,
      };
      expect(config.priceId).toBeUndefined();
    });

    it('should require features array', () => {
      const config: GemflushProductConfig = {
        ...createGemflushProductConfig(),
        features: [],
      };
      expect(Array.isArray(config.features)).toBe(true);
    });
  });

  describe('GemflushStripeConfig Contract', () => {
    it('should match GemflushStripeConfig structure', () => {
      const config: GemflushStripeConfig = {
        products: [createGemflushProductConfig()],
      };

      expect(Array.isArray(config.products)).toBe(true);
      expect(config.products.length).toBe(1);
      expect(config.products[0].name).toBe('Pro');
    });

    it('should support multiple products', () => {
      const config: GemflushStripeConfig = {
        products: [
          createGemflushProductConfig(),
          {
            ...createGemflushProductConfig(),
            name: 'Agency',
            price: 14900,
          },
        ],
      };

      expect(config.products.length).toBe(2);
      expect(config.products[0].name).toBe('Pro');
      expect(config.products[1].name).toBe('Agency');
    });
  });

  describe('CreateCheckoutSessionInput Contract', () => {
    it('should match CreateCheckoutSessionInput structure', () => {
      const input: CreateCheckoutSessionInput = {
        team: {
          id: 1,
          stripeCustomerId: 'cus_test123',
        },
        priceId: 'price_test123',
      };

      expect(input.team).toBeDefined();
      expect(input.team?.id).toBe(1);
      expect(input.team?.stripeCustomerId).toBe('cus_test123');
      expect(input.priceId).toBe('price_test123');
      expect(typeof input.priceId).toBe('string');
    });

    it('should handle null team', () => {
      const input: CreateCheckoutSessionInput = {
        team: null,
        priceId: 'price_test123',
      };

      expect(input.team).toBeNull();
      expect(input.priceId).toBe('price_test123');
    });

    it('should handle null stripeCustomerId', () => {
      const input: CreateCheckoutSessionInput = {
        team: {
          id: 1,
          stripeCustomerId: null,
        },
        priceId: 'price_test123',
      };

      expect(input.team?.stripeCustomerId).toBeNull();
    });

    it('should require priceId', () => {
      const input: CreateCheckoutSessionInput = {
        team: null,
        priceId: 'price_required',
      };

      expect(input.priceId).toBeDefined();
      expect(input.priceId.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateTeamSubscriptionInput Contract', () => {
    it('should match UpdateTeamSubscriptionInput structure', () => {
      const input: UpdateTeamSubscriptionInput = {
        stripeSubscriptionId: 'sub_test123',
        stripeProductId: 'prod_test123',
        planName: 'pro',
        subscriptionStatus: 'active',
      };

      expect(input.stripeSubscriptionId).toBe('sub_test123');
      expect(input.stripeProductId).toBe('prod_test123');
      expect(input.planName).toBe('pro');
      expect(input.subscriptionStatus).toBe('active');
    });

    it('should enforce planName union type', () => {
      const validPlans: UpdateTeamSubscriptionInput['planName'][] = ['free', 'pro', 'agency', null];
      
      validPlans.forEach((planName) => {
        const input: UpdateTeamSubscriptionInput = {
          stripeSubscriptionId: null,
          stripeProductId: null,
          planName,
          subscriptionStatus: null,
        };
        expect(input.planName).toBe(planName);
      });
    });

    it('should enforce subscriptionStatus union type', () => {
      const validStatuses: UpdateTeamSubscriptionInput['subscriptionStatus'][] = [
        'active',
        'trialing',
        'canceled',
        'unpaid',
        null,
      ];
      
      validStatuses.forEach((status) => {
        const input: UpdateTeamSubscriptionInput = {
          stripeSubscriptionId: null,
          stripeProductId: null,
          planName: null,
          subscriptionStatus: status,
        };
        expect(input.subscriptionStatus).toBe(status);
      });
    });

    it('should handle all null values for cancellation', () => {
      const input: UpdateTeamSubscriptionInput = {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: 'canceled',
      };

      expect(input.stripeSubscriptionId).toBeNull();
      expect(input.stripeProductId).toBeNull();
      expect(input.planName).toBeNull();
      expect(input.subscriptionStatus).toBe('canceled');
    });
  });

  describe('EnsureStripeProductsResult Contract', () => {
    it('should match EnsureStripeProductsResult structure when created', () => {
      const result: EnsureStripeProductsResult = {
        created: true,
        proPriceId: 'price_pro_test',
        agencyPriceId: 'price_agency_test',
      };

      expect(result.created).toBe(true);
      expect(result.proPriceId).toBe('price_pro_test');
      expect(result.agencyPriceId).toBe('price_agency_test');
    });

    it('should match EnsureStripeProductsResult structure when not created', () => {
      const result: EnsureStripeProductsResult = {
        created: false,
      };

      expect(result.created).toBe(false);
      expect(result.proPriceId).toBeUndefined();
      expect(result.agencyPriceId).toBeUndefined();
    });

    it('should handle optional price IDs', () => {
      const result: EnsureStripeProductsResult = {
        created: true,
        proPriceId: 'price_pro_test',
        // agencyPriceId is optional
      };

      expect(result.created).toBe(true);
      expect(result.proPriceId).toBeDefined();
      expect(result.agencyPriceId).toBeUndefined();
    });
  });
});

