/**
 * TopShelf Service LLC - Database Schema
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// ENUMS
// =============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'learner',
  'instructor',
  'content_author',
  'school_admin',
  'district_admin',
  'system_admin',
]);

export const learningModeEnum = pgEnum('learning_mode', [
  'L1_RECALL',
  'L2_EXPLAIN',
  'L3_APPLY',
  'L4_ANALYZE',
  'L5_EXPERT',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'paused',
  'completed',
  'abandoned',
]);

export const policyDecisionEnum = pgEnum('policy_decision', ['promote', 'demote', 'hold', 'defer']);

export const badgeStatusEnum = pgEnum('badge_status', ['pending', 'issued', 'revoked', 'expired']);

export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
]);

// =============================================================================
// ORGANIZATIONS (Multi-tenancy support)
// =============================================================================

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(), // district, school, enterprise
    parentId: uuid('parent_id').references((): AnyPgColumn => organizations.id),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    slugIdx: uniqueIndex('org_slug_idx').on(table.slug),
    parentIdx: index('org_parent_idx').on(table.parentId),
  })
);

// =============================================================================
// USERS
// =============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    displayName: varchar('display_name', { length: 200 }),
    role: userRoleEnum('role').notNull().default('learner'),
    organizationId: uuid('organization_id').references(() => organizations.id),
    emailVerified: boolean('email_verified').default(false),
    isActive: boolean('is_active').default(true),
    lastLoginAt: timestamp('last_login_at'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: uniqueIndex('user_email_idx').on(table.email),
    orgIdx: index('user_org_idx').on(table.organizationId),
    roleIdx: index('user_role_idx').on(table.role),
  })
);

// =============================================================================
// AUTH SESSIONS & TOKENS
// =============================================================================

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull().unique(),
    refreshToken: varchar('refresh_token', { length: 500 }).unique(),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    userIdx: index('auth_session_user_idx').on(table.userId),
    tokenIdx: uniqueIndex('auth_session_token_idx').on(table.token),
    expiresIdx: index('auth_session_expires_idx').on(table.expiresAt),
  })
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(), // google, microsoft
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('oauth_user_idx').on(table.userId),
    providerIdx: uniqueIndex('oauth_provider_idx').on(table.provider, table.providerAccountId),
  })
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('prt_user_idx').on(table.userId),
    tokenHashIdx: uniqueIndex('prt_token_hash_idx').on(table.tokenHash),
    expiresIdx: index('prt_expires_idx').on(table.expiresAt),
  })
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('evt_user_idx').on(table.userId),
    tokenHashIdx: uniqueIndex('evt_token_hash_idx').on(table.tokenHash),
    expiresIdx: index('evt_expires_idx').on(table.expiresAt),
  })
);

// =============================================================================
// CONTENT PACKS & BLOCKS
// =============================================================================

export const contentPacks = pgTable(
  'content_packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    version: varchar('version', { length: 20 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    certificationTarget: varchar('certification_target', { length: 100 }),
    authorId: uuid('author_id').references(() => users.id),
    organizationId: uuid('organization_id').references(() => organizations.id),
    status: contentStatusEnum('status').notNull().default('draft'),
    signature: text('signature'),
    signedAt: timestamp('signed_at'),
    signedBy: uuid('signed_by').references(() => users.id),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    publishedAt: timestamp('published_at'),
  },
  (table) => ({
    slugVersionIdx: uniqueIndex('content_pack_slug_version_idx').on(table.slug, table.version),
    statusIdx: index('content_pack_status_idx').on(table.status),
    certIdx: index('content_pack_cert_idx').on(table.certificationTarget),
  })
);

export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => contentPacks.id, { onDelete: 'cascade' }),
    blockId: varchar('block_id', { length: 100 }).notNull(), // Human-readable ID
    title: varchar('title', { length: 255 }).notNull(),
    objective: text('objective'),
    targetMode: learningModeEnum('target_mode').notNull(),
    prerequisites: jsonb('prerequisites').default([]),
    timeBudgetSeconds: integer('time_budget_seconds'),
    content: jsonb('content').notNull(), // The actual teaching content
    hints: jsonb('hints').default([]),
    variants: jsonb('variants').default([]),
    sequenceOrder: integer('sequence_order').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    packIdx: index('content_block_pack_idx').on(table.packId),
    blockIdIdx: uniqueIndex('content_block_id_idx').on(table.packId, table.blockId),
    modeIdx: index('content_block_mode_idx').on(table.targetMode),
    sequenceIdx: index('content_block_sequence_idx').on(table.packId, table.sequenceOrder),
  })
);

// =============================================================================
// LEARNER STATE & PROGRESS
// =============================================================================

export const learnerStates = pgTable(
  'learner_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentPackId: uuid('content_pack_id')
      .notNull()
      .references(() => contentPacks.id),
    currentMode: learningModeEnum('current_mode').notNull().default('L1_RECALL'),
    overallMastery: real('overall_mastery').notNull().default(0),
    totalTimeSpentSeconds: integer('total_time_spent_seconds').notNull().default(0),
    blocksCompleted: integer('blocks_completed').notNull().default(0),
    currentBlockId: varchar('current_block_id', { length: 100 }),
    skillEstimates: jsonb('skill_estimates').default({}),
    retentionHistory: jsonb('retention_history').default([]),
    transferScores: jsonb('transfer_scores').default({}),
    inProbation: boolean('in_probation').default(false),
    probationStartedAt: timestamp('probation_started_at'),
    lastActivityAt: timestamp('last_activity_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userPackIdx: uniqueIndex('learner_state_user_pack_idx').on(table.userId, table.contentPackId),
    modeIdx: index('learner_state_mode_idx').on(table.currentMode),
    activityIdx: index('learner_state_activity_idx').on(table.lastActivityAt),
  })
);

export const learnerProgressEvents = pgTable(
  'learner_progress_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    learnerStateId: uuid('learner_state_id')
      .notNull()
      .references(() => learnerStates.id),
    blockId: varchar('block_id', { length: 100 }).notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(), // started, completed, hint_used, etc.
    responseData: jsonb('response_data'),
    correctness: real('correctness'),
    timeSpentSeconds: integer('time_spent_seconds'),
    mode: learningModeEnum('mode'),
    metadata: jsonb('metadata').default({}),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
    syncedAt: timestamp('synced_at'), // For offline sync
  },
  (table) => ({
    userIdx: index('progress_event_user_idx').on(table.userId),
    stateIdx: index('progress_event_state_idx').on(table.learnerStateId),
    typeIdx: index('progress_event_type_idx').on(table.eventType),
    occurredIdx: index('progress_event_occurred_idx').on(table.occurredAt),
  })
);

// =============================================================================
// LEARNING SESSIONS
// =============================================================================

export const learningSessions = pgTable(
  'learning_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    learnerStateId: uuid('learner_state_id')
      .notNull()
      .references(() => learnerStates.id),
    status: sessionStatusEnum('status').notNull().default('active'),
    deviceInfo: jsonb('device_info'),
    teachingMode: integer('teaching_mode').default(2), // TeachingMode enum (0-4), default L2_CONTEXTUAL
    deviceProfile: varchar('device_profile', { length: 30 }).default('chromebook_standard'),
    errorsEncountered: integer('errors_encountered').default(0),
    problemsSolved: integer('problems_solved').default(0),
    triggersFired: jsonb('triggers_fired').default([]),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
    pausedDurationSeconds: integer('paused_duration_seconds').default(0),
    blocksAttempted: integer('blocks_attempted').default(0),
    blocksCompleted: integer('blocks_completed').default(0),
    averageCorrectness: real('average_correctness'),
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    userIdx: index('session_user_idx').on(table.userId),
    stateIdx: index('session_state_idx').on(table.learnerStateId),
    statusIdx: index('session_status_idx').on(table.status),
    startedIdx: index('session_started_idx').on(table.startedAt),
  })
);

// =============================================================================
// POLICY DECISIONS & AUDIT
// =============================================================================

export const policyEvaluations = pgTable(
  'policy_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    learnerStateId: uuid('learner_state_id')
      .notNull()
      .references(() => learnerStates.id),
    sessionId: uuid('session_id').references(() => learningSessions.id),
    decision: policyDecisionEnum('decision').notNull(),
    fromMode: learningModeEnum('from_mode').notNull(),
    toMode: learningModeEnum('to_mode'),
    signals: jsonb('signals').notNull(),
    reasoning: text('reasoning'),
    policyVersion: varchar('policy_version', { length: 50 }),
    chainHash: varchar('chain_hash', { length: 128 }),
    previousHash: varchar('previous_hash', { length: 128 }),
    signature: text('signature'),
    evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('policy_eval_user_idx').on(table.userId),
    stateIdx: index('policy_eval_state_idx').on(table.learnerStateId),
    decisionIdx: index('policy_eval_decision_idx').on(table.decision),
    evaluatedIdx: index('policy_eval_evaluated_idx').on(table.evaluatedAt),
  })
);

// =============================================================================
// BENCHMARKS
// =============================================================================

export const benchmarks = pgTable(
  'benchmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    learnerStateId: uuid('learner_state_id')
      .notNull()
      .references(() => learnerStates.id),
    contentPackId: uuid('content_pack_id')
      .notNull()
      .references(() => contentPacks.id),
    targetMode: learningModeEnum('target_mode').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('in_progress'),
    totalQuestions: integer('total_questions').notNull(),
    correctAnswers: integer('correct_answers').default(0),
    score: real('score'),
    passed: boolean('passed'),
    timeLimitSeconds: integer('time_limit_seconds'),
    timeSpentSeconds: integer('time_spent_seconds'),
    responses: jsonb('responses').default([]),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    userIdx: index('benchmark_user_idx').on(table.userId),
    stateIdx: index('benchmark_state_idx').on(table.learnerStateId),
    statusIdx: index('benchmark_status_idx').on(table.status),
  })
);

// =============================================================================
// BADGES & CREDENTIALS
// =============================================================================

export const badges = pgTable(
  'badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    contentPackId: uuid('content_pack_id')
      .notNull()
      .references(() => contentPacks.id),
    badgeType: varchar('badge_type', { length: 50 }).notNull(), // completion, mastery, expert
    level: learningModeEnum('level').notNull(),
    status: badgeStatusEnum('status').notNull().default('pending'),
    masteryScore: real('mastery_score').notNull(),
    totalTimeSpent: integer('total_time_spent').notNull(),
    benchmarksPassed: integer('benchmarks_passed').notNull(),
    signature: text('signature'),
    verificationHash: varchar('verification_hash', { length: 128 }),
    metadata: jsonb('metadata').default({}),
    issuedAt: timestamp('issued_at'),
    expiresAt: timestamp('expires_at'),
    revokedAt: timestamp('revoked_at'),
    revokedReason: text('revoked_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('badge_user_idx').on(table.userId),
    packIdx: index('badge_pack_idx').on(table.contentPackId),
    statusIdx: index('badge_status_idx').on(table.status),
    hashIdx: uniqueIndex('badge_hash_idx').on(table.verificationHash),
  })
);

// =============================================================================
// SYSTEM AUDIT LOG
// =============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }).notNull(),
    resourceId: uuid('resource_id'),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').default({}),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('audit_user_idx').on(table.userId),
    actionIdx: index('audit_action_idx').on(table.action),
    resourceIdx: index('audit_resource_idx').on(table.resource, table.resourceId),
    occurredIdx: index('audit_occurred_idx').on(table.occurredAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  parent: one(organizations, {
    fields: [organizations.parentId],
    references: [organizations.id],
    relationName: 'orgHierarchy',
  }),
  children: many(organizations, { relationName: 'orgHierarchy' }),
  users: many(users),
  contentPacks: many(contentPacks),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(authSessions),
  oauthAccounts: many(oauthAccounts),
  learnerStates: many(learnerStates),
  learningSessions: many(learningSessions),
  badges: many(badges),
  authoredPacks: many(contentPacks),
  emailVerificationTokens: many(emailVerificationTokens),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const contentPacksRelations = relations(contentPacks, ({ one, many }) => ({
  author: one(users, {
    fields: [contentPacks.authorId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [contentPacks.organizationId],
    references: [organizations.id],
  }),
  blocks: many(contentBlocks),
  learnerStates: many(learnerStates),
}));

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  pack: one(contentPacks, {
    fields: [contentBlocks.packId],
    references: [contentPacks.id],
  }),
}));

export const learnerStatesRelations = relations(learnerStates, ({ one, many }) => ({
  user: one(users, {
    fields: [learnerStates.userId],
    references: [users.id],
  }),
  contentPack: one(contentPacks, {
    fields: [learnerStates.contentPackId],
    references: [contentPacks.id],
  }),
  progressEvents: many(learnerProgressEvents),
  sessions: many(learningSessions),
  policyEvaluations: many(policyEvaluations),
  benchmarks: many(benchmarks),
}));

export const learnerProgressEventsRelations = relations(learnerProgressEvents, ({ one }) => ({
  user: one(users, {
    fields: [learnerProgressEvents.userId],
    references: [users.id],
  }),
  learnerState: one(learnerStates, {
    fields: [learnerProgressEvents.learnerStateId],
    references: [learnerStates.id],
  }),
}));

export const learningSessionsRelations = relations(learningSessions, ({ one }) => ({
  user: one(users, {
    fields: [learningSessions.userId],
    references: [users.id],
  }),
  learnerState: one(learnerStates, {
    fields: [learningSessions.learnerStateId],
    references: [learnerStates.id],
  }),
}));

export const policyEvaluationsRelations = relations(policyEvaluations, ({ one }) => ({
  user: one(users, {
    fields: [policyEvaluations.userId],
    references: [users.id],
  }),
  learnerState: one(learnerStates, {
    fields: [policyEvaluations.learnerStateId],
    references: [learnerStates.id],
  }),
  session: one(learningSessions, {
    fields: [policyEvaluations.sessionId],
    references: [learningSessions.id],
  }),
}));

export const benchmarksRelations = relations(benchmarks, ({ one }) => ({
  user: one(users, {
    fields: [benchmarks.userId],
    references: [users.id],
  }),
  learnerState: one(learnerStates, {
    fields: [benchmarks.learnerStateId],
    references: [learnerStates.id],
  }),
  contentPack: one(contentPacks, {
    fields: [benchmarks.contentPackId],
    references: [contentPacks.id],
  }),
}));

export const badgesRelations = relations(badges, ({ one }) => ({
  user: one(users, {
    fields: [badges.userId],
    references: [users.id],
  }),
  contentPack: one(contentPacks, {
    fields: [badges.contentPackId],
    references: [contentPacks.id],
  }),
}));

// =============================================================================
// BILLING & SUBSCRIPTIONS
// =============================================================================

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
]);

export const planTierEnum = pgEnum('plan_tier', ['individual', 'school', 'district', 'enterprise']);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
    plan: planTierEnum('plan').notNull(),
    interval: varchar('interval', { length: 20 }).notNull(), // monthly, annual
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    seats: integer('seats').notNull().default(1),
    usedSeats: integer('used_seats').notNull().default(0),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    trialEnd: timestamp('trial_end'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index('subscription_org_idx').on(table.organizationId),
    stripeCustomerIdx: uniqueIndex('subscription_stripe_customer_idx').on(table.stripeCustomerId),
    statusIdx: index('subscription_status_idx').on(table.status),
  })
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).unique(),
    amount: integer('amount').notNull(), // in cents
    currency: varchar('currency', { length: 3 }).notNull().default('usd'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    dueDate: timestamp('due_date'),
    paidAt: timestamp('paid_at'),
    invoicePdf: text('invoice_pdf'),
    lineItems: jsonb('line_items').default([]),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index('invoice_org_idx').on(table.organizationId),
    stripeIdx: uniqueIndex('invoice_stripe_idx').on(table.stripeInvoiceId),
    statusIdx: index('invoice_status_idx').on(table.status),
  })
);

export const seatAssignments = pgTable(
  'seat_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    assignedBy: uuid('assigned_by').references(() => users.id),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    subscriptionIdx: index('seat_subscription_idx').on(table.subscriptionId),
    userIdx: uniqueIndex('seat_user_idx').on(table.subscriptionId, table.userId),
  })
);

// =============================================================================
// WEBHOOKS & INTEGRATIONS
// =============================================================================

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    url: text('url').notNull(),
    secret: varchar('secret', { length: 255 }).notNull(),
    events: jsonb('events').notNull().default([]), // Array of event types
    isActive: boolean('is_active').default(true),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index('webhook_org_idx').on(table.organizationId),
  })
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => webhookEndpoints.id),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    attempts: integer('attempts').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at'),
    deliveredAt: timestamp('delivered_at'),
    failedAt: timestamp('failed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    endpointIdx: index('webhook_delivery_endpoint_idx').on(table.endpointId),
    eventIdx: index('webhook_delivery_event_idx').on(table.eventType),
    retryIdx: index('webhook_delivery_retry_idx').on(table.nextRetryAt),
  })
);

// =============================================================================
// DATA EXPORT (GDPR Compliance)
// =============================================================================

export const dataExportRequests = pgTable(
  'data_export_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    requestType: varchar('request_type', { length: 50 }).notNull(), // export, delete
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    downloadUrl: text('download_url'),
    expiresAt: timestamp('expires_at'),
    completedAt: timestamp('completed_at'),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    userIdx: index('export_user_idx').on(table.userId),
    statusIdx: index('export_status_idx').on(table.status),
  })
);

// =============================================================================
// BILLING RELATIONS
// =============================================================================

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  invoices: many(invoices),
  seatAssignments: many(seatAssignments),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const seatAssignmentsRelations = relations(seatAssignments, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [seatAssignments.subscriptionId],
    references: [subscriptions.id],
  }),
  user: one(users, {
    fields: [seatAssignments.userId],
    references: [users.id],
  }),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhookEndpoints.organizationId],
    references: [organizations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, {
    fields: [webhookDeliveries.endpointId],
    references: [webhookEndpoints.id],
  }),
}));
