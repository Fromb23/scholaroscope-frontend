import { apiClient } from '@/app/core/api/client';
import type {
    MusicPracticalAttachmentSupport,
    MusicPracticalContract,
    MusicPracticalEvidenceAttachment,
    MusicPracticalEvidenceEntry,
    MusicPracticalLearnerEvidenceMatrix,
    MusicPracticalLearnerEvidencePayload,
    MusicPracticalResolvePayload,
} from '@/app/core/types/session';

export const cbcMusicPracticalsAPI = {
    getSessionMusicPractical: async (sessionId: number): Promise<MusicPracticalContract> => {
        const response = await apiClient.get<MusicPracticalContract>(
            `/cbc/sessions/${sessionId}/music-practical/`,
        );

        return response.data;
    },

    resolveSessionMusicPractical: async (
        sessionId: number,
        payload: MusicPracticalResolvePayload,
    ): Promise<MusicPracticalContract> => {
        const response = await apiClient.post<MusicPracticalContract>(
            `/cbc/sessions/${sessionId}/music-practical/resolve/`,
            payload,
        );

        return response.data;
    },

    getSessionMusicLearnerEvidence: async (
        sessionId: number,
    ): Promise<MusicPracticalLearnerEvidenceMatrix> => {
        const response = await apiClient.get<MusicPracticalLearnerEvidenceMatrix>(
            `/cbc/sessions/${sessionId}/music-practical/learner-evidence/`,
        );

        return response.data;
    },

    recordMusicPracticalLearnerEvidence: async (
        sessionId: number,
        payload: MusicPracticalLearnerEvidencePayload,
    ): Promise<MusicPracticalEvidenceEntry> => {
        const response = await apiClient.post<MusicPracticalEvidenceEntry>(
            `/cbc/sessions/${sessionId}/music-practical/learner-evidence/`,
            payload,
        );

        return response.data;
    },

    uploadMusicPracticalLearnerEvidenceAttachment: async (
        sessionId: number,
        evidenceId: number,
        payload: {
            file: File;
            caption?: string;
            onUploadProgress?: (percent: number) => void;
        },
    ): Promise<MusicPracticalEvidenceAttachment> => {
        const formData = new FormData();
        formData.append('file', payload.file);
        if (payload.caption) {
            formData.append('caption', payload.caption);
        }

        const response = await apiClient.post<MusicPracticalEvidenceAttachment>(
            `/cbc/sessions/${sessionId}/music-practical/learner-evidence/${evidenceId}/attachments/`,
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

export type { MusicPracticalAttachmentSupport };
