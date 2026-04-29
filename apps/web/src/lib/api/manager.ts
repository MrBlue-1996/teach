import { api } from './client';

export interface ManagerSummaryUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  role: 'staff' | 'manager';
  organizationId: string | null;
  managerId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  badgeCount: number;
  blocksCompleted: number;
  totalTimeSpentSeconds: number;
  overallMastery: number;
  currentMode: string | null;
  activePackCount: number;
  lastActivityAt: string | null;
  manager: {
    id: string;
    email: string;
    displayName: string;
  } | null;
}

export interface TeamMembersResponse {
  teamMembers: ManagerSummaryUser[];
}

export interface CreateTeamMemberRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: 'staff' | 'manager';
  organizationId?: string;
  managerId?: string | null;
}

export interface UpdateTeamMemberRequest {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  role?: 'staff' | 'manager';
  isActive?: boolean;
  organizationId?: string | null;
  managerId?: string | null;
}

export const managerApi = {
  getTeamMembers: () => api.get<TeamMembersResponse>('/manager/team-members'),
  createTeamMember: (data: CreateTeamMemberRequest) =>
    api.post<{ message: string; user: unknown }>('/manager/team-members', data),
  updateTeamMember: (userId: string, data: UpdateTeamMemberRequest) =>
    api.patch<{ message: string; user: unknown }>(`/manager/team-members/${userId}`, data),
  deleteTeamMember: (userId: string) =>
    api.delete<{ message: string }>(`/manager/team-members/${userId}`),
};
