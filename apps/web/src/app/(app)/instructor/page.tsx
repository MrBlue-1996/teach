'use client';

import Link from 'next/link';
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
  BarChart3,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { instructorApi, type InstructorCourse, type InstructorStudent } from '@/lib/api';

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

type InstructorTab = 'overview' | 'students' | 'courses' | 'content';

export default function InstructorPage() {
  const [activeTab, setActiveTab] = useState<InstructorTab>('overview');
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState<InstructorStudent[]>([]);
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([instructorApi.getStudents(), instructorApi.getCourses()])
      .then(([studentsRes, coursesRes]) => {
        setStudents(studentsRes.students);
        setCourses(coursesRes.courses);
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

  const uniqueStudents = Array.from(
    new Map(students.map((student) => [student.userId, student])).values()
  );
  const totalStudents = uniqueStudents.length;
  const learnersWithSessions = uniqueStudents.filter(
    (student) => student.lastSessionAt !== null
  ).length;
  const avgMastery =
    students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.masteryScore ?? 0), 0) / students.length)
      : 0;
  const publishedCourses = courses.filter((c) => c.status === 'published');

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Instructor Panel"
        description="Monitor student progress and manage courses"
        icon={Users}
        badge="Instructor"
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
              label="With Sessions"
              value={learnersWithSessions}
              color="green"
            />
            <StatCard
              icon={AlertCircle}
              label="Published Courses"
              value={publishedCourses.length}
              color="red"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Mastery"
              value={`${avgMastery}%`}
              color="purple"
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

          {/* Course Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Course Summary</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('courses')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {publishedCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {dataLoading ? 'Loading...' : 'No published courses yet.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {publishedCourses.map((course) => (
                    <div key={course.id} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{course.title}</p>
                        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{course.enrolledCount} students</span>
                          <span className="capitalize">{course.status}</span>
                        </div>
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
                    <th className="pb-3 pr-4">Course</th>
                    <th className="pb-3 pr-4">Last Active</th>
                    <th className="pb-3">Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(
                      (s) =>
                        s.displayName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.email.toLowerCase().includes(studentSearch.toLowerCase())
                    )
                    .map((student) => (
                      <tr
                        key={`${student.userId}-${student.packId}`}
                        className="border-b text-sm hover:bg-muted/50"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                              {getInitials(student.displayName)}
                            </div>
                            <div>
                              <p className="font-medium">{student.displayName}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{student.packTitle}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatLastActive(student.lastSessionAt)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24">
                              <Progress value={student.masteryScore ?? 0} className="h-1.5" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {student.masteryScore !== null ? `${student.masteryScore}%` : '—'}
                            </span>
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
          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No courses found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Courses you author will appear here once created.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-4">Title</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Enrolled</th>
                    <th className="pb-3">Version</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id} className="border-b text-sm hover:bg-muted/50">
                      <td className="py-3 pr-4 font-medium">{course.title}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            course.status === 'published' &&
                              'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
                            course.status === 'draft' &&
                              'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400',
                            course.status === 'archived' &&
                              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          )}
                        >
                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{course.enrolledCount}</td>
                      <td className="py-3 text-muted-foreground">{course.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Content</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-lg border p-6 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">No course content found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Instructor-owned packs will appear here when they are available.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/content/${course.id}`}
                      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium">{course.title}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="capitalize">{course.status}</span>
                            <span>{course.enrolledCount} students</span>
                            <span>v{course.version}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Open
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
