import { apiClient } from '@/app/core/api/client';
import type { PracticalProfileResponse } from '@/app/core/types/session';

export const cbcPracticalsAPI = {
    getSessionPracticalProfile: async (sessionId: number): Promise<PracticalProfileResponse> => {
        const response = await apiClient.get<PracticalProfileResponse>(
            `/cbc/sessions/${sessionId}/practical-profile/`,
        );

        return response.data;
    },
};
