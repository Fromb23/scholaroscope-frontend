import { useQuery } from '@tanstack/react-query';
import { cbcAPI } from '@/app/plugins/cbc/api/cbc';
import { toArray } from '@/app/plugins/cbc/lib/apiHelpers';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';
import type {
    CbcAssessmentReportResult,
    CbcAssessmentReportResultFilters,
} from '@/app/plugins/cbc/types/cbc';

export function useCbcAssessmentReportResults(filters?: CbcAssessmentReportResultFilters) {
    const query = useQuery<CbcAssessmentReportResult[]>({
        queryKey: cbcKeys.assessmentReportResults.list(filters),
        queryFn: async () => toArray(await cbcAPI.getAssessmentReportResults(filters)),
        staleTime: 60 * 1000,
    });

    return {
        results: query.data ?? [],
        loading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
    };
}

export function useCbcAssessmentReportResult(id: number | null) {
    const query = useQuery<CbcAssessmentReportResult>({
        queryKey: cbcKeys.assessmentReportResults.detail(id ?? 0),
        queryFn: () => cbcAPI.getAssessmentReportResult(id!),
        enabled: id !== null,
        staleTime: 60 * 1000,
    });

    return {
        result: query.data ?? null,
        loading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
    };
}
