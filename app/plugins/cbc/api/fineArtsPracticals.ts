import { apiClient } from '@/app/core/api/client';
import type {
  FineArtsCourseworkTask,
  FineArtsPracticalContract,
  FineArtsLearnerEvidenceAttachment,
  FineArtsLearnerEvidenceCell,
  FineArtsLearnerEvidenceMatrix,
  FineArtsLearnerEvidencePayload,
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

  getSessionFineArtsLearnerEvidence: async (
    sessionId: number,
  ): Promise<FineArtsLearnerEvidenceMatrix> => {
    const response = await apiClient.get<FineArtsLearnerEvidenceMatrix>(
      `/cbc/sessions/${sessionId}/fine-arts-practical/learner-evidence/`,
    );

    return response.data;
  },

  recordFineArtsLearnerEvidence: async (
    sessionId: number,
    payload: FineArtsLearnerEvidencePayload,
  ): Promise<FineArtsLearnerEvidenceCell> => {
    const response = await apiClient.post<FineArtsLearnerEvidenceCell>(
      `/cbc/sessions/${sessionId}/fine-arts-practical/learner-evidence/`,
      payload,
    );

    return response.data;
  },

  uploadFineArtsLearnerEvidenceAttachment: async (
    sessionId: number,
    evidenceId: number,
    payload: {
      file: File;
      caption?: string;
      onUploadProgress?: (percent: number) => void;
    },
  ): Promise<FineArtsLearnerEvidenceAttachment> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.caption) {
      formData.append('caption', payload.caption);
    }

    const response = await apiClient.post<FineArtsLearnerEvidenceAttachment>(
      `/cbc/sessions/${sessionId}/fine-arts-practical/learner-evidence/${evidenceId}/attachments/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          if (!payload.onUploadProgress || !event.total) {
            return;
          }

          payload.onUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    );

    return response.data;
  },
};
