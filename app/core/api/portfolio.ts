import { apiClient } from '@/app/core/api/client';
import type {
  LearnerPortfolioFilters,
  LearnerPortfolioPayload,
  PortfolioEvidence,
} from '@/app/core/types/portfolio';

function normalizeParams(filters?: LearnerPortfolioFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (!filters) {
    return params;
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    params[key] = String(value);
  }

  return params;
}

export const learnerPortfolioAPI = {
  getPortfolio: async (
    learnerId: number,
    filters?: LearnerPortfolioFilters,
  ): Promise<LearnerPortfolioPayload> => {
    const response = await apiClient.get<LearnerPortfolioPayload>(
      `/cbc/learners/${learnerId}/portfolio/`,
      { params: normalizeParams(filters) },
    );
    return response.data;
  },

  getEvidenceDetail: async (
    learnerId: number,
    evidenceId: number,
    filters?: LearnerPortfolioFilters,
  ): Promise<PortfolioEvidence> => {
    const response = await apiClient.get<PortfolioEvidence>(
      `/cbc/learners/${learnerId}/portfolio/evidence/${evidenceId}/`,
      { params: normalizeParams(filters) },
    );
    return response.data;
  },
};
