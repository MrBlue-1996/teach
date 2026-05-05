/**
 * TopShelf Teaching - Instructor API
 * Aligned with backend: packages/api-server/src/routes/instructor.ts
 *
 * All endpoints require instructor role (instructor, school_admin, district_admin, system_admin).
 */

import { api } from './client';

/** Course overview returned by GET /instructor/courses */
export interface InstructorCourse {
  id: string;
  slug: string;
  title: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  enrolledCount: number;
}

/** Student record returned by GET /instructor/students */
export interface InstructorStudent {
  userId: string;
  email: string;
  displayName: string;
  packId: string;
  packSlug: string;
  packTitle: string;
  lastSessionAt: string | null;
  totalSessions: number;
  masteryScore: number | null;
}

export const instructorApi = {
  /** GET /instructor/courses — list instructor's own packs with enrolled-count */
  getCourses: () => api.get<{ courses: InstructorCourse[] }>('/instructor/courses'),

  /** GET /instructor/students — students across all instructor's packs */
  getStudents: (packId?: string) =>
    api.get<{ students: InstructorStudent[] }>(
      '/instructor/students',
      packId !== undefined ? { packId } : undefined
    ),
};
