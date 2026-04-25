// ============================================================================
// app/plugins/cambridge/api.ts
//
// All endpoints prefixed /cambridge/ on the backend.
// Reads  → /cambridge/<route>/
// Writes → /cambridge/admin/<route>/
// ============================================================================

import { apiClient } from '@/app/core/api/client';
import type {
  CambridgeSubject,
  CambridgeSubjectDetail,
  ContentArea,
  ContentAreaDetail,
  Topic,
  TopicDetail,
  LearningObjective,
  AssessmentComponent,
  CambridgeProgress,
  ClassProgressEntry,
  CambridgeInstallationStatus,
  CambridgeSubjectFormData,
  RenameSubjectData,
  ContentAreaFormData,
  TopicFormData,
  LearningObjectiveFormData,
  AssessmentComponentFormData,
  SubjectFilterParams,
  ProgressFilterParams,
} from './types';

// ============================================================================
// Subjects
// ============================================================================

export const subjectAPI = {
  getAll: async (params?: SubjectFilterParams) => {
    const response = await apiClient.get<CambridgeSubject[]>('/cambridge/subjects/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<CambridgeSubjectDetail>(`/cambridge/subjects/${id}/`);
    return response.data;
  },

  create: async (data: CambridgeSubjectFormData) => {
    const response = await apiClient.post<CambridgeSubject>('/cambridge/admin/subjects/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CambridgeSubjectFormData>) => {
    const response = await apiClient.patch<CambridgeSubject>(`/cambridge/admin/subjects/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cambridge/admin/subjects/${id}/`);
  },

  rename: async (id: number, data: RenameSubjectData) => {
    const response = await apiClient.patch<CambridgeSubject>(`/cambridge/admin/subjects/${id}/rename/`, data);
    return response.data;
  },
};

// ============================================================================
// Content Areas
// ============================================================================

export const contentAreaAPI = {
  getAll: async (params?: { subject?: number }) => {
    const response = await apiClient.get<ContentArea[]>('/cambridge/content-areas/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ContentAreaDetail>(`/cambridge/content-areas/${id}/`);
    return response.data;
  },

  create: async (data: ContentAreaFormData) => {
    const response = await apiClient.post<ContentArea>('/cambridge/admin/content-areas/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ContentAreaFormData>) => {
    const response = await apiClient.patch<ContentArea>(`/cambridge/admin/content-areas/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cambridge/admin/content-areas/${id}/`);
  },
};

// ============================================================================
// Topics
// ============================================================================

export const topicAPI = {
  getAll: async (params?: { content_area?: number }) => {
    const response = await apiClient.get<Topic[]>('/cambridge/topics/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<TopicDetail>(`/cambridge/topics/${id}/`);
    return response.data;
  },

  create: async (data: TopicFormData) => {
    const response = await apiClient.post<Topic>('/cambridge/admin/topics/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<TopicFormData>) => {
    const response = await apiClient.patch<Topic>(`/cambridge/admin/topics/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cambridge/admin/topics/${id}/`);
  },
};

// ============================================================================
// Learning Objectives
// ============================================================================

export const objectiveAPI = {
  getAll: async (params?: { topic?: number }) => {
    const response = await apiClient.get<LearningObjective[]>('/cambridge/objectives/', { params });
    return response.data;
  },

  create: async (data: LearningObjectiveFormData) => {
    const response = await apiClient.post<LearningObjective>('/cambridge/admin/objectives/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<LearningObjectiveFormData>) => {
    const response = await apiClient.patch<LearningObjective>(`/cambridge/admin/objectives/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cambridge/admin/objectives/${id}/`);
  },
};

// ============================================================================
// Assessment Components
// ============================================================================

export const assessmentComponentAPI = {
  getAll: async (params?: { subject?: number }) => {
    const response = await apiClient.get<AssessmentComponent[]>('/cambridge/components/', { params });
    return response.data;
  },

  create: async (data: AssessmentComponentFormData) => {
    const response = await apiClient.post<AssessmentComponent>('/cambridge/admin/components/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<AssessmentComponentFormData>) => {
    const response = await apiClient.patch<AssessmentComponent>(`/cambridge/admin/components/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cambridge/admin/components/${id}/`);
  },
};

// ============================================================================
// Progress
// ============================================================================

export const progressAPI = {
  getStudentProgress: async (studentId: number, subjectId: number) => {
    const response = await apiClient.get<CambridgeProgress>('/cambridge/progress/student/', {
      params: { student_id: studentId, subject_id: subjectId },
    });
    return response.data;
  },

  getClassProgress: async (params: ProgressFilterParams) => {
    const response = await apiClient.get<ClassProgressEntry[]>('/cambridge/progress/class/', { params });
    return response.data;
  },

  getSubjectProgress: async (params: ProgressFilterParams) => {
    const response = await apiClient.get<ClassProgressEntry[]>('/cambridge/progress/subject/', { params });
    return response.data;
  },
};

// ============================================================================
// Installation
// ============================================================================

export const installationAPI = {
  getStatus: async () => {
    const response = await apiClient.get<CambridgeInstallationStatus>('/cambridge/installation/status/');
    return response.data;
  },

  activate: async () => {
    const response = await apiClient.post<CambridgeInstallationStatus>('/cambridge/installation/activate/');
    return response.data;
  },
};
