/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRole } from '@/hooks/use-role';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi, type AdminUser } from '@/lib/api';
import {
  Shield,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  UserX,
} from 'lucide-react';

const ROLE_OPTIONS = [
  'learner',
  'staff',
  'manager',
  'instructor',
  'content_author',
  'school_admin',
  'district_admin',
  'system_admin',
] as const;

const roleColors: Record<string, string> = {
  system_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  district_admin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  school_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  instructor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  staff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  learner: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  content_author: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

function UserRow({ user, onUpdated }: { user: AdminUser; onUpdated: (u: AdminUser) => void }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = user.id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const dirty = role !== user.role || isActive !== user.isActive;

  async function handleSave() {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      const res = await adminApi.updateUser(user.id, {
        ...(role !== user.role ? { role } : {}),
        ...(isActive !== user.isActive ? { isActive } : {}),
      });
      onUpdated(res.user);
      setSaveStatus('saved');
      setEditing(false);
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{user.displayName ?? user.email}</p>
          {isActive ? (
            <UserCheck className="h-4 w-4 text-green-600 shrink-0" />
          ) : (
            <UserX className="h-4 w-4 text-destructive shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        {!editing && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[user.role] ?? roleColors['learner']}`}
          >
            {user.role}
          </span>
        )}
      </div>

      {/* Edit controls */}
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            Active
          </label>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saveStatus === 'saving'}>
            {saveStatus === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRole(user.role);
              setIsActive(user.isActive);
              setEditing(false);
              setSaveStatus('idle');
            }}
          >
            Cancel
          </Button>
          {saveStatus === 'error' && <span className="text-xs text-destructive">{errorMsg}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
          {isSelf ? (
            <span className="text-xs text-muted-foreground">You</span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { isSuperuser } = useRole();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSuperuser) {
      router.replace('/dashboard');
    }
  }, [isSuperuser, router]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers();
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperuser) {
      void loadUsers();
    }
  }, [isSuperuser, loadUsers]);

  if (!isSuperuser) return null;

  const filtered = users.filter(
    (u) =>
      search.trim() === '' ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.displayName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="User Management"
        description="Assign roles and manage user access. Only system admins can change roles."
        icon={Shield}
      />

      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
        <strong>Role guide:</strong> staff → lessons only · manager → staff features + manager
        dashboard · system_admin → full access including content editor
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => void loadUsers()}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{filtered.length} users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
            )}
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onUpdated={(updated) =>
                  setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                }
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
