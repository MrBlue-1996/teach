'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/hooks/use-auth';
import { managerApi, type CreateTeamMemberRequest, type ManagerSummaryUser } from '@/lib/api';
import { cn, getLevelName } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  BadgeCheck,
  Clock3,
  ShieldCheck,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react';

type EditableRole = 'staff' | 'manager';
type FormMode = 'create' | 'edit';

interface TeamFormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: EditableRole;
  managerId: string;
  isActive: boolean;
}

const ALLOWED_ROLES = new Set(['manager', 'school_admin', 'district_admin', 'system_admin']);

function emptyForm(): TeamFormState {
  return {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    displayName: '',
    role: 'staff',
    managerId: '',
    isActive: true,
  };
}

function formatHours(totalSeconds: number): string {
  return `${(totalSeconds / 3600).toFixed(totalSeconds >= 3600 ? 1 : 0)}h`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatLastSeen(value: string | null): string {
  if (!value) {
    return 'No activity yet';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function memberName(member: ManagerSummaryUser): string {
  return member.displayName || member.email;
}

export default function ManagerPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<ManagerSummaryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamFormState>(emptyForm());

  const canViewManagerDashboard = user?.role ? ALLOWED_ROLES.has(user.role) : false;
  const canCreateManagers = user?.role !== 'manager';

  async function loadTeamMembers(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await managerApi.getTeamMembers();
      setTeamMembers(response.teamMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (canViewManagerDashboard) {
      void loadTeamMembers();
    }
  }, [canViewManagerDashboard]);

  function resetForm(): void {
    setFormMode('create');
    setEditingMemberId(null);
    setForm(emptyForm());
  }

  function startEdit(member: ManagerSummaryUser): void {
    setFormMode('edit');
    setEditingMemberId(member.id);
    setForm({
      email: member.email,
      password: '',
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      displayName: member.displayName ?? '',
      role: member.role,
      managerId: member.managerId ?? '',
      isActive: member.isActive,
    });
  }

  async function submitForm(): Promise<void> {
    setIsSaving(true);
    setError(null);

    try {
      if (formMode === 'create') {
        const payload: CreateTeamMemberRequest = {
          email: form.email,
          password: form.password,
          role: canCreateManagers ? form.role : 'staff',
          managerId:
            user?.role === 'manager'
              ? null
              : form.role === 'staff' && form.managerId.length > 0
                ? form.managerId
                : null,
        };
        if (form.firstName) {
          payload.firstName = form.firstName;
        }
        if (form.lastName) {
          payload.lastName = form.lastName;
        }
        if (form.displayName) {
          payload.displayName = form.displayName;
        }
        await managerApi.createTeamMember(payload);
      } else if (editingMemberId) {
        await managerApi.updateTeamMember(editingMemberId, {
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          displayName: form.displayName || null,
          role: canCreateManagers ? form.role : 'staff',
          isActive: form.isActive,
          managerId:
            user?.role === 'manager'
              ? null
              : form.role === 'staff' && form.managerId.length > 0
                ? form.managerId
                : null,
        });
      }

      resetForm();
      await loadTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team member');
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateMember(member: ManagerSummaryUser): Promise<void> {
    setIsSaving(true);
    setError(null);

    try {
      await managerApi.deleteTeamMember(member.id);
      if (editingMemberId === member.id) {
        resetForm();
      }
      await loadTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate team member');
    } finally {
      setIsSaving(false);
    }
  }

  if (!canViewManagerDashboard) {
    return (
      <div className="space-y-6 page-transition">
        <PageHeader
          title="Manager Dashboard"
          description="This view is available to managers and org admins."
          icon={Users}
          badge="Restricted"
        />
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Your account does not currently have team management access.
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredMembers = teamMembers.filter((member) => {
    const query = search.toLowerCase();
    return (
      memberName(member).toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  });
  const managerOptions = teamMembers.filter(
    (member) => member.role === 'manager' && member.isActive
  );
  const activeMembers = teamMembers.filter((member) => member.isActive);
  const totalBadges = teamMembers.reduce((sum, member) => sum + member.badgeCount, 0);
  const totalTimeSpent = teamMembers.reduce((sum, member) => sum + member.totalTimeSpentSeconds, 0);
  const averageMastery =
    teamMembers.length > 0
      ? teamMembers.reduce((sum, member) => sum + member.overallMastery, 0) / teamMembers.length
      : 0;

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Manager Dashboard"
        description="Track training progress, badges, time on task, and manage your team."
        icon={Users}
        badge={user?.role === 'manager' ? 'Manager' : 'Org Admin'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadTeamMembers()} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button onClick={resetForm}>
              <UserPlus className="mr-2 h-4 w-4" />
              New Team Member
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Team Members" value={teamMembers.length} color="blue" />
        <StatCard
          icon={ShieldCheck}
          label="Active Accounts"
          value={activeMembers.length}
          color="green"
        />
        <StatCard icon={BadgeCheck} label="Badges Earned" value={totalBadges} color="yellow" />
        <StatCard
          icon={Clock3}
          label="Time On Task"
          value={formatHours(totalTimeSpent)}
          color="purple"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base">Team Progress</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or role"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{activeMembers.length} active in scope</span>
              <span>{formatPercent(averageMastery)} average mastery</span>
              <span>{managerOptions.length} managers available</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 text-sm text-muted-foreground">
                No team members found in this scope yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Team Member</th>
                      <th className="pb-3 pr-4 font-medium">Role</th>
                      <th className="pb-3 pr-4 font-medium">Level</th>
                      <th className="pb-3 pr-4 font-medium">Mastery</th>
                      <th className="pb-3 pr-4 font-medium">Badges</th>
                      <th className="pb-3 pr-4 font-medium">Time</th>
                      <th className="pb-3 pr-4 font-medium">Last Active</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b align-top hover:bg-muted/40">
                        <td className="py-3 pr-4">
                          <div className="space-y-1">
                            <p className="font-medium">{memberName(member)}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                            {member.manager && (
                              <p className="text-xs text-muted-foreground">
                                Manager: {member.manager.displayName}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {member.currentMode ? getLevelName(member.currentMode) : 'Not started'}
                        </td>
                        <td className="py-3 pr-4">{formatPercent(member.overallMastery)}</td>
                        <td className="py-3 pr-4">{member.badgeCount}</td>
                        <td className="py-3 pr-4">{formatHours(member.totalTimeSpentSeconds)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatLastSeen(member.lastActivityAt ?? member.lastLoginAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              member.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            )}
                          >
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEdit(member)}
                              disabled={isSaving}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => void deactivateMember(member)}
                              disabled={isSaving || !member.isActive}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {formMode === 'create' ? 'Add Team Member' : 'Edit Team Member'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  First name
                </label>
                <Input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Last name
                </label>
                <Input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Display name
              </label>
              <Input
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                value={form.email}
                disabled={formMode === 'edit'}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>

            {formMode === 'create' && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Temporary password
                </label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Role
                </label>
                <select
                  value={canCreateManagers ? form.role : 'staff'}
                  disabled={!canCreateManagers}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as EditableRole,
                      managerId: event.target.value === 'manager' ? '' : current.managerId,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </label>
                <select
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.value === 'active',
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {user?.role !== 'manager' && form.role === 'staff' && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Assigned manager
                </label>
                <select
                  value={form.managerId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, managerId: event.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {memberName(manager)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={() => void submitForm()} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {formMode === 'create' ? 'Create Member' : 'Save Changes'}
              </Button>
              {formMode === 'edit' && (
                <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
