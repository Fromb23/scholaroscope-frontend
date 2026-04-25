// ============================================================================
// app/plugins/cambridge/hooks.ts
//
// TanStack Query hooks for Cambridge domain.
// Reads use useQuery. Writes use useMutation with invalidation.
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  subjectAPI,
  contentAreaAPI,
  topicAPI,
  objectiveAPI,
  assessmentComponentAPI,
  progressAPI,
  installationAPI,
} from './api';
import { queryKeys } from './queryKeys';
import type {
  SubjectFilterParams,
  ProgressFilterParams,
  CambridgeSubjectFormData,
  RenameSubjectData,
  ContentAreaFormData,
  TopicFormData,
  LearningObjectiveFormData,
  AssessmentComponentFormData,
} from './types';

// ============================================================================
// Installation
// ============================================================================

export function useCambridgeInstallation() {
  return useQuery({
    queryKey: queryKeys.installation(),
    queryFn: () => installationAPI.getStatus(),
  });
}

export function useActivateCambridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => installationAPI.activate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installation() });
    },
  });
}

// ============================================================================
// Subjects
// ============================================================================

export function useCambridgeSubjects(params?: SubjectFilterParams) {
  return useQuery({
    queryKey: queryKeys.subjects(params),
    queryFn: () => subjectAPI.getAll(params),
  });
}

export function useCambridgeSubject(id: number) {
  return useQuery({
    queryKey: queryKeys.subject(id),
    queryFn: () => subjectAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateCambridgeSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CambridgeSubjectFormData) => subjectAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects() });
    },
  });
}

export function useUpdateCambridgeSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CambridgeSubjectFormData> }) =>
      subjectAPI.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subject(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects() });
    },
  });
}

export function useDeleteCambridgeSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subjectAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects() });
    },
  });
}

export function useRenameCambridgeSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RenameSubjectData }) =>
      subjectAPI.rename(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subject(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects() });
    },
  });
}

// ============================================================================
// Content Areas
// ============================================================================

export function useContentAreas(subjectId?: number) {
  return useQuery({
    queryKey: queryKeys.contentAreas(subjectId),
    queryFn: () => contentAreaAPI.getAll(subjectId ? { subject: subjectId } : undefined),
    enabled: subjectId !== undefined,
  });
}

export function useContentArea(id: number) {
  return useQuery({
    queryKey: queryKeys.contentArea(id),
    queryFn: () => contentAreaAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateContentArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ContentAreaFormData) => contentAreaAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contentAreas() });
    },
  });
}

export function useUpdateContentArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContentAreaFormData> }) =>
      contentAreaAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contentAreas() });
    },
  });
}

export function useDeleteContentArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contentAreaAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contentAreas() });
    },
  });
}

// ============================================================================
// Topics
// ============================================================================

export function useTopics(contentAreaId?: number) {
  return useQuery({
    queryKey: queryKeys.topics(contentAreaId),
    queryFn: () => topicAPI.getAll(contentAreaId ? { content_area: contentAreaId } : undefined),
    enabled: contentAreaId !== undefined,
  });
}

export function useTopic(id: number) {
  return useQuery({
    queryKey: queryKeys.topic(id),
    queryFn: () => topicAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TopicFormData) => topicAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.topics() });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => topicAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.topics() });
    },
  });
}

// ============================================================================
// Learning Objectives
// ============================================================================

export function useLearningObjectives(topicId?: number) {
  return useQuery({
    queryKey: queryKeys.objectives(topicId),
    queryFn: () => objectiveAPI.getAll(topicId ? { topic: topicId } : undefined),
    enabled: topicId !== undefined,
  });
}

export function useCreateLearningObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LearningObjectiveFormData) => objectiveAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives() });
    },
  });
}

export function useDeleteLearningObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => objectiveAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives() });
    },
  });
}

// ============================================================================
// Assessment Components
// ============================================================================

export function useAssessmentComponents(subjectId?: number) {
  return useQuery({
    queryKey: queryKeys.components(subjectId),
    queryFn: () => assessmentComponentAPI.getAll(subjectId ? { subject: subjectId } : undefined),
    enabled: subjectId !== undefined,
  });
}

export function useCreateAssessmentComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssessmentComponentFormData) => assessmentComponentAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components() });
    },
  });
}

export function useDeleteAssessmentComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => assessmentComponentAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components() });
    },
  });
}

// ============================================================================
// Progress
// ============================================================================

export function useStudentProgress(studentId: number, subjectId: number) {
  return useQuery({
    queryKey: queryKeys.studentProgress(studentId, subjectId),
    queryFn: () => progressAPI.getStudentProgress(studentId, subjectId),
    enabled: !!studentId && !!subjectId,
  });
}

export function useClassProgress(params: ProgressFilterParams) {
  return useQuery({
    queryKey: queryKeys.classProgress(params),
    queryFn: () => progressAPI.getClassProgress(params),
    enabled: !!params.cohort_id,
  });
}

export function useSubjectProgress(params: ProgressFilterParams) {
  return useQuery({
    queryKey: queryKeys.subjectProgress(params),
    queryFn: () => progressAPI.getSubjectProgress(params),
    enabled: !!params.subject_id,
  });
}
