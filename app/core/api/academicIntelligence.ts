import { apiClient } from './client';
import type {
  ClassSubjectIntelligence,
  LearnerSubjectIntelligence,
  TermIntelligence,
} from '@/app/core/types/academicIntelligence';

interface IntelligenceParams {
  termId?: number | null;
  includeEvidence?: boolean;
}

function params(options?: IntelligenceParams) {
  return {
    term_id: options?.termId ?? undefined,
    include_evidence: options?.includeEvidence ? '1' : undefined,
  };
}

export const academicIntelligenceAPI = {
  getInstructorLearnerSubject: async (
    learnerId: number,
    cohortSubjectId: number,
    options?: IntelligenceParams,
  ) => {
    const response = await apiClient.get<LearnerSubjectIntelligence>(
      `/academic-intelligence/instructor/learners/${learnerId}/subjects/${cohortSubjectId}/`,
      { params: params(options) },
    );
    return response.data;
  },

  getLearnerSubject: async (
    cohortSubjectId: number,
    options?: IntelligenceParams,
  ) => {
    const response = await apiClient.get<LearnerSubjectIntelligence>(
      `/academic-intelligence/learner/subjects/${cohortSubjectId}/`,
      { params: params(options) },
    );
    return response.data;
  },

  getInstructorClassSubject: async (
    cohortSubjectId: number,
    options?: IntelligenceParams,
  ) => {
    const response = await apiClient.get<ClassSubjectIntelligence>(
      `/academic-intelligence/instructor/cohort-subjects/${cohortSubjectId}/`,
      { params: params(options) },
    );
    return response.data;
  },

  getAdminTerm: async (termId: number) => {
    const response = await apiClient.get<TermIntelligence>(
      `/academic-intelligence/admin/terms/${termId}/`,
    );
    return response.data;
  },
};
