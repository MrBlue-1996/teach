/**
 * TopShelf Service LLC - Manager Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { hashPassword, validatePasswordStrength } from '@topshelf/auth';
import { getDatabase, users, eq, and, inArray, isNull, type Database } from '@topshelf/database';
import { requireRole } from '../middleware/auth.js';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serverError,
} from '../middleware/error-handler.js';
import { insertAuditLog } from '../lib/audit.js';

const MANAGER_VISIBLE_ROLES = ['staff', 'manager'] as const;
const MODE_RANK = {
  L1_RECALL: 1,
  L2_EXPLAIN: 2,
  L3_APPLY: 3,
  L4_ANALYZE: 4,
  L5_EXPERT: 5,
} as const;

type SupportedTeamRole = (typeof MANAGER_VISIBLE_ROLES)[number];

const CreateTeamMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(200).optional(),
  role: z.enum(MANAGER_VISIBLE_ROLES).default('staff'),
  organizationId: z.string().uuid().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

const UpdateTeamMemberSchema = z.object({
  firstName: z.string().min(1).max(100).nullable().optional(),
  lastName: z.string().min(1).max(100).nullable().optional(),
  displayName: z.string().min(1).max(200).nullable().optional(),
  role: z.enum(MANAGER_VISIBLE_ROLES).optional(),
  isActive: z.boolean().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

interface ActorScope {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
}

function deriveDisplayName(input: {
  email: string;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  displayName?: string | null | undefined;
}): string {
  const trimmedDisplayName = input.displayName?.trim();
  if (trimmedDisplayName !== undefined && trimmedDisplayName.length > 0) {
    return trimmedDisplayName;
  }

  const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
  if (fullName.length > 0) {
    return fullName;
  }

  return input.email.split('@')[0] ?? input.email;
}

async function getActorScope(db: Database, userId: string): Promise<ActorScope> {
  const actor = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
    columns: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
    },
  });

  if (!actor) {
    throw notFound('User', userId);
  }

  return actor;
}

function buildTeamScope(actor: ActorScope): ReturnType<typeof and> {
  const base = and(inArray(users.role, [...MANAGER_VISIBLE_ROLES]), isNull(users.deletedAt));

  switch (actor.role) {
    case 'manager':
      return and(base, eq(users.managerId, actor.id));
    case 'school_admin':
    case 'district_admin':
      if (actor.organizationId === null) {
        throw forbidden('Admin account must belong to an organization to manage a team');
      }
      return and(base, eq(users.organizationId, actor.organizationId));
    case 'system_admin':
      return base;
    default:
      throw forbidden('You do not have access to team management');
  }
}

function highestMode(modes: Array<string | null>): string | null {
  let selected: string | null = null;
  let highestRank = 0;

  for (const mode of modes) {
    if (mode === null) {
      continue;
    }

    const rank = mode in MODE_RANK ? MODE_RANK[mode as keyof typeof MODE_RANK] : 0;
    if (rank > highestRank) {
      highestRank = rank;
      selected = mode;
    }
  }

  return selected;
}

async function assertManagerAssignmentAllowed(
  db: Database,
  actor: ActorScope,
  managerId: string | null | undefined
): Promise<string | null> {
  if (actor.role === 'manager') {
    return actor.id;
  }

  if (managerId === null || managerId === undefined || managerId === '') {
    return null;
  }

  if (actor.role !== 'system_admin' && actor.organizationId === null) {
    throw forbidden('Your account must belong to an organization to assign managers');
  }

  const organizationId = actor.organizationId;

  const manager = await db.query.users.findFirst({
    where: and(
      eq(users.id, managerId),
      eq(users.role, 'manager'),
      isNull(users.deletedAt),
      ...(actor.role === 'system_admin' ? [] : [eq(users.organizationId, organizationId as string)])
    ),
    columns: { id: true },
  });

  if (!manager) {
    throw badRequest('Assigned manager is not available in your scope');
  }

  return manager.id;
}

function assertCreateRoleAllowed(actor: ActorScope, role: SupportedTeamRole): void {
  if (actor.role === 'manager' && role !== 'staff') {
    throw forbidden('Managers can only create staff accounts');
  }
}

function assertUpdateRoleAllowed(actor: ActorScope, role: SupportedTeamRole | undefined): void {
  if (role === undefined) {
    return;
  }

  if (actor.role === 'manager' && role !== 'staff') {
    throw forbidden('Managers can only manage staff roles');
  }
}

export function createManagerRoutes(): Hono {
  const router = new Hono();

  router.use('*', requireRole('manager', 'school_admin', 'district_admin', 'system_admin'));

  router.get('/team-members', async (c) => {
    const db = getDatabase();
    const actor = await getActorScope(db, c.get('userId'));
    const members = await db.query.users.findMany({
      where: buildTeamScope(actor),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        organizationId: true,
        managerId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      with: {
        manager: {
          columns: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        learnerStates: {
          columns: {
            currentMode: true,
            overallMastery: true,
            totalTimeSpentSeconds: true,
            blocksCompleted: true,
            lastActivityAt: true,
          },
        },
        badges: {
          columns: {
            status: true,
          },
        },
      },
      orderBy: (fields, { asc }) => [asc(fields.role), asc(fields.displayName), asc(fields.email)],
    });

    const teamMembers = members.map((member) => {
      const totalTimeSpentSeconds = member.learnerStates.reduce(
        (sum, state) => sum + state.totalTimeSpentSeconds,
        0
      );
      const blocksCompleted = member.learnerStates.reduce(
        (sum, state) => sum + state.blocksCompleted,
        0
      );
      const masterySamples = member.learnerStates.map((state) => state.overallMastery);
      const overallMastery =
        masterySamples.length > 0
          ? masterySamples.reduce((sum, mastery) => sum + mastery, 0) / masterySamples.length
          : 0;
      const currentMode = highestMode(member.learnerStates.map((state) => state.currentMode));
      const badgeCount = member.badges.filter((badge) => badge.status === 'issued').length;
      const lastActivityAt = member.learnerStates.reduce<string | null>((latest, state) => {
        const current = state.lastActivityAt?.toISOString() ?? null;
        if (current === null) {
          return latest;
        }
        if (latest === null) {
          return current;
        }
        return current > latest ? current : latest;
      }, null);

      return {
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        displayName: member.displayName ?? deriveDisplayName(member),
        role: member.role,
        organizationId: member.organizationId,
        managerId: member.managerId,
        isActive: member.isActive,
        lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
        createdAt: member.createdAt.toISOString(),
        badgeCount,
        blocksCompleted,
        totalTimeSpentSeconds,
        overallMastery,
        currentMode,
        activePackCount: member.learnerStates.length,
        lastActivityAt,
        manager:
          member.manager === null
            ? null
            : {
                id: member.manager.id,
                email: member.manager.email,
                displayName: member.manager.displayName ?? deriveDisplayName(member.manager),
              },
      };
    });

    return c.json({ teamMembers });
  });

  router.post('/team-members', zValidator('json', CreateTeamMemberSchema), async (c) => {
    const db = getDatabase();
    const actor = await getActorScope(db, c.get('userId'));
    const payload = c.req.valid('json');

    assertCreateRoleAllowed(actor, payload.role);

    const passwordCheck = validatePasswordStrength(payload.password);
    if (!passwordCheck.valid) {
      throw badRequest('Password does not meet requirements', { errors: passwordCheck.errors });
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, payload.email.toLowerCase()),
      columns: { id: true },
    });

    if (existingUser) {
      throw conflict('An account with this email already exists');
    }

    const organizationId =
      actor.role === 'system_admin' ? (payload.organizationId ?? null) : actor.organizationId;

    if (actor.role !== 'system_admin' && organizationId === null) {
      throw forbidden('Your account must belong to an organization to create team members');
    }

    const managerId = await assertManagerAssignmentAllowed(db, actor, payload.managerId);
    const passwordHash = await hashPassword(payload.password);
    const displayName = deriveDisplayName(payload);

    const [createdUser] = await db
      .insert(users)
      .values({
        email: payload.email.toLowerCase(),
        passwordHash,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        displayName,
        role: payload.role,
        organizationId,
        managerId,
        emailVerified: true,
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        managerId: users.managerId,
        organizationId: users.organizationId,
      });

    if (!createdUser) {
      throw serverError('Failed to create team member');
    }

    void insertAuditLog({
      userId: actor.id,
      action: 'manager.team_member_created',
      resource: 'user',
      resourceId: createdUser.id,
      ipAddress: c.req.header('x-forwarded-for') ?? undefined,
      userAgent: c.req.header('user-agent') ?? undefined,
      metadata: {
        createdRole: createdUser.role,
        createdEmail: createdUser.email,
      },
    });

    return c.json(
      {
        message: 'Team member created successfully',
        user: createdUser,
      },
      201
    );
  });

  router.patch('/team-members/:userId', zValidator('json', UpdateTeamMemberSchema), async (c) => {
    const db = getDatabase();
    const actor = await getActorScope(db, c.get('userId'));
    const targetUserId = c.req.param('userId');
    const payload = c.req.valid('json');

    assertUpdateRoleAllowed(actor, payload.role);

    const existingUser = await db.query.users.findFirst({
      where: and(buildTeamScope(actor), eq(users.id, targetUserId)),
      columns: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        managerId: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    });

    if (!existingUser) {
      throw notFound('User', targetUserId);
    }

    if (actor.role === 'manager' && existingUser.role !== 'staff') {
      throw forbidden('Managers can only update staff accounts');
    }

    const organizationId =
      payload.organizationId !== undefined
        ? actor.role === 'system_admin'
          ? payload.organizationId
          : actor.organizationId
        : existingUser.organizationId;
    const managerId =
      payload.managerId !== undefined
        ? await assertManagerAssignmentAllowed(db, actor, payload.managerId)
        : actor.role === 'manager'
          ? actor.id
          : existingUser.managerId;

    const firstName = payload.firstName !== undefined ? payload.firstName : existingUser.firstName;
    const lastName = payload.lastName !== undefined ? payload.lastName : existingUser.lastName;
    const displayName =
      payload.displayName !== undefined ? payload.displayName : existingUser.displayName;

    const resolvedDisplayName = deriveDisplayName({
      email: existingUser.email,
      firstName,
      lastName,
      displayName,
    });

    const [updatedUser] = await db
      .update(users)
      .set({
        ...(payload.firstName !== undefined ? { firstName } : {}),
        ...(payload.lastName !== undefined ? { lastName } : {}),
        ...(payload.displayName !== undefined ||
        payload.firstName !== undefined ||
        payload.lastName !== undefined
          ? { displayName: resolvedDisplayName }
          : {}),
        ...(payload.role !== undefined ? { role: payload.role } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(payload.organizationId !== undefined || actor.role !== 'system_admin'
          ? { organizationId }
          : {}),
        ...(payload.managerId !== undefined || actor.role === 'manager' ? { managerId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        managerId: users.managerId,
        organizationId: users.organizationId,
      });

    if (!updatedUser) {
      throw notFound('User', targetUserId);
    }

    void insertAuditLog({
      userId: actor.id,
      action: 'manager.team_member_updated',
      resource: 'user',
      resourceId: updatedUser.id,
      ipAddress: c.req.header('x-forwarded-for') ?? undefined,
      userAgent: c.req.header('user-agent') ?? undefined,
      metadata: {
        updatedRole: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });

    return c.json({
      message: 'Team member updated successfully',
      user: updatedUser,
    });
  });

  router.delete('/team-members/:userId', async (c) => {
    const db = getDatabase();
    const actor = await getActorScope(db, c.get('userId'));
    const targetUserId = c.req.param('userId');

    if (targetUserId === actor.id) {
      throw forbidden('You cannot deactivate your own account from the manager dashboard');
    }

    const existingUser = await db.query.users.findFirst({
      where: and(buildTeamScope(actor), eq(users.id, targetUserId)),
      columns: {
        id: true,
        role: true,
      },
    });

    if (!existingUser) {
      throw notFound('User', targetUserId);
    }

    if (actor.role === 'manager' && existingUser.role !== 'staff') {
      throw forbidden('Managers can only deactivate staff accounts');
    }

    const [deletedUser] = await db
      .update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning({
        id: users.id,
      });

    if (!deletedUser) {
      throw notFound('User', targetUserId);
    }

    void insertAuditLog({
      userId: actor.id,
      action: 'manager.team_member_deactivated',
      resource: 'user',
      resourceId: deletedUser.id,
      ipAddress: c.req.header('x-forwarded-for') ?? undefined,
      userAgent: c.req.header('user-agent') ?? undefined,
    });

    return c.json({ message: 'Team member deactivated successfully' });
  });

  return router;
}
