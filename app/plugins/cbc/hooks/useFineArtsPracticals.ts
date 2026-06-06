'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { emitSessionDataChanged } from '@/app/core/lib/sessionEvents';
import type {
    FineArtsLearnerEvidencePayload,
    FineArtsPracticalEvidencePayload,
} from '@/app/core/types/session';
import { cbcFineArtsPracticalsAPI } from '@/app/plugins/cbc/api/fineArtsPracticals';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';

export function useFineArtsCourseworkTasks(termNumber?: number) {
    return useQuery({
        queryKey: cbcKeys.fineArtsPracticals.tasks(termNumber),
        queryFn: () => cbcFineArtsPracticalsAPI.getFineArtsCourseworkTasks(
            typeof termNumber === 'number' ? { term_number: termNumber } : undefined,
        ),
        staleTime: 10 * 60 * 1000,
    });
}

export function useSessionFineArtsPractical(
    sessionId: number | null,
    enabled: boolean = true,
) {
    return useQuery({
        queryKey: sessionId ? cbcKeys.fineArtsPracticals.detail(sessionId) : cbcKeys.fineArtsPracticals.all,
        queryFn: () => cbcFineArtsPracticalsAPI.getSessionFineArtsPractical(sessionId!),
        enabled: Boolean(sessionId) && enabled,
        staleTime: 60 * 1000,
    });
}

export function useResolveFineArtsPractical(sessionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { coursework_task_id?: number; task_code?: string }) => (
            cbcFineArtsPracticalsAPI.resolveSessionFineArtsPractical(sessionId, payload)
        ),
        onSuccess: (data) => {
            queryClient.setQueryData(cbcKeys.fineArtsPracticals.detail(sessionId), data);
            emitSessionDataChanged({ reason: 'fine_arts_practical_resolved', sessionId });
        },
    });
}

export function useRecordFineArtsPracticalEvidence(sessionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: FineArtsPracticalEvidencePayload) => (
            cbcFineArtsPracticalsAPI.recordFineArtsPracticalEvidence(sessionId, payload)
        ),
        onSuccess: (data) => {
            queryClient.setQueryData(cbcKeys.fineArtsPracticals.detail(sessionId), data);
            emitSessionDataChanged({ reason: 'fine_arts_practical_evidence_recorded', sessionId });
        },
    });
}

export function useSessionFineArtsLearnerEvidence(
    sessionId: number | null,
    enabled: boolean = true,
    scope: 'present' | 'all' = 'present',
) {
    return useQuery({
        queryKey: sessionId ? cbcKeys.fineArtsPracticals.learnerMatrix(sessionId, scope) : cbcKeys.fineArtsPracticals.all,
        queryFn: () => cbcFineArtsPracticalsAPI.getSessionFineArtsLearnerEvidence(sessionId!, { scope }),
        enabled: Boolean(sessionId) && enabled,
        staleTime: 60 * 1000,
    });
}

export function useRecordFineArtsLearnerEvidence(sessionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: FineArtsLearnerEvidencePayload) => (
            cbcFineArtsPracticalsAPI.recordFineArtsLearnerEvidence(sessionId, payload)
        ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: cbcKeys.fineArtsPracticals.detail(sessionId) }),
                queryClient.invalidateQueries({ queryKey: ['cbc', 'fine-arts-practicals', 'learner-matrix', sessionId] }),
            ]);
            emitSessionDataChanged({ reason: 'fine_arts_learner_evidence_recorded', sessionId });
        },
    });
}

export function useUploadFineArtsLearnerEvidenceAttachment(sessionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: {
            evidenceId: number;
            file: File;
            caption?: string;
            onUploadProgress?: (percent: number) => void;
        }) => (
            cbcFineArtsPracticalsAPI.uploadFineArtsLearnerEvidenceAttachment(
                sessionId,
                payload.evidenceId,
                payload,
            )
        ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: cbcKeys.fineArtsPracticals.detail(sessionId) }),
                queryClient.invalidateQueries({ queryKey: ['cbc', 'fine-arts-practicals', 'learner-matrix', sessionId] }),
            ]);
            emitSessionDataChanged({ reason: 'fine_arts_learner_evidence_attachment_uploaded', sessionId });
        },
    });
}
