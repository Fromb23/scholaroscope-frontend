import {apiClient} from '@/app/core/api/client';
import {
  Project,
  ProjectDetail,
  ProjectParticipation,
  ProjectParticipationDetail,
  ProjectMilestone,
  MilestoneScore,
  ProjectProgressReport
} from '../types/project';

// Projects API
export const projectAPI = {
  getAll: async (params?: {
    subject?: number;
    term?: number;
    evaluation_type?: string;
  }) => {
    const response = await apiClient.get<Project[]>('/projects/projects/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ProjectDetail>(`/projects/projects/${id}/`);
    return response.data;
  },

  getActive: async () => {
    const response = await apiClient.get<Project[]>('/projects/projects/active/');
    return response.data;
  },

  getUpcoming: async () => {
    const response = await apiClient.get<Project[]>('/projects/projects/upcoming/');
    return response.data;
  },

  create: async (data: Partial<Project>) => {
    const response = await apiClient.post<Project>('/projects/projects/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Project>) => {
    const response = await apiClient.patch<Project>(`/projects/projects/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/projects/projects/${id}/`);
  },

  addParticipants: async (id: number, studentIds: number[]) => {
    const response = await apiClient.post(`/projects/projects/${id}/add_participants/`, {
      student_ids: studentIds
    });
    return response.data;
  },

  getParticipants: async (id: number) => {
    const response = await apiClient.get<ProjectParticipation[]>(
      `/projects/projects/${id}/participants/`
    );
    return response.data;
  },

  getProgressReport: async (id: number) => {
    const response = await apiClient.get<ProjectProgressReport[]>(
      `/projects/projects/${id}/progress_report/`
    );
    return response.data;
  }
};

// Project Participation API
export const participationAPI = {
  getAll: async (params?: { project?: number; student?: number }) => {
    const response = await apiClient.get<ProjectParticipation[]>('/projects/participations/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ProjectParticipationDetail>(`/projects/participations/${id}/`);
    return response.data;
  },

  update: async (id: number, data: Partial<ProjectParticipation>) => {
    const response = await apiClient.patch<ProjectParticipation>(
      `/projects/participations/${id}/`,
      data
    );
    return response.data;
  },

  submit: async (id: number) => {
    const response = await apiClient.post(`/projects/participations/${id}/submit/`);
    return response.data;
  },

  getPendingEvaluation: async () => {
    const response = await apiClient.get<ProjectParticipation[]>(
      '/projects/participations/pending_evaluation/'
    );
    return response.data;
  }
};

// Milestone API
export const milestoneAPI = {
  getAll: async (projectId?: number) => {
    const params = projectId ? { project: projectId } : {};
    const response = await apiClient.get<ProjectMilestone[]>('/projects/milestones/', { params });
    return response.data;
  },

  create: async (data: Partial<ProjectMilestone>) => {
    const response = await apiClient.post<ProjectMilestone>('/projects/milestones/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ProjectMilestone>) => {
    const response = await apiClient.patch<ProjectMilestone>(`/projects/milestones/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/projects/milestones/${id}/`);
  }
};

// Milestone Score API
export const milestoneScoreAPI = {
  getAll: async (params?: { milestone?: number; participation?: number }) => {
    const response = await apiClient.get<MilestoneScore[]>('/projects/milestone-scores/', { params });
    return response.data;
  },

  create: async (data: {
    milestone: number;
    participation: number;
    score: number;
    comments?: string;
    evaluated_by: string;
  }) => {
    const response = await apiClient.post<MilestoneScore>('/projects/milestone-scores/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<MilestoneScore>) => {
    const response = await apiClient.patch<MilestoneScore>(`/projects/milestone-scores/${id}/`, data);
    return response.data;
  }
};