/**
 * TopShelf Billing Package - Comprehensive Test Suite
 *
 * Tests for billing service, subscription management, and Stripe integration.
 * All Stripe API calls are mocked.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing module
vi.mock('@topshelf/observability', () => ({
  getLogger: vi.fn(() => ({
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    })),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('@topshelf/config', () => ({
  getConfig: vi.fn(() => ({
    serviceName: 'test-billing',
    observability: {
      logging: { level: 'info' },
    },
  })),
}));

// Mock Stripe before importing BillingService
const mockStripe = {
  customers: {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn(),
    cancel: vi.fn(),
  },
  setupIntents: {
    create: vi.fn(),
  },
  paymentMethods: {
    attach: vi.fn(),
    list: vi.fn(),
    detach: vi.fn(),
  },
  invoices: {
    list: vi.fn(),
    retrieveUpcoming: vi.fn(),
  },
  subscriptionItems: {
    createUsageRecord: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
  coupons: {
    create: vi.fn(),
  },
  promotionCodes: {
    create: vi.fn(),
  },
};

vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe),
}));

import {
  BillingService,
  BillingConfigSchema,
  PRICING_PLANS,
  type BillingConfig,
  type PlanTier,
  type BillingInterval,
} from './index.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const testBillingConfig: BillingConfig = {
  stripeSecretKey: 'sk_test_1234567890',
  stripeWebhookSecret: 'whsec_test_secret',
  stripePriceIds: {
    individual: {
      monthly: 'price_individual_monthly',
      annual: 'price_individual_annual',
    },
    school: {
      monthly: 'price_school_monthly',
      annual: 'price_school_annual',
    },
    district: {
      monthly: 'price_district_monthly',
      annual: 'price_district_annual',
    },
    enterprise: {
      monthly: 'price_enterprise_monthly',
      annual: 'price_enterprise_annual',
    },
  },
  trialDays: 14,
  taxEnabled: true,
};

// =============================================================================
// BILLING CONFIG SCHEMA TESTS
// =============================================================================

describe('BillingConfigSchema', () => {
  it('should validate correct config', () => {
    const result = BillingConfigSchema.safeParse(testBillingConfig);

    expect(result.success).toBe(true);
  });

  it('should require stripeSecretKey', () => {
    const config = { ...testBillingConfig };
    delete (config as any).stripeSecretKey;

    const result = BillingConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
  });

  it('should require stripeWebhookSecret', () => {
    const config = { ...testBillingConfig };
    delete (config as any).stripeWebhookSecret;

    const result = BillingConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
  });

  it('should default trialDays to 14', () => {
    const config = { ...testBillingConfig };
    delete (config as any).trialDays;

    const result = BillingConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trialDays).toBe(14);
    }
  });

  it('should default taxEnabled to true', () => {
    const config = { ...testBillingConfig };
    delete (config as any).taxEnabled;

    const result = BillingConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxEnabled).toBe(true);
    }
  });
});

// =============================================================================
// PRICING PLANS TESTS
// =============================================================================

describe('PRICING_PLANS', () => {
  it('should have all plan tiers defined', () => {
    const tiers: PlanTier[] = ['individual', 'school', 'district', 'enterprise'];

    for (const tier of tiers) {
      expect(PRICING_PLANS[tier]).toBeDefined();
      expect(PRICING_PLANS[tier].tier).toBe(tier);
    }
  });

  it('should have required fields for each plan', () => {
    for (const plan of Object.values(PRICING_PLANS)) {
      expect(plan.name).toBeDefined();
      expect(plan.description).toBeDefined();
      expect(plan.features).toBeInstanceOf(Array);
      expect(plan.limits).toBeDefined();
      expect(plan.pricing).toBeDefined();
      expect(plan.pricing.monthly).toBeGreaterThan(0);
      expect(plan.pricing.annual).toBeGreaterThan(0);
    }
  });

  it('should have annual discount compared to monthly', () => {
    for (const plan of Object.values(PRICING_PLANS)) {
      const monthlyAnnualized = plan.pricing.monthly * 12;
      expect(plan.pricing.annual).toBeLessThan(monthlyAnnualized);
    }
  });

  it('should have increasing price tiers', () => {
    expect(PRICING_PLANS.individual.pricing.monthly).toBeLessThan(
      PRICING_PLANS.school.pricing.monthly
    );
    expect(PRICING_PLANS.school.pricing.monthly).toBeLessThan(
      PRICING_PLANS.district.pricing.monthly
    );
    expect(PRICING_PLANS.district.pricing.monthly).toBeLessThan(
      PRICING_PLANS.enterprise.pricing.monthly
    );
  });

  describe('Plan Limits', () => {
    it('should have appropriate seat limits', () => {
      expect(PRICING_PLANS.individual.limits.seats).toBe(1);
      expect(PRICING_PLANS.school.limits.seats).toBe(500);
      expect(PRICING_PLANS.district.limits.seats).toBe('unlimited');
      expect(PRICING_PLANS.enterprise.limits.seats).toBe('unlimited');
    });

    it('should have appropriate support levels', () => {
      expect(PRICING_PLANS.individual.limits.supportLevel).toBe('community');
      expect(PRICING_PLANS.school.limits.supportLevel).toBe('email');
      expect(PRICING_PLANS.district.limits.supportLevel).toBe('priority');
      expect(PRICING_PLANS.enterprise.limits.supportLevel).toBe('dedicated');
    });

    it('should have SSO only for district and enterprise', () => {
      expect(PRICING_PLANS.individual.limits.sso).toBe(false);
      expect(PRICING_PLANS.school.limits.sso).toBe(false);
      expect(PRICING_PLANS.district.limits.sso).toBe(true);
      expect(PRICING_PLANS.enterprise.limits.sso).toBe(true);
    });
  });
});

// =============================================================================
// BILLING SERVICE TESTS
// =============================================================================

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    billingService = new BillingService(testBillingConfig);
  });

  // ===========================================================================
  // CUSTOMER MANAGEMENT
  // ===========================================================================

  describe('Customer Management', () => {
    describe('createCustomer', () => {
      it('should create a Stripe customer', async () => {
        mockStripe.customers.create.mockResolvedValue({
          id: 'cus_test123',
          email: 'test@example.com',
        });

        const customerId = await billingService.createCustomer({
          organizationId: 'org-123',
          email: 'test@example.com',
          name: 'Test Organization',
        });

        expect(customerId).toBe('cus_test123');
        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'Test Organization',
          metadata: {
            organizationId: 'org-123',
          },
        });
      });

      it('should include custom metadata', async () => {
        mockStripe.customers.create.mockResolvedValue({
          id: 'cus_test456',
        });

        await billingService.createCustomer({
          organizationId: 'org-456',
          email: 'org@test.com',
          name: 'Custom Org',
          metadata: { source: 'signup', referral: 'partner-abc' },
        });

        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: 'org@test.com',
          name: 'Custom Org',
          metadata: {
            organizationId: 'org-456',
            source: 'signup',
            referral: 'partner-abc',
          },
        });
      });
    });

    describe('updateCustomer', () => {
      it('should update customer details', async () => {
        mockStripe.customers.update.mockResolvedValue({});

        await billingService.updateCustomer('cus_123', {
          email: 'newemail@test.com',
          name: 'Updated Name',
        });

        expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_123', {
          email: 'newemail@test.com',
          name: 'Updated Name',
        });
      });
    });

    describe('getCustomer', () => {
      it('should retrieve customer', async () => {
        const mockCustomer = {
          id: 'cus_123',
          email: 'test@example.com',
          deleted: false,
        };
        mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

        const customer = await billingService.getCustomer('cus_123');

        expect(customer).toEqual(mockCustomer);
      });

      it('should return null for deleted customer', async () => {
        mockStripe.customers.retrieve.mockResolvedValue({
          id: 'cus_123',
          deleted: true,
        });

        const customer = await billingService.getCustomer('cus_123');

        expect(customer).toBeNull();
      });

      it('should return null on error', async () => {
        mockStripe.customers.retrieve.mockRejectedValue(new Error('Not found'));

        const customer = await billingService.getCustomer('cus_invalid');

        expect(customer).toBeNull();
      });
    });
  });

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  describe('Subscription Management', () => {
    describe('createSubscription', () => {
      it('should create a subscription with default trial', async () => {
        const mockSubscription = {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'trialing',
        };
        mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

        const subscription = await billingService.createSubscription({
          customerId: 'cus_123',
          plan: 'school',
          interval: 'monthly',
          seats: 100,
        });

        expect(subscription.id).toBe('sub_123');
        expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
          customer: 'cus_123',
          items: [
            {
              price: 'price_school_monthly',
              quantity: 100,
            },
          ],
          trial_period_days: 14,
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          metadata: undefined,
        });
      });

      it('should allow custom trial days', async () => {
        mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_123' });

        await billingService.createSubscription({
          customerId: 'cus_123',
          plan: 'individual',
          interval: 'annual',
          trialDays: 30,
        });

        expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            trial_period_days: 30,
          })
        );
      });

      it('should default to 1 seat if not specified', async () => {
        mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_123' });

        await billingService.createSubscription({
          customerId: 'cus_123',
          plan: 'individual',
          interval: 'monthly',
        });

        expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [{ price: 'price_individual_monthly', quantity: 1 }],
          })
        );
      });
    });

    describe('updateSubscription', () => {
      it('should update cancel_at_period_end', async () => {
        mockStripe.subscriptions.update.mockResolvedValue({
          id: 'sub_123',
          cancel_at_period_end: true,
        });

        await billingService.updateSubscription('sub_123', {
          cancelAtPeriodEnd: true,
        });

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          cancel_at_period_end: true,
        });
      });

      it('should update plan and interval', async () => {
        const mockSub = {
          id: 'sub_123',
          items: { data: [{ id: 'si_123' }] },
        };
        mockStripe.subscriptions.retrieve.mockResolvedValue(mockSub);
        mockStripe.subscriptions.update.mockResolvedValue({ id: 'sub_123' });

        await billingService.updateSubscription('sub_123', {
          plan: 'district',
          interval: 'annual',
          seats: 500,
        });

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          items: [
            {
              id: 'si_123',
              price: 'price_district_annual',
              quantity: 500,
            },
          ],
          proration_behavior: 'create_prorations',
        });
      });

      it('should update seats only', async () => {
        const mockSub = {
          id: 'sub_123',
          items: { data: [{ id: 'si_456' }] },
        };
        mockStripe.subscriptions.retrieve.mockResolvedValue(mockSub);
        mockStripe.subscriptions.update.mockResolvedValue({ id: 'sub_123' });

        await billingService.updateSubscription('sub_123', {
          seats: 200,
        });

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          items: [{ id: 'si_456', quantity: 200 }],
        });
      });
    });

    describe('cancelSubscription', () => {
      it('should cancel immediately', async () => {
        mockStripe.subscriptions.cancel.mockResolvedValue({
          id: 'sub_123',
          status: 'canceled',
        });

        await billingService.cancelSubscription('sub_123', true);

        expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
      });

      it('should cancel at period end by default', async () => {
        mockStripe.subscriptions.update.mockResolvedValue({
          id: 'sub_123',
          cancel_at_period_end: true,
        });

        await billingService.cancelSubscription('sub_123');

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          cancel_at_period_end: true,
        });
      });
    });

    describe('reactivateSubscription', () => {
      it('should remove cancel_at_period_end', async () => {
        mockStripe.subscriptions.update.mockResolvedValue({
          id: 'sub_123',
          cancel_at_period_end: false,
        });

        await billingService.reactivateSubscription('sub_123');

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          cancel_at_period_end: false,
        });
      });
    });

    describe('getSubscription', () => {
      it('should retrieve subscription', async () => {
        const mockSub = { id: 'sub_123', status: 'active' };
        mockStripe.subscriptions.retrieve.mockResolvedValue(mockSub);

        const subscription = await billingService.getSubscription('sub_123');

        expect(subscription).toEqual(mockSub);
      });

      it('should return null on error', async () => {
        mockStripe.subscriptions.retrieve.mockRejectedValue(new Error('Not found'));

        const subscription = await billingService.getSubscription('sub_invalid');

        expect(subscription).toBeNull();
      });
    });
  });

  // ===========================================================================
  // PAYMENT METHODS
  // ===========================================================================

  describe('Payment Methods', () => {
    describe('createSetupIntent', () => {
      it('should create a setup intent', async () => {
        mockStripe.setupIntents.create.mockResolvedValue({
          id: 'seti_123',
          client_secret: 'seti_123_secret',
        });

        const setupIntent = await billingService.createSetupIntent('cus_123');

        expect(setupIntent.id).toBe('seti_123');
        expect(mockStripe.setupIntents.create).toHaveBeenCalledWith({
          customer: 'cus_123',
          payment_method_types: ['card'],
        });
      });
    });

    describe('attachPaymentMethod', () => {
      it('should attach and set as default', async () => {
        mockStripe.paymentMethods.attach.mockResolvedValue({});
        mockStripe.customers.update.mockResolvedValue({});

        await billingService.attachPaymentMethod('cus_123', 'pm_123');

        expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_123', {
          customer: 'cus_123',
        });
        expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_123', {
          invoice_settings: {
            default_payment_method: 'pm_123',
          },
        });
      });
    });

    describe('listPaymentMethods', () => {
      it('should list card payment methods', async () => {
        const mockMethods = [
          { id: 'pm_1', card: { last4: '4242' } },
          { id: 'pm_2', card: { last4: '1234' } },
        ];
        mockStripe.paymentMethods.list.mockResolvedValue({ data: mockMethods });

        const methods = await billingService.listPaymentMethods('cus_123');

        expect(methods).toHaveLength(2);
        expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          type: 'card',
        });
      });
    });

    describe('deletePaymentMethod', () => {
      it('should detach payment method', async () => {
        mockStripe.paymentMethods.detach.mockResolvedValue({});

        await billingService.deletePaymentMethod('pm_123');

        expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_123');
      });
    });
  });

  // ===========================================================================
  // INVOICES
  // ===========================================================================

  describe('Invoices', () => {
    describe('listInvoices', () => {
      it('should list invoices for customer', async () => {
        const mockInvoices = [
          { id: 'in_1', amount_due: 1000 },
          { id: 'in_2', amount_due: 2000 },
        ];
        mockStripe.invoices.list.mockResolvedValue({ data: mockInvoices });

        const invoices = await billingService.listInvoices('cus_123');

        expect(invoices).toHaveLength(2);
        expect(mockStripe.invoices.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          limit: 10,
        });
      });

      it('should accept custom limit', async () => {
        mockStripe.invoices.list.mockResolvedValue({ data: [] });

        await billingService.listInvoices('cus_123', 50);

        expect(mockStripe.invoices.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          limit: 50,
        });
      });
    });

    describe('getUpcomingInvoice', () => {
      it('should get upcoming invoice', async () => {
        const mockInvoice = {
          amount_due: 5000,
          lines: { data: [] },
        };
        mockStripe.invoices.retrieveUpcoming.mockResolvedValue(mockInvoice);

        const invoice = await billingService.getUpcomingInvoice('cus_123');

        expect(invoice).toEqual(mockInvoice);
      });

      it('should return null if no upcoming invoice', async () => {
        mockStripe.invoices.retrieveUpcoming.mockRejectedValue(new Error('No upcoming invoice'));

        const invoice = await billingService.getUpcomingInvoice('cus_123');

        expect(invoice).toBeNull();
      });
    });
  });

  // ===========================================================================
  // USAGE-BASED BILLING
  // ===========================================================================

  describe('Usage-Based Billing', () => {
    describe('reportUsage', () => {
      it('should report usage record', async () => {
        const mockRecord = { id: 'ur_123', quantity: 100 };
        mockStripe.subscriptionItems.createUsageRecord.mockResolvedValue(mockRecord);

        const record = await billingService.reportUsage({
          subscriptionItemId: 'si_123',
          quantity: 100,
        });

        expect(record.quantity).toBe(100);
      });

      it('should use current timestamp by default', async () => {
        mockStripe.subscriptionItems.createUsageRecord.mockResolvedValue({ id: 'ur_123' });

        await billingService.reportUsage({
          subscriptionItemId: 'si_123',
          quantity: 50,
        });

        const call = mockStripe.subscriptionItems.createUsageRecord.mock.calls[0];
        expect(call[1].timestamp).toBeDefined();
        expect(call[1].action).toBe('increment');
      });

      it('should accept custom action', async () => {
        mockStripe.subscriptionItems.createUsageRecord.mockResolvedValue({ id: 'ur_123' });

        await billingService.reportUsage({
          subscriptionItemId: 'si_123',
          quantity: 100,
          action: 'set',
        });

        expect(mockStripe.subscriptionItems.createUsageRecord).toHaveBeenCalledWith(
          'si_123',
          expect.objectContaining({ action: 'set' })
        );
      });
    });
  });

  // ===========================================================================
  // CHECKOUT SESSIONS
  // ===========================================================================

  describe('Checkout Sessions', () => {
    describe('createCheckoutSession', () => {
      it('should create checkout session', async () => {
        const mockSession = {
          id: 'cs_123',
          url: 'https://checkout.stripe.com/session/cs_123',
        };
        mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

        const session = await billingService.createCheckoutSession({
          plan: 'school',
          interval: 'monthly',
          successUrl: 'https://app.example.com/success',
          cancelUrl: 'https://app.example.com/cancel',
          customerEmail: 'test@example.com',
        });

        expect(session.id).toBe('cs_123');
        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
          mode: 'subscription',
          customer: undefined,
          customer_email: 'test@example.com',
          line_items: [{ price: 'price_school_monthly', quantity: 1 }],
          subscription_data: {
            trial_period_days: 14,
            metadata: undefined,
          },
          success_url: 'https://app.example.com/success',
          cancel_url: 'https://app.example.com/cancel',
          allow_promotion_codes: true,
          billing_address_collection: 'required',
          tax_id_collection: { enabled: true },
        });
      });

      it('should use existing customer if provided', async () => {
        mockStripe.checkout.sessions.create.mockResolvedValue({ id: 'cs_123' });

        await billingService.createCheckoutSession({
          customerId: 'cus_existing',
          plan: 'individual',
          interval: 'annual',
          successUrl: 'https://app.example.com/success',
          cancelUrl: 'https://app.example.com/cancel',
        });

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_existing',
            customer_email: undefined,
          })
        );
      });
    });

    describe('createPortalSession', () => {
      it('should create billing portal session', async () => {
        const mockSession = {
          id: 'bps_123',
          url: 'https://billing.stripe.com/session/bps_123',
        };
        mockStripe.billingPortal.sessions.create.mockResolvedValue(mockSession);

        const session = await billingService.createPortalSession({
          customerId: 'cus_123',
          returnUrl: 'https://app.example.com/billing',
        });

        expect(session.url).toBe('https://billing.stripe.com/session/bps_123');
        expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
          customer: 'cus_123',
          return_url: 'https://app.example.com/billing',
        });
      });
    });
  });

  // ===========================================================================
  // WEBHOOKS
  // ===========================================================================

  describe('Webhooks', () => {
    describe('constructWebhookEvent', () => {
      it('should construct webhook event', () => {
        const mockEvent = { id: 'evt_123', type: 'customer.created' };
        mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

        const event = billingService.constructWebhookEvent('{"test": "payload"}', 'sig_header');

        expect(event.type).toBe('customer.created');
        expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
          '{"test": "payload"}',
          'sig_header',
          testBillingConfig.stripeWebhookSecret
        );
      });
    });
  });

  // ===========================================================================
  // COUPONS & PROMOTIONS
  // ===========================================================================

  describe('Coupons & Promotions', () => {
    describe('createCoupon', () => {
      it('should create percentage coupon', async () => {
        mockStripe.coupons.create.mockResolvedValue({
          id: 'coupon_123',
          percent_off: 20,
        });

        const coupon = await billingService.createCoupon({
          name: '20% Off',
          percentOff: 20,
          duration: 'once',
        });

        expect(coupon.percent_off).toBe(20);
        expect(mockStripe.coupons.create).toHaveBeenCalledWith({
          name: '20% Off',
          percent_off: 20,
          amount_off: undefined,
          currency: 'usd',
          duration: 'once',
          duration_in_months: undefined,
          max_redemptions: undefined,
          redeem_by: undefined,
        });
      });

      it('should create fixed amount coupon', async () => {
        mockStripe.coupons.create.mockResolvedValue({
          id: 'coupon_456',
          amount_off: 1000,
        });

        await billingService.createCoupon({
          name: '$10 Off',
          amountOff: 1000,
          currency: 'usd',
          duration: 'repeating',
          durationInMonths: 3,
        });

        expect(mockStripe.coupons.create).toHaveBeenCalledWith(
          expect.objectContaining({
            amount_off: 1000,
            duration: 'repeating',
            duration_in_months: 3,
          })
        );
      });

      it('should handle expiration date', async () => {
        mockStripe.coupons.create.mockResolvedValue({ id: 'coupon_789' });
        const expirationDate = new Date('2026-12-31');

        await billingService.createCoupon({
          name: 'Holiday Special',
          percentOff: 25,
          duration: 'once',
          redeemBy: expirationDate,
        });

        expect(mockStripe.coupons.create).toHaveBeenCalledWith(
          expect.objectContaining({
            redeem_by: Math.floor(expirationDate.getTime() / 1000),
          })
        );
      });
    });

    describe('createPromotionCode', () => {
      it('should create promotion code', async () => {
        mockStripe.promotionCodes.create.mockResolvedValue({
          id: 'promo_123',
          code: 'SAVE20',
        });

        const promoCode = await billingService.createPromotionCode({
          couponId: 'coupon_123',
          code: 'SAVE20',
        });

        expect(promoCode.code).toBe('SAVE20');
        expect(mockStripe.promotionCodes.create).toHaveBeenCalledWith({
          coupon: 'coupon_123',
          code: 'SAVE20',
          max_redemptions: undefined,
          expires_at: undefined,
        });
      });

      it('should handle max redemptions and expiration', async () => {
        mockStripe.promotionCodes.create.mockResolvedValue({ id: 'promo_456' });
        const expiresAt = new Date('2026-06-30');

        await billingService.createPromotionCode({
          couponId: 'coupon_456',
          code: 'LIMITED',
          maxRedemptions: 100,
          expiresAt,
        });

        expect(mockStripe.promotionCodes.create).toHaveBeenCalledWith({
          coupon: 'coupon_456',
          code: 'LIMITED',
          max_redemptions: 100,
          expires_at: Math.floor(expiresAt.getTime() / 1000),
        });
      });
    });
  });
});
