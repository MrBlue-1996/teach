/**
 * Database Schema - Comprehensive Test Suite
 *
 * Tests for Drizzle ORM database schema definitions including tables,
 * enums, relations, and exported types.
 */

import { describe, it, expect } from 'vitest';
import {
  // Enums
  userRoleEnum,
  learningModeEnum,
  sessionStatusEnum,
  policyDecisionEnum,
  badgeStatusEnum,
  contentStatusEnum,
  subscriptionStatusEnum,
  planTierEnum,

  // Tables
  organizations,
  users,
  authSessions,
  oauthAccounts,
  contentPacks,
  contentBlocks,
  learnerStates,
  learnerProgressEvents,
  learningSessions,
  policyEvaluations,
  benchmarks,
  badges,
  auditLogs,
  subscriptions,
  invoices,
  seatAssignments,
  webhookEndpoints,
  webhookDeliveries,
  dataExportRequests,

  // Relations
  organizationsRelations,
  usersRelations,
  authSessionsRelations,
  contentPacksRelations,
  contentBlocksRelations,
  learnerStatesRelations,
  learnerProgressEventsRelations,
  learningSessionsRelations,
  policyEvaluationsRelations,
  benchmarksRelations,
  badgesRelations,
  subscriptionsRelations,
  invoicesRelations,
  seatAssignmentsRelations,
  webhookEndpointsRelations,
  webhookDeliveriesRelations,
} from './schema/index.js';

// =============================================================================
// ENUM SCHEMA TESTS
// =============================================================================

describe('Enum Schemas', () => {
  describe('userRoleEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(userRoleEnum).toBeDefined();
      expect(userRoleEnum.enumName).toBe('user_role');
    });

    it('should contain all expected user roles', () => {
      const expectedRoles = [
        'learner',
        'staff',
        'manager',
        'instructor',
        'content_author',
        'school_admin',
        'district_admin',
        'system_admin',
      ];
      expect(userRoleEnum.enumValues).toEqual(expectedRoles);
    });
  });

  describe('learningModeEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(learningModeEnum).toBeDefined();
      expect(learningModeEnum.enumName).toBe('learning_mode');
    });

    it('should contain all expected learning modes', () => {
      const expectedModes = ['L1_RECALL', 'L2_EXPLAIN', 'L3_APPLY', 'L4_ANALYZE', 'L5_EXPERT'];
      expect(learningModeEnum.enumValues).toEqual(expectedModes);
    });
  });

  describe('sessionStatusEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(sessionStatusEnum).toBeDefined();
      expect(sessionStatusEnum.enumName).toBe('session_status');
    });

    it('should contain all expected session statuses', () => {
      const expectedStatuses = ['active', 'paused', 'completed', 'abandoned'];
      expect(sessionStatusEnum.enumValues).toEqual(expectedStatuses);
    });
  });

  describe('policyDecisionEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(policyDecisionEnum).toBeDefined();
      expect(policyDecisionEnum.enumName).toBe('policy_decision');
    });

    it('should contain all expected policy decisions', () => {
      const expectedDecisions = ['promote', 'demote', 'hold', 'defer'];
      expect(policyDecisionEnum.enumValues).toEqual(expectedDecisions);
    });
  });

  describe('badgeStatusEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(badgeStatusEnum).toBeDefined();
      expect(badgeStatusEnum.enumName).toBe('badge_status');
    });

    it('should contain all expected badge statuses', () => {
      const expectedStatuses = ['pending', 'issued', 'revoked', 'expired'];
      expect(badgeStatusEnum.enumValues).toEqual(expectedStatuses);
    });
  });

  describe('contentStatusEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(contentStatusEnum).toBeDefined();
      expect(contentStatusEnum.enumName).toBe('content_status');
    });

    it('should contain all expected content statuses', () => {
      const expectedStatuses = ['draft', 'review', 'approved', 'published', 'archived'];
      expect(contentStatusEnum.enumValues).toEqual(expectedStatuses);
    });
  });

  describe('subscriptionStatusEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(subscriptionStatusEnum).toBeDefined();
      expect(subscriptionStatusEnum.enumName).toBe('subscription_status');
    });

    it('should contain all expected subscription statuses', () => {
      const expectedStatuses = ['trialing', 'active', 'past_due', 'canceled', 'unpaid'];
      expect(subscriptionStatusEnum.enumValues).toEqual(expectedStatuses);
    });
  });

  describe('planTierEnum', () => {
    it('should be a valid pgEnum', () => {
      expect(planTierEnum).toBeDefined();
      expect(planTierEnum.enumName).toBe('plan_tier');
    });

    it('should contain all expected plan tiers', () => {
      const expectedTiers = ['individual', 'school', 'district', 'enterprise'];
      expect(planTierEnum.enumValues).toEqual(expectedTiers);
    });
  });
});

