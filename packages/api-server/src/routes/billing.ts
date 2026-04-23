/**
 * TopShelf Service LLC - Billing Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { BillingService } from '@topshelf/billing';
import { getConfig } from '@topshelf/config';
import { getDatabase, subscriptions, users, eq } from '@topshelf/database';
import { authMiddleware } from '../middleware/auth.js';
import { badRequest } from '../middleware/error-handler.js';

// =============================================================================
// SCHEMAS
// =============================================================================

const CheckoutSchema = z.object({
  plan: z.enum(['individual', 'school', 'district', 'enterprise']),
  interval: z.enum(['monthly', 'annual']),
  seats: z.number().int().min(1).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerEmail: z.string().email().optional(),
});

const PortalQuerySchema = z.object({
  returnUrl: z.string().url(),
});

// =============================================================================
// HELPERS
// =============================================================================

function createBillingService(): BillingService {
  const config = getConfig();
  const b = config.billing;
  return new BillingService({
    stripeSecretKey: b.stripeSecretKey,
    stripeWebhookSecret: b.stripeWebhookSecret,
    trialDays: b.trialDays,
    taxEnabled: b.taxEnabled,
    stripePriceIds: {
      individual: {
        monthly: b.priceIds.individualMonthly,
        annual: b.priceIds.individualAnnual,
      },
      school: {
        monthly: b.priceIds.schoolMonthly,
        annual: b.priceIds.schoolAnnual,
      },
      district: {
        monthly: b.priceIds.districtMonthly,
        annual: b.priceIds.districtAnnual,
      },
      enterprise: {
        monthly: b.priceIds.enterpriseMonthly,
        annual: b.priceIds.enterpriseAnnual,
      },
    },
  });
}

// =============================================================================
// ROUTES
// =============================================================================

export function createBillingRoutes(): Hono {
  const router = new Hono();

  // ---------------------------------------------------------------------------
  // POST /billing/webhook — Stripe webhook (public, verified by signature)
  // ---------------------------------------------------------------------------
  router.post('/webhook', async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (signature === undefined || signature === '') {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    const billing = createBillingService();

    let event: ReturnType<typeof billing.constructWebhookEvent>;
    try {
      event = billing.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
      return c.json({ error: message }, 400);
    }

    // Acknowledge the event — full handler logic wired in future sprints
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        // TODO: sync subscription/invoice records in DB (billing-engineer sprint)
        break;
      default:
        // Unhandled event types are acknowledged but not processed
        break;
    }

    return c.json({ received: true });
  });

  // ---------------------------------------------------------------------------
  // POST /billing/checkout — Create Stripe checkout session (auth required)
  // ---------------------------------------------------------------------------
  router.post('/checkout', authMiddleware(), zValidator('json', CheckoutSchema), async (c) => {
    const body = c.req.valid('json');
    const billing = createBillingService();

    const session = await billing.createCheckoutSession({
      plan: body.plan,
      interval: body.interval,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      ...(body.seats !== undefined ? { seats: body.seats } : {}),
      ...(body.customerEmail !== undefined ? { customerEmail: body.customerEmail } : {}),
    });

    return c.json({ url: session.url, sessionId: session.id });
  });

  // ---------------------------------------------------------------------------
  // GET /billing/portal — Create Stripe billing portal session (auth required)
  // ---------------------------------------------------------------------------
  router.get('/portal', authMiddleware(), zValidator('query', PortalQuerySchema), async (c) => {
    const userId = c.get('userId');
    const { returnUrl } = c.req.valid('query');
    const db = getDatabase();

    // Look up this user's Stripe customer ID via their organization's subscription
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { organizationId: true },
    });

    if (
      user?.organizationId === undefined ||
      user.organizationId === null ||
      user.organizationId === ''
    ) {
      throw badRequest('No organization associated with this account');
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, user.organizationId),
      columns: { stripeCustomerId: true },
    });

    if (!subscription) {
      throw badRequest('No active subscription found for this organization');
    }

    const billing = createBillingService();
    const portalSession = await billing.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
    });

    return c.json({ url: portalSession.url });
  });

  // ---------------------------------------------------------------------------
  // GET /billing/subscription — Get current user's subscription status (auth required)
  // ---------------------------------------------------------------------------
  router.get('/subscription', authMiddleware(), async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { organizationId: true },
    });

    if (
      user?.organizationId === undefined ||
      user.organizationId === null ||
      user.organizationId === ''
    ) {
      return c.json({ subscription: null });
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, user.organizationId),
    });

    if (!subscription) {
      return c.json({ subscription: null });
    }

    return c.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        interval: subscription.interval,
        status: subscription.status,
        seats: subscription.seats,
        usedSeats: subscription.usedSeats,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialEnd: subscription.trialEnd,
      },
    });
  });

  return router;
}
