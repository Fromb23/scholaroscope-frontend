import { apiClient } from '@/app/core/api/client';
import type {
  CbcCohortAllowedSubjects,
  CbcCohortProfileSummary,
  CbcPathway,
  CbcSchoolOfferedCombination,
  CbcStudentSubjectSwitchOptions,
  CbcSubjectCombination,
  CbcTrack,
} from '@/app/plugins/cbc/types/pathways';

export const cbcPathwayAPI = {
  listPathways: async () => {
    const response = await apiClient.get<CbcPathway[]>('/cbc/pathways/');
    return response.data;
  },

  listTracks: async (pathwayId: number) => {
    const response = await apiClient.get<CbcTrack[]>(`/cbc/pathways/${pathwayId}/tracks/`);
    return response.data;
  },

  listCombinations: async (trackId: number, level?: string) => {
    const response = await apiClient.get<CbcSubjectCombination[]>(
      `/cbc/tracks/${trackId}/combinations/`,
      { params: level ? { level } : undefined }
    );
    return response.data;
  },

  listCombinationSubjects: async (combinationId: number, level?: string) => {
    const response = await apiClient.get<CbcSubjectCombination>(
      `/cbc/combinations/${combinationId}/subjects/`,
      { params: level ? { level } : undefined }
    );
    return response.data.subjects;
  },

  listSchoolOfferedCombinations: async () => {
    const response = await apiClient.get<CbcSchoolOfferedCombination[]>('/cbc/school-offered-combinations/');
    return response.data;
  },

  offerCombination: async (combinationId: number) => {
    const response = await apiClient.post<CbcSchoolOfferedCombination>(
      '/cbc/school-offered-combinations/',
      { combination_id: combinationId }
    );
    return response.data;
  },

  getCohortProfile: async (cohortId: number) => {
    const response = await apiClient.get<CbcCohortProfileSummary>(`/cbc/cohorts/${cohortId}/profile/`);
    return response.data;
  },

  configureCohortProfile: async (cohortId: number, offeredCombinationId: number) => {
    const response = await apiClient.post<CbcCohortProfileSummary>(
      `/cbc/cohorts/${cohortId}/profile/`,
      { offered_combination_id: offeredCombinationId }
    );
    return response.data;
  },

  getCohortAllowedSubjects: async (cohortId: number) => {
    const response = await apiClient.get<CbcCohortAllowedSubjects>(`/cbc/cohorts/${cohortId}/allowed_subjects/`);
    return response.data;
  },

  getStudentSubjectSwitchOptions: async (studentId: number) => {
    const response = await apiClient.get<CbcStudentSubjectSwitchOptions>(
      `/cbc/students/${studentId}/subject_switch_options/`
    );
    return response.data;
  },
};
