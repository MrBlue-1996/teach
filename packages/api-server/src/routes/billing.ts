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
import { getDatabase, invoices, subscriptions, users, eq, type Database } from '@topshelf/database';
import { getLogger } from '@topshelf/observability';
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

type PlanTier = 'individual' | 'school' | 'district' | 'enterprise';
type BillingInterval = 'monthly' | 'annual';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

interface WebhookEvent {
  id?: string;
  type: string;
  data: {
    object: unknown;
  };
}

interface StripeSubscriptionLike {
  id?: string;
  customer?: string | { id?: string } | null;
  status?: string;
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  trial_end?: number | null;
  metadata?: Record<string, string> | null;
  items?: {
    data?: Array<{
      quantity?: number | null;
      price?: {
        recurring?: {
          interval?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
}

interface StripeInvoiceLike {
  id?: string;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  status?: string | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  total?: number | null;
  currency?: string | null;
  due_date?: number | null;
  invoice_pdf?: string | null;
  status_transitions?: {
    paid_at?: number | null;
  } | null;
  lines?: {
    data?: Array<{
      description?: string | null;
      quantity?: number | null;
      amount?: number | null;
      price?: {
        unit_amount?: number | null;
      } | null;
    }>;
  } | null;
  metadata?: Record<string, string> | null;
}

interface StoredSubscription {
  id: string;
  organizationId: string;
  metadata?: Record<string, unknown> | null;
}

const log = getLogger().child({ route: 'billing' });

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

function unixToDate(value: number | null | undefined): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  return new Date(value * 1000);
}

function stripeId(value: string | { id?: string } | null | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'object' && value !== null && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

function toSubscriptionStatus(status: string | undefined): SubscriptionStatus {
  if (status === undefined) {
    return 'past_due';
  }

  switch (status) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'unpaid':
      return status;
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'past_due';
    default:
      return 'past_due';
  }
}

function isPlanTier(value: string | undefined): value is PlanTier {
  return (
    value === 'individual' || value === 'school' || value === 'district' || value === 'enterprise'
  );
}

function isBillingInterval(value: string | undefined): value is BillingInterval {
  return value === 'monthly' || value === 'annual';
}

function stripeIntervalToBillingInterval(value: string | null | undefined): BillingInterval | null {
  if (value === 'month') {
    return 'monthly';
  }

  if (value === 'year') {
    return 'annual';
  }

  return null;
}

function subscriptionQuantity(subscription: StripeSubscriptionLike): number | null {
  const quantity = subscription.items?.data?.[0]?.quantity;
  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0
    ? quantity
    : null;
}

async function findStoredSubscription(
  db: Database,
  params: { stripeSubscriptionId?: string | null; stripeCustomerId?: string | null }
): Promise<StoredSubscription | null> {
  if (params.stripeSubscriptionId !== undefined && params.stripeSubscriptionId !== null) {
    const bySubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, params.stripeSubscriptionId),
      columns: { id: true, organizationId: true },
    });

    if (bySubscription !== undefined) {
      return bySubscription;
    }
  }

  if (params.stripeCustomerId !== undefined && params.stripeCustomerId !== null) {
    const byCustomer = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeCustomerId, params.stripeCustomerId),
      columns: { id: true, organizationId: true },
    });

    if (byCustomer !== undefined) {
      return byCustomer;
    }
  }

  return null;
}

