/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { useAuthStore } from '@/stores/auth-store';

const ADMIN_ROLES = new Set(['school_admin', 'district_admin', 'system_admin']);

export interface RoleState {
  role: string;
  /** Full platform superuser — can edit content, manage users, configure the system */
  isSuperuser: boolean;
  /** Admin or higher */
  isAdmin: boolean;
  /** Manager or higher */
  isManager: boolean;
  /** Staff or higher (can access lessons) */
  isStaff: boolean;
}

/**
 * Returns the current user's role and convenience flags.
 *
 * Role hierarchy (highest → lowest):
 *   system_admin → district_admin → school_admin → manager → instructor → staff → learner
 *
 * To grant superuser (system_admin) access to an account, update the user's
 * role via the admin panel or the database migration runbooks in docs/runbooks/.
 */
export function useRole(): RoleState {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'learner';
  const isSuperuser = role === 'system_admin';
  const isAdmin = ADMIN_ROLES.has(role);
  const isManager = isAdmin || role === 'manager';
  const isStaff = isManager || role === 'staff' || role === 'instructor';

  return { role, isSuperuser, isAdmin, isManager, isStaff };
}
