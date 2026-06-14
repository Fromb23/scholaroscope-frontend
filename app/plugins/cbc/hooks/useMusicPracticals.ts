'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { emitSessionDataChanged } from '@/app/core/lib/sessionEvents';
import type {
    MusicPracticalLearnerEvidencePayload,
    MusicPracticalResolvePayload,
} from '@/app/core/types/session';
import { cbcMusicPracticalsAPI } from '@/app/plugins/cbc/api/musicPracticals';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';

export function useSessionMusicPractical(
    sessionId: number | null,
    enabled: boolean = true,
) {
    return useQuery({
        queryKey: sessionId ? cbcKeys.musicPracticals.detail(sessionId) : cbcKeys.musicPracticals.all,
        queryFn: () => cbcMusicPracticalsAPI.getSessionMusicPractical(sessionId!),
        enabled: Boolean(sessionId) && enabled,
        staleTime: 0,
    });
}

export function useResolveMusicPractical(sessionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: MusicPracticalResolvePayload) => (
            cbcMusicPracticalsAPI.resolveSessionMusicPractical(sessionId, payload)
        ),
        onSuccess: async (data) => {
            queryClient.setQueryData(cbcKeys.musicPracticals.detail(sessionId), data);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: cbcKeys.practicals.profile(sessionId) }),
                queryClient.invalidateQueries({ queryKey: cbcKeys.musicPracticals.learnerMatrix(sessionId) }),
            ]);
            emitSessionDataChanged({ reason: 'music_practical_resolved', sessionId });
        },
    });
}

export function useSessionMusicLearnerEvidence(
    sessionId: number | null,
    enabled: boolean = true,
) {
    return useQuery({
        queryKey: sessionId ? cbcKeys.musicPracticals.learnerMatrix(sessionId) : cbcKeys.musicPracticals.all,
        queryFn: () => cbcMusicPracticalsAPI.getSessionMusicLearnerEvidence(sessionId!),
        enabled: Boolean(sessionId) && enabled,
        staleTime: 0,
    });
}

export function useRecordMusicPracticalLearnerEvidence(sessionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: MusicPracticalLearnerEvidencePayload) => (
            cbcMusicPracticalsAPI.recordMusicPracticalLearnerEvidence(sessionId, payload)
        ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: cbcKeys.practicals.profile(sessionId) }),
                queryClient.invalidateQueries({ queryKey: cbcKeys.musicPracticals.detail(sessionId) }),
                queryClient.invalidateQueries({ queryKey: cbcKeys.musicPracticals.learnerMatrix(sessionId) }),
            ]);
            emitSessionDataChanged({ reason: 'music_practical_evidence_recorded', sessionId });
        },
    });
}

export function useUploadMusicPracticalLearnerEvidenceAttachment(sessionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: {
            evidenceId: number;
            file: File;
            caption?: string;
            onUploadProgress?: (percent: number) => void;
        }) => (
            cbcMusicPracticalsAPI.uploadMusicPracticalLearnerEvidenceAttachment(
                sessionId,
                payload.evidenceId,
                payload,
            )
        ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: cbcKeys.practicals.profile(sessionId) }),
                queryClient.invalidateQueries({ queryKey: cbcKeys.musicPracticals.detail(sessionId) }),
                queryClient.invalidateQueries({ queryKey: cbcKeys.musicPracticals.learnerMatrix(sessionId) }),
            ]);
            emitSessionDataChanged({ reason: 'music_practical_attachment_uploaded', sessionId });
        },
    });
}
