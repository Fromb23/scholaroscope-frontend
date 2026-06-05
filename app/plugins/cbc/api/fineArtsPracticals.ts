import { apiClient } from '@/app/core/api/client';
import type {
    FineArtsCourseworkTask,
    FineArtsPracticalContract,
    FineArtsPracticalEvidencePayload,
} from '@/app/core/types/session';

export const cbcFineArtsPracticalsAPI = {
    getFineArtsCourseworkTasks: async (params?: { term_number?: number }) => {
        const response = await apiClient.get<FineArtsCourseworkTask[]>(
            '/cbc/fine-arts/coursework-tasks/',
            {
                params: {
                    active: true,
                    ...(typeof params?.term_number === 'number'
                        ? { term_number: params.term_number }
                        : {}),
                },
            },
        );
        return response.data;
    },

    getSessionFineArtsPractical: async (sessionId: number) => {
        const response = await apiClient.get<FineArtsPracticalContract>(
            `/cbc/sessions/${sessionId}/fine-arts-practical/`,
        );
        return response.data;
    },

    resolveSessionFineArtsPractical: async (
        sessionId: number,
        payload: { coursework_task_id?: number; task_code?: string },
    ) => {
        const response = await apiClient.post<FineArtsPracticalContract>(
            `/cbc/sessions/${sessionId}/fine-arts-practical/resolve/`,
            payload,
        );
        return response.data;
    },

    recordFineArtsPracticalEvidence: async (
        sessionId: number,
        payload: FineArtsPracticalEvidencePayload,
    ) => {
        const response = await apiClient.post<FineArtsPracticalContract>(
            `/cbc/sessions/${sessionId}/fine-arts-practical/evidence/`,
            payload,
        );
        return response.data;
    },
};
