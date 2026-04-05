/**
 * TopShelf Service LLC - Billing & Subscription Management
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import Stripe from 'stripe';
import { z } from 'zod';
import { getLogger } from '@topshelf/observability';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BillingConfigSchema = z.object({
  stripeSecretKey: z.string(),
  stripeWebhookSecret: z.string(),
  stripePriceIds: z.object({
    individual: z.object({
      monthly: z.string(),
      annual: z.string(),
    }),
    school: z.object({
      monthly: z.string(),
      annual: z.string(),
    }),
    district: z.object({
      monthly: z.string(),
      annual: z.string(),
    }),
    enterprise: z.object({
      monthly: z.string(),
      annual: z.string(),
    }),
  }),
  trialDays: z.number().default(14),
  taxEnabled: z.boolean().default(true),
});

export type BillingConfig = z.infer<typeof BillingConfigSchema>;

// =============================================================================
// TYPES
// =============================================================================

export type PlanTier = 'individual' | 'school' | 'district' | 'enterprise';
export type BillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface PricingPlan {
  tier: PlanTier;
  name: string;
  description: string;
  features: string[];
  limits: {
    seats: number | 'unlimited';
    contentPacks: number | 'unlimited';
    storageGB: number;
    supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
    apiAccess: boolean;
    sso: boolean;
    customBranding: boolean;
    analytics: 'basic' | 'advanced' | 'enterprise';
  };
  pricing: {
    monthly: number;
    annual: number;
    perSeat?: number;
  };
}

export interface Subscription {
  id: string;
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: PlanTier;
  interval: BillingInterval;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  seats: number;
  usedSeats: number;
  trialEnd?: Date;
  metadata: Record<string, string>;
}

export interface Invoice {
  id: string;
  organizationId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate?: Date;
  paidAt?: Date;
  invoicePdf?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    amount: number;
  }>;
}

export interface UsageRecord {
  organizationId: string;
  metric: 'active_learners' | 'api_calls' | 'storage_bytes' | 'llm_tokens';
  quantity: number;
  timestamp: Date;
}

// =============================================================================
// PRICING PLANS
// =============================================================================

export const PRICING_PLANS: Record<PlanTier, PricingPlan> = {
  individual: {
    tier: 'individual',
    name: 'Individual',
    description: 'Perfect for self-directed learners',
    features: [
      'Access to all content packs',
      'Progress tracking',
      'Badges and credentials',
      'Mobile app access',
      'Community support',
    ],
    limits: {
      seats: 1,
      contentPacks: 'unlimited',
      storageGB: 5,
      supportLevel: 'community',
      apiAccess: false,
      sso: false,
      customBranding: false,
      analytics: 'basic',
    },
    pricing: {
      monthly: 29,
      annual: 290, // ~17% discount
    },
  },
  school: {
    tier: 'school',
    name: 'School',
    description: 'For individual schools and small institutions',
    features: [
      'Everything in Individual',
      'Up to 500 student seats',
      'Instructor dashboard',
      'Class management',
      'Progress reports',
      'Email support',
      'Basic analytics',
    ],
    limits: {
      seats: 500,
      contentPacks: 'unlimited',
      storageGB: 100,
      supportLevel: 'email',
      apiAccess: true,
      sso: false,
      customBranding: false,
      analytics: 'basic',
    },
    pricing: {
      monthly: 499,
      annual: 4990,
      perSeat: 2,
    },
  },
  district: {
    tier: 'district',
    name: 'District',
    description: 'For school districts and larger organizations',
    features: [
      'Everything in School',
      'Unlimited student seats',
      'Multi-school management',
      'SSO integration',
      'Advanced analytics',
      'Priority support',
      'Custom content packs',
      'API access',
    ],
    limits: {
      seats: 'unlimited',
      contentPacks: 'unlimited',
      storageGB: 1000,
      supportLevel: 'priority',
      apiAccess: true,
      sso: true,
      customBranding: true,
      analytics: 'advanced',
    },
    pricing: {
      monthly: 2499,
      annual: 24990,
      perSeat: 1.5,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For large enterprises and state-level deployments',
    features: [
      'Everything in District',
      'Dedicated success manager',
      'Custom integrations',
      'On-premise option',
      'SLA guarantee',
      'Dedicated support',
      'White-label option',
      'Custom contracts',
    ],
    limits: {
      seats: 'unlimited',
      contentPacks: 'unlimited',
      storageGB: 10000,
      supportLevel: 'dedicated',
      apiAccess: true,
      sso: true,
      customBranding: true,
      analytics: 'enterprise',
    },
    pricing: {
      monthly: 9999,
      annual: 99990,
      perSeat: 1,
    },
  },
};

// =============================================================================
// BILLING SERVICE
// =============================================================================

export class BillingService {
  private stripe: Stripe;
  private config: BillingConfig;
  private logger = getLogger().child({ service: 'billing' });

  constructor(config: BillingConfig) {
    this.config = config;
    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  // ===========================================================================
  // CUSTOMER MANAGEMENT
  // ===========================================================================

  async createCustomer(params: {
    organizationId: string;
    email: string;
    name: string;
    metadata?: Record<string, string>;
  }): Promise<string> {
    this.logger.info({ organizationId: params.organizationId }, 'Creating Stripe customer');

    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        organizationId: params.organizationId,
        ...params.metadata,
      },
    });

    return customer.id;
  }

  async updateCustomer(
    customerId: string,
    updates: { email?: string; name?: string; metadata?: Record<string, string> }
  ): Promise<void> {
    await this.stripe.customers.update(customerId, updates);
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;
      return customer as Stripe.Customer;
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  async createSubscription(params: {
    customerId: string;
    plan: PlanTier;
    interval: BillingInterval;
    seats?: number;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    const priceId = this.config.stripePriceIds[params.plan][params.interval];

    this.logger.info({ customerId: params.customerId, plan: params.plan }, 'Creating subscription');

    const subscription = await this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [
        {
          price: priceId,
          quantity: params.seats || 1,
        },
      ],
      trial_period_days: params.trialDays ?? this.config.trialDays,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    });

    return subscription;
  }

  async updateSubscription(
    subscriptionId: string,
    updates: {
      plan?: PlanTier;
      interval?: BillingInterval;
      seats?: number;
      cancelAtPeriodEnd?: boolean;
    }
  ): Promise<Stripe.Subscription> {
    const updateParams: Stripe.SubscriptionUpdateParams = {};

    if (updates.cancelAtPeriodEnd !== undefined) {
      updateParams.cancel_at_period_end = updates.cancelAtPeriodEnd;
    }

    if (updates.plan && updates.interval) {
      const priceId = this.config.stripePriceIds[updates.plan][updates.interval];
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      updateParams.items = [
        {
          id: subscription.items.data[0]!.id,
          price: priceId,
          ...(updates.seats !== undefined ? { quantity: updates.seats } : {}),
        },
      ];
      updateParams.proration_behavior = 'create_prorations';
    } else if (updates.seats) {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      updateParams.items = [
        {
          id: subscription.items.data[0]!.id,
          quantity: updates.seats,
        },
      ];
    }

    return this.stripe.subscriptions.update(subscriptionId, updateParams);
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<Stripe.Subscription> {
    this.logger.info({ subscriptionId, immediately }, 'Canceling subscription');

    if (immediately) {
      return this.stripe.subscriptions.cancel(subscriptionId);
    }

    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // PAYMENT METHODS
  // ===========================================================================

  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const methods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return methods.data;
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // ===========================================================================
  // INVOICES
  // ===========================================================================

  async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  }

  async getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
    try {
      return await this.stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // USAGE-BASED BILLING
  // ===========================================================================

  async reportUsage(params: {
    subscriptionItemId: string;
    quantity: number;
    timestamp?: number;
    action?: 'increment' | 'set';
  }): Promise<Stripe.UsageRecord> {
    return this.stripe.subscriptionItems.createUsageRecord(params.subscriptionItemId, {
      quantity: params.quantity,
      timestamp: params.timestamp || Math.floor(Date.now() / 1000),
      action: params.action || 'increment',
    });
  }

  // ===========================================================================
  // CHECKOUT SESSIONS
  // ===========================================================================

  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    plan: PlanTier;
    interval: BillingInterval;
    seats?: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const priceId = this.config.stripePriceIds[params.plan][params.interval];

    return this.stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(params.customerId !== undefined ? { customer: params.customerId } : {}),
      ...(params.customerId === undefined && params.customerEmail !== undefined
        ? { customer_email: params.customerEmail }
        : {}),
      line_items: [
        {
          price: priceId,
          quantity: params.seats || 1,
        },
      ],
      subscription_data: {
        trial_period_days: this.config.trialDays,
        ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: this.config.taxEnabled,
      },
    });
  }

  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
  }

  // ===========================================================================
  // WEBHOOK HANDLING
  // ===========================================================================

  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, this.config.stripeWebhookSecret);
  }

  // ===========================================================================
  // COUPONS & PROMOTIONS
  // ===========================================================================

  async createCoupon(params: {
    name: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number;
    maxRedemptions?: number;
    redeemBy?: Date;
  }): Promise<Stripe.Coupon> {
    return this.stripe.coupons.create({
      name: params.name,
      currency: params.currency || 'usd',
      duration: params.duration,
      ...(params.percentOff !== undefined ? { percent_off: params.percentOff } : {}),
      ...(params.amountOff !== undefined ? { amount_off: params.amountOff } : {}),
      ...(params.durationInMonths !== undefined
        ? { duration_in_months: params.durationInMonths }
        : {}),
      ...(params.maxRedemptions !== undefined ? { max_redemptions: params.maxRedemptions } : {}),
      ...(params.redeemBy !== undefined
        ? { redeem_by: Math.floor(params.redeemBy.getTime() / 1000) }
        : {}),
    });
  }

  async createPromotionCode(params: {
    couponId: string;
    code: string;
    maxRedemptions?: number;
    expiresAt?: Date;
  }): Promise<Stripe.PromotionCode> {
    return this.stripe.promotionCodes.create({
      coupon: params.couponId,
      code: params.code,
      ...(params.maxRedemptions !== undefined ? { max_redemptions: params.maxRedemptions } : {}),
      ...(params.expiresAt !== undefined
        ? { expires_at: Math.floor(params.expiresAt.getTime() / 1000) }
        : {}),
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Stripe };
export { BillingConfigSchema };