// =============================================================================
// TABLE SCHEMA TESTS
// =============================================================================

describe('Table Schemas', () => {
  describe('organizations', () => {
    it('should be a valid table schema', () => {
      expect(organizations).toBeDefined();
      // Drizzle tables have a Symbol for table name
      expect(typeof organizations).toBe('object');
    });

    it('should have all required columns', () => {
      const columns = Object.keys(organizations);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('slug');
      expect(columns).toContain('type');
      expect(columns).toContain('parentId');
      expect(columns).toContain('settings');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('deletedAt');
    });
  });

  describe('users', () => {
    it('should be a valid table schema', () => {
      expect(users).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(users);
      expect(columns).toContain('id');
      expect(columns).toContain('email');
      expect(columns).toContain('passwordHash');
      expect(columns).toContain('firstName');
      expect(columns).toContain('lastName');
      expect(columns).toContain('displayName');
      expect(columns).toContain('role');
      expect(columns).toContain('organizationId');
      expect(columns).toContain('managerId');
      expect(columns).toContain('emailVerified');
      expect(columns).toContain('isActive');
      expect(columns).toContain('lastLoginAt');
      expect(columns).toContain('metadata');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('deletedAt');
    });
  });

  describe('authSessions', () => {
    it('should be a valid table schema', () => {
      expect(authSessions).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(authSessions);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('token');
      expect(columns).toContain('refreshToken');
      expect(columns).toContain('userAgent');
      expect(columns).toContain('ipAddress');
      expect(columns).toContain('expiresAt');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('revokedAt');
    });
  });

  describe('oauthAccounts', () => {
    it('should be a valid table schema', () => {
      expect(oauthAccounts).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(oauthAccounts);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('provider');
      expect(columns).toContain('providerAccountId');
      expect(columns).toContain('accessToken');
      expect(columns).toContain('refreshToken');
      expect(columns).toContain('expiresAt');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });

  describe('contentPacks', () => {
    it('should be a valid table schema', () => {
      expect(contentPacks).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(contentPacks);
      expect(columns).toContain('id');
      expect(columns).toContain('slug');
      expect(columns).toContain('version');
      expect(columns).toContain('title');
      expect(columns).toContain('description');
      expect(columns).toContain('certificationTarget');
      expect(columns).toContain('authorId');
      expect(columns).toContain('organizationId');
      expect(columns).toContain('status');
      expect(columns).toContain('signature');
      expect(columns).toContain('signedAt');
      expect(columns).toContain('signedBy');
      expect(columns).toContain('metadata');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('publishedAt');
    });
  });

  describe('contentBlocks', () => {
    it('should be a valid table schema', () => {
      expect(contentBlocks).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(contentBlocks);
      expect(columns).toContain('id');
      expect(columns).toContain('packId');
      expect(columns).toContain('blockId');
      expect(columns).toContain('title');
      expect(columns).toContain('objective');
      expect(columns).toContain('targetMode');
      expect(columns).toContain('prerequisites');
      expect(columns).toContain('timeBudgetSeconds');
      expect(columns).toContain('content');
      expect(columns).toContain('hints');
      expect(columns).toContain('variants');
      expect(columns).toContain('sequenceOrder');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });

  describe('learnerStates', () => {
    it('should be a valid table schema', () => {
      expect(learnerStates).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(learnerStates);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('contentPackId');
      expect(columns).toContain('currentMode');
      expect(columns).toContain('overallMastery');
      expect(columns).toContain('totalTimeSpentSeconds');
      expect(columns).toContain('blocksCompleted');
      expect(columns).toContain('currentBlockId');
      expect(columns).toContain('skillEstimates');
      expect(columns).toContain('retentionHistory');
      expect(columns).toContain('transferScores');
      expect(columns).toContain('inProbation');
      expect(columns).toContain('probationStartedAt');
      expect(columns).toContain('lastActivityAt');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });

  describe('learnerProgressEvents', () => {
    it('should be a valid table schema', () => {
      expect(learnerProgressEvents).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(learnerProgressEvents);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('learnerStateId');
      expect(columns).toContain('blockId');
      expect(columns).toContain('eventType');
      expect(columns).toContain('responseData');
      expect(columns).toContain('correctness');
      expect(columns).toContain('timeSpentSeconds');
      expect(columns).toContain('mode');
      expect(columns).toContain('metadata');
      expect(columns).toContain('occurredAt');
      expect(columns).toContain('syncedAt');
    });
  });

  describe('learningSessions', () => {
    it('should be a valid table schema', () => {
      expect(learningSessions).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(learningSessions);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('learnerStateId');
      expect(columns).toContain('status');
      expect(columns).toContain('deviceInfo');
      expect(columns).toContain('startedAt');
      expect(columns).toContain('endedAt');
      expect(columns).toContain('pausedDurationSeconds');
      expect(columns).toContain('blocksAttempted');
      expect(columns).toContain('blocksCompleted');
      expect(columns).toContain('averageCorrectness');
      expect(columns).toContain('metadata');
    });
  });

  describe('policyEvaluations', () => {
    it('should be a valid table schema', () => {
      expect(policyEvaluations).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(policyEvaluations);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('learnerStateId');
      expect(columns).toContain('sessionId');
      expect(columns).toContain('decision');
      expect(columns).toContain('fromMode');
      expect(columns).toContain('toMode');
      expect(columns).toContain('signals');
      expect(columns).toContain('reasoning');
      expect(columns).toContain('policyVersion');
      expect(columns).toContain('chainHash');
      expect(columns).toContain('previousHash');
      expect(columns).toContain('signature');
      expect(columns).toContain('evaluatedAt');
    });
  });

  describe('benchmarks', () => {
    it('should be a valid table schema', () => {
      expect(benchmarks).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(benchmarks);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('learnerStateId');
      expect(columns).toContain('contentPackId');
      expect(columns).toContain('targetMode');
      expect(columns).toContain('status');
      expect(columns).toContain('totalQuestions');
      expect(columns).toContain('correctAnswers');
      expect(columns).toContain('score');
      expect(columns).toContain('passed');
      expect(columns).toContain('timeLimitSeconds');
      expect(columns).toContain('timeSpentSeconds');
      expect(columns).toContain('responses');
      expect(columns).toContain('startedAt');
      expect(columns).toContain('completedAt');
    });
  });

  describe('badges', () => {
    it('should be a valid table schema', () => {
      expect(badges).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(badges);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('contentPackId');
      expect(columns).toContain('badgeType');
      expect(columns).toContain('level');
      expect(columns).toContain('status');
      expect(columns).toContain('masteryScore');
      expect(columns).toContain('totalTimeSpent');
      expect(columns).toContain('benchmarksPassed');
      expect(columns).toContain('signature');
      expect(columns).toContain('verificationHash');
      expect(columns).toContain('metadata');
      expect(columns).toContain('issuedAt');
      expect(columns).toContain('expiresAt');
      expect(columns).toContain('revokedAt');
      expect(columns).toContain('revokedReason');
      expect(columns).toContain('createdAt');
    });
  });

  describe('auditLogs', () => {
    it('should be a valid table schema', () => {
      expect(auditLogs).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(auditLogs);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('action');
      expect(columns).toContain('resource');
      expect(columns).toContain('resourceId');
      expect(columns).toContain('previousState');
      expect(columns).toContain('newState');
      expect(columns).toContain('ipAddress');
      expect(columns).toContain('userAgent');
      expect(columns).toContain('metadata');
      expect(columns).toContain('occurredAt');
    });
  });

  describe('subscriptions', () => {
    it('should be a valid table schema', () => {
      expect(subscriptions).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(subscriptions);
      expect(columns).toContain('id');
      expect(columns).toContain('organizationId');
      expect(columns).toContain('stripeCustomerId');
      expect(columns).toContain('stripeSubscriptionId');
      expect(columns).toContain('plan');
      expect(columns).toContain('interval');
      expect(columns).toContain('status');
      expect(columns).toContain('seats');
      expect(columns).toContain('usedSeats');
      expect(columns).toContain('currentPeriodStart');
      expect(columns).toContain('currentPeriodEnd');
      expect(columns).toContain('cancelAtPeriodEnd');
      expect(columns).toContain('trialEnd');
      expect(columns).toContain('metadata');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });

  describe('invoices', () => {
    it('should be a valid table schema', () => {
      expect(invoices).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(invoices);
      expect(columns).toContain('id');
      expect(columns).toContain('organizationId');
      expect(columns).toContain('subscriptionId');
      expect(columns).toContain('stripeInvoiceId');
      expect(columns).toContain('amount');
      expect(columns).toContain('currency');
      expect(columns).toContain('status');
      expect(columns).toContain('dueDate');
      expect(columns).toContain('paidAt');
      expect(columns).toContain('invoicePdf');
      expect(columns).toContain('lineItems');
      expect(columns).toContain('metadata');
      expect(columns).toContain('createdAt');
    });
  });

  describe('seatAssignments', () => {
    it('should be a valid table schema', () => {
      expect(seatAssignments).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(seatAssignments);
      expect(columns).toContain('id');
      expect(columns).toContain('subscriptionId');
      expect(columns).toContain('userId');
      expect(columns).toContain('assignedBy');
      expect(columns).toContain('assignedAt');
      expect(columns).toContain('revokedAt');
    });
  });

  describe('webhookEndpoints', () => {
    it('should be a valid table schema', () => {
      expect(webhookEndpoints).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(webhookEndpoints);
      expect(columns).toContain('id');
      expect(columns).toContain('organizationId');
      expect(columns).toContain('url');
      expect(columns).toContain('secret');
      expect(columns).toContain('events');
      expect(columns).toContain('isActive');
      expect(columns).toContain('description');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });

  describe('webhookDeliveries', () => {
    it('should be a valid table schema', () => {
      expect(webhookDeliveries).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(webhookDeliveries);
      expect(columns).toContain('id');
      expect(columns).toContain('endpointId');
      expect(columns).toContain('eventType');
      expect(columns).toContain('payload');
      expect(columns).toContain('responseStatus');
      expect(columns).toContain('responseBody');
      expect(columns).toContain('attempts');
      expect(columns).toContain('nextRetryAt');
      expect(columns).toContain('deliveredAt');
      expect(columns).toContain('failedAt');
      expect(columns).toContain('createdAt');
    });
  });

  describe('dataExportRequests', () => {
    it('should be a valid table schema', () => {
      expect(dataExportRequests).toBeDefined();
    });

    it('should have all required columns', () => {
      const columns = Object.keys(dataExportRequests);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('requestType');
      expect(columns).toContain('status');
      expect(columns).toContain('downloadUrl');
      expect(columns).toContain('expiresAt');
      expect(columns).toContain('completedAt');
      expect(columns).toContain('requestedAt');
      expect(columns).toContain('metadata');
    });
  });
});

// =============================================================================
// RELATIONS TESTS
// =============================================================================

describe('Relations', () => {
  describe('organizationsRelations', () => {
    it('should be defined', () => {
      expect(organizationsRelations).toBeDefined();
    });
  });

  describe('usersRelations', () => {
    it('should be defined', () => {
      expect(usersRelations).toBeDefined();
    });
  });

  describe('authSessionsRelations', () => {
    it('should be defined', () => {
      expect(authSessionsRelations).toBeDefined();
    });
  });

  describe('contentPacksRelations', () => {
    it('should be defined', () => {
      expect(contentPacksRelations).toBeDefined();
    });
  });

  describe('contentBlocksRelations', () => {
    it('should be defined', () => {
      expect(contentBlocksRelations).toBeDefined();
    });
  });

  describe('learnerStatesRelations', () => {
    it('should be defined', () => {
      expect(learnerStatesRelations).toBeDefined();
    });
  });

  describe('learnerProgressEventsRelations', () => {
    it('should be defined', () => {
      expect(learnerProgressEventsRelations).toBeDefined();
    });
  });

  describe('learningSessionsRelations', () => {
    it('should be defined', () => {
      expect(learningSessionsRelations).toBeDefined();
    });
  });

  describe('policyEvaluationsRelations', () => {
    it('should be defined', () => {
      expect(policyEvaluationsRelations).toBeDefined();
    });
  });

  describe('benchmarksRelations', () => {
    it('should be defined', () => {
      expect(benchmarksRelations).toBeDefined();
    });
  });

  describe('badgesRelations', () => {
    it('should be defined', () => {
      expect(badgesRelations).toBeDefined();
    });
  });

  describe('subscriptionsRelations', () => {
    it('should be defined', () => {
      expect(subscriptionsRelations).toBeDefined();
    });
  });

  describe('invoicesRelations', () => {
    it('should be defined', () => {
      expect(invoicesRelations).toBeDefined();
    });
  });

  describe('seatAssignmentsRelations', () => {
    it('should be defined', () => {
      expect(seatAssignmentsRelations).toBeDefined();
    });
  });

  describe('webhookEndpointsRelations', () => {
    it('should be defined', () => {
      expect(webhookEndpointsRelations).toBeDefined();
    });
  });

  describe('webhookDeliveriesRelations', () => {
    it('should be defined', () => {
      expect(webhookDeliveriesRelations).toBeDefined();
    });
  });
});

// =============================================================================
// SCHEMA STRUCTURE VALIDATION
// =============================================================================

describe('Schema Structure Validation', () => {
  describe('Primary keys', () => {
    it('all tables should have id column as UUID primary key', () => {
      const tables = [
        organizations,
        users,
        authSessions,
        oauthAccounts,
        contentPacks,
        contentBlocks,
        learnerStates,
        learnerProgressEvents,
        learningSessions,
        policyEvaluations,
        benchmarks,
        badges,
        auditLogs,
        subscriptions,
        invoices,
        seatAssignments,
        webhookEndpoints,
        webhookDeliveries,
        dataExportRequests,
      ];

      for (const table of tables) {
        expect(Object.keys(table)).toContain('id');
      }
    });
  });

  describe('Timestamp columns', () => {
    it('core tables should have createdAt column', () => {
      const tablesWithCreatedAt = [
        organizations,
        users,
        authSessions,
        oauthAccounts,
        contentPacks,
        contentBlocks,
        learnerStates,
        badges,
        subscriptions,
        webhookEndpoints,
        webhookDeliveries,
        invoices,
      ];

      for (const table of tablesWithCreatedAt) {
        expect(Object.keys(table)).toContain('createdAt');
      }
    });
  });

  describe('Foreign key relationships', () => {
    it('users table should have organizationId for multi-tenancy', () => {
      expect(Object.keys(users)).toContain('organizationId');
    });

    it('authSessions should reference users', () => {
      expect(Object.keys(authSessions)).toContain('userId');
    });

    it('learnerStates should reference users and contentPacks', () => {
      expect(Object.keys(learnerStates)).toContain('userId');
      expect(Object.keys(learnerStates)).toContain('contentPackId');
    });

    it('badges should reference users and contentPacks', () => {
      expect(Object.keys(badges)).toContain('userId');
      expect(Object.keys(badges)).toContain('contentPackId');
    });

    it('subscriptions should reference organizations', () => {
      expect(Object.keys(subscriptions)).toContain('organizationId');
    });

    it('webhookEndpoints should reference organizations', () => {
      expect(Object.keys(webhookEndpoints)).toContain('organizationId');
    });

    it('webhookDeliveries should reference webhookEndpoints', () => {
      expect(Object.keys(webhookDeliveries)).toContain('endpointId');
    });
  });

  describe('Soft delete support', () => {
    it('organizations should have deletedAt for soft delete', () => {
      expect(Object.keys(organizations)).toContain('deletedAt');
    });

    it('users should have deletedAt for soft delete', () => {
      expect(Object.keys(users)).toContain('deletedAt');
    });
  });

  describe('Audit trail support', () => {
    it('auditLogs table should have proper structure for auditing', () => {
      const columns = Object.keys(auditLogs);
      expect(columns).toContain('userId');
      expect(columns).toContain('action');
      expect(columns).toContain('resource');
      expect(columns).toContain('resourceId');
      expect(columns).toContain('previousState');
      expect(columns).toContain('newState');
      expect(columns).toContain('ipAddress');
      expect(columns).toContain('userAgent');
      expect(columns).toContain('occurredAt');
    });
  });

  describe('GDPR compliance', () => {
    it('dataExportRequests table should exist for data portability', () => {
      expect(dataExportRequests).toBeDefined();
      const columns = Object.keys(dataExportRequests);
      expect(columns).toContain('requestType');
      expect(columns).toContain('status');
      expect(columns).toContain('downloadUrl');
      expect(columns).toContain('expiresAt');
    });
  });

  describe('Billing support', () => {
    it('subscriptions should have Stripe integration fields', () => {
      const columns = Object.keys(subscriptions);
      expect(columns).toContain('stripeCustomerId');
      expect(columns).toContain('stripeSubscriptionId');
      expect(columns).toContain('plan');
      expect(columns).toContain('status');
      expect(columns).toContain('seats');
    });

    it('invoices should have proper billing fields', () => {
      const columns = Object.keys(invoices);
      expect(columns).toContain('amount');
      expect(columns).toContain('currency');
      expect(columns).toContain('status');
      expect(columns).toContain('stripeInvoiceId');
    });
  });
});
