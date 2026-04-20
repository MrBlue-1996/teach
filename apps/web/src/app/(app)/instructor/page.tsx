'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    initials: 'SC',
    enrolledCourses: 3,
    overallProgress: 78,
    lastActive: '2 hours ago',
    streak: 14,
    badgesEarned: 8,
    status: 'active',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    email: 'marcus@example.com',
    initials: 'MJ',
    enrolledCourses: 2,
    overallProgress: 92,
    lastActive: '1 hour ago',
    streak: 21,
    badgesEarned: 12,
    status: 'active',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily@example.com',
    initials: 'ER',
    enrolledCourses: 4,
    overallProgress: 45,
    lastActive: '3 days ago',
    streak: 0,
    badgesEarned: 3,
    status: 'at-risk',
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david@example.com',
    initials: 'DK',
    enrolledCourses: 1,
    overallProgress: 65,
    lastActive: '5 hours ago',
    streak: 7,
    badgesEarned: 5,
    status: 'active',
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa@example.com',
    initials: 'LT',
    enrolledCourses: 2,
    overallProgress: 15,
    lastActive: '2 weeks ago',
    streak: 0,
    badgesEarned: 0,
    status: 'inactive',
  },
  {
    id: '6',
    name: 'James Wilson',
    email: 'james@example.com',
    initials: 'JW',
    enrolledCourses: 3,
    overallProgress: 88,
    lastActive: '30 min ago',
    streak: 30,
    badgesEarned: 15,
    status: 'active',
  },
];

const mockCourses: CourseOverview[] = [
  {
    id: '1',
    title: 'CompTIA Network+ Certification',
    enrolledStudents: 24,
    avgMastery: 62,
    completionRate: 35,
    status: 'published',
  },
  {
    id: '2',
    title: 'Linux+ Fundamentals',
    enrolledStudents: 18,
    avgMastery: 71,
    completionRate: 45,
    status: 'published',
  },
  {
    id: '3',
    title: 'Cybersecurity Essentials',
    enrolledStudents: 31,
    avgMastery: 48,
    completionRate: 20,
    status: 'published',
  },
  {
    id: '4',
    title: 'Advanced Networking Lab',
    enrolledStudents: 0,
    avgMastery: 0,
    completionRate: 0,
    status: 'draft',
  },
];

type InstructorTab = 'overview' | 'students' | 'courses' | 'content';

export default function InstructorPage() {
  const [activeTab, setActiveTab] = useState<InstructorTab>('overview');
  const [studentSearch, setStudentSearch] = useState('');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'students' as const, label: 'Students', icon: Users },
    { id: 'courses' as const, label: 'Courses', icon: GraduationCap },
    { id: 'content' as const, label: 'Content', icon: FileText },
  ];

  const totalStudents = mockStudents.length;
  const activeStudents = mockStudents.filter((s) => s.status === 'active').length;
  const atRiskStudents = mockStudents.filter(
    (s) => s.status === 'at-risk' || s.status === 'inactive'
  ).length;
  const avgProgress = Math.round(
    mockStudents.reduce((sum, s) => sum + s.overallProgress, 0) / totalStudents
  );

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
                  {mockStudents
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
              <div className="space-y-4">
                {mockCourses
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 pr-4">Courses</th>
                  <th className="pb-3 pr-4">Progress</th>
                  <th className="pb-3 pr-4">Streak</th>
                  <th className="pb-3 pr-4">Badges</th>
                  <th className="pb-3 pr-4">Last Active</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockStudents
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
                      <td className="py-3 pr-4">{student.enrolledCourses}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Progress value={student.overallProgress} className="h-1.5 w-16" />
                          <span>{student.overallProgress}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{student.streak} days</td>
                      <td className="py-3 pr-4">{student.badgesEarned}</td>
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
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {mockCourses.map((course) => (
            <Card key={course.id} className="card-hover">
              <CardContent className="p-0">
                <ImagePlaceholder
                  type="image"
                  aspectRatio="video"
                  label={course.title}
                  className="rounded-none border-0 rounded-t-lg"
                />
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{course.title}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        course.status === 'published' && 'bg-green-100 text-green-600',
                        course.status === 'draft' && 'bg-yellow-100 text-yellow-600',
                        course.status === 'archived' && 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold">{course.enrolledStudents}</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{course.avgMastery}%</p>
                      <p className="text-xs text-muted-foreground">Avg Mastery</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{course.completionRate}%</p>
                      <p className="text-xs text-muted-foreground">Completion</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-2 h-3 w-3" />
                      View
                    </Button>
                    <Button size="sm" className="flex-1">
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
