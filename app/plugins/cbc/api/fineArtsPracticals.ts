import { apiClient } from '@/app/core/api/client';
import type {
  FineArtsCourseworkTask,
  FineArtsPracticalContract,
  FineArtsPracticalEvidencePayload,
} from '@/app/core/types/session';

type FineArtsCourseworkTaskListResponse =
  | FineArtsCourseworkTask[]
  | {
      count?: number;
      next?: string | null;
      previous?: string | null;
      results?: FineArtsCourseworkTask[];
    };

function normalizeFineArtsCourseworkTasks(
  data: FineArtsCourseworkTaskListResponse,
): FineArtsCourseworkTask[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}

export const cbcFineArtsPracticalsAPI = {
  getFineArtsCourseworkTasks: async (params?: {
    term_number?: number;
  }): Promise<FineArtsCourseworkTask[]> => {
    const response = await apiClient.get<FineArtsCourseworkTaskListResponse>(
      '/cbc/fine-arts/coursework-tasks/',
      {
        params: {
          active: true,
          ...(typeof params?.term_number === 'number' ? { term_number: params.term_number } : {}),
        },
      },
    );

    return normalizeFineArtsCourseworkTasks(response.data);
  },

  getSessionFineArtsPractical: async (sessionId: number): Promise<FineArtsPracticalContract> => {
    const response = await apiClient.get<FineArtsPracticalContract>(
      `/cbc/sessions/${sessionId}/fine-arts-practical/`,
    );

    return response.data;
  },

  resolveSessionFineArtsPractical: async (
    sessionId: number,
    payload: { coursework_task_id?: number; task_code?: string },
  ): Promise<FineArtsPracticalContract> => {
    const response = await apiClient.post<FineArtsPracticalContract>(
      `/cbc/sessions/${sessionId}/fine-arts-practical/resolve/`,
      payload,
    );

    return response.data;
  },

  recordFineArtsPracticalEvidence: async (
    sessionId: number,
    payload: FineArtsPracticalEvidencePayload,
  ): Promise<FineArtsPracticalContract> => {
    const response = await apiClient.post<FineArtsPracticalContract>(
      `/cbc/sessions/${sessionId}/fine-arts-practical/evidence/`,
      payload,
    );

    return response.data;
  },
};