async function syncSubscriptionEvent(db: Database, event: WebhookEvent): Promise<void> {
  if (typeof event.data.object !== 'object' || event.data.object === null) {
    log.warn(
      { eventId: event.id, eventType: event.type },
      'Skipping malformed Stripe subscription event'
    );
    return;
  }

  const subscription = event.data.object as StripeSubscriptionLike;
  const stripeSubscriptionId = typeof subscription.id === 'string' ? subscription.id : null;
  const stripeCustomerId = stripeId(subscription.customer);

  if (stripeSubscriptionId === null && stripeCustomerId === null) {
    log.warn(
      { eventId: event.id, eventType: event.type },
      'Skipping Stripe subscription event without IDs'
    );
    return;
  }

  const stored = await findStoredSubscription(db, { stripeSubscriptionId, stripeCustomerId });
  const metadata = subscription.metadata ?? {};
  const now = new Date();
  const seats = subscriptionQuantity(subscription);
  const status =
    event.type === 'customer.subscription.deleted'
      ? 'canceled'
      : toSubscriptionStatus(subscription.status);

  const updateValues = {
    ...(stripeSubscriptionId !== null ? { stripeSubscriptionId } : {}),
    ...(stripeCustomerId !== null ? { stripeCustomerId } : {}),
    status,
    currentPeriodStart: unixToDate(subscription.current_period_start),
    currentPeriodEnd: unixToDate(subscription.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    trialEnd: unixToDate(subscription.trial_end),
    ...(seats !== null ? { seats } : {}),
    metadata: {
      ...metadata,
      lastStripeEventId: event.id ?? '',
      lastStripeEventType: event.type,
    },
    updatedAt: now,
  };

  if (stored !== null) {
    await db.update(subscriptions).set(updateValues).where(eq(subscriptions.id, stored.id));
    return;
  }

  const organizationId = metadata.organizationId;
  const plan = isPlanTier(metadata.plan) ? metadata.plan : undefined;
  const interval = isBillingInterval(metadata.interval)
    ? metadata.interval
    : stripeIntervalToBillingInterval(subscription.items?.data?.[0]?.price?.recurring?.interval);

  if (
    organizationId === undefined ||
    stripeCustomerId === null ||
    stripeSubscriptionId === null ||
    plan === undefined ||
    interval === null
  ) {
    log.warn(
      { eventId: event.id, eventType: event.type, stripeSubscriptionId, stripeCustomerId },
      'Cannot create local subscription from Stripe event without organization, plan, and interval metadata'
    );
    return;
  }

  await db
    .insert(subscriptions)
    .values({
      organizationId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      interval,
      status,
      seats: seats ?? 1,
      currentPeriodStart: unixToDate(subscription.current_period_start),
      currentPeriodEnd: unixToDate(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      trialEnd: unixToDate(subscription.trial_end),
      metadata: updateValues.metadata,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: updateValues,
    });
}

function invoiceAmount(invoice: StripeInvoiceLike): number {
  return invoice.amount_paid ?? invoice.amount_due ?? invoice.total ?? 0;
}

function invoiceLineItems(invoice: StripeInvoiceLike): Array<{
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
}> {
  return (invoice.lines?.data ?? []).map((line) => ({
    description: line.description ?? '',
    quantity: line.quantity ?? 1,
    unitAmount: line.price?.unit_amount ?? 0,
    amount: line.amount ?? 0,
  }));
}

async function syncInvoiceEvent(db: Database, event: WebhookEvent): Promise<void> {
  if (typeof event.data.object !== 'object' || event.data.object === null) {
    log.warn(
      { eventId: event.id, eventType: event.type },
      'Skipping malformed Stripe invoice event'
    );
    return;
  }

  const invoice = event.data.object as StripeInvoiceLike;
  const stripeInvoiceId = typeof invoice.id === 'string' ? invoice.id : null;
  const stripeSubscriptionId = stripeId(invoice.subscription);
  const stripeCustomerId = stripeId(invoice.customer);

  if (stripeInvoiceId === null) {
    log.warn(
      { eventId: event.id, eventType: event.type },
      'Skipping Stripe invoice event without invoice ID'
    );
    return;
  }

  const stored = await findStoredSubscription(db, { stripeSubscriptionId, stripeCustomerId });
  if (stored === null) {
    log.warn(
      {
        eventId: event.id,
        eventType: event.type,
        stripeInvoiceId,
        stripeSubscriptionId,
        stripeCustomerId,
      },
      'Skipping Stripe invoice event because no local subscription matched'
    );
    return;
  }

  const now = new Date();
  const invoiceValues = {
    organizationId: stored.organizationId,
    subscriptionId: stored.id,
    stripeInvoiceId,
    amount: invoiceAmount(invoice),
    currency: invoice.currency ?? 'usd',
    status: invoice.status ?? (event.type === 'invoice.payment_succeeded' ? 'paid' : 'open'),
    dueDate: unixToDate(invoice.due_date),
    paidAt: unixToDate(invoice.status_transitions?.paid_at),
    invoicePdf: invoice.invoice_pdf ?? null,
    lineItems: invoiceLineItems(invoice),
    metadata: {
      ...(invoice.metadata ?? {}),
      lastStripeEventId: event.id ?? '',
      lastStripeEventType: event.type,
    },
  };

  await db.insert(invoices).values(invoiceValues).onConflictDoUpdate({
    target: invoices.stripeInvoiceId,
    set: invoiceValues,
  });

  await db
    .update(subscriptions)
    .set({
      status: event.type === 'invoice.payment_failed' ? 'past_due' : 'active',
      updatedAt: now,
      metadata: {
        lastInvoiceId: stripeInvoiceId,
        lastStripeEventId: event.id ?? '',
        lastStripeEventType: event.type,
      },
    })
    .where(eq(subscriptions.id, stored.id));
}

async function processBillingWebhook(db: Database, event: WebhookEvent): Promise<boolean> {
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscriptionEvent(db, event);
      return true;
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      await syncInvoiceEvent(db, event);
      return true;
    default:
      log.info(
        { eventId: event.id, eventType: event.type },
        'Unhandled Stripe billing webhook event'
      );
      return false;
  }
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

    const processed = await processBillingWebhook(getDatabase(), event);

    return c.json({ received: true, processed });
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
