'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { StatCard } from '@/components/ui/stat-card';
import {
  Users,
  TrendingUp,
  Search,
  Plus,
  Eye,
  BarChart3,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminApi, type AdminUser, type AdminStats } from '@/lib/api';

interface Student {
  id: string;
  name: string;
  email: string;
  initials: string;
  enrolledCourses: number;
  overallProgress: number;
  lastActive: string;
  streak: number;
  badgesEarned: number;
  status: 'active' | 'inactive' | 'at-risk';
}

interface CourseOverview {
  id: string;
  title: string;
  enrolledStudents: number;
  avgMastery: number;
  completionRate: number;
  status: 'published' | 'draft' | 'archived';
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function mapUserToStudent(u: AdminUser): Student {
  return {
    id: u.id,
    name: u.displayName ?? u.email,
    email: u.email,
    initials: getInitials(u.displayName ?? u.email),
    enrolledCourses: 0,
    overallProgress: 0,
    lastActive: formatLastActive(u.lastLoginAt),
    streak: 0,
    badgesEarned: 0,
    status: u.isActive ? 'active' : 'inactive',
  };
}

// Placeholder courses shown while no course-analytics endpoint exists
const placeholderCourses: CourseOverview[] = [];

type InstructorTab = 'overview' | 'students' | 'courses' | 'content';

export default function InstructorPage() {
  const [activeTab, setActiveTab] = useState<InstructorTab>('overview');
  const [studentSearch, setStudentSearch] = useState('');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getUsers()])
      .then(([statsRes, usersRes]) => {
        setAdminStats(statsRes);
        setStudents(usersRes.users.map(mapUserToStudent));
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, []);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'students' as const, label: 'Students', icon: Users },
    { id: 'courses' as const, label: 'Courses', icon: GraduationCap },
    { id: 'content' as const, label: 'Content', icon: FileText },
  ];

  const totalStudents = adminStats?.stats.totalUsers ?? students.length;
  const activeStudents =
    adminStats?.stats.activeLearners ?? students.filter((s) => s.status === 'active').length;
  const atRiskStudents = students.filter(
    (s) => s.status === 'at-risk' || s.status === 'inactive'
  ).length;
  const avgProgress =
    students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.overallProgress, 0) / students.length)
      : 0;

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Instructor Panel"
        description="Monitor student progress, manage courses, and create content"
        icon={Users}
        badge="Instructor"
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total Students" value={totalStudents} color="blue" />
            <StatCard
              icon={CheckCircle2}
              label="Active"
              value={activeStudents}
              color="green"
              change={`${Math.round((activeStudents / totalStudents) * 100)}%`}
              trend="up"
            />
            <StatCard icon={AlertCircle} label="At Risk" value={atRiskStudents} color="red" />
            <StatCard
              icon={TrendingUp}
              label="Avg Progress"
              value={`${avgProgress}%`}
              color="purple"
              change="+5% this week"
              trend="up"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Class Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Class Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImagePlaceholder
                  type="animation"
                  aspectRatio="video"
                  label="Performance Distribution Chart"
                />
              </CardContent>
            </Card>

            {/* Engagement Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-primary" />
                  Activity Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImagePlaceholder
                  type="animation"
                  aspectRatio="video"
                  label="Weekly Activity Heatmap"
                />
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Students */}
          {atRiskStudents > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Students Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {students
                    .filter((s) => s.status === 'at-risk' || s.status === 'inactive')
                    .map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                            {student.initials}
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Last active: {student.lastActive}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              student.status === 'at-risk'
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400'
                            )}
                          >
                            {student.status === 'at-risk' ? 'At Risk' : 'Inactive'}
                          </span>
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Course Summary</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('courses')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {placeholderCourses.filter((c) => c.status === 'published').length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Course analytics coming soon. See blockers.
                </p>
              ) : (
                <div className="space-y-4">
                  {placeholderCourses
                    .filter((c) => c.status === 'published')
                    .map((course) => (
                      <div key={course.id} className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{course.title}</p>
                          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{course.enrolledStudents} students</span>
                            <span>{course.completionRate}% completion</span>
                          </div>
                        </div>
                        <div className="w-32">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">Avg Mastery</span>
                            <span className="font-medium">{course.avgMastery}%</span>
                          </div>
                          <Progress value={course.avgMastery} className="h-1.5" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-4">Student</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Last Active</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                    .map((student) => (
                      <tr key={student.id} className="border-b text-sm hover:bg-muted/50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                              {student.initials}
                            </div>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">
                          {student.email}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{student.lastActive}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              student.status === 'active' &&
                                'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
                              student.status === 'at-risk' &&
                                'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
                              student.status === 'inactive' &&
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            )}
                          >
                            {student.status === 'at-risk'
                              ? 'At Risk'
                              : student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">Course analytics coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Per-course enrollment and mastery stats require a dedicated instructor endpoint.
            </p>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Authoring</CardTitle>
            </CardHeader>
            <CardContent>
              <ImagePlaceholder
                type="animation"
                aspectRatio="banner"
                label="Content Editor - Coming Soon"
              />
              <p className="mt-4 text-sm text-muted-foreground">
                Create and manage teaching blocks, quizzes, and course materials. The content
                authoring tools are being prepared for this section.
              </p>
              <Button className="mt-4" disabled>
                <Plus className="mr-2 h-4 w-4" />
                Create New Content Pack
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
