import { useQuery } from '@tanstack/react-query';
import { cbcAPI } from '@/app/plugins/cbc/api/cbc';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
    CbcAssessmentReportResult,
    CbcAssessmentReportResultFilters,
    CbcResultCohortOverview,
    CbcResultLearnerSummary,
} from '@/app/plugins/cbc/types/cbc';

export function useCbcAssessmentReportResults(filters?: CbcAssessmentReportResultFilters) {
    const query = useQuery<PaginatedResponse<CbcAssessmentReportResult>>({
        queryKey: cbcKeys.assessmentReportResults.list(filters),
        queryFn: async () => {
            const response = await cbcAPI.getAssessmentReportResults(filters);
            return Array.isArray(response)
                ? { count: response.length, next: null, previous: null, results: response }
                : response;
        },
        staleTime: 60 * 1000,
    });

    return {
        results: query.data?.results ?? [],
        count: query.data?.count ?? 0,
        next: query.data?.next ?? null,
        previous: query.data?.previous ?? null,
        loading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
    };
}

export function useCbcResultCohortOverview(filters?: CbcAssessmentReportResultFilters) {
    const query = useQuery<CbcResultCohortOverview[]>({
        queryKey: cbcKeys.assessmentReportResults.cohortOverview(filters),
        queryFn: () => cbcAPI.getResultCohortOverview(filters),
        staleTime: 60 * 1000,
    });
    return { cohorts: query.data ?? [], loading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useCbcResultCohortLearners(
    cohortId: number,
    filters?: CbcAssessmentReportResultFilters,
) {
    const query = useQuery<PaginatedResponse<CbcResultLearnerSummary>>({
        queryKey: cbcKeys.assessmentReportResults.cohortLearners(cohortId, filters),
        queryFn: () => cbcAPI.getResultCohortLearners(cohortId, filters),
        enabled: cohortId > 0,
        staleTime: 60 * 1000,
    });
    return {
        learners: query.data?.results ?? [],
        count: query.data?.count ?? 0,
        next: query.data?.next ?? null,
        previous: query.data?.previous ?? null,
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

export function useCbcLearnerAssessmentReportResults(
    cohortId: number,
    learnerId: number,
    filters?: CbcAssessmentReportResultFilters,
) {
    const query = useQuery<CbcAssessmentReportResult[]>({
        queryKey: cbcKeys.assessmentReportResults.learnerResults(cohortId, learnerId, filters),
        queryFn: () => cbcAPI.getLearnerAssessmentReportResults(cohortId, learnerId, filters),
        enabled: cohortId > 0 && learnerId > 0,
        staleTime: 60 * 1000,
    });
    return { results: query.data ?? [], loading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useCbcAssessmentReportResult(
    id: number | null,
    authorityMode: 'teaching' | 'supervision',
) {
    const query = useQuery<CbcAssessmentReportResult>({
        queryKey: cbcKeys.assessmentReportResults.detail(id ?? 0, authorityMode),
        queryFn: () => cbcAPI.getAssessmentReportResult(id!, authorityMode),
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
