/**
 * TopShelf API Server - Billing Routes Test Suite
 *
 * Tests for billing routes: checkout, portal session.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createBillingRoutes } from './billing.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockCheckoutSession = {
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/c/pay/cs_test_123',
};

const mockPortalSession = {
  id: 'bps_test_456',
  url: 'https://billing.stripe.com/session/bps_test_456',
};

const mockBillingService = {
  createCheckoutSession: vi.fn().mockResolvedValue(mockCheckoutSession),
  createPortalSession: vi.fn().mockResolvedValue(mockPortalSession),
  constructWebhookEvent: vi.fn().mockReturnValue({ type: 'test.event', data: {} }),
};

vi.mock('@topshelf/billing', () => ({
  BillingService: vi.fn().mockImplementation(() => mockBillingService),
}));

const mockUser = {
  organizationId: 'org-1',
};

const mockSubscription = {
  id: 'sub-1',
  organizationId: 'org-1',
  stripeCustomerId: 'cus_test_789',
  plan: 'school',
  interval: 'monthly',
  status: 'active',
  seats: 100,
  usedSeats: 42,
  currentPeriodStart: new Date('2026-04-01'),
  currentPeriodEnd: new Date('2026-05-01'),
  cancelAtPeriodEnd: false,
  trialEnd: null,
};

const {
  mockInsert,
  mockInsertValues,
  mockOnConflictDoUpdate,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
} = vi.hoisted(() => {
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockInsertValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  return {
    mockInsert,
    mockInsertValues,
    mockOnConflictDoUpdate,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
  };
});

const mockDb = {
  query: {
    users: {
      findFirst: vi.fn().mockResolvedValue(mockUser),
    },
    subscriptions: {
      findFirst: vi.fn().mockResolvedValue(mockSubscription),
    },
  },
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@topshelf/database', () => ({
  getDatabase: (): typeof mockDb => mockDb,
  users: { id: 'id', organizationId: 'organizationId' },
  subscriptions: {
    id: 'id',
    organizationId: 'organizationId',
    stripeCustomerId: 'stripeCustomerId',
    stripeSubscriptionId: 'stripeSubscriptionId',
  },
  invoices: {
    stripeInvoiceId: 'stripeInvoiceId',
  },
  eq: (...args: unknown[]): unknown[] => args,
}));

vi.mock('@topshelf/observability', () => ({
  getLogger: (): Record<string, unknown> => ({
    child: (): Record<string, unknown> => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }),
}));

vi.mock('@topshelf/config', () => ({
  getConfig: (): Record<string, unknown> => ({
    environment: 'test',
    billing: {
      stripeSecretKey: 'sk_test_placeholder',
      stripeWebhookSecret: 'whsec_placeholder',
      trialDays: 14,
      taxEnabled: true,
      priceIds: {
        individualMonthly: 'price_ind_mo',
        individualAnnual: 'price_ind_an',
        schoolMonthly: 'price_sch_mo',
        schoolAnnual: 'price_sch_an',
        districtMonthly: 'price_dis_mo',
        districtAnnual: 'price_dis_an',
        enterpriseMonthly: 'price_ent_mo',
        enterpriseAnnual: 'price_ent_an',
      },
    },
  }),
}));

import { createMiddleware } from 'hono/factory';

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (): ReturnType<typeof createMiddleware> =>
    createMiddleware(async (_c, next) => {
      await next();
    }),
  requireRole: (): ReturnType<typeof createMiddleware> =>
    createMiddleware(async (_c, next) => {
      await next();
    }),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Billing Routes', () => {
  let app: Hono;

  beforeEach((): void => {
    vi.clearAllMocks();
    app = new Hono();
    app.onError(errorHandler);

    // Simulate authenticated user context
    app.use('*', async (c, next): Promise<void> => {
      c.set('userId' as any, 'user-test-1');
      c.set('userRole' as any, 'school_admin');
      await next();
    });

    app.route('/billing', createBillingRoutes());

    // Restore defaults
    mockDb.query.users.findFirst.mockResolvedValue(mockUser);
    mockDb.query.subscriptions.findFirst.mockResolvedValue(mockSubscription);
    mockBillingService.createCheckoutSession.mockResolvedValue(mockCheckoutSession);
    mockBillingService.createPortalSession.mockResolvedValue(mockPortalSession);
    mockBillingService.constructWebhookEvent.mockReturnValue({ type: 'test.event', data: {} });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // POST /billing/checkout
  // ---------------------------------------------------------------------------

  describe('POST /billing/checkout', () => {
    it('should return a checkout URL for valid request', async () => {
      const res = await app.request('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'school',
          interval: 'monthly',
          successUrl: 'https://app.topshelf.app/billing/success',
          cancelUrl: 'https://app.topshelf.app/billing/cancel',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toBe(mockCheckoutSession.url);
      expect(body.sessionId).toBe(mockCheckoutSession.id);
    });

    it('should pass seats to billing service when provided', async () => {
      const res = await app.request('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'district',
          interval: 'annual',
          seats: 250,
          successUrl: 'https://app.topshelf.app/billing/success',
          cancelUrl: 'https://app.topshelf.app/billing/cancel',
        }),
      });

      expect(res.status).toBe(200);
      expect(mockBillingService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ seats: 250, plan: 'district', interval: 'annual' })
      );
    });

    it('should return 400 for invalid plan tier', async () => {
      const res = await app.request('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'unknown_tier',
          interval: 'monthly',
          successUrl: 'https://app.topshelf.app/billing/success',
          cancelUrl: 'https://app.topshelf.app/billing/cancel',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when successUrl is missing', async () => {
      const res = await app.request('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'school', interval: 'monthly' }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /billing/portal
  // ---------------------------------------------------------------------------

  describe('GET /billing/portal', () => {
    it('should return a portal URL for valid request', async () => {
      const res = await app.request(
        '/billing/portal?returnUrl=https%3A%2F%2Fapp.topshelf.app%2Fdashboard'
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toBe(mockPortalSession.url);
    });

    it('should return 400 when user has no organization', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ organizationId: null });

      const res = await app.request(
        '/billing/portal?returnUrl=https%3A%2F%2Fapp.topshelf.app%2Fdashboard'
      );

      expect(res.status).toBe(400);
    });

    it('should return 400 when no subscription exists for the organization', async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(null);

      const res = await app.request(
        '/billing/portal?returnUrl=https%3A%2F%2Fapp.topshelf.app%2Fdashboard'
      );

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid returnUrl', async () => {
      const res = await app.request('/billing/portal?returnUrl=not-a-url');

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /billing/subscription
  // ---------------------------------------------------------------------------

  describe('GET /billing/subscription', () => {
    it('should return subscription data for user with active subscription', async () => {
      const res = await app.request('/billing/subscription');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.subscription).toBeDefined();
      expect(body.subscription.plan).toBe('school');
      expect(body.subscription.status).toBe('active');
    });

    it('should return null when user has no organization', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ organizationId: null });

      const res = await app.request('/billing/subscription');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.subscription).toBeNull();
    });

    it('should return null when no subscription exists', async () => {
      mockDb.query.subscriptions.findFirst.mockResolvedValue(null);

      const res = await app.request('/billing/subscription');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.subscription).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // POST /billing/webhook
  // ---------------------------------------------------------------------------

  describe('POST /billing/webhook', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      const res = await app.request('/billing/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test.event' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when signature verification fails', async () => {
      mockBillingService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });

      const res = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_sig',
        },
        body: JSON.stringify({ type: 'test.event' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return received: true for valid webhook', async () => {
      mockBillingService.constructWebhookEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {},
      });

      const res = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_sig',
        },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
      expect(body.processed).toBe(true);
    });

    it('should persist a paid invoice and mark subscription active', async () => {
      mockBillingService.constructWebhookEvent.mockReturnValue({
        id: 'evt_paid_1',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_test_789',
            subscription: 'sub_stripe_123',
            amount_paid: 49900,
            currency: 'usd',
            status: 'paid',
            status_transitions: { paid_at: 1_767_225_600 },
            invoice_pdf: 'https://stripe.test/invoice.pdf',
            lines: {
              data: [
                {
                  description: 'School plan',
                  quantity: 1,
                  amount: 49900,
                  price: { unit_amount: 49900 },
                },
              ],
            },
          },
        },
      });

      const res = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_sig',
        },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
      });

      expect(res.status).toBe(200);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          subscriptionId: 'sub-1',
          stripeInvoiceId: 'in_123',
          amount: 49900,
          status: 'paid',
        })
      );
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'stripeInvoiceId',
        })
      );
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should persist a failed invoice and mark subscription past_due', async () => {
      mockBillingService.constructWebhookEvent.mockReturnValue({
        id: 'evt_failed_1',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_failed_123',
            customer: 'cus_test_789',
            subscription: 'sub_stripe_123',
            amount_due: 49900,
            currency: 'usd',
            status: 'open',
            due_date: 1_767_312_000,
          },
        },
      });

      const res = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_sig',
        },
        body: JSON.stringify({ type: 'invoice.payment_failed' }),
      });

      expect(res.status).toBe(200);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeInvoiceId: 'in_failed_123',
          amount: 49900,
          status: 'open',
        })
      );
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'past_due',
        })
      );
    });

    it('should sync subscription update events to the local subscription row', async () => {
      mockBillingService.constructWebhookEvent.mockReturnValue({
        id: 'evt_sub_1',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_stripe_123',
            customer: 'cus_test_789',
            status: 'active',
            current_period_start: 1_767_225_600,
            current_period_end: 1_769_817_600,
            cancel_at_period_end: false,
            trial_end: null,
            metadata: { plan: 'school', interval: 'monthly' },
            items: { data: [{ quantity: 100 }] },
          },
        },
      });

      const res = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_sig',
        },
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      });

      expect(res.status).toBe(200);
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeSubscriptionId: 'sub_stripe_123',
          stripeCustomerId: 'cus_test_789',
          status: 'active',
          seats: 100,
        })
      );
    });

    it('should acknowledge unhandled webhook events without DB writes', async () => {
      mockBillingService.constructWebhookEvent.mockReturnValue({
        id: 'evt_unhandled',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      });

      const res = await app.request('/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_sig',
        },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
      expect(body.processed).toBe(false);
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
