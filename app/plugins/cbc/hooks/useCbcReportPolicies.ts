'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cbcReportPolicyAPI } from '@/app/plugins/cbc/api/reportPolicies';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';
import type {
    CbcReportPolicy,
    CbcReportPolicyFilters,
    CbcReportPolicyPayload,
} from '@/app/plugins/cbc/types/reportPolicy';

export function useCbcReportPolicies(filters?: CbcReportPolicyFilters) {
    const queryClient = useQueryClient();

    const query = useQuery<CbcReportPolicy[]>({
        queryKey: cbcKeys.reportPolicies.list(filters),
        queryFn: () => cbcReportPolicyAPI.getAll(filters),
        staleTime: 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: (payload: CbcReportPolicyPayload) => cbcReportPolicyAPI.create(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: cbcKeys.reportPolicies.all });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<CbcReportPolicyPayload> }) =>
            cbcReportPolicyAPI.update(id, payload),
        onSuccess: async (policy) => {
            queryClient.setQueryData(cbcKeys.reportPolicies.detail(policy.id), policy);
            await queryClient.invalidateQueries({ queryKey: cbcKeys.reportPolicies.all });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => cbcReportPolicyAPI.delete(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: cbcKeys.reportPolicies.all });
        },
    });

    return {
        policies: query.data ?? [],
        loading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
        createPolicy: (payload: CbcReportPolicyPayload) => createMutation.mutateAsync(payload),
        updatePolicy: (id: number, payload: Partial<CbcReportPolicyPayload>) =>
            updateMutation.mutateAsync({ id, payload }),
        deletePolicy: (id: number) => deleteMutation.mutateAsync(id),
        saving: createMutation.isPending || updateMutation.isPending,
        deleting: deleteMutation.isPending,
    };
}

export function useCbcReportPolicy(id: number | null) {
    const query = useQuery<CbcReportPolicy>({
        queryKey: cbcKeys.reportPolicies.detail(id ?? 0),
        queryFn: () => cbcReportPolicyAPI.getById(id!),
        enabled: id !== null,
        staleTime: 60 * 1000,
    });

    return {
        policy: query.data ?? null,
        loading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
    };
}
