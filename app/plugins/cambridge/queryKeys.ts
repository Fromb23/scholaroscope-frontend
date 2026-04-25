// ============================================================================
// app/plugins/cambridge/queryKeys.ts
//
// TanStack Query key factory for Cambridge domain.
// ============================================================================

import type { SubjectFilterParams, ProgressFilterParams } from './types';

export const queryKeys = {
  all: ['cambridge'] as const,

  // Installation
  installation: () => [...queryKeys.all, 'installation'] as const,

  // Subjects
  subjects: (params?: SubjectFilterParams) =>
    [...queryKeys.all, 'subjects', params ?? {}] as const,
  subject: (id: number) => [...queryKeys.all, 'subjects', id] as const,

  // Content Areas
  contentAreas: (subjectId?: number) =>
    [...queryKeys.all, 'content-areas', subjectId ?? 'all'] as const,
  contentArea: (id: number) => [...queryKeys.all, 'content-areas', id] as const,

  // Topics
  topics: (contentAreaId?: number) =>
    [...queryKeys.all, 'topics', contentAreaId ?? 'all'] as const,
  topic: (id: number) => [...queryKeys.all, 'topics', id] as const,

  // Learning Objectives
  objectives: (topicId?: number) =>
    [...queryKeys.all, 'objectives', topicId ?? 'all'] as const,

  // Assessment Components
  components: (subjectId?: number) =>
    [...queryKeys.all, 'components', subjectId ?? 'all'] as const,

  // Progress
  studentProgress: (studentId: number, subjectId: number) =>
    [...queryKeys.all, 'progress', 'student', studentId, subjectId] as const,
  classProgress: (params: ProgressFilterParams) =>
    [...queryKeys.all, 'progress', 'class', params] as const,
  subjectProgress: (params: ProgressFilterParams) =>
    [...queryKeys.all, 'progress', 'subject', params] as const,
} as const;
